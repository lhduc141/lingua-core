import { CefrAssignment } from './cefr-assignment.inteface';

export interface PlacementResult {
	sessionId: string;
	cefrAssignment: CefrAssignment;

	finalTheta: number;
	finalSe: number;

	questionsAdministered: number;
	correctAnswers: number;
	accuracyRate: number; // percentage, e.g. 64.3

	startedAt: Date;
	completedAt: Date;
}
