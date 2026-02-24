import { FormattedQuestion } from './formatted-question.interface';
import { PlacementResult } from './placement-result.inteface';

export interface AnswerPlacementResponse {
	isCorrect: boolean;
	updatedTheta: number;
	updatedSe: number;
	isCompleted: boolean;
	progress: {
		questionsAnswered: number;
		minQuestions: number;
		maxQuestions: number;
	};
	nextQuestion?: FormattedQuestion;
	result?: PlacementResult;
}
