import { FormattedQuestion } from './formatted-question.interface';

export interface StartPlacementResponse {
	assessmentId: string;
	sessionId: string;
	firstQuestion: FormattedQuestion;
	config: {
		minQuestions: number;
		maxQuestions: number;
		targetSe: number;
		initialTheta: number;
	};
}
