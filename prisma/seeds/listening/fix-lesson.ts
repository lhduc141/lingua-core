/**
 * fix-listening-lessons.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A2/B1/B2 listening lessons bị seed nhầm thành QuestionSet.
 * Script này:
 *   1. Tìm các Passage có sourceTag khớp a2_lesson_*, b1_lesson_*, b2_lesson_*
 *   2. Với mỗi passage, tìm QuestionSet đang giữ các questions đó
 *   3. Tạo Lesson mới + LessonQuestion links từ QuestionSetItems
 *   4. Xóa QuestionSet sai (và QuestionSetItems)
 *
 * Usage: pnpm exec tsx prisma/seeds/fix-listening-lessons.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LESSON_SOURCE_TAGS = [
	...Array.from({ length: 10 }, (_, i) => `a2_lesson_${String(i + 1).padStart(2, '0')}`),
	...Array.from({ length: 10 }, (_, i) => `b1_lesson_${String(i + 1).padStart(2, '0')}`),
	...Array.from({ length: 10 }, (_, i) => `b2_lesson_${String(i + 1).padStart(2, '0')}`),
];

const CEFR_DIFFICULTY: Record<string, number> = {
	A1: 1,
	A2: 2,
	B1: 3,
	B2: 4,
	C1: 5,
	C2: 6,
};

async function fixListeningLessons() {
	console.log('\n══════════════════════════════════════════════════════');
	console.log('  Fix: Listening lessons wrongly created as QuestionSets');
	console.log('══════════════════════════════════════════════════════\n');

	let fixed = 0;
	let skipped = 0;
	let errors = 0;

	for (const sourceTag of LESSON_SOURCE_TAGS) {
		try {
			// 1. Find the passage
			const passage = await prisma.passage.findFirst({
				where: { sourceTag, deletedAt: null },
			});

			if (!passage) {
				console.log(`  ⏭  No passage: ${sourceTag}`);
				skipped++;
				continue;
			}

			// 2. Check if Lesson already exists for this passage's questions
			const firstQuestion = await prisma.question.findFirst({
				where: { passageId: passage.passageId, deletedAt: null },
				include: { lessonQuestions: true },
			});

			if (firstQuestion?.lessonQuestions && firstQuestion.lessonQuestions.length > 0) {
				console.log(`  ⏭  Lesson already exists: ${sourceTag}`);
				skipped++;
				continue;
			}

			// 3. Find the wrong QuestionSet linked to these questions
			const questions = await prisma.question.findMany({
				where: { passageId: passage.passageId, deletedAt: null },
				include: {
					questionSetItems: {
						include: { questionSet: true },
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			if (questions.length === 0) {
				console.log(`  ⚠  No questions for passage: ${sourceTag}`);
				skipped++;
				continue;
			}

			// Get the wrong QuestionSet (first one found)
			const wrongQsItem = questions[0]?.questionSetItems[0];
			const wrongQs = wrongQsItem?.questionSet;

			// 4. Create the correct Lesson
			const lesson = await prisma.lesson.create({
				data: {
					skillName: 'listening' as any,
					title: passage.title ?? sourceTag,
					description: null,
					cefrLevel: passage.cefrLevel,
					estimatedMinutes: 10,
					status: 'published' as any,
				},
			});

			// 5. Create LessonQuestion links (in order)
			for (let i = 0; i < questions.length; i++) {
				await prisma.lessonQuestion.create({
					data: {
						lessonId: lesson.lessonId,
						questionId: questions[i]!.questionId,
						position: i + 1,
					},
				});
			}

			// 6. Delete wrong QuestionSet if found
			if (wrongQs) {
				await prisma.questionSetItem.deleteMany({
					where: { questionSetId: wrongQs.questionSetId },
				});
				await prisma.questionSet.delete({
					where: { questionSetId: wrongQs.questionSetId },
				});
				console.log(
					`  ✅ Fixed: "${passage.title}" | ${questions.length}Q | deleted QS ${wrongQs.questionSetId.slice(0, 8)}...`,
				);
			} else {
				console.log(`  ✅ Created lesson: "${passage.title}" | ${questions.length}Q (no wrong QS found)`);
			}

			fixed++;
		} catch (err: any) {
			console.error(`  ❌ Error for ${sourceTag}: ${err.message}`);
			errors++;
		}
	}

	console.log('\n══════════════════════════════════════════════════════');
	console.log(`  ✅ Fixed:   ${fixed}`);
	console.log(`  ⏭  Skipped: ${skipped}`);
	console.log(`  ❌ Errors:  ${errors}`);
	console.log('══════════════════════════════════════════════════════\n');

	console.log('Next: Reset plan and generate a new one to include Listening tasks.');
}

fixListeningLessons()
	.catch((e) => {
		console.error('Fatal:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
