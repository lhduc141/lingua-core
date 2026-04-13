export interface StatusStatsResult {
	users: {
		total: number;
		active: number;
		newThisWeek: number;
	};
	content: {
		lessons: number;
		questionSets: number;
		questions: number;
		passages: number;
		dictionaryEntries: number;
	};

	activity: {
		exerciseRecordsThisWeek: number;
		pendingGrading: number;
	};

	funnel: {
		totalUsers: number;
		surveyDone: number;
		placementDone: number;
	};
	cefrDistribution: Record<string, number>;
	skillPerformance: Record<string, { avgScore: number | null; count: number }>;
}
