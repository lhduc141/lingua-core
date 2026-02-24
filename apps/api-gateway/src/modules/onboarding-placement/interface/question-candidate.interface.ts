import { CatQuestion } from './cat-question.interface';

export interface QuestionCandidate {
	question: CatQuestion;
	information: number; // Fisher Information I(θ) at current theta
	exposureRate: number; // usageCount / totalCompletedSessions
	priority: number; // information * exposure_penalty_factor
}
