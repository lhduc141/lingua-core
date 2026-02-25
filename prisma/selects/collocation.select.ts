import { Prisma } from '@prisma/client';

export const CollocationSelect = {
	list: {
		collocationId: true,
		phrase: true,
		meaning: true,
		viMeaning: true,
		example: true,
		viExample: true,
		frequency: true,
		cefrLevel: true,
	} satisfies Prisma.CollocationSelect,
} as const;
