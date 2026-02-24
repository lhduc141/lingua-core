export interface StopDecision {
	shouldStop: boolean;
	reason: 'se_threshold' | 'max_questions' | 'continue';

	// // Current state
	// currentSe: number;
	// questionsAdministered: number;
	//
	// // Thresholds
	// targetSe: number;
	// minQuestions: number;
	// maxQuestions: number;
}
