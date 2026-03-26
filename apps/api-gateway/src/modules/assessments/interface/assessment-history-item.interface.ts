export interface AssessmentHistoryItem {
	exerciseRecordId: string;
	refType: string;
	refId: string;
	refTitle: string | null;
	skillName: string | null;
	cefrLevel: string | null;
	status: string;
	score: number | null;
	totalQuestions: number;
	startedAt: Date | null;
	completedAt: Date | null;
}
