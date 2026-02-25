import { WordFormItem } from './word-form-item.interface';
import { SenseItem } from './sense-item.interface';

export interface DictEntryLookup {
	entryId: string;

	lang: string;
	headword: string;
	pos: string | null;
	ipa: string | null;
	cefrLevel: string | null;
	source: string | null;

	wordForms: WordFormItem[];
	senses: SenseItem[];

	searchedAs?: string; // return roots whenever user search another type of this word
}
