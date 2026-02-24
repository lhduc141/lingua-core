import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { IrtMathUtils } from '../utils/irt-math.utils';
import { CatQuestion } from '../interface/cat-question.interface';
import { FormattedQuestion } from '../interface/formatted-question.interface';
import { QuestionCandidate } from '../interface/question-candidate.interface';
import { StopDecision } from '../interface/stop-decision.interface';
import { EXPOSURE_LIMITS } from '@app/shared/constants/exposure-limit.constant';
import { IrtParameters } from '../interface/irt-parameters.interface';
import { IrtResponse } from '../interface/irt-response.interface';
import { DEFAULT_CAT_CONFIG } from '@app/shared/constants/default-cat-config.constant';
import { CefrAssignment } from '../interface/cefr-assignment.inteface';

@Injectable()
export class CatEngineService {
	private readonly logger = new Logger(CatEngineService.name);

	private readonly SOURCE_TAG = 'placement_test_v1';

	constructor(private readonly prisma: PrismaService) {}

	// ─────────────────────────────────────────────────────────
	// 1. Question Selection
	// ─────────────────────────────────────────────────────────

	/**
	 * Select the most informative unadministered question at the current theta estimate.
	 *
	 * Algorithm:
	 *   1. Load all eligible questions from DB (sourceTag, IRT params not null, not deleted)
	 *   2. Exclude questions already answered in this session
	 *   3. For each candidate: score = Fisher Information * exposure penalty
	 *      - exposure_rate = usageCount / totalCompletedSessions
	 *      - if exposure_rate > EXPOSURE_LIMITS.maxRate → multiply score by EXPOSURE_LIMITS.penalty
	 *   4. Sort descending by score → pick first
	 *   5. Format for API response (locale-preferred text, no isCorrect)
	 *
	 * Returns null if no eligible questions remain (edge case: pool exhausted).
	 */
	async selectNextQuestion(
		currentTheta: number,
		excludeIds: string[],
		totalCompletedSessions: number,
	): Promise<FormattedQuestion | null> {
		const rows = await this.prisma.question.findMany({
			where: {
				sourceTag: this.SOURCE_TAG,
				irtDifficulty: { not: null },
				irtDiscrimination: { not: null },
				irtGuessing: { not: null },
				deletedAt: null,
				...(excludeIds.length > 0 && { questionId: { notIn: excludeIds } }),
			},
			select: {
				questionId: true,
				passageId: true,
				usageCount: true,
				irtDifficulty: true,
				irtDiscrimination: true,
				irtGuessing: true,
				passage: {
					select: {
						passageId: true,
						title: true,
						content: true,
						cefrLevel: true,
					},
				},
				translations: {
					select: { locale: true, stemText: true, contentJson: true },
				},
				options: {
					where: { deletedAt: null },
					orderBy: { position: 'asc' },
					select: {
						optionId: true,
						position: true,
						isCorrect: true,
						translations: {
							select: { locale: true, optionText: true },
						},
					},
				},
			},
		});

		if (rows.length === 0) {
			this.logger.warn(`No eligible questions found | theta=${currentTheta} | excludeCount=${excludeIds.length}`);
			return null;
		}

		// Score all candidates
		const scored: Array<QuestionCandidate & { rowIndex: number }> = rows.map((row, idx) => {
			const irt: IrtParameters = this.extractIrtParams(row);
			const catQ: CatQuestion = {
				questionId: row.questionId,
				passageId: row.passageId,
				irt,
				usageCount: row.usageCount,
			};
			const information = IrtMathUtils.calculateInformation(currentTheta, irt.a, irt.b, irt.c);
			const exposureRate = totalCompletedSessions > 0 ? row.usageCount / totalCompletedSessions : 0;
			const penaltyFactor = exposureRate > EXPOSURE_LIMITS.maxRate ? EXPOSURE_LIMITS.penalty : 1.0;

			return {
				question: catQ,
				information,
				exposureRate,
				priority: information * penaltyFactor,
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

	// ─────────────────────────────────────────────────────────
	// 2. Ability Estimation
	// ─────────────────────────────────────────────────────────

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
			correct: (a.isCorrect ? 1 : 0) as 0 | 1,
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

	// ─────────────────────────────────────────────────────────
	// 3. Stopping Criteria
	// ─────────────────────────────────────────────────────────

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

	// ─────────────────────────────────────────────────────────
	// 4. CEFR Mapping
	// ─────────────────────────────────────────────────────────

	mapToCefr(theta: number, se: number): CefrAssignment {
		return IrtMathUtils.mapThetaToCEFR(theta, se);
	}

	// ─────────────────────────────────────────────────────────
	// 5. Helpers
	// ─────────────────────────────────────────────────────────

	/**
	 * Extract IrtParameters from any object that has the three Prisma Decimal fields.
	 * Used when recalculating SE from PlacementAttempt records.
	 */
	extractIrtParams(q: { irtDifficulty: any; irtDiscrimination: any; irtGuessing: any }): IrtParameters {
		return {
			a: this.toFloat(q.irtDiscrimination, 1.0),
			b: this.toFloat(q.irtDifficulty, 0.0),
			c: this.toFloat(q.irtGuessing, 0.25),
		};
	}

	/**
	 * Format a raw DB question row into FormattedQuestion for API response.
	 *
	 * Locale selection: prefer 'vi', fall back to first available translation.
	 * Security: `isCorrect` is stripped from options before returning.
	 */
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

	// ─────────────────────────────────────────────────────────
	// Private
	// ─────────────────────────────────────────────────────────

	private toFloat(value: any, fallback: number): number {
		const parsed = parseFloat(value?.toString());
		return isNaN(parsed) ? fallback : parsed;
	}
}
