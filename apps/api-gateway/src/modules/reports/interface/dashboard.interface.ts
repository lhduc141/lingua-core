// GET /dashboard/overview
export interface DashboardOverview {
	cefrLevel: string | null;
	cefrConfidence: number | null;
	currentPlanCycle: number | null;
	planProgress: {
		totalItems: number;
		completedItems: number;
		percentage: number;
	} | null;
	skillSummary: Record<string, SkillSummaryItem>;
	streak: {
		currentDays: number;
		longestDays: number;
	};
	vocabularyCount: number;
	totalAssessments: number;
	totalStudyMinutes: number;
	recentActivity: RecentActivityItem[];
}

export interface SkillSummaryItem {
	avgScore: number | null;
	assessmentCount: number;
	trend: 'up' | 'down' | 'stable' | 'new';
}

export interface RecentActivityItem {
	type: 'assessment' | 'plan_item';
	title: string;
	skillName: string | null;
	score: number | null;
	status: string;
	date: string;
}

// GET /dashboard/skills/:skillName/progress
export interface SkillProgress {
	skillName: string;
	avgScore: number | null;
	assessmentCount: number;
	trend: 'up' | 'down' | 'stable' | 'new';
	scoreHistory: ScoreHistoryPoint[];
	planItemsCompleted: number;
	planItemsTotal: number;
}

export interface ScoreHistoryPoint {
	date: string;
	score: number;
	refType: string;
	refTitle: string | null;
}

// GET /dashboard/streak
export interface StreakData {
	currentDays: number;
	longestDays: number;
	lastActiveDate: string | null;
	activityCalendar: ActivityDay[];
}

export interface ActivityDay {
	date: string;
	assessmentCount: number;
	planItemsCompleted: number;
	totalStudyMinutes: number;
}

// GET /dashboard/study-time
export interface StudyTimeData {
	period: string;
	totalMinutes: number;
	avgMinutesPerDay: number;
	dailyBreakdown: DailyStudyTime[];
}

export interface DailyStudyTime {
	date: string;
	minutes: number;
	assessmentCount: number;
}
