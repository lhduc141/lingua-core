export enum MaintenanceQueues {
  MAINTENANCE = 'maintenance',
  CACHE_CLEANUP = 'cache.cleanup',
  TOKEN_USAGE_REPORT = 'cache.token.usage',
}

export enum MaintenanceJob {
  CLEANUP_CACHE = 'cleanup-cache',
  GENERATE_USAGE_REPORT = 'generate-usage-report',
  DELETE_EXPIRED_RECORDS = 'delete-expired-records',
}
