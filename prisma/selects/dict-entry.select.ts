import { Prisma } from '@prisma/client';

export const DictEntrySelect = {
	// Full lookup response — max 3 senses, max 5 collocations per sense
	lookup: {
		entryId: true,
		headword: true,
		pos: true,
		ipa: true,
		cefrLevel: true,
		source: true,
		wordForms: {
			where: { deletedAt: null },
			select: { form: true, pos: true },
		},
		senses: {
			where: { deletedAt: null },
			orderBy: { order: 'asc' as const },
			take: 3,
			select: {
				senseId: true,
				shortDef: true,
				viDef: true,
				synonyms: true,
				antonyms: true,
				examples: {
					where: { deletedAt: null },
					select: { example: true, translation: true },
				},
				collocations: {
					where: { deletedAt: null },
					orderBy: { frequency: 'asc' as const },
					take: 5,
					select: {
						collocationId: true,
						phrase: true,
						meaning: true,
						viMeaning: true,
						example: true,
						viExample: true,
					},
				},
			},
		},
	} satisfies Prisma.DictEntrySelect,

	minimal: {
		entryId: true,
		headword: true,
		pos: true,
		cefrLevel: true,
	} satisfies Prisma.DictEntrySelect,
} as const;
