import { PlanTask } from './plan-task.interface';

export interface PlanDay {
	day: number;
	date: string;
	totalTasks: number;
	status: 'completed' | 'in_progress' | 'pending';
	tasks: PlanTask[];
}
