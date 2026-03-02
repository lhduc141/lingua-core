import { Prisma } from '@prisma/client';

export const CatSessionSelect = {
	idOnly: {
		sessionId: true,
	} satisfies Prisma.CatSessionSelect,

	latestResult: {
		cefrLevel: true,
		finalTheta: true,
	} satisfies Prisma.CatSessionSelect,

	latestCefr: {
		cefrLevel: true,
	} satisfies Prisma.CatSessionSelect,

	cefrConfidence: {
		cefrLevel: true,
		confidence: true,
	} satisfies Prisma.CatSessionSelect,
} as const;
