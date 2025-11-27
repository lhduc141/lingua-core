export enum PlanQueues {
  PLAN = 'plan',
  PLAN_SCHEDULER = 'plan.scheduler',
  PLAN_GENERATOR = 'plan.generator',
}

export enum PlanJob {
  GENERATE_PLAN = 'generate-plan',
  UPDATE_PROGRESS = 'update-progress',
  SCHEDULE_SESSION = 'schedule-session',
}
