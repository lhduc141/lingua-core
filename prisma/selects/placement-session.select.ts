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
} as const;
