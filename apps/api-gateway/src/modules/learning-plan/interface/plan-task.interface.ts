// Represents a single task in the daily plan
export interface PlanTask {
	itemId: string;
	title: string;
	description: string | null;
	rationale: string | null;
	itemType: string;
	refType: string | null;
	refId: string | null;
	status: string;
	estimatedMinutes: number | null;
	skillName: string | null;
	submittedText: string | null;
	taskScore: number | null;
	// weekly_review specific
	userFeedback: string | null;
	feedbackSubmittedAt: Date | null;
}
