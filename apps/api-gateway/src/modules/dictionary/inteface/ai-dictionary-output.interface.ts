import { AiSenseInput } from './ai-sense-input.interface';
import { AiWordFormInput } from './ai-word-form-input.interface';

export interface AiDictionaryOutput {
	headword: string; // luôn là ROOT form
	ipa?: string;
	pos?: string;
	cefrLevel?: string;
	wordForms: AiWordFormInput[];
	senses: AiSenseInput[];
}
