import { Prisma } from '@prisma/client';

export const AnswerSelect = {
	idOnly: {
		answerId: true,
	} satisfies Prisma.AnswerSelect,

	withAnswers: {
		answerId: true,
		questionId: true,
		answerDetails: {
			select: { optionId: true, textAnswer: true, position: true },
		},
	} satisfies Prisma.AnswerSelect,

	scoreOnly: {
		score: true,
	} satisfies Prisma.AnswerSelect,
} as const;
