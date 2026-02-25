import { PassageBrief } from './passage-brief.interface';
import { QuestionOption } from './question-option.interface';

export interface QuestionItem {
	questionId: string;
	position: number;
	type: string;

	difficulty: number;
	maxScore: number;
	stemText: string | null;
	contentJson: unknown | null;

	passage: PassageBrief | null;
	options: QuestionOption[];
}
