/**
 * seed-practice-from-json.ts
 *
 * Đọc practice JSON files → insert QuestionSet + Questions vào DB.
 * Chạy SAU generate-practice.ts.
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/seed-practice-from-json.ts           # all
 *   pnpm exec tsx prisma/seeds/seed-practice-from-json.ts reading A1
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const DATA_DIR = path.resolve(__dirname, 'data');
const CEFR_DIFFICULTY: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

// ─── INSERT HELPERS ───────────────────────────────────────────────────────────
async function insertPassage(data: {
	title: string;
	content: string;
	wordCount: number;
	cefrLevel: string;
	topic: string;
}) {
	return prisma.passage.create({
		data: {
			title: data.title,
			content: data.content,
			wordCount: data.wordCount || data.content.split(/\s+/).length,
			cefrLevel: data.cefrLevel,
			topic: data.topic,
			status: 'published' as any,
			sourceTag: 'practice_seed_v1',
		},
	});
}

async function insertMcq(
	stemText: string,
	options: string[],
	correctIndex: number,
	cefrLevel: string,
	skill: string,
	passageId?: string,
): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'mcq_single' as any,
			skill,
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
			passageId: passageId ?? null,
		},
	});
	await prisma.questionTranslation.create({ data: { questionId: q.questionId, locale: 'en', stemText } });
	for (let i = 0; i < options.length; i++) {
		const opt = await prisma.questionOption.create({
			data: { questionId: q.questionId, isCorrect: i === correctIndex, position: i + 1 },
		});
		await prisma.optionTranslation.create({
			data: { optionId: opt.optionId, locale: 'en', optionText: options[i] },
		});
	}
	return q.questionId;
}

async function insertFillBlank(stemText: string, answerKeys: string[], cefrLevel: string): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'fill_blank' as any,
			skill: 'writing',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
		},
	});
	await prisma.questionTranslation.create({ data: { questionId: q.questionId, locale: 'en', stemText } });
	await prisma.questionPayload.create({ data: { questionId: q.questionId, answerKeysJson: answerKeys } });
	return q.questionId;
}

async function insertSpeaking(prompt: string, durationSeconds: number, cefrLevel: string): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'speaking' as any,
			skill: 'speaking',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 10,
		},
	});
	await prisma.questionTranslation.create({ data: { questionId: q.questionId, locale: 'en', stemText: prompt } });
	await prisma.questionPayload.create({
		data: {
			questionId: q.questionId,
			configJson: { durationSeconds },
			scoringJson: { criteria: ['pronunciation', 'fluency', 'vocabulary', 'grammar'] },
		},
	});
	return q.questionId;
}

// ─── PRACTICE SET SEEDERS ─────────────────────────────────────────────────────

async function seedReadingSet(set: any, cefrLevel: string): Promise<boolean> {
	const exists = await prisma.questionSet.findFirst({
		where: { title: set.title, skillName: 'reading' as any, cefrLevel, lessonId: null },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${set.title}`);
		return false;
	}

	// Passage
	const passage = await insertPassage({
		title: set.passage.title,
		content: set.passage.content,
		wordCount: set.passage.wordCount,
		cefrLevel,
		topic: set.passage.topic ?? '',
	});

	// Questions
	const questionIds: string[] = [];
	for (const q of set.questions ?? []) {
		const id = await insertMcq(q.stemText, q.options, q.correctIndex, cefrLevel, 'reading', passage.passageId);
		questionIds.push(id);
	}

	// QuestionSet
	const qSet = await prisma.questionSet.create({
		data: {
			title: set.title,
			description: set.description ?? null,
			skillName: 'reading' as any,
			cefrLevel,
			estimatedMinutes: set.estimatedMinutes ?? 20,
			isActive: true,
			lessonId: null,
		},
	});

	for (let pos = 0; pos < questionIds.length; pos++) {
		await prisma.questionSetItem.create({
			data: { questionSetId: qSet.questionSetId, questionId: questionIds[pos], position: pos + 1 },
		});
	}

	console.log(`    ✅ ${set.title} (${questionIds.length} questions)`);
	return true;
}

async function seedWritingSet(set: any, cefrLevel: string): Promise<boolean> {
	const exists = await prisma.questionSet.findFirst({
		where: { title: set.title, skillName: 'writing' as any, cefrLevel, lessonId: null },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${set.title}`);
		return false;
	}

	const questionIds: string[] = [];
	for (const q of set.questions ?? []) {
		const id = await insertFillBlank(q.stemText, q.answerKeys ?? [''], cefrLevel);
		questionIds.push(id);
	}

	const qSet = await prisma.questionSet.create({
		data: {
			title: set.title,
			description: set.description ?? null,
			skillName: 'writing' as any,
			cefrLevel,
			estimatedMinutes: set.estimatedMinutes ?? 20,
			isActive: true,
			lessonId: null,
		},
	});

	for (let pos = 0; pos < questionIds.length; pos++)
		await prisma.questionSetItem.create({
			data: { questionSetId: qSet.questionSetId, questionId: questionIds[pos], position: pos + 1 },
		});

	return true;
}

async function seedSpeakingSet(set: any, cefrLevel: string): Promise<boolean> {
	const exists = await prisma.questionSet.findFirst({
		where: { title: set.title, skillName: 'speaking' as any, cefrLevel, lessonId: null },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${set.title}`);
		return false;
	}

	const questionIds: string[] = [];

	for (const q of set.mcqQuestions ?? []) {
		const id = await insertMcq(q.stemText, q.options, q.correctIndex, cefrLevel, 'speaking');
		questionIds.push(id);
	}

	for (const s of set.speakingTasks ?? []) {
		const id = await insertSpeaking(s.prompt, s.durationSeconds ?? 60, cefrLevel);
		questionIds.push(id);
	}

	const qSet = await prisma.questionSet.create({
		data: {
			title: set.title,
			description: set.description ?? null,
			skillName: 'speaking' as any,
			cefrLevel,
			estimatedMinutes: set.estimatedMinutes ?? 20,
			isActive: true,
			lessonId: null,
		},
	});

	for (let pos = 0; pos < questionIds.length; pos++) {
		await prisma.questionSetItem.create({
			data: { questionSetId: qSet.questionSetId, questionId: questionIds[pos], position: pos + 1 },
		});
	}

	console.log(`    ✅ ${set.title} (${questionIds.length} questions)`);
	return true;
}

// ─── FILE SEEDER ──────────────────────────────────────────────────────────────

async function seedFile(filePath: string) {
	const raw = fs.readFileSync(filePath, 'utf-8');
	const data = JSON.parse(raw);
	const { skill, cefrLevel, practiceSets } = data;

	console.log(`\n📂 ${path.basename(filePath)}: ${practiceSets.length} sets (${skill} / ${cefrLevel})`);

	let inserted = 0;
	let skipped = 0;

	for (const set of practiceSets) {
		try {
			let ok = false;
			if (skill === 'reading') ok = await seedReadingSet(set, cefrLevel);
			else if (skill === 'writing') ok = await seedWritingSet(set, cefrLevel);
			else if (skill === 'speaking') ok = await seedSpeakingSet(set, cefrLevel);
			if (ok) inserted++;
			else skipped++;
		} catch (e) {
			console.error(`    ❌ Error on "${set.title}": ${(e as Error).message}`);
		}
	}

	console.log(`  → Inserted: ${inserted} | Skipped: ${skipped}`);
	return { inserted, skipped };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2).filter((a) => a !== '--force');
	const skillArg = args[0];
	const levelArg = args[1];

	console.log('🌱 LinguaPanda Practice Seeder (from JSON)');

	if (!fs.existsSync(DATA_DIR)) {
		console.error(`❌ Data dir not found: ${DATA_DIR}`);
		console.error('   Run generate-practice.ts first!');
		process.exit(1);
	}

	let files = fs
		.readdirSync(DATA_DIR)
		.filter((f) => f.startsWith('practice-') && f.endsWith('.json'))
		.map((f) => path.join(DATA_DIR, f));

	if (skillArg) files = files.filter((f) => path.basename(f).includes(`practice-${skillArg}`));
	if (levelArg) files = files.filter((f) => path.basename(f).includes(`-${levelArg}.json`));

	if (files.length === 0) {
		console.error('❌ No matching practice JSON files found.');
		console.error(`   Expected: practice-reading-A1.json etc. in ${DATA_DIR}`);
		process.exit(1);
	}

	console.log(`📦 Files: ${files.length}`);
	files.forEach((f) => console.log(`   - ${path.basename(f)}`));

	let totalInserted = 0;
	let totalSkipped = 0;

	for (const file of files) {
		const { inserted, skipped } = await seedFile(file);
		totalInserted += inserted;
		totalSkipped += skipped;
	}

	const qSetCount = await prisma.questionSet.count({ where: { lessonId: null, deletedAt: null } });
	const qCount = await prisma.question.count({ where: { deletedAt: null } });

	console.log(`   Inserted: ${totalInserted} | Skipped: ${totalSkipped}`);
	console.log(`   DB — Standalone QuestionSets: ${qSetCount} | Total Questions: ${qCount}`);
}

main()
	.catch((e) => {
		console.error('❌ Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
