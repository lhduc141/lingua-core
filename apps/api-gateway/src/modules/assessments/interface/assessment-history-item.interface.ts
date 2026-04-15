export interface AssessmentHistoryItem {
	exerciseRecordId: string;
	refType: string;
	refId: string;
	title: string | null; // Update (rename) 14/04/26: rename to feat with UI
	skillName: string | null;
	cefrLevel: string | null;
	status: string;
	score: number | null;
	totalQuestions: number;

	correctCount: number; // Update (add) 14/04/26: improve UI

	startedAt: Date | null;
	completedAt: Date | null;
}
