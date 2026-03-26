import { ResponseDto } from '@app/shared';
import { DEFAULT_CAT_CONFIG } from '@app/shared/constants/default-cat-config.constant';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import {
	ExerciseRecordSelect,
	PlacementAnswerSelect,
	PlacementSessionSelect,
	QuestionSelect,
} from '../../../../../../prisma/selects';
import { SubmitPlacementAnswerDto } from '../dto/submit-placement-answer.dto';
import { CefrAssignment } from '../interface/cefr-assignment.interface';
import { PlacementResult } from '../interface/placement-result.interface';
import { CatEngineService } from './cat-engine.service';

@Injectable()
export class PlacementService {
	private readonly logger = new Logger(PlacementService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly catEngine: CatEngineService,
	) {}

	// POST /placement/start
	async startPlacementTest(userId: string): Promise<ResponseDto<any>> {
		const existing = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'in_progress' },
			select: PlacementSessionSelect.idOnly,
		});
		if (existing)
			throw new ConflictException(
				`You already have an active placement test (sessionId: ${existing.sessionId}). ` +
					`Submit answers to continue or wait for it to expire.`,
			);

		const totalCompletedSessions = await this.prisma.placementSession.count({
			where: { status: 'completed' },
		});
		const { placementSession, exerciseRecord } = await this.prisma.$transaction(async (tx) => {
			const placementSession = await tx.placementSession.create({
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
			const exerciseRecord = await tx.exerciseRecord.create({
				data: {
					userId,
					refType: 'placement_test' as any,
					refId: placementSession.sessionId,
					status: 'in_progress' as any,
					placementSessionId: placementSession.sessionId,
					startedAt: new Date(),
				},
			});
			return { placementSession, exerciseRecord };
		});
		this.logger.log(
			`Placement test started | userId=${userId} | placementSession=${placementSession.sessionId} | exerciseRecord=${exerciseRecord.exerciseRecordId}`,
		);

		const firstQuestion = await this.catEngine.selectNextQuestion(
			DEFAULT_CAT_CONFIG.initialTheta,
			[],
			totalCompletedSessions,
			1,
			[],
		);

		if (!firstQuestion) {
			await this.prisma.placementSession.update({
				where: { sessionId: placementSession.sessionId },
				data: { status: 'abandoned' as any },
			});
			throw new NotFoundException('No placement test questions available. Please contact the administrator.');
		}

		return ResponseDto.success(
			Object,
			{
				assessmentId: placementSession.sessionId,
				sessionId: placementSession.sessionId,
				firstQuestion,
				config: {
					minQuestions: DEFAULT_CAT_CONFIG.minQuestions,
					maxQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
					targetSe: DEFAULT_CAT_CONFIG.targetSe,
					initialTheta: DEFAULT_CAT_CONFIG.initialTheta,
				},
			},
			'Placement test started',
		);
	}

	// POST /placement/answers
	async submitAnswer(userId: string, dto: SubmitPlacementAnswerDto): Promise<ResponseDto<any>> {
		const { exerciseRecordId, questionId, selectedOptionId } = dto;

		// Validate assessment
		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.placementCheck,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found or does not belong to you.');
		if (exerciseRecord.status !== 'in_progress')
			throw new BadRequestException(`Assessment is not in progress (current status: ${exerciseRecord.status}).`);
		if (!exerciseRecord.placementSessionId)
			throw new NotFoundException('No CAT session linked to this exerciseRecord.');

		// Get CatSession
		const session = await this.prisma.placementSession.findFirst({
			where: { sessionId: exerciseRecord.placementSessionId, userId, status: 'in_progress' },
		});
		if (!session) throw new NotFoundException('Active placement test session not found.');

		// Prevent re-answering
		const alreadyAnswered = await this.prisma.placementAnswer.findFirst({
			where: { sessionId: session.sessionId, questionId },
			select: PlacementAnswerSelect.idOnly,
		});
		if (alreadyAnswered) {
			throw new BadRequestException(`Question ${questionId} has already been answered in this session.`);
		}

		// Fetch question + options
		const question = await this.prisma.question.findFirst({
			where: { questionId, sourceTag: 'placement_test_v1', deletedAt: null },
			select: QuestionSelect.placementAnswer,
		});
		if (!question) throw new NotFoundException(`Question ${questionId} not found in the placement test pool.`);

		// Validate option
		const selectedOption = question.options.find((o) => o.optionId === selectedOptionId);
		if (!selectedOption) {
			throw new BadRequestException(`Option ${selectedOptionId} does not belong to question ${questionId}.`);
		}
		const isCorrect = selectedOption.isCorrect;

		// Fetch past attempts
		const pastAttempts = await this.prisma.placementAnswer.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAnswerSelect.withIrt,
			orderBy: { questionOrder: 'asc' },
		});

		const currentTheta = parseFloat(session.thetaEstimate.toString());
		const questionOrder = pastAttempts.length + 1;

		// MLE: update theta
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
		const allParams = allResponses.map(({ a, b, c }) => ({ a, b, c }));
		const newSe = this.catEngine.calculateSE(newTheta, allParams);

		this.logger.debug(
			`Answer submitted | session=${session.sessionId} | q=${questionOrder} ` +
				`| isCorrect=${isCorrect} | θ: ${currentTheta.toFixed(3)} → ${newTheta.toFixed(3)} | SE: ${newSe.toFixed(3)}`,
		);

		// Persist attempt
		const irtB = parseFloat(question.irtDifficulty?.toString() ?? '0.0');
		await this.prisma.placementAnswer.create({
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

		// Update question exposure
		await this.prisma.question.update({
			where: { questionId },
			data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
		});

		// Build theta history
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

		// Update session state
		await this.prisma.placementSession.update({
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
		const totalCompletedSessions = await this.prisma.placementSession.count({
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

		return ResponseDto.success(
			Object,
			{
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
			},
			'Answer submitted',
		);
	}

	// POST /placement/complete
	async completePlacementTest(userId: string): Promise<ResponseDto<any>> {
		const session = await this.prisma.placementSession.findFirst({
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
		const attempts = await this.prisma.placementAnswer.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAnswerSelect.irtOnly,
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.initialSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		await this.finalize(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount);

		return ResponseDto.success(
			Object,
			this.buildResult(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount),
			'Placement test completed',
		);
	}

	// GET /placement/result
	async getPlacementResult(userId: string): Promise<ResponseDto<any>> {
		const session = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
		});
		if (!session) {
			throw new NotFoundException('No completed placement test found. Please complete the placement test first.');
		}

		const theta = parseFloat((session.finalTheta ?? session.thetaEstimate).toString());
		const attempts = await this.prisma.placementAnswer.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAnswerSelect.irtOnly,
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.targetSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		return ResponseDto.success(
			Object,
			this.buildResult(session, cefrAssignment, theta, se, session.currentQuestion, session.correctCount),
			'Placement test result retrieved',
		);
	}

	// POST /placement/skip
	async skipPlacementTest(userId: string): Promise<ResponseDto<any>> {
		// Abandon CAT session đang in-progress nếu có
		await this.prisma.placementSession.updateMany({
			where: { userId, status: 'in_progress' },
			data: { status: 'abandoned' as any },
		});

		await this.prisma.user.update({
			where: { userId },
			data: { placementSkippedAt: new Date() },
		});

		this.logger.log(`User ${userId} skipped placement test`);
		return ResponseDto.success(Object, null, 'Placement test skipped successfully');
	}

	// GET /placement/current
	async getCurrentSession(userId: string) {
		const session = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'in_progress' },
			orderBy: { createdAt: 'desc' },
		});
		if (!session) throw new NotFoundException('No in-progress placement session found.');

		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { userId, status: 'in_progress' },
			orderBy: { createdAt: 'desc' },
		});
		if (!exerciseRecord) throw new NotFoundException('No exerciseRecord linked to this session.');

		const pastAttempts = await this.prisma.placementAnswer.findMany({
			where: { sessionId: session.sessionId },
			select: PlacementAnswerSelect.withIrt,
			orderBy: { questionOrder: 'asc' },
		});
		const answeredIds = pastAttempts.map((a) => a.questionId);
		const answeredPassageIds = pastAttempts.map((a) => a.question?.passageId ?? null).filter(Boolean) as string[];

		const questionOrder = pastAttempts.length + 1;
		const currentTheta = parseFloat(session.thetaEstimate.toString());
		const totalCompletedSessions = await this.prisma.placementSession.count({
			where: { status: 'completed' },
		});

		const nextQuestion = await this.catEngine.selectNextQuestion(
			currentTheta,
			answeredIds,
			totalCompletedSessions,
			questionOrder,
			answeredPassageIds,
		);

		if (!nextQuestion) throw new NotFoundException('No more questions available.');
		this.logger.log(`Resume session | userId=${userId} | sessionId=${session.sessionId} | q=${questionOrder}`);

		return ResponseDto.success(
			Object,
			{
				assessmentId: exerciseRecord.placementSessionId,
				sessionId: session.sessionId,
				currentQuestion: nextQuestion,
				questionOrder,
				progress: {
					questionsAnswered: pastAttempts.length,
					minQuestions: DEFAULT_CAT_CONFIG.minQuestions,
					maxQuestions: DEFAULT_CAT_CONFIG.maxQuestions,
				},
			},
			'Current placement session retrieved',
		);
	}

	//  Private Helpers
	private async finalizeAndRespond(args: {
		session: any;
		isCorrect: boolean;
		newTheta: number;
		newSe: number;
		questionOrder: number;
		newCorrectCount: number;
		newIncorrectCount: number;
		thetaHistory: any[];
	}): Promise<ResponseDto<any>> {
		const { session, isCorrect, newTheta, newSe, questionOrder, newCorrectCount, newIncorrectCount, thetaHistory } =
			args;

		const cefrAssignment = this.catEngine.mapToCefr(newTheta, newSe);

		await this.prisma.placementSession.update({
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

		await this.prisma.exerciseRecord.updateMany({
			where: { placementSessionId: session.sessionId },
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

		return ResponseDto.success(
			Object,
			{
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
			},
			'Placement test completed',
		);
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

		await this.prisma.placementSession.update({
			where: { sessionId: session.sessionId },
			data: {
				status: 'completed',
				finalTheta: theta,
				cefrLevel: cefrAssignment.level,
				confidence: parseFloat((1 - se / 2).toFixed(2)),
				completedAt: now,
			},
		});

		await this.prisma.exerciseRecord.updateMany({
			where: { placementSessionId: session.sessionId },
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
