import { PrismaClient } from '@prisma/client';

const IRT_MAPPING = {
	1: { b: -2.0, label: 'A1 (Very Easy)' },
	2: { b: -1.0, label: 'A2 (Easy)' },
	3: { b: 0.0, label: 'B1 (Moderate)' },
	4: { b: 1.0, label: 'B2 (Hard)' },
	5: { b: 2.0, label: 'C1 (Very Hard)' },
} as const;
const DISCRIMINATION = 1.0;
const GUESSING = 0.25;

const prisma = new PrismaClient();

async function assignIRTParameters() {
	const questions = await prisma.question.findMany({
		where: {
			sourceTag: 'placement_test_v1',
			deletedAt: null,
		},
		orderBy: {
			difficulty: 'asc',
		},
	});

	let processed = 0;
	const stats = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
	};

	for (const question of questions) {
		const difficulty = question.difficulty;
		const irtParams = IRT_MAPPING[difficulty as keyof typeof IRT_MAPPING] || IRT_MAPPING[3]; // Default to moderate

		await prisma.question.update({
			where: { questionId: question.questionId },
			data: {
				irtDifficulty: irtParams.b,
				irtDiscrimination: DISCRIMINATION,
				irtGuessing: GUESSING,
			},
		});

		processed++;
		stats[difficulty as keyof typeof stats]++;
	}
}

assignIRTParameters()
	.catch(() => process.exit(1))
	.finally(async () => {
		await prisma.$disconnect();
	});
