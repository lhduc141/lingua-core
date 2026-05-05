export interface AssessmentQuestion {
	questionId: string;
	type: string;
	position: number;
	maxScore: number | null;
	stemText: string | null;
	contentJson: any;
	passage: {
		passageId: string;
		title: string | null;
		content: string;
		cefrLevel: string | null;
		wordCount: number | null;
		audioUrl: string | null;
	} | null;
	options: {
		optionId: string;
		position: number | null;
		text: string | null;
	}[];
}
