import { Prisma } from '@prisma/client';
import { QuestionSelect } from './question.select';

export const PlacementAttemptSelect = {
	idOnly: {
		attemptId: true,
	} satisfies Prisma.PlacementAttemptSelect,

	withIrt: {
		questionId: true,
		isCorrect: true,
		question: { select: QuestionSelect.irtParams },
	} satisfies Prisma.PlacementAttemptSelect,

	irtOnly: {
		question: { select: QuestionSelect.irtParams },
	} satisfies Prisma.PlacementAttemptSelect,
} as const;
