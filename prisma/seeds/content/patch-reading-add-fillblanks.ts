/**
 * patch-reading-add-fillblanks.ts
 *
 * Thêm fill_blank questions vào các reading lessons đã được seed.
 * Chạy SAU KHI có output JSON từ Gemini.
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/content/patch-reading-add-fillblanks.ts          # all levels
 *   pnpm exec tsx prisma/seeds/content/patch-reading-add-fillblanks.ts A1       # chỉ A1
 *
 * Idempotent: skip lesson nếu đã có fill_blank question
 *
 * Input files (Gemini output):
 *   prisma/seeds/content/data/fillblanks-reading-A1.json
 *   prisma/seeds/content/data/fillblanks-reading-A2.json
 *   prisma/seeds/content/data/fillblanks-reading-B1.json
 *   prisma/seeds/content/data/fillblanks-reading-B2.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✅' : 'MISSING ❌');
console.log(
	'Prisma models:',
	Object.keys(prisma).filter((k) => !k.startsWith('_')),
);

const DATA_DIR = path.resolve(__dirname, 'data');

const CEFR_DIFFICULTY: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

async function insertReadingFillBlankQuestion(
	stemText: string,
	answerKeys: string[],
	cefrLevel: string,
	passageId: string,
): Promise<string> {
	const q = await prisma.question.create({
		data: {
			type: 'fill_blank' as any,
			skill: 'reading',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
			passageId,
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

async function patchLesson(
	lessonTitle: string,
	cefrLevel: string,
	fillBlanks: { stemText: string; answerKeys: string[] }[],
): Promise<'patched' | 'skipped' | 'not_found'> {
	// 1. Find existing lesson
	const lesson = await prisma.lesson.findFirst({
		where: { title: lessonTitle, skillName: 'reading' as any, cefrLevel, deletedAt: null },
	});

	if (!lesson) {
		console.log(`    ⚠️  Not found: "${lessonTitle}"`);
		return 'not_found';
	}

	// 2. Idempotency — check if fill_blank already exists for this lesson
	const existingFillBlank = await prisma.lessonQuestion.findFirst({
		where: {
			lessonId: lesson.lessonId,
			question: { type: 'fill_blank' as any, skill: 'reading' },
		},
	});

	if (existingFillBlank) {
		console.log(`    ⏭️  Skip (already has fill_blank): "${lessonTitle}"`);
		return 'skipped';
	}

	// 3. Get passageId from existing MCQ questions (all share the same passage)
	const existingQuestion = await prisma.lessonQuestion.findFirst({
		where: { lessonId: lesson.lessonId },
		include: { question: { select: { passageId: true } } },
		orderBy: { position: 'asc' },
	});

	const passageId = existingQuestion?.question?.passageId;
	if (!passageId) {
		console.log(`    ❌ No passageId found for: "${lessonTitle}"`);
		return 'not_found';
	}

	// 4. Get current max position
	const maxPositionRow = await prisma.lessonQuestion.aggregate({
		where: { lessonId: lesson.lessonId },
		_max: { position: true },
	});
	let nextPosition = (maxPositionRow._max.position ?? 0) + 1;

	// 5. Insert fill_blank questions
	for (const fb of fillBlanks) {
		const questionId = await insertReadingFillBlankQuestion(fb.stemText, fb.answerKeys, cefrLevel, passageId);

		await prisma.lessonQuestion.create({
			data: {
				lessonId: lesson.lessonId,
				questionId,
				position: nextPosition++,
			},
		});
	}

	console.log(`    ✅ Patched: "${lessonTitle}" (+${fillBlanks.length} fill_blank)`);
	return 'patched';
}

// ─── PATCH FILE ───────────────────────────────────────────────────────────────

async function patchFile(filePath: string) {
	if (!fs.existsSync(filePath)) {
		console.log(`  ⚠️  File not found: ${path.basename(filePath)} — skip`);
		return { patched: 0, skipped: 0, notFound: 0 };
	}

	const raw = fs.readFileSync(filePath, 'utf-8');
	const data = JSON.parse(raw) as {
		cefrLevel: string;
		lessons: { title: string; fillBlanks: { stemText: string; answerKeys: string[] }[] }[];
	};

	console.log(`\n📂 ${path.basename(filePath)}: ${data.lessons.length} lessons (${data.cefrLevel})`);

	let patched = 0;
	let skipped = 0;
	let notFound = 0;

	for (const lesson of data.lessons) {
		if (!lesson.fillBlanks?.length) {
			console.log(`    ⚠️  No fillBlanks in data: "${lesson.title}"`);
			continue;
		}

		const result = await patchLesson(lesson.title, data.cefrLevel, lesson.fillBlanks);
		if (result === 'patched') patched++;
		else if (result === 'skipped') skipped++;
		else notFound++;
	}

	console.log(`  → Patched: ${patched} | Skipped: ${skipped} | Not found: ${notFound}`);
	return { patched, skipped, notFound };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2);
	const levelArg = args[0]?.toUpperCase(); // e.g. "A1", "B2"

	const levels = levelArg ? [levelArg] : ['A1', 'A2', 'B1', 'B2'];

	console.log('🔧 Patch: Adding fill_blank questions to reading lessons');
	console.log(`   Levels: ${levels.join(', ')}`);

	let totalPatched = 0;
	let totalSkipped = 0;
	let totalNotFound = 0;

	for (const level of levels) {
		const filePath = path.join(DATA_DIR, `fillblanks-reading-${level}.json`);
		const result = await patchFile(filePath);
		totalPatched += result.patched;
		totalSkipped += result.skipped;
		totalNotFound += result.notFound;
	}

	// Stats
	const fillBlankCount = await prisma.question.count({
		where: { type: 'fill_blank' as any, skill: 'reading', deletedAt: null },
	});

	console.log('\n═══════════════════════════════════════');
	console.log('✅ Patch complete!');
	console.log(`   Patched: ${totalPatched} | Skipped: ${totalSkipped} | Not found: ${totalNotFound}`);
	console.log(`   DB — Reading fill_blank questions total: ${fillBlankCount}`);
}

main()
	.catch((e) => {
		console.error('❌ Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
