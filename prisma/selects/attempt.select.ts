import { Prisma } from '@prisma/client';

export const AttemptSelect = {
	idOnly: {
		attemptId: true,
	} satisfies Prisma.AttemptSelect,

	withAnswers: {
		attemptId: true,
		questionId: true,
		answers: {
			select: { optionId: true, textAnswer: true, position: true },
		},
	} satisfies Prisma.AttemptSelect,

	scoreOnly: {
		score: true,
	} satisfies Prisma.AttemptSelect,
} as const;
