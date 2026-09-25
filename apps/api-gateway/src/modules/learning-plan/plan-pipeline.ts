import { createHash } from 'crypto';
import { assertStageOutput } from '../../../../ai-service/src/planning/structured-plan';
import type { AiPlanItem } from './interface/ai-plan-item.interface';
import type { PlanContext } from './interface/plan-context.interface';
import type { PlanContentCandidate, PlanSelectedContentDetail } from './interface/plan-content-candidate.interface';
export const validDuration = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const truncateText = (s: string, n: number) => s.slice(0, n);
export const WRITING_TAGS = {
	'Task Response': 'writing_task_response',
	'Coherence & Cohesion': 'writing_coherence_cohesion',
	'Lexical Resource': 'writing_vocabulary_range',
	'Grammatical Range & Accuracy': 'writing_grammar_accuracy',
};
export function guardContext(context: PlanContext, research: boolean) {
	const start = Date.parse(context.weekStartDate + 'T00:00:00Z');
	if (!Number.isFinite(start) || new Date(start).getUTCDay() !== 1 || context.weekDates?.length !== 7)
		throw Error('Explicit Monday calendar required');
	const names = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
	context.weekDates.forEach((d, i) => {
		if (
			d.day !== i + 1 ||
			d.weekday !== names[i] ||
			d.date !== new Date(start + i * 86400000).toISOString().slice(0, 10)
		)
			throw Error('Invalid injected calendar');
	});
	if (context.weekEndDate !== context.weekDates[6].date) throw Error('Invalid week end');
	const c = context.learnerContext;
	if (
		!c.availableDays.length ||
		new Set(c.availableDays).size !== c.availableDays.length ||
		c.availableDays.some((d) => !names.includes(d)) ||
		!Number.isFinite(c.dailyMinutesLimit) ||
		c.dailyMinutesLimit <= 0 ||
		!Number.isFinite(c.plannedStudyHoursPerWeek) ||
		c.plannedStudyHoursPerWeek <= 0
	)
		throw Error('Invalid schedule constraints');
	if (c.planSkills.some((s) => !['reading', 'writing', 'speaking'].includes(s)))
		throw Error('Unsupported plan skill');
	if (
		research &&
		(!Array.isArray(context.recentWeaknesses) ||
			context.recentWeaknesses.some(
				(w) =>
					w.skill !== 'writing' ||
					WRITING_TAGS[w.criterion] !== w.tag ||
					!Object.hasOwn(WRITING_TAGS, w.criterion) ||
					typeof w.score !== 'number' ||
					!Number.isFinite(w.score) ||
					w.score < 0 ||
					w.score >= 6.5,
			))
	)
		throw Error('Research accepts only valid Writing criterion weaknesses');
}
export function completeSelection(raw: any, pool: PlanContentCandidate[], n: number) {
	const selected: PlanContentCandidate[] = [];
	const seen = new Set<string>();
	const invalidRefIds: string[] = [];
	const duplicateRefIds: string[] = [];
	const refs = raw?.selectedContent ?? [];
	for (const i of refs) {
		const c = pool.find((c) => c.refId === i.refId);
		if (!c) {
			invalidRefIds.push(i.refId);
			continue;
		}
		if (seen.has(i.refId)) {
			duplicateRefIds.push(i.refId);
			continue;
		}
		seen.add(i.refId);
		if (selected.length < n) selected.push(c);
	}
	const before = selected.length;
	for (const c of pool) if (selected.length < n && !selected.some((s) => s.refId === c.refId)) selected.push(c);
	return {
		selected,
		rawSelectedCount: refs.length,
		invalidRefIds,
		duplicateRefIds,
		fillCount: selected.length - before,
	};
}
export interface PipelineOptions {
	mode: 'production' | 'research';
	allowCustomActivity: boolean;
	selectionTarget?: number;
	selectorSeed?: number;
	plannerSeed?: number;
	resolveDetails: (selected: PlanContentCandidate[]) => Promise<PlanSelectedContentDetail[]>;
	select: (payload: any) => Promise<any>;
	generate: (payload: any) => Promise<any>;
}
// Capability boundary: no Prisma, queue, grading, review or persistence dependency.
export async function runPlanPipeline(
	input: { context: PlanContext; lessons: any[]; questionSets: any[] },
	options: PipelineOptions,
) {
	const context = structuredClone(input.context);
	const research = options.mode === 'research';
	guardContext(context, research);
	if (research && (!Number.isInteger(options.selectorSeed) || !Number.isInteger(options.plannerSeed)))
		throw Error('Explicit stage seeds required');
	const candidatePool = buildCandidatePool(
		input.lessons.filter((i) => validDuration(i.estimatedMinutes)),
		input.questionSets.filter((i) => validDuration(i.estimatedMinutes)),
		context.contentTargetLevel,
		context.learnerContext.focusSkills,
		context.learnerContext.planSkills,
		24,
	);
	if (!candidatePool.length) throw Error('Empty valid candidate pool');
	if (new Set(candidatePool.map((c) => c.fullRefId)).size !== candidatePool.length)
		throw Error('Ambiguous catalog IDs');
	const n =
		options.selectionTarget ??
		Math.min(candidatePool.length, Math.max(6, Math.min(10, context.learnerContext.availableDays.length * 2)));
	if (!Number.isInteger(n) || n < 1 || n > candidatePool.length) throw Error('Invalid selection target');
	const result: any = {
		candidatePool,
		candidatePoolHash: hash(candidatePool),
		rawSelectorOutput: null,
		rawPlannerOutput: null,
		transportFallbackUsed: false,
		pipelineStatus: 'pending',
		selectedContentDetails: [],
		validatedPlanItems: [],
		rejections: [],
		normalizations: [],
	};
	const common = {
		cefrLevel: context.cefrLevel,
		contentTargetLevel: context.contentTargetLevel,
		goals: context.learnerContext,
		skillPerformance: context.skillPerformance,
		recentWeaknesses: context.recentWeaknesses,
	};
	try {
		try {
			result.rawSelectorOutput = await options.select({
				...common,
				selectionTarget: n,
				candidates: candidatePool.map(({ fullRefId, ...i }) => i),
				seed: options.selectorSeed,
			});
			assertStageOutput('selector', result.rawSelectorOutput);
		} catch (e) {
			if ((e as any).transportFailure !== true) throw e;
			result.transportFallbackUsed = true;
		}
		const selection = completeSelection(result.rawSelectorOutput, candidatePool, n);
		Object.assign(result, selection);
		result.validatedSelection = selection.selected;
		const details = await options.resolveDetails(selection.selected);
		if (
			details.length !== n ||
			details.some(
				(d, i) =>
					d.fullRefId !== selection.selected[i].fullRefId ||
					d.refId !== selection.selected[i].refId ||
					!validDuration(d.estimatedMinutes) ||
					!d.title ||
					d.itemType !== selection.selected[i].itemType ||
					d.skillName !== selection.selected[i].skillName ||
					d.estimatedMinutes !== selection.selected[i].estimatedMinutes,
			)
		)
			throw Error('Exactly N complete canonical details required');
		result.selectedContentDetails = details;
		result.rawPlannerOutput = await options.generate({
			...common,
			weekStartDate: context.weekStartDate,
			weekEndDate: context.weekEndDate,
			weekDates: context.weekDates,
			dailyMinutesLimit: context.learnerContext.dailyMinutesLimit,
			selectedContent: details.map(({ fullRefId, ...i }) => i),
			seed: options.plannerSeed,
			allowCustomActivity: options.allowCustomActivity,
		});
		assertStageOutput('planner', result.rawPlannerOutput, options.allowCustomActivity);
		Object.assign(
			result,
			validatePlan(result.rawPlannerOutput.planItems, details, context, options.allowCustomActivity),
		);
		if (!result.validatedPlanItems.length) throw Error('No valid plan items');
		result.pipelineStatus = 'success';
		return result;
	} catch (e) {
		result.pipelineStatus = 'failed';
		result.failure = String((e as Error).message);
		throw Object.assign(Error(result.failure), { result });
	}
}
export function hash(value: unknown): string {
	return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function validatePlan(
	rawItems: AiPlanItem[],
	selectedContentDetails: PlanSelectedContentDetail[],
	context: PlanContext,
	allowCustomActivity = true,
) {
	const { planSkills, availableDays, dailyMinutesLimit, plannedStudyHoursPerWeek } = context.learnerContext;
	const shortToFullMap = new Map(selectedContentDetails.map((i) => [i.refId, i.fullRefId]));
	const rejections: any[] = [];
	const normalizations: any[] = [];
	const weekdayByDay: Record<number, string> = {
		1: 'MONDAY',
		2: 'TUESDAY',
		3: 'WEDNESDAY',
		4: 'THURSDAY',
		5: 'FRIDAY',
		6: 'SATURDAY',
		7: 'SUNDAY',
	};

	const allowedSkills = new Set(planSkills);
	const selectedContentByFullId = new Map(selectedContentDetails.map((item) => [item.fullRefId, item]));
	const selectedRefIds = new Set<string>();
	const dayTaskCount = new Map<number, number>();
	const dayMinutes = new Map<number, number>();
	const weeklyMinutesLimit = plannedStudyHoursPerWeek * 60;
	let weeklyMinutes = 0;
	const normalizedAiItems: AiPlanItem[] = [];

	for (const [index, rawItem] of rawItems.entries()) {
		const reject = (reason: string) => rejections.push({ index, reason });
		const day = Number(rawItem.day);
		if (!Number.isInteger(day) || day < 1 || day > 7) {
			reject(`Skipping item with invalid day: ${rawItem.day}`);
			continue;
		}

		const itemType = String(rawItem.itemType ?? '');
		if (!['lesson', 'practice_session', 'custom_activity'].includes(itemType)) {
			reject(`Skipping invalid itemType: ${itemType}`);
			continue;
		}

		const weekday = weekdayByDay[day];
		if (!availableDays.includes(weekday)) {
			reject(`Skipping item on unavailable day: day=${rawItem.day} weekday=${weekday}`);
			continue;
		}

		// Clone before normalization so the raw AI result is not mutated.
		const item: AiPlanItem = { ...rawItem, day };

		if (itemType === 'custom_activity') {
			if (!allowCustomActivity) {
				reject('Custom activities disabled');
				continue;
			}
			item.refId = null;
			item.title = String(item.title ?? '').trim();
			item.description = item.description ? String(item.description).trim() : null;
			if (!item.title || !item.description) {
				reject('Skipping custom activity missing title or description');
				continue;
			}
		} else {
			if (!item.refId) {
				reject(`Skipping item missing refId: "${item.title}"`);
				continue;
			}

			const rawRefId = String(item.refId).trim();
			const fullId = String(shortToFullMap.get(rawRefId) ?? rawRefId).trim();
			const selectedContent = selectedContentByFullId.get(fullId);
			if (!selectedContent) {
				reject(`Skipping unknown/unselected refId: "${fullId}" (${item.title})`);
				continue;
			}

			if (selectedContent.itemType !== itemType) {
				reject(
					`Skipping refId with mismatched itemType: ${fullId} | ai=${itemType} | actual=${selectedContent.itemType}`,
				);
				continue;
			}

			if (selectedRefIds.has(fullId)) {
				reject(`Skipping duplicate refId in generated plan: "${fullId}" (${item.title})`);
				continue;
			}

			// Database metadata is authoritative for persisted content tasks. This prevents
			// the model from changing skill or duration to bypass deterministic constraints.
			item.refId = fullId;
			item.title = selectedContent.title;
			item.description = null;
			item.skillName = selectedContent.skillName;
			if (!validDuration(selectedContent.estimatedMinutes)) {
				reject('Invalid canonical duration');
				continue;
			}
			item.estimatedMinutes = selectedContent.estimatedMinutes!;
		}

		const itemSkill = item.skillName ? String(item.skillName).toLowerCase() : null;
		if (!itemSkill || !allowedSkills.has(itemSkill)) {
			reject(`Skipping item outside allowed plan skills: ${item.title} | skill=${item.skillName}`);
			continue;
		}
		item.skillName = itemSkill;

		if (item.day === 7 && item.itemType !== 'practice_session') {
			reject(`Skipping Sunday non-practice item: ${item.title}`);
			continue;
		}

		const currentCount = dayTaskCount.get(item.day) ?? 0;
		const maxTasks = item.day === 7 ? 2 : 4;
		if (currentCount >= maxTasks) {
			reject(`Skipping item because day limit reached: day=${item.day}`);
			continue;
		}

		const currentMinutes = dayMinutes.get(item.day) ?? 0;
		const itemMinutes = Number(item.estimatedMinutes ?? 0);
		if (!Number.isFinite(itemMinutes) || itemMinutes <= 0) {
			reject(`Skipping item with invalid estimatedMinutes: ${item.title} | minutes=${item.estimatedMinutes}`);
			continue;
		}
		if (currentMinutes + itemMinutes > dailyMinutesLimit) {
			reject(
				`Skipping item because daily minutes limit reached: day=${item.day} current=${currentMinutes} item=${itemMinutes} limit=${dailyMinutesLimit}`,
			);
			continue;
		}
		if (weeklyMinutes + itemMinutes > weeklyMinutesLimit) {
			reject(
				`Skipping item because weekly minutes limit reached: current=${weeklyMinutes} item=${itemMinutes} limit=${weeklyMinutesLimit}`,
			);
			continue;
		}

		item.position = currentCount + 1;
		dayTaskCount.set(item.day, currentCount + 1);
		dayMinutes.set(item.day, currentMinutes + itemMinutes);
		weeklyMinutes += itemMinutes;
		if (item.refId) selectedRefIds.add(String(item.refId));
		normalizedAiItems.push(item);
		if (JSON.stringify(rawItem) !== JSON.stringify(item))
			normalizations.push({ index, before: rawItem, after: item });
	}

	const finalExecutable = normalizedAiItems.length > 0;
	const rawConstraintCompliant = finalExecutable && rejections.length === 0;

	return {
		validatedPlanItems: normalizedAiItems,
		rejections,
		normalizations,
		hardConstraintResult: {
			// Legacy compatibility: `passed` continues to mean that validation
			// produced at least one executable task. Research analysis must use
			// `rawConstraintCompliant` for all-hard-rules compliance.
			passed: finalExecutable,
			finalExecutable,
			rawConstraintCompliant,
			rejectedCount: rejections.length,
		},
		weeklyMinutes,
		weeklyMinutesLimit,
	};
}
export function buildCandidatePool(
	lessons: any[],
	questionSets: any[],
	cefrLevel: string,
	focusSkills: string[],
	planSkills: string[],
	maxCandidates = 24,
): PlanContentCandidate[] {
	const usedShortIds = new Set<string>();
	const toShortRefId = (fullRefId: string) => {
		for (const length of [8, 12, 16, 24, 36]) {
			const candidate = fullRefId.slice(0, length);
			if (!usedShortIds.has(candidate)) {
				usedShortIds.add(candidate);
				return candidate;
			}
		}
		usedShortIds.add(fullRefId);
		return fullRefId;
	};

	const all: PlanContentCandidate[] = [
		...lessons.map((lesson: any) => ({
			refId: '',
			fullRefId: String(lesson.lessonId),
			itemType: 'lesson' as const,
			title: String(lesson.title ?? ''),
			description: lesson.description ? truncateText(String(lesson.description), 180) : null,
			skillName: String(lesson.skillName ?? '').toLowerCase(),
			cefrLevel: lesson.cefrLevel ? String(lesson.cefrLevel) : null,
			estimatedMinutes: lesson.estimatedMinutes != null ? Number(lesson.estimatedMinutes) : null,
		})),
		...questionSets.map((questionSet: any) => ({
			refId: '',
			fullRefId: String(questionSet.questionSetId),
			itemType: 'practice_session' as const,
			title: String(questionSet.title ?? ''),
			description: questionSet.description ? truncateText(String(questionSet.description), 180) : null,
			skillName: String(questionSet.skillName ?? '').toLowerCase(),
			cefrLevel: questionSet.cefrLevel ? String(questionSet.cefrLevel) : null,
			estimatedMinutes: questionSet.estimatedMinutes != null ? Number(questionSet.estimatedMinutes) : null,
		})),
	];

	const focusSet = new Set(focusSkills);
	const skillOrder = new Map(planSkills.map((skill, index) => [skill, index]));
	all.sort((a, b) => {
		const aFocus = focusSet.has(a.skillName) ? 0 : 1;
		const bFocus = focusSet.has(b.skillName) ? 0 : 1;
		if (aFocus !== bFocus) return aFocus - bFocus;

		const aExact = a.cefrLevel === cefrLevel ? 0 : 1;
		const bExact = b.cefrLevel === cefrLevel ? 0 : 1;
		if (aExact !== bExact) return aExact - bExact;

		const aSkill = skillOrder.get(a.skillName) ?? 999;
		const bSkill = skillOrder.get(b.skillName) ?? 999;
		if (aSkill !== bSkill) return aSkill - bSkill;

		if (a.itemType !== b.itemType) return a.itemType.localeCompare(b.itemType);
		return a.fullRefId.localeCompare(b.fullRefId);
	});

	// Round-robin by skill AND content type so a large lesson catalog does not starve
	// practice sessions (important for Sunday and for balanced plan construction).
	const orderedSkills = [
		...focusSkills.filter((skill, index, arr) => arr.indexOf(skill) === index && planSkills.includes(skill)),
		...planSkills.filter((skill) => !focusSet.has(skill)),
	];
	const bucketKeys = orderedSkills.flatMap((skill) => [`${skill}|lesson`, `${skill}|practice_session`]);
	const buckets = new Map<string, PlanContentCandidate[]>(bucketKeys.map((key) => [key, []]));
	for (const item of all) {
		const key = `${item.skillName}|${item.itemType}`;
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key)!.push(item);
	}

	const selected: PlanContentCandidate[] = [];
	let madeProgress = true;
	while (selected.length < maxCandidates && madeProgress) {
		madeProgress = false;
		for (const key of bucketKeys) {
			const bucket = buckets.get(key) ?? [];
			const next = bucket.shift();
			if (!next) continue;
			selected.push(next);
			madeProgress = true;
			if (selected.length >= maxCandidates) break;
		}
	}

	return selected.map((item) => ({ ...item, refId: toShortRefId(item.fullRefId) }));
}
