import { Prisma } from '@prisma/client';

export const PracticeSessionQuestionSelect = {
	idOnly: {
		questionId: true,
	} satisfies Prisma.PracticeSessionQuestionSelect,
} as const;
