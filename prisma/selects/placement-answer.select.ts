import { Prisma } from '@prisma/client';
import { QuestionSelect } from './question.select';

export const PlacementAnswerSelect = {
	idOnly: {
		answerId: true,
	} satisfies Prisma.PlacementAnswerSelect,

	withIrt: {
		questionId: true,
		isCorrect: true,
		question: { select: QuestionSelect.irtParams },
	} satisfies Prisma.PlacementAnswerSelect,

	irtOnly: {
		question: { select: QuestionSelect.irtParams },
	} satisfies Prisma.PlacementAnswerSelect,
} as const;
