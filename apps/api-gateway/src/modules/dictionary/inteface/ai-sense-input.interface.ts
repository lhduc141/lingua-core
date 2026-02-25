import { AiExampleInput } from './ai-example-input.interface';
import { AiCollocationInput } from './ai-collocation-input.interface';

export interface AiSenseInput {
	definition: string;
	viDefinition?: string;
	examples: AiExampleInput[];
	synonyms: string[];
	antonyms: string[];
	collocations: AiCollocationInput[];
}
