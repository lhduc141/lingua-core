import { Prisma } from '@prisma/client';

export const PassageSelect = {
	create: {
		passageId: true,
		title: true,
		content: true,
		wordCount: true,
		cefrLevel: true,
		topic: true,
		sourceTag: true,
	} satisfies Prisma.PassageSelect,
} as const;
