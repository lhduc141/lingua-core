/**
 * seed-writing-task2.ts
 *
 * Seed 50 standalone Writing Task 2 practice sets (A2/B1/B2)
 * từ file practice-writing-task2.json
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/practice/seed-writing-task2.ts
 *
 * Idempotent: skip nếu title + skill + cefrLevel đã tồn tại
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const CEFR_DIFFICULTY: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

// ─── INSERT ESSAY QUESTION ────────────────────────────────────────────────────

async function insertEssayQuestion(
	prompt: string,
	minWords: number,
	maxWords: number,
	cefrLevel: string,
): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'essay' as any,
			skill: 'writing',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 2,
			status: 'published' as any,
			maxScore: 10,
		},
	});

	await prisma.questionTranslation.create({
		data: {
			questionId: q.questionId,
			locale: 'en',
			stemText: prompt,
		},
	});

	await prisma.questionPayload.create({
		data: {
			questionId: q.questionId,
			scoringJson: {
				minWords,
				maxWords,
				criteria: ['task_achievement', 'coherence', 'vocabulary', 'grammar'],
			},
		},
	});

	return q.questionId;
}

// ─── SEED 1 PRACTICE SET ─────────────────────────────────────────────────────

async function seedWritingTask2Set(set: any): Promise<boolean> {
	const cefrLevel = set.cefrLevel;

	// Skip nếu đã tồn tại
	const exists = await prisma.questionSet.findFirst({
		where: {
			title: set.title,
			skillName: 'writing' as any,
			cefrLevel,
			lessonId: null,
		},
	});

	if (exists) {
		console.log(`    ⏭️  Skip: ${set.title}`);
		return false;
	}

	// Insert essay question
	const essay = set.essay; // object đơn từ JSON Gemini
	const questionId = await insertEssayQuestion(essay.prompt, essay.minWords, essay.maxWords, cefrLevel);

	// Tạo QuestionSet
	const qSet = await prisma.questionSet.create({
		data: {
			title: set.title,
			description: set.description ?? null,
			skillName: 'writing' as any,
			cefrLevel,
			estimatedMinutes: set.estimatedMinutes ?? 30,
			isActive: true,
			lessonId: null,
		},
	});

	// Link question vào set
	await prisma.questionSetItem.create({
		data: {
			questionSetId: qSet.questionSetId,
			questionId,
			position: 1,
		},
	});

	console.log(`    ✅ Inserted: [${cefrLevel}] ${set.title}`);
	return true;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
	console.log('🌱 Seeding Writing Task 2 Practice Sets...\n');

	const filePath = path.resolve(__dirname, 'data/practice-writing-task2.json');

	if (!fs.existsSync(filePath)) {
		console.error(`❌ File not found: ${filePath}`);
		process.exit(1);
	}

	const raw = fs.readFileSync(filePath, 'utf-8');
	const { practiceSets } = JSON.parse(raw);

	console.log(`📦 Total sets to process: ${practiceSets.length}`);

	// Group theo cefrLevel để log đẹp
	const byLevel: Record<string, any[]> = {};
	for (const set of practiceSets) {
		if (!byLevel[set.cefrLevel]) byLevel[set.cefrLevel] = [];
		byLevel[set.cefrLevel].push(set);
	}

	Object.entries(byLevel).forEach(([level, sets]) => {
		console.log(`  ${level}: ${sets.length} sets`);
	});

	console.log('');

	let inserted = 0;
	let skipped = 0;
	let errors = 0;

	for (const set of practiceSets) {
		try {
			const ok = await seedWritingTask2Set(set);
			if (ok) inserted++;
			else skipped++;
		} catch (e) {
			console.error(`    ❌ Error on "${set.title}": ${(e as Error).message}`);
			errors++;
		}
	}

	console.log('\n─────────────────────────────────');
	console.log(`✅ Done!`);
	console.log(`   Inserted : ${inserted}`);
	console.log(`   Skipped  : ${skipped}`);
	console.log(`   Errors   : ${errors}`);

	// Verify count
	const total = await prisma.questionSet.count({
		where: { skillName: 'writing' as any, lessonId: null, deletedAt: null },
	});
	console.log(`\n📊 Total writing practice sets in DB: ${total}`);
}

main()
	.catch((e) => {
		console.error('❌ Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
