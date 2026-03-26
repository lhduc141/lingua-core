import { DEFAULT_CAT_CONFIG } from '@app/shared/constants/default-cat-config.constant';
import { EXPOSURE_LIMITS } from '@app/shared/constants/exposure-limit.constant';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { QuestionSelect } from '../../../../../../prisma/selects';
import { CefrAssignment } from '../interface/cefr-assignment.interface';
import { FormattedQuestion } from '../interface/formatted-question.interface';
import { IrtParameters } from '../interface/irt-parameters.interface';
import { IrtResponse } from '../interface/irt-response.interface';
import { QuestionCandidate } from '../interface/question-candidate.interface';
import { StopDecision } from '../interface/stop-decision.interface';
import { IrtMathUtils } from '../utils/irt-math.utils';

// Passage Config
// Q1-5: Grammar only
// Q6-20: Passage-based
const GRAMMAR_PHASE_END = 5;
const MAX_QUESTIONS_PER_PASSAGE = 4;

@Injectable()
export class CatEngineService {
	private readonly logger = new Logger(CatEngineService.name);
	private readonly SOURCE_TAG = 'placement_test_v1'; // Query "placement test" question

	constructor(private readonly prisma: PrismaService) {}

	//TODO 1. Question Selection
	async selectNextQuestion(
		currentTheta: number,
		excludeIds: string[],
		totalCompletedSessions: number,
		questionOrder: number, // Đang ở câu thứ mấy
		answeredPassageIds: string[], // Passage nào đã dùng
	): Promise<FormattedQuestion | null> {
		//? Phase Check
		const isGrammarPhase = questionOrder <= GRAMMAR_PHASE_END;
		const phaseFilter = isGrammarPhase
			? { passageId: null } // Grammar phase: Q1-5
			: { passageId: { not: null as any } }; // Passage phase: Q6-20

		//? Query Database
		const rows = await this.prisma.question.findMany({
			where: {
				sourceTag: this.SOURCE_TAG,

				irtDifficulty: { not: null },
				irtDiscrimination: { not: null },
				irtGuessing: { not: null },

				deletedAt: null,
				...(excludeIds.length > 0 && { questionId: { notIn: excludeIds } }),
				...phaseFilter,
			},
			select: QuestionSelect.placementCandidate,
		});
		if (rows.length === 0) return null;

		//? Tìm active passage
		let activePassageId: string | null = null;
		if (!isGrammarPhase && answeredPassageIds.length > 0) {
			const passageCount: Record<string, number> = {}; // Đếm số câu đã hỏi cho mỗi passage
			for (const pid of answeredPassageIds) if (pid) passageCount[pid] = (passageCount[pid] ?? 0) + 1;

			const lastPassageId = answeredPassageIds[answeredPassageIds.length - 1]; // Id passage
			if (lastPassageId && (passageCount[lastPassageId] ?? 0) < MAX_QUESTIONS_PER_PASSAGE)
				activePassageId = lastPassageId;
		}

		//? Score questio: tính điểm cho từng câu
		const scored: Array<QuestionCandidate & { rowIndex: number }> = rows.map((row, idx) => {
			const irt: IrtParameters = this.extractIrtParams(row);

			const information = IrtMathUtils.calculateInformation(currentTheta, irt.a, irt.b, irt.c); // Độ phù hợp
			const exposureRate = totalCompletedSessions > 0 ? row.usageCount / totalCompletedSessions : 0; // Câu này đã dùng nhiều chưa
			const passageBoost = activePassageId && row.passageId === activePassageId ? 1.5 : 1.0;

			const penaltyFactor = exposureRate > EXPOSURE_LIMITS.maxRate ? EXPOSURE_LIMITS.penalty : 1.0;

			return {
				question: { questionId: row.questionId, passageId: row.passageId, irt, usageCount: row.usageCount },
				information,
				exposureRate,
				priority: information * penaltyFactor * passageBoost,
				rowIndex: idx,
			};
		});
		scored.sort((a, b) => b.priority - a.priority);
		const winner = scored[0];
		const winnerRow = rows[winner.rowIndex];

		this.logger.debug(
			`Question selected | q=${winnerRow.questionId} | b=${winnerRow.irtDifficulty} ` +
				`| I=${winner.information.toFixed(4)} | priority=${winner.priority.toFixed(4)} ` +
				`| θ=${currentTheta} | pool=${rows.length}`,
		);

		return this.formatQuestion(winnerRow);
	}

	//TODO 2. Ability Estimation
	/**
	 * Build an IrtResponse array from PlacementAttempt records.
	 *
	 * This combines DB rows (which have Prisma Decimal types) into
	 * the plain-number format needed by IrtMathUtils.
	 *
	 * Always pass ALL attempts from the session (not just new ones)
	 * to get the full MLE over the entire response pattern.
	 */
	buildResponses(
		attempts: Array<{
			isCorrect: boolean;
			question: {
				irtDiscrimination: any;
				irtDifficulty: any;
				irtGuessing: any;
			};
		}>,
	): IrtResponse[] {
		return attempts.map((a) => ({
			a: this.toFloat(a.question.irtDiscrimination, 1.0),
			b: this.toFloat(a.question.irtDifficulty, 0.0),
			c: this.toFloat(a.question.irtGuessing, 0.25),
			correct: a.isCorrect ? 1 : 0,
		}));
	}

	/** Run Newton-Raphson MLE to estimate theta from all responses. */
	estimateTheta(responses: IrtResponse[], currentTheta: number): number {
		return IrtMathUtils.estimateThetaMLE(responses, currentTheta);
	}

	/** Calculate SE(θ) from IRT parameters of all administered items. */
	calculateSE(theta: number, params: IrtParameters[]): number {
		return IrtMathUtils.calculateSE(theta, params);
	}

	// 3. Stopping Criteria

	/**
	 * Evaluate whether the CAT session should terminate.
	 *
	 * Priority:
	 *   1. max_questions — hard cap, always enforced first
	 *   2. se_threshold  — precision-based early stop
	 *   3. continue      — test must continue
	 */
	checkStoppingCriteria(questionsAnswered: number, se: number): StopDecision {
		if (questionsAnswered >= DEFAULT_CAT_CONFIG.maxQuestions) {
			return { shouldStop: true, reason: 'max_questions' };
		}
		if (questionsAnswered >= DEFAULT_CAT_CONFIG.minQuestions && se < DEFAULT_CAT_CONFIG.targetSe) {
			return { shouldStop: true, reason: 'se_threshold' };
		}
		return { shouldStop: false, reason: 'continue' };
	}

	// 4. CEFR Mapping

	mapToCefr(theta: number, se: number): CefrAssignment {
		return IrtMathUtils.mapThetaToCEFR(theta, se);
	}

	// 5. Helpers
	extractIrtParams(q: { irtDifficulty: any; irtDiscrimination: any; irtGuessing: any }): IrtParameters {
		return {
			a: this.toFloat(q.irtDiscrimination, 1.0),
			b: this.toFloat(q.irtDifficulty, 0.0),
			c: this.toFloat(q.irtGuessing, 0.25),
		};
	}

	formatQuestion(row: {
		questionId: string;
		passageId: string | null;
		passage: { passageId: string; title: string | null; content: string; cefrLevel: string | null } | null;
		translations: Array<{ locale: string; stemText: string | null; contentJson: any }>;
		options: Array<{
			optionId: string;
			position: number | null;
			isCorrect: boolean;
			translations: Array<{ locale: string; optionText: string | null }>;
		}>;
	}): FormattedQuestion {
		const trans = row.translations.find((t) => t.locale === 'vi') ?? row.translations[0];

		return {
			questionId: row.questionId,
			passageId: row.passageId,
			passage: row.passage ?? null,
			content: {
				stemText: trans?.stemText ?? null,
				contentJson: trans?.contentJson ?? null,
			},
			options: row.options.map((o) => {
				const optTrans = o.translations.find((t) => t.locale === 'vi') ?? o.translations[0];
				return {
					optionId: o.optionId,
					position: o.position,
					text: optTrans?.optionText ?? null,
					// isCorrect intentionally omitted
				};
			}),
		};
	}

	// Private
	private toFloat(value: any, fallback: number): number {
		const parsed = parseFloat(value?.toString());
		return isNaN(parsed) ? fallback : parsed;
	}
}
