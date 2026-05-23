import { Prisma } from '@prisma/client';

export const QuestionSelect = {
	detail: {
		questionId: true,
		type: true,
		difficulty: true,
		maxScore: true,
		translations: {
			where: { locale: 'en' },
			select: {
				stemText: true,
				contentJson: true,
			},
		},
		options: {
			where: { deletedAt: null },
			orderBy: { position: 'asc' as const },
			select: {
				optionId: true,
				position: true,
				translations: {
					where: { locale: 'en' },
					select: { optionText: true },
				},
			},
		},
		passage: {
			select: {
				passageId: true,
				title: true,
				content: true,
				cefrLevel: true,
				wordCount: true,
				audioUrl: true,
			},
		},
	} satisfies Prisma.QuestionSelect,

	payload: {
		select: { configJson: true },
	},

	irtParams: {
		passageId: true,
		irtDiscrimination: true,
		irtDifficulty: true,
		irtGuessing: true,
	} satisfies Prisma.QuestionSelect,

	skillType: {
		type: true,
		skill: true,
	} satisfies Prisma.QuestionSelect,

	grade: {
		questionId: true,
		type: true,
		options: {
			where: { deletedAt: null },
			select: { optionId: true, isCorrect: true },
		},
		payload: {
			select: {
				answerKeysJson: true,
				configJson: true,
				scoringJson: true, // RAG: minWords, maxWords
			},
		},
		translations: {
			// RAG: stemText ~ Đề bài
			take: 1,
			where: { locale: 'en' },
			select: { stemText: true },
		},
	} satisfies Prisma.QuestionSelect,

	placementAnswer: {
		questionId: true,
		passageId: true,
		irtDifficulty: true,
		irtDiscrimination: true,
		irtGuessing: true,
		options: {
			where: { deletedAt: null },
			select: { optionId: true, isCorrect: true },
		},
	} satisfies Prisma.QuestionSelect,

	placementResume: {
		questionId: true,
		passageId: true,
		passage: {
			select: {
				passageId: true,
				title: true,
				content: true,
				cefrLevel: true,
			},
		},
		translations: { select: { locale: true, stemText: true, contentJson: true } },
		options: {
			where: { deletedAt: null },
			orderBy: { position: 'asc' as const },
			select: {
				optionId: true,
				position: true,
				isCorrect: true,
				translations: { select: { locale: true, optionText: true } },
			},
		},
	} satisfies Prisma.QuestionSelect,

	placementCandidate: {
		questionId: true,
		passageId: true,
		usageCount: true,
		irtDifficulty: true,
		irtDiscrimination: true,
		irtGuessing: true,
		passage: {
			select: {
				passageId: true,
				title: true,
				content: true,
				cefrLevel: true,
			},
		},
		translations: {
			select: { locale: true, stemText: true, contentJson: true },
		},
		options: {
			where: { deletedAt: null },
			orderBy: { position: 'asc' as const },
			select: {
				optionId: true,
				position: true,
				isCorrect: true,
				translations: {
					select: { locale: true, optionText: true },
				},
			},
		},
	} satisfies Prisma.QuestionSelect,
} as const;
