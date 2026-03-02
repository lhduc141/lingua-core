import { Prisma } from '@prisma/client';
import { DictEntrySelect } from './dict-entry.select';

export const WordFormSelect = {
	lookup: {
		pos: true,
		entry: { select: DictEntrySelect.lookup },
	} satisfies Prisma.WordFormSelect,
} as const;
