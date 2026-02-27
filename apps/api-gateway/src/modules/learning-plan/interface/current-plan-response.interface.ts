import { PlanDay } from './plan-day.interface';

export interface CurrentPlanResponse {
	planCycle: number;
	weekNumber: number;
	startDate: string;
	endDate: string;
	totalDays: number;
	completedDays: number;
	overallProgress: number;
	days: PlanDay[];
}
