import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { CatEngineService } from './cat-engine.service';
import { SubmitPlacementAnswerDto } from '../dto/submit-placement-answer.dto';
import { StartPlacementResponse } from '../interface/start-placement-response.interface';
import { AnswerPlacementResponse } from '../interface/answer-placement-response.interface';
import { DEFAULT_CAT_CONFIG } from '@app/shared/constants/default-cat-config.constant';
import { PlacementResult } from '../interface/placement-result.inteface';
import { CefrAssignment } from '../interface/cefr-assignment.inteface';

/**
 * PlacementService
 *
 * Orchestrates the CAT placement test lifecycle:
 *   start → [answer × N] → finalize
 *
 * Owns all business rules:
 *   - Preventing duplicate sessions
 *   - Validating answer ownership (option belongs to question)
 *   - Preventing re-answering the same question
 *   - Enforcing minQuestions for manual completion
 *   - Atomic finalization (CatSession + Assessment updated together)
 *
 * Delegates pure math to CatEngineService (MLE, SE, question selection, CEFR mapping).
 *
 * Data model:
 *   User → (Assessment + CatSession) ← created together
 *   CatSession → PlacementAttempt[] ← one per answered question
 *   Assessment.catSessionId → CatSession
 *   API uses assessmentId as the user-facing identifier.
 */
@Injectable()
export class PlacementService {
	private readonly logger = new Logger(PlacementService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly catEngine: CatEngineService,
	) {}

	// ─────────────────────────────────────────────────────────
	// POST /placement/test/start
	// ─────────────────────────────────────────────────────────

	/**
	 * Start a new CAT placement test for the user.
	 *
	 * Flow:
	 *   1. Guard: 409 if user has an in-progress session
	 *   2. Count completed sessions for exposure rate calculation
	 *   3. Transaction: create CatSession + Assessment atomically
	 *   4. Select first question at θ = DEFAULT_CAT_CONFIG.initialTheta (0.0)
	 *   5. Return assessmentId, sessionId, firstQuestion, config
	 *
	 * Why atomic transaction?
	 *   CatSession and Assessment represent two aspects of the same event.
	 *   If either fails, we'd have an orphan record that breaks state.
	 *
	 * Why count completed sessions here?
	 *   Exposure rate = usageCount / totalCompletedSessions.
	 *   This number is read once and passed to selectNextQuestion.
	 *   It doesn't need to be perfectly fresh on every question —
	 *   the exposure penalty is a soft control, not a hard constraint.
	 */
	async startPlacementTest(userId: string): Promise<StartPlacementResponse> {
		const existing = await this.prisma.catSession.findFirst({
			where: { userId, status: 'in_progress' },
			select: { sessionId: true },
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
		);

		if (!firstQuestion) {
			// Roll back by marking session as abandoned so it doesn't block user
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

	// ─────────────────────────────────────────────────────────
	// POST /placement/test/answer
	// ─────────────────────────────────────────────────────────

	/**
	 * Submit one answer and receive the next question or the final result.
	 *
	 * Flow:
	 *   1. Find Assessment by assessmentId + userId → get catSessionId
	 *   2. Find CatSession → validate in_progress
	 *   3. Check question not already answered in this session
	 *   4. Find question + options → validate selectedOptionId belongs to question
	 *   5. Determine isCorrect
	 *   6. Fetch all past attempts with IRT params for MLE
	 *   7. Run MLE (past + current) → new theta
	 *   8. Compute new SE from all administered items at new theta
	 *   9. Persist PlacementAttempt
	 *   10. Update question usage tracking
	 *   11. Update CatSession (theta, thetaHistory, counts, currentQuestion)
	 *   12. Check stopping criteria
	 *       → shouldStop: finalize session + return result
	 *       → continue: select next question + return nextQuestion
	 *
	 * Why MLE over all items (not incremental update)?
	 *   Newton-Raphson can produce slightly different results depending on
	 *   the starting point and response order. Running over all items from
	 *   the current theta estimate (warm start) gives the most stable
	 *   and reproducible result, and is the standard academic approach.
	 *
	 * Why update question.usageCount?
	 *   Exposure control: the next session will penalize this question's
	 *   priority score if exposureRate exceeds EXPOSURE_LIMITS.maxRate.
	 */
	async submitAnswer(userId: string, dto: SubmitPlacementAnswerDto): Promise<AnswerPlacementResponse> {
		const { assessmentId, questionId, selectedOptionId } = dto;

		// 1. Validate assessment → get session
		const assessment = await this.prisma.assessment.findFirst({
			where: { assessmentId, userId, deletedAt: null },
			select: { assessmentId: true, catSessionId: true, status: true },
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

		// 2. Get CatSession
		const session = await this.prisma.catSession.findFirst({
			where: { sessionId: assessment.catSessionId, userId, status: 'in_progress' },
		});
		if (!session) {
			throw new NotFoundException('Active placement test session not found.');
		}

		// 3. Prevent re-answering the same question
		const alreadyAnswered = await this.prisma.placementAttempt.findFirst({
			where: { sessionId: session.sessionId, questionId },
			select: { attemptId: true },
		});
		if (alreadyAnswered) {
			throw new BadRequestException(`Question ${questionId} has already been answered in this session.`);
		}

		// 4. Fetch question + options
		const question = await this.prisma.question.findFirst({
			where: { questionId, sourceTag: 'placement_test_v1', deletedAt: null },
			select: {
				questionId: true,
				irtDifficulty: true,
				irtDiscrimination: true,
				irtGuessing: true,
				options: {
					where: { deletedAt: null },
					select: { optionId: true, isCorrect: true },
				},
			},
		});
		if (!question) {
			throw new NotFoundException(`Question ${questionId} not found in the placement test pool.`);
		}

		// 5. Validate option belongs to question
		const selectedOption = question.options.find((o) => o.optionId === selectedOptionId);
		if (!selectedOption) {
			throw new BadRequestException(`Option ${selectedOptionId} does not belong to question ${questionId}.`);
		}
		const isCorrect = selectedOption.isCorrect;

		// 6. Fetch all past attempts with IRT params
		const pastAttempts = await this.prisma.placementAttempt.findMany({
			where: { sessionId: session.sessionId },
			select: {
				questionId: true,
				isCorrect: true,
				question: {
					select: { irtDiscrimination: true, irtDifficulty: true, irtGuessing: true },
				},
			},
			orderBy: { questionOrder: 'asc' },
		});

		const currentTheta = parseFloat(session.thetaEstimate.toString());
		const questionOrder = pastAttempts.length + 1; // 1-indexed position

		// 7. MLE: update theta using all responses (past + current)
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

		// 8. SE from all administered items at new theta
		const allParams = allResponses.map(({ a, b, c }) => ({ a, b, c }));
		const newSe = this.catEngine.calculateSE(newTheta, allParams);

		this.logger.debug(
			`Answer submitted | session=${session.sessionId} | q=${questionOrder} ` +
				`| isCorrect=${isCorrect} | θ: ${currentTheta.toFixed(3)} → ${newTheta.toFixed(3)} | SE: ${newSe.toFixed(3)}`,
		);

		// 9. Persist PlacementAttempt
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

		// 10. Update question exposure tracking
		await this.prisma.question.update({
			where: { questionId },
			data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
		});

		// 11. Build updated session data
		const thetaHistory = (session.thetaHistory as any[]) ?? [];
		thetaHistory.push({ theta: newTheta, se: newSe, q: questionOrder });
		const newCorrectCount = session.correctCount + (isCorrect ? 1 : 0);
		const newIncorrectCount = session.incorrectCount + (isCorrect ? 0 : 1);

		// 12. Check stopping criteria
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
		const nextQuestion = await this.catEngine.selectNextQuestion(newTheta, answeredIds, totalCompletedSessions);

		if (!nextQuestion) {
			// Pool exhausted — force finalize
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

	// ─────────────────────────────────────────────────────────
	// POST /placement/test/complete
	// ─────────────────────────────────────────────────────────

	/**
	 * Manually finalize an in-progress placement test.
	 *
	 * Guard: requires >= minQuestions answered.
	 * Rationale: fewer than 10 items gives SE > ~0.6 which makes the
	 * CEFR assignment unreliable. The frontend should disable this button
	 * until minQuestions is reached.
	 *
	 * Flow:
	 *   1. Find active session for user
	 *   2. Check >= minQuestions answered
	 *   3. Recalculate SE from actual attempts (more accurate than stored value)
	 *   4. Map theta → CEFR
	 *   5. Finalize CatSession + Assessment
	 *   6. Return PlacementResult
	 */
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
			select: {
				question: { select: { irtDiscrimination: true, irtDifficulty: true, irtGuessing: true } },
			},
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.initialSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		await this.finalize(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount);

		return this.buildResult(session, cefrAssignment, theta, se, questionsAnswered, session.correctCount);
	}

	// ─────────────────────────────────────────────────────────
	// GET /placement/test/result
	// ─────────────────────────────────────────────────────────

	/**
	 * Retrieve the most recently completed placement test result.
	 *
	 * SE is recalculated from actual attempts rather than using the stored
	 * value, because it's slightly more accurate (stored SE uses theta
	 * from before the final update; recalculated SE uses finalTheta).
	 */
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
			select: {
				question: { select: { irtDiscrimination: true, irtDifficulty: true, irtGuessing: true } },
			},
		});
		const params = attempts.map((a) => this.catEngine.extractIrtParams(a.question));
		const se = params.length > 0 ? this.catEngine.calculateSE(theta, params) : DEFAULT_CAT_CONFIG.targetSe;
		const cefrAssignment = this.catEngine.mapToCefr(theta, se);

		return this.buildResult(session, cefrAssignment, theta, se, session.currentQuestion, session.correctCount);
	}

	// ─────────────────────────────────────────────────────────
	// Private helpers
	// ─────────────────────────────────────────────────────────

	/**
	 * Finalize the session when stopping criteria triggers during submitAnswer.
	 * Updates DB and returns the AnswerPlacementResponse with result embedded.
	 */
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

	/**
	 * Persist finalized state for CatSession + Assessment.
	 * Used by completePlacementTest (manual completion).
	 */
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
