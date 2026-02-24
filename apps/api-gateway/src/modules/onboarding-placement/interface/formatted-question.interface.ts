export interface FormattedQuestion {
	questionId: string;
	passageId: string | null;

	passage: {
		passageId: string;
		title: string | null;
		content: string;
		cefrLevel: string | null;
	} | null;

	content: {
		stemText: string | null;
		contentJson: any;
	};

	options: Array<{
		optionId: string;
		position: number | null;
		text: string | null;
	}>;
}
