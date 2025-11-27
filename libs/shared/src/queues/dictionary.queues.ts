//TODO libs/shared/src/queues/dictionary.queues.ts

export enum DictQueues {
	DICTIONARY = 'dictionary',
	DICT_IMPORT = 'dict.import',
	DICT_LOOKUP_FALLBACK = 'dict.lookup.fallback',
}

export enum DictJob {
	BACKFILL_BY_AI = 'backfill-by-ai',
	IMPORT_ENTRY = 'import-entry',
	LOOKUP_AND_CACHE = 'lookup-and-cache',
	FETCH_AUDIO = 'fetch-audio',
}
