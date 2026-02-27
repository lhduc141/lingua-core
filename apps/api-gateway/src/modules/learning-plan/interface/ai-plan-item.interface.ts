export interface AiPlanItem {
	day: number;
	position: number;
	itemType: 'lesson' | 'practice_session' | 'custom_activity' | 'weekly_review';
	refId: string | null;
	title: string;
	description: string | null;
	rationale: string | null;
	estimatedMinutes: number;
	skillName: string | null;
}
