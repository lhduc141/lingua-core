export type CatInitResponse = {
	sessionId: string;
	firstQuestion: {
		questionId: string;
		passageId: string | null;
		content: any; // Full question object from DB
	};
	initialState: {
		theta: number;
		se: number;
		questionsRemaining: number;
	};
};
