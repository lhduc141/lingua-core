export type PlanContentItemType = 'lesson' | 'practice_session';

export interface PlanContentCandidate {
	/** Short stable reference exposed to the LLM. */
	refId: string;
	/** Full database UUID. Never needs to be sent to the LLM. */
	fullRefId: string;
	itemType: PlanContentItemType;
	title: string;
	description: string | null;
	skillName: string;
	cefrLevel: string | null;
	estimatedMinutes: number | null;
}

export interface PlanSelectedContentDetail extends PlanContentCandidate {
	theorySummary?: string | null;
	questionCount?: number;
	questionTypes?: string[];
	sampleStems?: string[];
}
