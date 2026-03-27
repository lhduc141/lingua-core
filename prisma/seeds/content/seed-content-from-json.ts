/**
 * seed-from-json.ts
 *
 * Đọc JSON files từ prisma/seeds/data/ và insert vào database.
 * Chạy SAU generate-content.ts.
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/seed-from-json.ts              # all files
 *   pnpm exec tsx prisma/seeds/seed-from-json.ts reading A1   # chỉ 1 file
 *
 * Idempotent: skip lesson nếu title+skill+cefrLevel đã tồn tại
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../apps/api-gateway/.env') });

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
			sourceTag: 'content_seed_v1',
		},
	});
}

async function insertMcqQuestion(
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

	await prisma.questionTranslation.create({
		data: { questionId: q.questionId, locale: 'en', stemText },
	});

	for (let i = 0; i < options.length; i++) {
		const opt = await prisma.questionOption.create({
			data: {
				questionId: q.questionId,
				isCorrect: i === correctIndex,
				position: i + 1,
			},
		});
		await prisma.optionTranslation.create({
			data: { optionId: opt.optionId, locale: 'en', optionText: options[i] },
		});
	}

	return q.questionId;
}

async function insertFillBlankQuestion(stemText: string, answerKeys: string[], cefrLevel: string): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'fill_blank' as any,
			skill: 'writing',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
		},
	});

	await prisma.questionTranslation.create({
		data: { questionId: q.questionId, locale: 'en', stemText },
	});

	await prisma.questionPayload.create({
		data: { questionId: q.questionId, answerKeysJson: answerKeys },
	});

	return q.questionId;
}

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
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 10,
		},
	});

	await prisma.questionTranslation.create({
		data: { questionId: q.questionId, locale: 'en', stemText: prompt },
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

async function insertSpeakingQuestion(prompt: string, durationSeconds: number, cefrLevel: string): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'speaking' as any,
			skill: 'speaking',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 10,
		},
	});

	await prisma.questionTranslation.create({
		data: { questionId: q.questionId, locale: 'en', stemText: prompt },
	});

	await prisma.questionPayload.create({
		data: {
			questionId: q.questionId,
			configJson: { durationSeconds },
			scoringJson: {
				criteria: ['pronunciation', 'fluency', 'vocabulary', 'grammar'],
			},
		},
	});

	return q.questionId;
}

// ─── LESSON SEEDERS ───────────────────────────────────────────────────────────

async function seedReadingLesson(lesson: any, cefrLevel: string): Promise<boolean> {
	// Idempotency check
	const exists = await prisma.lesson.findFirst({
		where: { title: lesson.title, skillName: 'reading' as any, cefrLevel },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${lesson.title}`);
		return false;
	}

	// 1. Passage
	const passage = await insertPassage({
		title: lesson.passage.title,
		content: lesson.passage.content,
		wordCount: lesson.passage.wordCount,
		cefrLevel,
		topic: lesson.passage.topic ?? '',
	});

	// 2. Questions
	const questionIds: string[] = [];
	for (const q of lesson.questions ?? []) {
		const id = await insertMcqQuestion(
			q.stemText,
			q.options,
			q.correctIndex,
			cefrLevel,
			'reading',
			passage.passageId,
		);
		questionIds.push(id);
	}

	// 3. Lesson
	const dbLesson = await prisma.lesson.create({
		data: {
			skillName: 'reading' as any,
			title: lesson.title,
			description: lesson.description ?? null,
			cefrLevel,
			estimatedMinutes: lesson.estimatedMinutes ?? 20,
			theoryContent: lesson.theoryContent ?? null,
			status: 'published' as any,
		},
	});

	// 4. LessonQuestion links
	for (let pos = 0; pos < questionIds.length; pos++) {
		await prisma.lessonQuestion.create({
			data: { lessonId: dbLesson.lessonId, questionId: questionIds[pos], position: pos + 1 },
		});
	}

	console.log(`    ✅ ${lesson.title} (${questionIds.length} questions)`);
	return true;
}

async function seedWritingLesson(lesson: any, cefrLevel: string): Promise<boolean> {
	const exists = await prisma.lesson.findFirst({
		where: { title: lesson.title, skillName: 'writing' as any, cefrLevel },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${lesson.title}`);
		return false;
	}

	const questionIds: string[] = [];

	// Fill-blank questions
	for (const q of lesson.fillBlanks ?? []) {
		const id = await insertFillBlankQuestion(q.stemText, q.answerKeys ?? [''], cefrLevel);
		questionIds.push(id);
	}

	// Essay questions
	for (const e of lesson.essays ?? []) {
		const id = await insertEssayQuestion(e.prompt, e.minWords ?? 50, e.maxWords ?? 200, cefrLevel);
		questionIds.push(id);
	}

	const dbLesson = await prisma.lesson.create({
		data: {
			skillName: 'writing' as any,
			title: lesson.title,
			description: lesson.description ?? null,
			cefrLevel,
			estimatedMinutes: lesson.estimatedMinutes ?? 25,
			theoryContent: lesson.theoryContent ?? null,
			status: 'published' as any,
		},
	});

	for (let pos = 0; pos < questionIds.length; pos++) {
		await prisma.lessonQuestion.create({
			data: { lessonId: dbLesson.lessonId, questionId: questionIds[pos], position: pos + 1 },
		});
	}

	console.log(`    ✅ ${lesson.title} (${questionIds.length} questions)`);
	return true;
}

async function seedSpeakingLesson(lesson: any, cefrLevel: string): Promise<boolean> {
	const exists = await prisma.lesson.findFirst({
		where: { title: lesson.title, skillName: 'speaking' as any, cefrLevel },
	});
	if (exists) {
		console.log(`    ⏭️  Skip: ${lesson.title}`);
		return false;
	}

	const questionIds: string[] = [];

	// MCQ questions
	for (const q of lesson.mcqQuestions ?? []) {
		const id = await insertMcqQuestion(q.stemText, q.options, q.correctIndex, cefrLevel, 'speaking');
		questionIds.push(id);
	}

	// Speaking tasks
	for (const s of lesson.speakingTasks ?? []) {
		const id = await insertSpeakingQuestion(s.prompt, s.durationSeconds ?? 60, cefrLevel);
		questionIds.push(id);
	}

	const dbLesson = await prisma.lesson.create({
		data: {
			skillName: 'speaking' as any,
			title: lesson.title,
			description: lesson.description ?? null,
			cefrLevel,
			estimatedMinutes: lesson.estimatedMinutes ?? 20,
			theoryContent: lesson.theoryContent ?? null,
			status: 'published' as any,
		},
	});

	for (let pos = 0; pos < questionIds.length; pos++) {
		await prisma.lessonQuestion.create({
			data: { lessonId: dbLesson.lessonId, questionId: questionIds[pos], position: pos + 1 },
		});
	}

	console.log(`    ✅ ${lesson.title} (${questionIds.length} questions)`);
	return true;
}

// ─── FILE SEEDER ──────────────────────────────────────────────────────────────

async function seedFile(filePath: string) {
	const raw = fs.readFileSync(filePath, 'utf-8');
	const data = JSON.parse(raw);

	const { skill, cefrLevel, lessons } = data;
	console.log(`\n📂 ${path.basename(filePath)}: ${lessons.length} lessons (${skill} / ${cefrLevel})`);

	let inserted = 0;
	let skipped = 0;

	for (const lesson of lessons) {
		let ok = false;
		try {
			if (skill === 'reading') ok = await seedReadingLesson(lesson, cefrLevel);
			else if (skill === 'writing') ok = await seedWritingLesson(lesson, cefrLevel);
			else if (skill === 'speaking') ok = await seedSpeakingLesson(lesson, cefrLevel);
		} catch (e) {
			console.error(`    ❌ Error on "${lesson.title}": ${(e as Error).message}`);
		}
		if (ok) inserted++;
		else skipped++;
	}

	console.log(`  → Inserted: ${inserted} | Skipped: ${skipped}`);
	return { inserted, skipped };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2).filter((a) => a !== '--force');
	const skillArg = args[0];
	const levelArg = args[1];

	console.log('🌱 LinguaPanda DB Seeder (from JSON)');

	if (!fs.existsSync(DATA_DIR)) {
		console.error(`❌ Data directory not found: ${DATA_DIR}`);
		console.error('   Run generate-content.ts first!');
		process.exit(1);
	}

	// Collect files to process
	let files = fs
		.readdirSync(DATA_DIR)
		.filter((f) => f.startsWith('lessons-') && f.endsWith('.json'))
		.map((f) => path.join(DATA_DIR, f));

	// Apply filters
	if (skillArg) files = files.filter((f) => path.basename(f).includes(`lessons-${skillArg}`));
	if (levelArg) files = files.filter((f) => path.basename(f).includes(`-${levelArg}.json`));

	if (files.length === 0) {
		console.error('❌ No matching JSON files found.');
		console.error(`   Expected files like: lessons-reading-A1.json in ${DATA_DIR}`);
		process.exit(1);
	}

	console.log(`📦 Files to process: ${files.length}`);
	files.forEach((f) => console.log(`   - ${path.basename(f)}`));

	let totalInserted = 0;
	let totalSkipped = 0;

	for (const file of files) {
		const { inserted, skipped } = await seedFile(file);
		totalInserted += inserted;
		totalSkipped += skipped;
	}

	// Final stats
	const lessonCount = await prisma.lesson.count({ where: { deletedAt: null } });
	const questionCount = await prisma.question.count({ where: { deletedAt: null } });
	const passageCount = await prisma.passage.count({ where: { deletedAt: null } });

	console.log('\n═══════════════════════════════════════');
	console.log('✅ Seed complete!');
	console.log(`   Inserted: ${totalInserted} | Skipped: ${totalSkipped}`);
	console.log(`   DB totals — Lessons: ${lessonCount} | Questions: ${questionCount} | Passages: ${passageCount}`);
}

main()
	.catch((e) => {
		console.error('❌ Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
