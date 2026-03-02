import { Prisma } from '@prisma/client';

export const LessonQuestionSelect = {
	idOnly: {
		questionId: true,
	} satisfies Prisma.LessonQuestionSelect,
} as const;
