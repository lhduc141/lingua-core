import { Prisma } from '@prisma/client';

export const QuestionSelect = {
	// isCorrect không được include — bảo mật đáp án
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
			},
		},
	} satisfies Prisma.QuestionSelect,
} as const;
