import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	validatePlan,
	guardContext,
	WRITING_TAGS,
	completeSelection,
	runPlanPipeline,
	buildCandidatePool,
} from '../apps/api-gateway/src/modules/learning-plan/plan-pipeline';
import {
	assertStageOutput,
	callStructuredStage,
	usageSummary,
	requestFor,
} from '../apps/ai-service/src/planning/structured-plan';
import { runResearch } from './run-pilot';
const context: any = {
	cefrLevel: 'B1',
	contentTargetLevel: 'B1',
	learnerContext: {
		primaryGoal: 'communication',
		targetGoal: 'Improve writing',
		focusSkills: ['writing'],
		planSkills: ['reading', 'writing', 'speaking'],
		availableDays: ['MONDAY', 'TUESDAY', 'SUNDAY'],
		plannedStudyHoursPerWeek: 2,
		dailyMinutesLimit: 60,
	},
	skillPerformance: [{ skill: 'writing', avg: 60 }],
	recentWeaknesses: [],
	weekStartDate: '2026-09-14',
	weekEndDate: '2026-09-20',
	weekDates: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((weekday, i) => ({
		day: i + 1,
		weekday,
		date: `2026-09-${14 + i}`,
	})),
};
const details: any[] = Array.from({ length: 8 }, (_, i) => ({
	refId: `short${i}`,
	fullRefId: `full${i}`,
	itemType: 'practice_session',
	title: `Canonical ${i}`,
	description: null,
	skillName: 'writing',
	cefrLevel: 'B1',
	estimatedMinutes: 30,
}));
const item = (i = 0, patch: any = {}) =>
	({
		day: 1,
		position: 1,
		itemType: 'practice_session',
		refId: `short${i}`,
		title: 'AI title',
		description: null,
		rationale: null,
		estimatedMinutes: 1,
		skillName: 'speaking',
		...patch,
	}) as any;
const check = (items: any[], d: any[] = details, c: any = context, custom = false) => validatePlan(items, d, c, custom);
test('numeric/string day share one daily counter', () =>
	assert.equal(check([item(0), item(1, { day: '1' }), item(2), item(3, { day: '1' })]).weeklyMinutes, 60));
for (const day of [1.5, 0, 8, -1])
	test(`reject day ${day}`, () => assert.equal(check([item(0, { day })]).validatedPlanItems.length, 0));
for (const duration of [null, undefined, 0, -1, 0.5])
	test(`reject canonical duration ${duration}`, () =>
		assert.equal(check([item()], [{ ...details[0], estimatedMinutes: duration }]).validatedPlanItems.length, 0));
test('canonical title', () => assert.equal(check([item()]).validatedPlanItems[0].title, 'Canonical 0'));
test('canonical skill', () => assert.equal(check([item()]).validatedPlanItems[0].skillName, 'writing'));
test('canonical duration', () => assert.equal(check([item()]).validatedPlanItems[0].estimatedMinutes, 30));
for (const refId of ['unknown', 'full7'])
	test(`reject invalid/unselected ${refId}`, () =>
		assert.equal(check([item(0, { refId })], details.slice(0, 1)).validatedPlanItems.length, 0));
test('duplicates', () => assert.equal(check([item(), item()]).validatedPlanItems.length, 1));
test('unavailable day', () => assert.equal(check([item(0, { day: 3 })]).validatedPlanItems.length, 0));
test('Sunday non-practice', () =>
	assert.equal(
		check([item(0, { day: 7, itemType: 'lesson' })], [{ ...details[0], itemType: 'lesson' }]).validatedPlanItems
			.length,
		0,
	));
test('Sunday max two', () =>
	assert.equal(
		check(
			[0, 1, 2].map((i) => item(i, { day: 7 })),
			details.map((d) => ({ ...d, estimatedMinutes: 10 })),
		).validatedPlanItems.length,
		2,
	));
test('daily minutes', () => assert.equal(check([0, 1, 2].map((i) => item(i))).weeklyMinutes, 60));
test('weekly minutes', () =>
	assert.equal(
		check([item(0), item(1, { day: 2 }), item(2, { day: 7 })], details, {
			...context,
			learnerContext: { ...context.learnerContext, plannedStudyHoursPerWeek: 1 },
		}).weeklyMinutes,
		60,
	));
test('no Listening', () =>
	assert.equal(check([item()], [{ ...details[0], skillName: 'listening' }]).validatedPlanItems.length, 0));
test('custom disabled', () =>
	assert.equal(check([item(0, { itemType: 'custom_activity', description: 'task' })]).validatedPlanItems.length, 0));
test('baseline W empty', () => assert.doesNotThrow(() => guardContext(context, true)));
for (const [criterion, tag] of Object.entries(WRITING_TAGS))
	test(`Writing tag ${tag}`, () =>
		assert.doesNotThrow(() =>
			guardContext({ ...context, recentWeaknesses: [{ skill: 'writing', criterion, tag, score: 5 }] }, true),
		));
for (const w of [
	{ skill: 'speaking', criterion: 'Pronunciation', tag: 'speaking_pronunciation', score: 5 },
	{ skill: 'writing', criterion: 'Grammar', tag: 'grammar_articles', score: 5 },
])
	test(`reject diagnostic ${w.tag}`, () =>
		assert.throws(() => guardContext({ ...context, recentWeaknesses: [w] }, true)));
test('calendar required', () => assert.throws(() => guardContext({ ...context, weekStartDate: undefined }, true)));
test('exact N with telemetry', () => {
	const r = completeSelection(
		{ selectedContent: [{ refId: 'short0' }, { refId: 'bad' }, { refId: 'short0' }] },
		details,
		4,
	);
	assert.equal(r.selected.length, 4);
	assert.equal(r.fillCount, 3);
	assert.deepEqual(r.invalidRefIds, ['bad']);
	assert.deepEqual(r.duplicateRefIds, ['short0']);
});
test('strict schema rejects extras/missing fields', () => {
	assert.throws(() => assertStageOutput('selector', { selectedContent: [{ refId: 'a', reason: 'bad' }] }));
	assert.throws(() => assertStageOutput('planner', { planItems: [{ day: 1 }] }));
});
const catalog = { lessons: [], questionSets: details.map((d) => ({ ...d, questionSetId: d.fullRefId })), details };
test('incomplete details fails', async () => {
	await assert.rejects(
		runPlanPipeline(
			{ context, ...catalog },
			{
				mode: 'research',
				allowCustomActivity: false,
				selectorSeed: 1,
				plannerSeed: 1,
				selectionTarget: 2,
				select: async () => ({ selectedContent: [] }),
				generate: async () => ({ planItems: [] }),
				resolveDetails: async () => [],
			},
		),
	);
});
test('pool independent of W and row order', () =>
	assert.deepEqual(
		buildCandidatePool([], catalog.questionSets, 'B1', ['writing'], context.learnerContext.planSkills),
		buildCandidatePool(
			[],
			catalog.questionSets.slice().reverse(),
			'B1',
			['writing'],
			context.learnerContext.planSkills,
		),
	));
test('missing usage null', () => {
	const u = usageSummary('planner', {});
	assert.equal(u.promptTokens, null);
	assert.equal(u.completionTokens, null);
	assert.equal(u.totalTokens, null);
	assert.equal(u.estimatedCostUsd, null);
});
test('reasoning not double billed', () => {
	const a = { prompt_tokens: 100, completion_tokens: 100 };
	assert.equal(
		usageSummary('planner', a).estimatedCostUsd,
		usageSummary('planner', { ...a, completion_tokens_details: { reasoning_tokens: 90 } }).estimatedCostUsd,
	);
});
test('failed attempts observable, seed/config stable, SDK retries disabled', async () => {
	const calls: any[] = [],
		logs: any[] = [];
	const client = {
		chat: {
			completions: {
				create: async (req: any, opts: any) => {
					calls.push({ req, opts });
					if (calls.length === 1) throw Object.assign(Error('rate'), { status: 429 });
					return { choices: [{ finish_reason: 'stop', message: { content: '{"selectedContent":[]}' } }] };
				},
			},
		},
	};
	await callStructuredStage(
		client,
		'selector',
		{ ...context, goals: context.learnerContext, seed: 123 },
		{
			record: (a) => {
				logs.push(a);
			},
			sleep: async () => {},
		},
	);
	assert.equal(logs.length, 2);
	assert.equal(logs[0].transportStatus, 'failed');
	assert.deepEqual(calls[0], calls[1]);
	assert.equal(calls[0].opts.maxRetries, 0);
	assert.equal(calls[0].req.seed, 123);
});
test('schema failure not retried', async () => {
	const logs: any[] = [];
	await assert.rejects(
		callStructuredStage(
			{
				chat: {
					completions: {
						create: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }),
					},
				},
			},
			'selector',
			{},
			{
				record: (a) => {
					logs.push(a);
				},
			},
		),
	);
	assert.equal(logs.length, 1);
	assert.equal(logs[0].schemaStatus, 'failed');
});
test('research seeds reach both stages; no learner capabilities', async () => {
	const requests: any[] = [],
		attempts: any[] = [],
		runs: any[] = [];
	const client = {
		chat: {
			completions: {
				create: async (req: any) => {
					requests.push(req);
					const body =
						req.model === 'openai/gpt-oss-20b'
							? { selectedContent: [] }
							: { planItems: [item(0, { refId: 'full0' })] };
					return { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(body) } }] };
				},
			},
		},
	};
	const input = {
		synthetic: true,
		persist: false,
		context,
		catalog,
		meta: { experimentId: 'pilot', runId: 'one', pairId: 'p', profileId: 'x', condition: 'baseline', repeat: 1 },
		config: { selectorSeed: 71, plannerSeed: 72, selectionTarget: 2 },
	};
	const result = await runResearch(
		input,
		client,
		(a) => {
			attempts.push(a);
		},
		(r) => {
			runs.push(r);
		},
	);
	assert.equal(result.pipelineStatus, 'success');
	assert.equal(requests[0].seed, 71);
	assert.equal(requests[1].seed, 72);
	assert.equal(requests.length, 2);
	assert.equal(runs.length, 1);
	// No Nest service/Prisma/queue/Azure object is supplied or constructed by this path.
	await assert.rejects(
		runResearch(
			{ ...input, persist: true },
			client,
			() => {},
			() => {},
		),
	);
	assert.equal(requests.length, 2);
});
test('prompt parity both stages only weakness block differs', () => {
	for (const stage of ['selector', 'planner'] as const) {
		const a: any = { ...context, goals: context.learnerContext, candidates: [], selectedContent: [], seed: 7 };
		const b = {
			...a,
			recentWeaknesses: [
				{
					skill: 'writing',
					criterion: 'Task Response',
					tag: 'writing_task_response',
					score: 5,
					severity: 'high',
				},
			],
		};
		const mask = (s: string) =>
			s.replace(
				/DIAGNOSTIC WEAKNESSES:[\s\S]*?(?=\n\s*(?:CANDIDATE CONTENT|SELECTED CONTENT|WEEK|SCHEDUL|PLAN))/,
				'DIAGNOSTIC WEAKNESSES: MASK\n',
			);
		assert.equal(
			mask(String(requestFor(stage, a).messages[1].content)),
			mask(String(requestFor(stage, b).messages[1].content)),
		);
	}
});
