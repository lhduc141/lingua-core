import { appendFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { Groq } from 'groq-sdk';
import { runPlanPipeline, guardContext } from '../apps/api-gateway/src/modules/learning-plan/plan-pipeline';
import { callStructuredStage, MODELS } from '../apps/ai-service/src/planning/structured-plan';

export async function runResearch(
	input: any,
	client: any,
	recordAttempt: (a: any) => void | Promise<void>,
	recordRun: (r: any) => void | Promise<void>,
) {
	const { context, catalog, meta, config } = input;
	// Fail before constructing any pipeline work or making any provider request.
	if (input.persist !== false || input.synthetic !== true) throw Error('Synthetic persist=false input required');
	if (
		!meta ||
		!['baseline', 'proposed'].includes(meta.condition) ||
		!['experimentId', 'runId', 'pairId', 'profileId'].every((k) => typeof meta[k] === 'string' && meta[k]) ||
		!Number.isInteger(meta.repeat)
	)
		throw Error('Invalid research identifiers');
	guardContext(context, true);
	if (meta.condition === 'baseline' && context.recentWeaknesses.length !== 0) throw Error('Baseline W must be empty');
	if (meta.condition === 'proposed' && context.recentWeaknesses.length !== 1)
		throw Error('Proposed requires exactly one Writing weakness');
	if (!Number.isInteger(config.selectorSeed) || !Number.isInteger(config.plannerSeed)) throw Error('Seeds required');
	if (!Array.isArray(catalog.lessons) || !Array.isArray(catalog.questionSets) || !Array.isArray(catalog.details))
		throw Error('Injected catalog required');
	const start = Date.now();
	const attempts: any[] = [];
	const result: any = {
		...meta,
		P: context.cefrLevel,
		C: context.learnerContext,
		R: context.skillPerformance,
		W: context.recentWeaknesses,
		weekStartDate: context.weekStartDate,
		weekEndDate: context.weekEndDate,
		selectorSeed: config.selectorSeed,
		plannerSeed: config.plannerSeed,
		models: MODELS,
		modelConfig: {
			temperature: 0.2,
			n: 1,
			stream: false,
			include_reasoning: false,
			reasoning_effort: 'low',
			responseFormat: 'json_schema strict=true',
			selectorMaxTokens: 2000,
			plannerMaxTokens: 4096,
			maxRetries: config.maxRetries ?? 2,
			timeoutMs: config.timeoutMs ?? 60000,
		},
		startedAt: new Date(start).toISOString(),
		failure: null,
		rawSelectorOutput: null,
		rawPlannerOutput: null,
		validatedSelection: [],
		rawSelectedCount: 0,
		fillCount: 0,
		hardConstraintResult: null,
		rejections: [],
		normalizations: [],
		candidatePool: [],
		candidatePoolHash: null,
	};
	const stage = (name: 'selector' | 'planner', payload: any) =>
		callStructuredStage(client, name, payload, {
			maxRetries: config.maxRetries,
			timeoutMs: config.timeoutMs,
			backoffMs: config.backoffMs,
			record: async (a) => {
				attempts.push(a);
				await recordAttempt({ ...meta, ...a });
			},
		});
	try {
		Object.assign(
			result,
			await runPlanPipeline(
				{ context, lessons: catalog.lessons, questionSets: catalog.questionSets },
				{
					mode: 'research',
					allowCustomActivity: false,
					selectionTarget: config.selectionTarget,
					selectorSeed: config.selectorSeed,
					plannerSeed: config.plannerSeed,
					resolveDetails: async (selected) =>
						selected.flatMap((c) => {
							const detail = catalog.details.find((d) => d.fullRefId === c.fullRefId);
							return detail ? [{ ...detail, refId: c.refId }] : [];
						}),
					select: (p) => stage('selector', p),
					generate: (p) => stage('planner', p),
				},
			),
		);
	} catch (e) {
		Object.assign(result, e.result ?? { pipelineStatus: 'failed', failure: String(e.message) });
	}
	result.callAttemptReferences = attempts.map((a) => a.id);
	result.stageLatency = Object.fromEntries(
		['selector', 'planner'].map((s) => [
			s,
			attempts.filter((a) => a.stage === s).reduce((n, a) => n + a.elapsedMs, 0),
		]),
	);
	for (const key of [
		'promptTokens',
		'cachedPromptTokens',
		'completionTokens',
		'reasoningTokens',
		'totalTokens',
		'estimatedCostUsd',
	])
		result[key] =
			attempts.length && attempts.every((a) => a[key] != null) ? attempts.reduce((n, a) => n + a[key], 0) : null;
	result.finishedAt = new Date().toISOString();
	result.runLatencyMs = Date.now() - start;
	result.invalidRefs = result.invalidRefIds ?? [];
	result.duplicates = result.duplicateRefIds ?? [];
	result.fallbackUsed = result.transportFallbackUsed ?? false;
	result.validatedPlan = result.validatedPlanItems ?? [];
	await recordRun(result);
	return result;
}
async function main() {
	const [file, out, flag] = process.argv.slice(2);
	if (!file || !out || flag !== '--allow-provider-pilot')
		throw Error('Usage: tsx research/run-pilot.ts INPUT.json OUTPUT.jsonl --allow-provider-pilot');
	if (existsSync(out) || existsSync(out + '.calls.jsonl')) throw Error('Output exists; choose a fresh pilot path');
	const input = JSON.parse(readFileSync(file, 'utf8'));
	if (!process.env.GROQ_API_KEY) throw Error('Set GROQ_API_KEY externally; no .env files are loaded');
	mkdirSync(dirname(out), { recursive: true });
	const client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 60000 });
	const result = await runResearch(
		input,
		client,
		(a) => appendFileSync(out + '.calls.jsonl', JSON.stringify(a) + '\n'),
		(r) => appendFileSync(out, JSON.stringify(r) + '\n'),
	);
	if (result.pipelineStatus !== 'success') process.exitCode = 1;
}
if (require.main === module)
	main().catch((e) => {
		console.error(e.message);
		process.exitCode = 1;
	});
