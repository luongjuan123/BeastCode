export interface ModerationConfig {
	appealDeadlineDays: number;
	deletionDelayDays: number;
	maxReportsPerDayPerUser: number;
	reportCooldownSeconds: number;
	maxUploadSizeBytes: number;
	warningThresholdForSuspension: number;
	warningExpirationDays: number;
}

export const moderationConfig: ModerationConfig = {
	appealDeadlineDays: 14,
	deletionDelayDays: 14,
	maxReportsPerDayPerUser: 5,
	reportCooldownSeconds: 600, // 10 minutes
	maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
	warningThresholdForSuspension: 3,
	warningExpirationDays: 30, // Warnings expire after 30 days
};
