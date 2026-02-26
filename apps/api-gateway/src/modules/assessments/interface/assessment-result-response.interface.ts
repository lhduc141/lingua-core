import { AttemptResult } from './attempt-result.interface';

// Complete / Result Response
export interface AssessmentResultResponse {
	assessmentId: string;
	refType: string;
	status: string;
	score: number | null;
	totalQuestions: number;
	correctCount: number | null;
	startedAt: Date | null;
	completedAt: Date | null;
	message?: string;
	attempts: AttemptResult[];
}
