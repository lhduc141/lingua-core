import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { CatEngineService } from './cat-engine.service';
import { SubmitPlacementAnswerDto } from '../dto/submit-placement-answer.dto';
import { StartPlacementResponse } from '../interface/start-placement-response.interface';
import { AnswerPlacementResponse } from '../interface/answer-placement-response.interface';
import { DEFAULT_CAT_CONFIG } from '@app/shared/constants/default-cat-config.constant';
import { PlacementResult } from '../interface/placement-result.interface';
import { CefrAssignment } from '../interface/cefr-assignment.interface';
import {
	AssessmentSelect,
	CatSessionSelect,
	PlacementAttemptSelect,
	QuestionSelect,
} from '../../../../../../prisma/selects';

@Injectable()
export class PlacementService {
	private readonly logger = new Logger(PlacementService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly catEngine: CatEngineService,
	) {}

	//TODO: APIs function caller
	//POST /placement/test/start
	async startPlacementTest(userId: string): Promise<StartPlacementResponse> {
		// Check session
		const existing = await this.prisma.catSession.findFirst({
			where: { userId, status: 'in_progress' },
			select: CatSessionSelect.idOnly,
		});
		if (existing) {
			throw new ConflictException(
				`You already have an active placement test (sessionId: ${existing.sessionId}). ` +
					`Submit answers to continue or wait for it to expire.`,
			);
		}

		const totalCompletedSessions = await this.prisma.catSession.count({
			where: { status: 'completed' },
		});
		const { catSession, assessment } = await this.prisma.$transaction(async (tx) => {
			const cat = await tx.catSession.create({
				data: {
					userId,
					status: 'in_progress',
					thetaEstimate: DEFAULT_CAT_CONFIG.initialTheta,
					thetaHistory: [
						{
							theta: DEFAULT_CAT_CONFIG.initialTheta,
							se: DEFAULT_CAT_CONFIG.initialSe,
							q: 0,
						},
					],
					correctCount: 0,
					incorrectCount: 0,
					currentQuestion: 0,
					totalQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
				},
			});
			const assess = await tx.assessment.create({
				data: {
					userId,
					refType: 'placement_test' as any,
					refId: cat.sessionId,
					status: 'in_progress' as any,
					catSessionId: cat.sessionId,
					startedAt: new Date(),
				},
			});

			return { catSession: cat, assessment: assess };
		});

		this.logger.log(
			`Placement test started | userId=${userId} | sessionId=${catSession.sessionId} | assessmentId=${assessment.assessmentId}`,
		);

		const firstQuestion = await this.catEngine.selectNextQuestion(
			DEFAULT_CAT_CONFIG.initialTheta,
			[],
			totalCompletedSessions,
			1,
			[],
		);

		if (!firstQuestion) {
			await this.prisma.catSession.update({
				where: { sessionId: catSession.sessionId },
				data: { status: 'abandoned' as any },
			});
			throw new NotFoundException('No placement test questions available. Please contact the administrator.');
		}

		return {
			assessmentId: assessment.assessmentId,
			sessionId: catSession.sessionId,
			firstQuestion,
			config: {
				minQuestions: DEFAULT_CAT_CONFIG.minQuestions,
				maxQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
				targetSe: DEFAULT_CAT_CONFIG.targetSe,
				initialTheta: DEFAULT_CAT_CONFIG.initialTheta,
			},
		};
	}

	//POST /placement/test/answer
	async submitAnswer(userId: string, dto: SubmitPlacementAnswerDto): Promise<AnswerPlacementResponse> {
		const { assessmentId, questionId, selectedOptionId } = dto;

		// Validate assessment → get session
		const assessment = await this.prisma.assessment.findFirst({
			where: { assessmentId, userId, deletedAt: null },
			select: AssessmentSelect.placementCheck,
		});
		if (!assessment) {
			throw new NotFoundException('Assessment not found or does not belong to you.');
		}
		if (assessment.status !== 'in_progress') {
			throw new BadRequestException(`Assessment is not in progress (current status: ${assessment.status}).`);
		}
		if (!assessment.catSessionId) {
			throw new NotFoundException('No CAT session linked to this assessment.');
		}

		// Get CatSession
		const session = await this.prisma.catSession.findFirst({
			where: { sessionId: assessment.catSessionId, userId, status: 'in_progress' },
		});
		if (!session) {
			throw new NotFoundException('Active placement test session not found.');
		}

		// Prevent re-answering the same question
		const alreadyAnswered = await this.prisma.placementAttempt.findFirst({
			where: { sessionId: session.sessionId, questionId },
			select: PlacementAttemptSelect.idOnly,
		});
		if (alreadyAnswered) {
			throw new BadRequestException(`Question ${questionId} has already been answered in this session.`);
		}

		// Fetch question + options
		const question = await this.prisma.question.findFirst({
			where: { questionId, sourceTag: 'placement_test_v1', deletedAt: null },
			select: QuestionSelect.placementAnswer,
		});
		if (!question) {
			throw new NotFoundException(`Question ${questionId} not found in the placement test pool.`);
		}

		// Validate option belongs to question
		const selectedOption = question.options.find((o) => o.optionId === selectedOptionId);
		if (!selectedOption) {
			throw new BadRequestException(`Option ${selectedOptionId} does not belong to question ${questionId}.`);
		}
		const isCorrect = selectedOption.isCorrect;

		// Fetch all past attempts with IRT params
		const pastAttempts = await this.prisma.placementAttempt.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAttemptSelect.withIrt,
			orderBy: { questionOrder: 'asc' },
		});

		const currentTheta = parseFloat(session.thetaEstimate.toString());
		const questionOrder = pastAttempts.length + 1; // 1-indexed position

		// MLE: update theta using all responses (past + current)
		const allResponses = this.catEngine.buildResponses([
			...pastAttempts,
			{
				isCorrect,
				question: {
					irtDiscrimination: question.irtDiscrimination,
					irtDifficulty: question.irtDifficulty,
					irtGuessing: question.irtGuessing,
				},
			},
		]);
		const newTheta = this.catEngine.estimateTheta(allResponses, currentTheta);

		// SE from all administered items at new theta
		const allParams = allResponses.map(({ a, b, c }) => ({ a, b, c }));
		const newSe = this.catEngine.calculateSE(newTheta, allParams);

		this.logger.debug(
			`Answer submitted | session=${session.sessionId} | q=${questionOrder} ` +
				`| isCorrect=${isCorrect} | θ: ${currentTheta.toFixed(3)} → ${newTheta.toFixed(3)} | SE: ${newSe.toFixed(3)}`,
		);

		// Persist PlacementAttempt
		const irtB = parseFloat(question.irtDifficulty?.toString() ?? '0.0');
		await this.prisma.placementAttempt.create({
			data: {
				sessionId: session.sessionId,
				questionId,
				questionOrder,
				difficulty: irtB,
				userAnswer: selectedOptionId,
				isCorrect,
				thetaBefore: currentTheta,
				thetaAfter: newTheta,
				answeredAt: new Date(),
			},
		});

		// Update question exposure tracking
		await this.prisma.question.update({
			where: { questionId },
			data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
		});

		// Build updated session data
		const thetaHistory = (session.thetaHistory as any[]) ?? [];
		thetaHistory.push({ theta: newTheta, se: newSe, q: questionOrder });
		const newCorrectCount = session.correctCount + (isCorrect ? 1 : 0);
		const newIncorrectCount = session.incorrectCount + (isCorrect ? 0 : 1);

		// Check stopping criteria
		const stopping = this.catEngine.checkStoppingCriteria(questionOrder, newSe);
		if (stopping.shouldStop) {
			this.logger.log(
				`Stopping: ${stopping.reason} | session=${session.sessionId} | q=${questionOrder} | SE=${newSe}`,
			);
			return this.finalizeAndRespond({
				session,
				isCorrect,
				newTheta,
				newSe,
				questionOrder,
				newCorrectCount,
				newIncorrectCount,
				thetaHistory,
			});
		}

		// Update session state and continue
		await this.prisma.catSession.update({
			where: { sessionId: session.sessionId },
			data: {
				thetaEstimate: newTheta,
				thetaHistory: thetaHistory as any,
				correctCount: newCorrectCount,
				incorrectCount: newIncorrectCount,
				currentQuestion: questionOrder,
			},
		});

		// Select next question
		const answeredIds = [...pastAttempts.map((a) => a.questionId), questionId];
		const totalCompletedSessions = await this.prisma.catSession.count({
			where: { status: 'completed' },
		});
		const answeredPassageIds = [
			...pastAttempts.map((a) => a.question?.passageId ?? null),
			question.passageId ?? null,
		].filter(Boolean) as string[];
		const nextQuestion = await this.catEngine.selectNextQuestion(
			newTheta,
			answeredIds,
			totalCompletedSessions,
			questionOrder + 1,
			answeredPassageIds,
		);

		if (!nextQuestion) {
			this.logger.warn(
				`Question pool exhausted | session=${session.sessionId} | q=${questionOrder} | Force finalizing.`,
			);
			return this.finalizeAndRespond({
				session,
				isCorrect,
				newTheta,
				newSe,
				questionOrder,
				newCorrectCount,
				newIncorrectCount,
				thetaHistory,
			});
		}

		return {
			isCorrect,
			updatedTheta: newTheta,
			updatedSe: newSe,
			isCompleted: false,
			progress: {
				questionsAnswered: questionOrder,
				minQuestions: DEFAULT_CAT_CONFIG.minQuestions,
				maxQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
			},
			nextQuestion,
		};
	}

	//POST /placement/test/complete
	async completePlacementTest(userId: string): Promise<PlacementResult> {
		const session = await this.prisma.catSession.findFirst({
			where: { userId, status: 'in_progress' },
		});
		if (!session) {
			throw new NotFoundException('No active placement test found. Please start a test first.');
		}

		const questionsAnswered = session.currentQuestion;
		if (questionsAnswered < DEFAULT_CAT_CONFIG.minQuestions) {
			throw new BadRequestException(
				`Cannot complete yet. You have answered ${questionsAnswered} of the required ` +
					`${DEFAULT_CAT_CONFIG.minQuestions} minimum questions.`,
			);
		}

		const theta = parseFloat(session.thetaEstimate.toString());

		// Recalculate SE from actual attempts for accuracy
		const attempts = await this.prisma.placementAttempt.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAttemptSelect.irtOnly,
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.initialSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		await this.finalize(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount);

		return this.buildResult(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount);
	}

	//GET /placement/test/result
	async getPlacementResult(userId: string): Promise<PlacementResult> {
		const session = await this.prisma.catSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
		});
		if (!session) {
			throw new NotFoundException('No completed placement test found. Please complete the placement test first.');
		}

		const theta = parseFloat((session.finalTheta ?? session.thetaEstimate).toString());

		const attempts = await this.prisma.placementAttempt.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAttemptSelect.irtOnly,
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.targetSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		return this.buildResult(session, cefrAssignment, theta, se, session.currentQuestion, session.correctCount);
	}

	//TODO Private Helpers
	private async finalizeAndRespond(args: {
		session: any;
		isCorrect: boolean;
		newTheta: number;
		newSe: number;
		questionOrder: number;
		newCorrectCount: number;
		newIncorrectCount: number;
		thetaHistory: any[];
	}): Promise<AnswerPlacementResponse> {
		const { session, isCorrect, newTheta, newSe, questionOrder, newCorrectCount, newIncorrectCount, thetaHistory } =
			args;

		const cefrAssignment = this.catEngine.mapToCefr(newTheta, newSe);

		await this.prisma.catSession.update({
			where: { sessionId: session.sessionId },
			data: {
				status: 'completed',
				thetaEstimate: newTheta,
				thetaHistory: thetaHistory as any,
				correctCount: newCorrectCount,
				incorrectCount: newIncorrectCount,
				currentQuestion: questionOrder,
				finalTheta: newTheta,
				cefrLevel: cefrAssignment.level,
				confidence: parseFloat((1 - newSe / 2).toFixed(2)),
				completedAt: new Date(),
			},
		});

		await this.prisma.assessment.updateMany({
			where: { catSessionId: session.sessionId },
			data: {
				status: 'scored' as any,
				completedAt: new Date(),
				score: questionOrder > 0 ? parseFloat(((newCorrectCount / questionOrder) * 100).toFixed(2)) : 0,
			},
		});

		this.logger.log(
			`Session finalized | sessionId=${session.sessionId} | CEFR=${cefrAssignment.level} ` +
				`| θ=${newTheta} | SE=${newSe} | q=${questionOrder}`,
		);

		return {
			isCorrect,
			updatedTheta: newTheta,
			updatedSe: newSe,
			isCompleted: true,
			progress: {
				questionsAnswered: questionOrder,
				minQuestions: DEFAULT_CAT_CONFIG.minQuestions,
				maxQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
			},
			result: this.buildResult(session, cefrAssignment, newTheta, newSe, questionOrder, newCorrectCount),
		};
	}

	private async finalize(
		session: any,
		cefrAssignment: CefrAssignment,
		theta: number,
		se: number,
		questionsAnswered: number,
		correctAnswers: number,
	): Promise<void> {
		const now = new Date();

		await this.prisma.catSession.update({
			where: { sessionId: session.sessionId },
			data: {
				status: 'completed',
				finalTheta: theta,
				cefrLevel: cefrAssignment.level,
				confidence: parseFloat((1 - se / 2).toFixed(2)),
				completedAt: now,
			},
		});

		await this.prisma.assessment.updateMany({
			where: { catSessionId: session.sessionId },
			data: {
				status: 'scored' as any,
				completedAt: now,
				score: questionsAnswered > 0 ? parseFloat(((correctAnswers / questionsAnswered) * 100).toFixed(2)) : 0,
			},
		});

		this.logger.log(
			`Session manually completed | sessionId=${session.sessionId} | CEFR=${cefrAssignment.level} ` +
				`| θ=${theta} | SE=${se} | q=${questionsAnswered}`,
		);
	}

	private buildResult(
		session: any,
		cefrAssignment: CefrAssignment,
		theta: number,
		se: number,
		questionsAdministered: number,
		correctAnswers: number,
	): PlacementResult {
		return {
			sessionId: session.sessionId,
			cefrAssignment,
			finalTheta: theta,
			finalSe: se,
			questionsAdministered,
			correctAnswers,
			accuracyRate:
				questionsAdministered > 0 ? parseFloat(((correctAnswers / questionsAdministered) * 100).toFixed(1)) : 0,
			startedAt: session.startedAt ?? session.createdAt,
			completedAt: session.completedAt ?? new Date(),
		};
	}
}
