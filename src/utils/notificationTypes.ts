export type BeastNotificationPriority = "critical" | "high" | "normal" | "low" | "silent";

export type BeastNotificationEvent =
	// Authentication & Security
	| "AUTH_WELCOME"
	| "AUTH_VERIFY"
	| "AUTH_RESET"
	| "AUTH_CHANGE_CONFIRM"
	| "AUTH_LOGIN_ALERT"
	| "SECURE_TERMINATION"
	// Contest Triggers (15 specific states + old aliases)
	| "CONTEST_PUBLISHED"
	| "CONTEST_REG_OPEN"
	| "CONTEST_REG_CONFIRM"
	| "CONTEST_CLOSING_SOON"
	| "CONTEST_STARTING_TOMORROW"
	| "CONTEST_STARTING_1H"
	| "CONTEST_STARTING_30M"
	| "CONTEST_STARTING_10M"
	| "CONTEST_STARTED"
	| "CONTEST_ENDING_SOON"
	| "CONTEST_ENDED"
	| "CONTEST_EDITORIAL_RELEASED"
	| "CONTEST_RESULTS_PUBLISHED"
	| "CONTEST_CANCELLED"
	| "CONTEST_RESCHEDULED"
	| "VIRTUAL_MODE"
	| "CONTEST_REG_REMINDER"
	| "CONTEST_SOON"
	| "CONTEST_ENDING"
	| "CONTEST_WINNER"
	// Problems
	| "PROB_DAILY"
	| "PROB_SOLVED_MILESTONE"
	| "PROB_EDITORIAL"
	| "PROB_RECOMMENDED"
	// Threads & Social
	| "THREAD_REPLY"
	| "THREAD_MENTION"
	| "THREAD_LIKE"
	| "THREAD_QUOTE"
	// Chat & Messaging
	| "CHAT_DIRECT_MESSAGE"
	| "CHAT_MENTION"
	// Account
	| "ACC_PROFILE_UPDATED"
	| "ACC_PASSWORD_CHANGED"
	| "ACC_ROLE_CHANGED"
	| "ACC_WARNING"
	| "ACC_SUSPICIOUS_LOGIN"
	// System
	| "SYS_MAINTENANCE"
	| "SYS_DOWNTIME"
	| "SYS_RESTORED"
	| "SYS_NEW_FEATURE"
	| "SYS_NEWSLETTER"
	// Achievements
	| "ACH_BADGE"
	| "ACH_LEVEL_UP"
	| "ACH_XP_MILESTONE"
	| "ACH_STREAK_REMINDER"
	| "ACH_STREAK_WARN"
	// University
	| "UNI_INVITE"
	| "UNI_CONTEST_INVITE"
	| "UNI_TEAM_INVITE";

export interface ChannelPreference {
	inApp: boolean;
	email: boolean;
}

export interface UserNotificationPreferences {
	contest: ChannelPreference;
	problem: ChannelPreference;
	thread: ChannelPreference;
	submission: ChannelPreference;
	achievements: ChannelPreference;
	account: ChannelPreference;
	admin: ChannelPreference;
	university: ChannelPreference;
	system: ChannelPreference;
	security: ChannelPreference;
	marketing: ChannelPreference;
}

export interface NotificationPayload {
	toEmail: string;
	toUid: string;
	userName: string;
	placeholders?: Record<string, string>;
	details?: { label: string; value: string; isHighlight?: boolean }[];
	ctaText?: string;
	ctaUrl?: string;
	customContent?: string;
	eventId?: string;
	metadata?: Record<string, any>;
	fromUid?: string;
	fromDisplayName?: string;
	fromAvatarUrl?: string;
}

export interface DispatchResult {
	success: boolean;
	message: string;
	logId?: string;
	queuedId?: string;
	status: "queued" | "skipped" | "failed";
}

export interface InAppNotificationRecord {
	id?: string;
	toUid: string;
	fromUid: string;
	fromDisplayName: string;
	fromAvatarUrl: string;
	type: BeastNotificationEvent;
	title: string;
	body: string;
	category: string;
	priority: BeastNotificationPriority;
	createdAt: number;
	read: boolean;
	ctaText?: string;
	ctaUrl?: string;
	threadId?: string;
	contestId?: string;
	problemId?: string;
	metadata?: Record<string, any>;
}
