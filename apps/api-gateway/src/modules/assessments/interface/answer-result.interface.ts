export interface AnswerResult {
	questionId: string;
	questionType: string; // mcq_single | mcq_multi | fill_blank | essay | speaking
	isCorrect: boolean | null;
	earnedScore: number | null;
	maxScore: number;
	gradingStatus: string;

	stemText: string | null;

	userAnswer: {
		optionIds?: string[]; // mcq_single/mcq_multi — array of optionId
		optionTexts?: string[];
		textAnswer?: string; // fill_blank/essay/speaking
	} | null;
	correctAnswer: {
		optionIds?: string[]; // optionId của đáp án đúng (mcq)
		optionTexts?: string[]; // text của đáp án đúng (mcq) — để hiển thị
		textAnswers?: string[]; // answerKeysJson (fill_blank)
	} | null;

	aiFeedback: {
		overallScore: number;
		dimensions: Array<{
			name: string;
			score: number;
			feedback: string; // map từ "comment" trong criteriaJson
		}>;
		corrections: Array<{
			original: string;
			corrected: string;
			rule: string;
		}>;
		suggestions: string[];
	} | null;
}
