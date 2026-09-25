export interface PlanSkillPerformance {
	skill: string;
	avg: number;
}

export interface PlanDiagnosticWeakness {
	skill: string;
	criterion: string;
	tag: string;
	severity: 'low' | 'medium' | 'high';
	score: number | null;
	evidence: string | null;
	date?: string | null;
}

export interface PlanWeekDate {
	day: number;
	weekday: string;
	date: string;
}

export interface PlanLearnerContext {
	primaryGoal: string | null;
	targetGoal: string | null;
	focusSkills: string[];
	planSkills: string[];
	plannedStudyHoursPerWeek: number;
	availableDays: string[];
	dailyMinutesLimit: number;
}

export interface PlanContext {
	/** Proficiency estimate from placement/CAT. */
	cefrLevel: string;
	/** Content retrieval level. C1 learners currently use the B2 catalog ceiling. */
	contentTargetLevel: string;
	learnerContext: PlanLearnerContext;
	skillPerformance: PlanSkillPerformance[];
	recentWeaknesses: PlanDiagnosticWeakness[];
	weekStartDate: string;
	weekEndDate: string;
	weekDates: PlanWeekDate[];
}
