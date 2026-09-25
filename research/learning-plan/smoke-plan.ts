import 'dotenv/config';

import { Test } from '@nestjs/testing';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { AiClientModule, AiClientService } from '@app/ai-client';
import { BullmqService } from '@app/bullmq';

import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningPlanService } from '../../apps/api-gateway/src/modules/learning-plan/learning-plan.service';

const DEFAULT_USER_ID = 'eb3f7286-82c1-47c3-8af5-878456b5525c';

function toPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

async function main() {
	const userId = process.argv[2] || DEFAULT_USER_ID;

	const startedAt = new Date();

	console.log('='.repeat(72));
	console.log('LinguaPanda Learning-Plan Smoke Test');
	console.log('='.repeat(72));
	console.log(`userId    : ${userId}`);
	console.log(`startedAt : ${startedAt.toISOString()}`);
	console.log('');

	/*
	 * We intentionally do NOT boot ApiGatewayModule here.
	 *
	 * This keeps the smoke runner independent from:
	 * - HTTP server
	 * - frontend
	 * - Google OAuth
	 * - JWT
	 *
	 * BullMQ is replaced with a no-op dependency because generatePlan()
	 * itself does not require a queue worker.
	 */
	const moduleRef = await Test.createTestingModule({
		imports: [
			PrismaModule,
			AiClientModule,
		],
		providers: [
			{
				provide: BullmqService,
				useValue: {
					registerWorker: () => undefined,
				},
			},
			{
				provide: LearningPlanService,
				inject: [
					PrismaService,
					AiClientService,
					BullmqService,
				],
				useFactory: (
					prisma: PrismaService,
					aiClient: AiClientService,
					bullmq: BullmqService,
				) => {
					return new LearningPlanService(
						prisma,
						aiClient,
						bullmq,
					);
				},
			},
		],
	}).compile();	

	const prisma = moduleRef.get(PrismaService);
	const planService = moduleRef.get(LearningPlanService);

	try {
		const aiLogsBefore = await prisma.aiCallLog.count();

		console.log(`[before] ai_call_logs = ${aiLogsBefore}`);
		console.log('');
		console.log('Generating one learning plan...');
		console.log('');

		const result = await planService.generatePlan(userId, {});

		const finishedAt = new Date();

		console.log('');
		console.log('Plan generation returned successfully.');
		console.dir(result, { depth: null });

		const data = result.data as any;

		if (!data?.aiTraceId) {
			throw new Error(
				'generatePlan() succeeded but did not return aiTraceId.',
			);
		}

		const aiTraceId = String(data.aiTraceId);

		/*
		 * Read only the compact usage fields here.
		 * Exact prompt/response remain available in ai_call_logs.
		 */
		const aiCalls = await prisma.aiCallLog.findMany({
			where: {
				correlationId: aiTraceId,
				feature: 'learning_plan',
				deletedAt: null,
			},
			orderBy: [
				{ createdAt: 'asc' },
				{ attemptIndex: 'asc' },
			],
			select: {
				aiCallLogId: true,
				correlationId: true,
				feature: true,
				stage: true,
				provider: true,
				model: true,
				status: true,
				attemptIndex: true,
				credentialSlot: true,

				promptTokens: true,
				cachedPromptTokens: true,
				completionTokens: true,
				reasoningTokens: true,
				totalTokens: true,

				inputPricePerMillion: true,
				cachedInputPricePerMillion: true,
				outputPricePerMillion: true,
				estimatedCostUsd: true,

				queueTimeMs: true,
				promptTimeMs: true,
				completionTimeMs: true,
				totalTimeMs: true,

				errorMessage: true,
				createdAt: true,
			},
		});

		const planItems = await prisma.learningPlanItem.findMany({
			where: {
				userId,
				planCycle: data.planCycle,
				weekNumber: data.weekNumber,
				deletedAt: null,
			},
			orderBy: [
				{ dueDate: 'asc' },
				{ position: 'asc' },
			],
			select: {
				itemId: true,
				title: true,
				description: true,
				rationale: true,
				itemType: true,
				refType: true,
				refId: true,
				dueDate: true,
				position: true,
				status: true,
				estimatedMinutes: true,
				skillName: true,
				generatedAt: true,
			},
		});

		const successfulCalls = aiCalls.filter(
			(call) => call.status === 'success',
		);

		const selectorSuccess = successfulCalls.some(
			(call) => call.stage === 'content_selector',
		);

		const plannerSuccess = successfulCalls.some(
			(call) => call.stage === 'plan_generator',
		);

		const usageSummary = successfulCalls.reduce(
			(acc, call) => {
				acc.promptTokens += call.promptTokens ?? 0;
				acc.cachedPromptTokens += call.cachedPromptTokens ?? 0;
				acc.completionTokens += call.completionTokens ?? 0;
				acc.reasoningTokens += call.reasoningTokens ?? 0;
				acc.totalTokens += call.totalTokens ?? 0;
				acc.estimatedCostUsd += Number(
					call.estimatedCostUsd ?? 0,
				);

				return acc;
			},
			{
				promptTokens: 0,
				cachedPromptTokens: 0,
				completionTokens: 0,
				reasoningTokens: 0,
				totalTokens: 0,
				estimatedCostUsd: 0,
			},
		);

		const aiLogsAfter = await prisma.aiCallLog.count();

		const record = {
			mode: 'production_smoke',

			run: {
				userId,
				startedAt: startedAt.toISOString(),
				finishedAt: finishedAt.toISOString(),
				durationMs:
					finishedAt.getTime() - startedAt.getTime(),
			},

			planResult: toPlain(result),

			checks: {
				selectorSuccess,
				plannerSuccess,
				planPersisted: planItems.length > 0,
				expectedCoreStagesPassed:
					selectorSuccess && plannerSuccess,
			},

			logging: {
				before: aiLogsBefore,
				after: aiLogsAfter,
				newRows: aiLogsAfter - aiLogsBefore,
			},

			usageSummary,

			aiCalls: toPlain(aiCalls),

			planItems: toPlain(planItems),
		};

		console.log('');
		console.log('='.repeat(72));
		console.log('AI CALLS');
		console.log('='.repeat(72));

		console.table(
			aiCalls.map((call) => ({
				stage: call.stage,
				model: call.model,
				status: call.status,
				attempt: call.attemptIndex,
				prompt: call.promptTokens,
				cached: call.cachedPromptTokens,
				completion: call.completionTokens,
				reasoning: call.reasoningTokens,
				total: call.totalTokens,
				costUsd:
					call.estimatedCostUsd != null
						? Number(call.estimatedCostUsd)
						: null,
				timeMs: call.totalTimeMs,
			})),
		);

		console.log('');
		console.log('Usage total:');
		console.table([usageSummary]);

		console.log('');
		console.log('='.repeat(72));
		console.log('PLAN ITEMS');
		console.log('='.repeat(72));

		console.table(
			planItems.map((item) => ({
				date: item.dueDate
					? item.dueDate.toISOString().slice(0, 10)
					: null,
				position: item.position,
				type: item.itemType,
				skill: item.skillName,
				minutes: item.estimatedMinutes,
				title: item.title,
			})),
		);

		const outputDir = join(
			process.cwd(),
			'research',
			'learning-plan',
			'runs',
		);

		mkdirSync(outputDir, { recursive: true });

		const safeTimestamp = startedAt
			.toISOString()
			.replace(/[:.]/g, '-');

		const outputPath = join(
			outputDir,
			`smoke-${safeTimestamp}.json`,
		);

		writeFileSync(
			outputPath,
			JSON.stringify(record, null, 2),
			'utf8',
		);

		console.log('');
		console.log('='.repeat(72));
		console.log('SMOKE RESULT');
		console.log('='.repeat(72));

		console.log(
			`Selector       : ${selectorSuccess ? 'PASS' : 'FAIL'}`,
		);
		console.log(
			`Plan generator : ${plannerSuccess ? 'PASS' : 'FAIL'}`,
		);
		console.log(
			`Plan persisted : ${planItems.length > 0 ? 'PASS' : 'FAIL'}`,
		);
		console.log(`Plan items     : ${planItems.length}`);
		console.log(`AI log rows    : ${aiCalls.length}`);
		console.log(`AI trace       : ${aiTraceId}`);
		console.log(
			`Total tokens   : ${usageSummary.totalTokens}`,
		);
		console.log(
			`Estimated cost : $${usageSummary.estimatedCostUsd.toFixed(8)}`,
		);
		console.log(`Record saved   : ${outputPath}`);

		console.log('='.repeat(72));

		if (!selectorSuccess || !plannerSuccess) {
			process.exitCode = 2;
		}
	} catch (error: any) {
		console.error('');
		console.error('SMOKE TEST FAILED');
		console.error(error?.stack ?? error);

		process.exitCode = 1;
	} finally {
		await moduleRef.close();
	}
}

main();