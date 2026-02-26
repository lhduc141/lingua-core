// ─── Attempt Result ──────────────────────────────────────────
export interface AttemptResult {
	attemptId: string;
	questionId: string;
	type: string;
	modality: string | null;
	correct: boolean | null;
	score: number | null;
	gradingStatus: string;
	correctOptionId: string | null; // chỉ trả khi scored
	userAnswer: {
		optionId?: string | null;
		textAnswer?: string | null;
	};
	evaluation: {
		overallScore: number;
		criteriaJson: any;
	} | null;
}
