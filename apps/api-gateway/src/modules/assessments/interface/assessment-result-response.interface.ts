import { AnswerResult } from './answer-result.interface';

export interface AssessmentResultResponse {
	exerciseRecordId: string;
	refType: string;
	status: string;
	score: number | null;
	totalQuestions: number;
	correctCount: number | null;
	startedAt: Date | null;
	completedAt: Date | null;
	message?: string;
	answers: AnswerResult[];
}
