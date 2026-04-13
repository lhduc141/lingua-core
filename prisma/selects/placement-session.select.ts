import { Prisma } from '@prisma/client';

export const PlacementSessionSelect = {
	idOnly: {
		sessionId: true,
	} satisfies Prisma.PlacementSessionSelect,

	latestResult: {
		cefrLevel: true,
		finalTheta: true,
	} satisfies Prisma.PlacementSessionSelect,

	latestCefr: {
		cefrLevel: true,
	} satisfies Prisma.PlacementSessionSelect,

	cefrConfidence: {
		cefrLevel: true,
		confidence: true,
	} satisfies Prisma.PlacementSessionSelect,

	// ADMIN Lists
	adminList: {
		sessionId: true,
		status: true,
		cefrLevel: true,
		confidence: true,
		finalTheta: true,
		currentQuestion: true,
		totalQuestions: true,
		correctCount: true,
		incorrectCount: true,
		startedAt: true,
		completedAt: true,
		user: {
			select: {
				userId: true,
				email: true,
				googleName: true,
				googleAvatarUrl: true,
			},
		},
	} satisfies Prisma.PlacementSessionSelect,
} as const;
