/**
 * fix-listening-cefr.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A2/B1/B2 listening passages + lessons có cefrLevel = null vì JSON files
 * thiếu field cefrLevel khi seed lần đầu.
 *
 * Script này patch lại cefrLevel dựa vào sourceTag pattern:
 *   a2_* → A2 | b1_* → B1 | b2_* → B2
 *
 * Usage: pnpm exec tsx prisma/seeds/listening/fix-listening-cefr.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PATTERNS: { prefix: string; cefr: string }[] = [
	{ prefix: 'a2_', cefr: 'A2' },
	{ prefix: 'b1_', cefr: 'B1' },
	{ prefix: 'b2_lesson_', cefr: 'B2' }, // only lessons (practice was correct)
];

async function main() {
	console.log('\n══════════════════════════════════════════════════════');
	console.log('  Fix: listening passages/lessons cefrLevel = null');
	console.log('══════════════════════════════════════════════════════\n');

	for (const { prefix, cefr } of PATTERNS) {
		// ── 1. Fix Passages ───────────────────────────────────────────
		const passages = await prisma.passage.findMany({
			where: {
				sourceTag: { startsWith: prefix },
				cefrLevel: null,
				deletedAt: null,
			},
			select: { passageId: true, sourceTag: true },
		});

		if (passages.length > 0) {
			await prisma.passage.updateMany({
				where: { passageId: { in: passages.map((p) => p.passageId) } },
				data: { cefrLevel: cefr },
			});
			console.log(`  ✅ Passages  [${cefr}]: updated ${passages.length} rows`);
		} else {
			console.log(`  ⏭  Passages  [${cefr}]: no null cefrLevel found`);
		}

		// ── 2. Fix Questions (difficulty) ─────────────────────────────
		const passageIds = passages.map((p) => p.passageId);
		if (passageIds.length > 0) {
			const CEFR_DIFFICULTY: Record<string, number> = {
				A2: 2,
				B1: 3,
				B2: 4,
			};
			const updatedQ = await prisma.question.updateMany({
				where: { passageId: { in: passageIds }, deletedAt: null },
				data: { difficulty: CEFR_DIFFICULTY[cefr] ?? 1 },
			});
			console.log(`  ✅ Questions [${cefr}]: updated difficulty for ${updatedQ.count} rows`);
		}

		// ── 3. Fix Lessons ────────────────────────────────────────────
		const lessons = await prisma.lesson.findMany({
			where: {
				skillName: 'listening' as any,
				cefrLevel: null,
				deletedAt: null,
				// lessons linked to our affected passages via lessonQuestions → questions
				lessonQuestions: {
					some: {
						question: { passageId: { in: passages.map((p) => p.passageId) } },
					},
				},
			},
			select: { lessonId: true, title: true },
		});

		if (lessons.length > 0) {
			await prisma.lesson.updateMany({
				where: { lessonId: { in: lessons.map((l) => l.lessonId) } },
				data: { cefrLevel: cefr },
			});
			console.log(`  ✅ Lessons   [${cefr}]: updated ${lessons.length} rows`);
			lessons.forEach((l) => console.log(`      - ${l.title}`));
		} else {
			console.log(`  ⏭  Lessons   [${cefr}]: no null cefrLevel found`);
		}

		// ── 4. Fix QuestionSets (practice) ───────────────────────────
		const qsets = await prisma.questionSet.findMany({
			where: {
				skillName: 'listening' as any,
				cefrLevel: null,
				deletedAt: null,
				items: {
					some: {
						question: { passageId: { in: passages.map((p) => p.passageId) } },
					},
				},
			},
			select: { questionSetId: true, title: true },
		});

		if (qsets.length > 0) {
			await prisma.questionSet.updateMany({
				where: { questionSetId: { in: qsets.map((q) => q.questionSetId) } },
				data: { cefrLevel: cefr },
			});
			console.log(`  ✅ QuestionSets [${cefr}]: updated ${qsets.length} rows`);
		} else {
			console.log(`  ⏭  QuestionSets [${cefr}]: no null cefrLevel found`);
		}

		console.log();
	}

	// ── Summary query ─────────────────────────────────────────────────────
	console.log('══════════════════════════════════════════════════════');
	console.log('  Listening content summary after fix:');
	console.log('──────────────────────────────────────────────────────');

	const lessonSummary = await prisma.lesson.groupBy({
		by: ['cefrLevel'],
		where: { skillName: 'listening' as any, deletedAt: null },
		_count: true,
	});
	lessonSummary.sort((a, b) => (a.cefrLevel ?? '').localeCompare(b.cefrLevel ?? ''));
	lessonSummary.forEach((r) => console.log(`  Lessons   cefrLevel=${r.cefrLevel ?? 'NULL'}: ${r._count} rows`));

	const qsSummary = await prisma.questionSet.groupBy({
		by: ['cefrLevel'],
		where: { skillName: 'listening' as any, deletedAt: null },
		_count: true,
	});
	qsSummary.sort((a, b) => (a.cefrLevel ?? '').localeCompare(b.cefrLevel ?? ''));
	qsSummary.forEach((r) => console.log(`  QuestionSets cefrLevel=${r.cefrLevel ?? 'NULL'}: ${r._count} rows`));

	console.log('══════════════════════════════════════════════════════\n');
}

main()
	.catch((e) => {
		console.error('Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
