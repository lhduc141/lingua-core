import { Prisma } from '@prisma/client';

export const QuestionSetItemSelect = {
	idOnly: {
		questionId: true,
	} satisfies Prisma.QuestionSetItemSelect,
} as const;
