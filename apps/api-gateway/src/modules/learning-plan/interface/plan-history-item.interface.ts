export interface PlanHistoryItem {
	planCycle: number;
	weekNumber: number;
	startDate: string;
	endDate: string;
	totalTasks: number;
	completedTasks: number;
	skippedTasks: number;
	progress: number;
}
