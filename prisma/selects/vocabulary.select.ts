import { Prisma } from '@prisma/client';

export const VocabularySelect = {
	list: {
		id: true,
		status: true,
		note: true,
		context: true,
		addedAt: true,
		entry: {
			select: {
				entryId: true,
				headword: true,
				cefrLevel: true,
				pos: true,
				ipa: true,
			},
		},
	} satisfies Prisma.UserVocabularySelect,
} as const;
