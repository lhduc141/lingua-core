import { PlacementResult } from '../interface/placement-result.inteface';

export interface CatAnswerResponse {
	isCorrect: boolean;

	updatedTheta: number;
	updatedSe: number;

	nextQuestion?: {
		questionId: string;
		passageId: string | null;
		content: any;
	};

	isCompleted: boolean;

	result?: PlacementResult;

	progress: {
		questionsAnswered: number;
		minQuestions: number;
		maxQuestions: number;
		estimatedRemaining: number;
	};
}
