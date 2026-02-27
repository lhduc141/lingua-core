export enum PlanQueues {
	PLAN = 'plan',
	PLAN_SCHEDULER = 'plan.scheduler',
	PLAN_GENERATOR = 'plan.generator',
	PLAN_AI = 'plan.ai',
}

export enum PlanJob {
	GENERATE_PLAN = 'generate-plan',
	UPDATE_PROGRESS = 'update-progress',
	SCHEDULE_SESSION = 'schedule-session',
	GRADE_CUSTOM_ACTIVITY = 'grade-custom-activity',
}
