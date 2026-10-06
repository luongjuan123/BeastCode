import { BeastNotificationEvent, BeastNotificationPriority } from "./notificationTypes";

export interface TemplateConfig {
	category: "contest" | "problem" | "thread" | "submission" | "achievements" | "account" | "admin" | "university" | "system" | "security" | "marketing";
	priority: BeastNotificationPriority;
	subject: string;
	headerTitle: string;
	accentColor: string;
	accentGlowColor: string;
	title: string;
	leadText: string;
	description?: string;
	details: { label: string; value: string; isHighlight?: boolean }[];
	ctaText?: string;
	ctaUrl?: string;
	footerText?: string;
	otpCode?: string;
	otpExpiration?: string;
	contestCard?: {
		title: string;
		startTime: string;
		duration: string;
		countdown?: string;
		bannerUrl?: string;
	};
	orgCard?: {
		orgName: string;
		orgAvatar?: string;
		roleName?: string;
		ownerName?: string;
		detailsText?: string;
	};
}

export const EVENT_TEMPLATES: Record<BeastNotificationEvent, (name: string, ph: Record<string, string>, customContent?: string) => TemplateConfig> = {
	// Authentication & Security
	AUTH_WELCOME: (name, ph, customContent) => ({
		category: "account",
		priority: "high",
		subject: "Welcome to BeastCode!",
		headerTitle: "Welcome",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: "Welcome to the Coding Arena!",
		leadText: `Hello ${name}, welcome to BeastCode! Your account has been successfully created.`,
		description: customContent || "Get ready to solve challenging problems, compete in real-time contests, and learn from top editorials.",
		details: [
			{ label: "Account Username", value: name },
			{ label: "Status", value: "Active", isHighlight: true }
		],
		ctaText: "Explore Challenges"
	}),

	AUTH_VERIFY: (name, ph, customContent) => ({
		category: "security",
		priority: "critical",
		subject: "Verify Your Email Address - BeastCode",
		headerTitle: "Verification",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Confirm Your Account",
		leadText: `Hello ${name}, please verify your email address to complete your registration.`,
		description: customContent || "Click the verification button below. This link will expire in 24 hours.",
		details: [
			{ label: "Verification Code", value: ph.code || "N/A" },
			{ label: "Expiry Time", value: "24 Hours", isHighlight: true }
		],
		ctaText: "Verify Email"
	}),

	AUTH_RESET: (name, ph, customContent) => ({
		category: "security",
		priority: "critical",
		subject: "Reset Your Password - BeastCode",
		headerTitle: "Reset your password",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Reset your password",
		leadText: `Hello ${name},`,
		description: "We received a request to reset your password. Click below to continue.<br/><br/>If you didn't request this, ignore this email. The link expires after one hour.",
		details: [
			{ label: "IP Address", value: ph.ip || "Unknown IP" },
			{ label: "Expires In", value: "1 Hour", isHighlight: true }
		],
		ctaText: "Reset Password",
		footerText: `BeastCode &bull; Competitive Programming Platform &bull; bomboclatbeastcode.codes<br/>Need help? <a href="mailto:support@beastcode.codes" style="color: #ef4444; text-decoration: none; font-weight: 600;">support@beastcode.codes</a>`
	}),

	AUTH_CHANGE_CONFIRM: (name, ph, customContent) => ({
		category: "security",
		priority: "critical",
		subject: "Confirm Email Change - BeastCode",
		headerTitle: "Security Link",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Confirm Email Update",
		leadText: `Hello ${name}, you requested to change your email address.`,
		description: customContent || "Click the button below to confirm your new email. Your old email address will remain active until you confirm.",
		details: [
			{ label: "New Email", value: ph.newEmail || "N/A", isHighlight: true }
		],
		ctaText: "Confirm Email Change"
	}),

	AUTH_LOGIN_ALERT: (name, ph, customContent) => ({
		category: "security",
		priority: "high",
		subject: "Security Alert: New Login - BeastCode",
		headerTitle: "Security Notice",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "New Account Sign-in",
		leadText: `Hello ${name}, we detected a new login on your BeastCode account.`,
		description: customContent || "If this was you, no action is needed. If you do not recognize this activity, change your password immediately.",
		details: [
			{ label: "Device/Browser", value: ph.device || "Unknown Browser" },
			{ label: "IP Address", value: ph.ip || "Unknown IP" },
			{ label: "Time", value: new Date().toLocaleString() }
		],
		ctaText: "Review Account Security"
	}),

	SECURE_TERMINATION: (name, ph, customContent) => ({
		category: "security",
		priority: "critical",
		subject: `[Security Alert] Contest Session Terminated: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Security Terminate",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Session Disqualified",
		leadText: `Hello ${name},`,
		description: `Your active session in the contest <strong>${ph.contestTitle || "Contest"}</strong> has been terminated due to a violation of the secure exam rules. Your access has been locked and submissions disqualified.`,
		details: [
			{ label: "Contest", value: ph.contestTitle || "Contest" },
			{ label: "Reason", value: customContent || "Violation of secure browser environment rules", isHighlight: true }
		],
		ctaText: "Review Security Rules"
	}),

	// Contest Triggers (15 specific stages)
	CONTEST_PUBLISHED: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `[New Contest] ${ph.contestTitle || "Contest"} has been scheduled!`,
		headerTitle: "Contest Published",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: ph.contestTitle || "Contest Scheduled",
		leadText: `Hello ${name}, a new competitive programming contest has been scheduled on BeastCode!`,
		description: customContent || "Review the contest details below and secure your spot in the arena.",
		contestCard: {
			title: ph.contestTitle || "Contest",
			startTime: ph.startTime || "N/A",
			duration: ph.durationText || "120 minutes",
			bannerUrl: ph.bannerUrl || undefined
		},
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" },
			{ label: "Duration", value: ph.durationText || "120 minutes" }
		],
		ctaText: "Register Now"
	}),

	CONTEST_REG_OPEN: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `[Registration Open] ${ph.contestTitle || "Contest"} - Register Now!`,
		headerTitle: "Registration Open",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: "Registration Now Open",
		leadText: `Hello ${name}, registration is now officially open for ${ph.contestTitle || "Contest"}.`,
		description: customContent || "Make sure to register early to secure your division seating.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Start Date", value: ph.startTime || "N/A" }
		],
		ctaText: "Register Now"
	}),

	CONTEST_REG_CONFIRM: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `[BeastCode] Registration Confirmed: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Registration",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: "Spot Reserved",
		leadText: `Hello ${name}, your registration for the upcoming contest has been confirmed!`,
		description: customContent || "Get ready to compete and test your programming speed against other coders.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" },
			{ label: "Duration", value: ph.durationText || "120 minutes" }
		],
		ctaText: "View Arena Page"
	}),

	CONTEST_CLOSING_SOON: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[BeastCode Reminder] Registration Closing Soon: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Closing Soon",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "Registration Closing Soon",
		leadText: `Hello ${name}, registration is closing soon for ${ph.contestTitle || "Contest"}.`,
		description: customContent || "Register immediately to make sure you do not miss this contest's rating update.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Registration Deadline", value: ph.deadlineTime || "1 hour" }
		],
		ctaText: "Register Now"
	}),

	CONTEST_STARTING_TOMORROW: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `[BeastCode] 24 Hours to Go: ${ph.contestTitle || "Contest"}`,
		headerTitle: "24h Countdown",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Starts Tomorrow",
		leadText: `Hello ${name}, ${ph.contestTitle || "Contest"} will start in exactly 24 hours.`,
		description: customContent || "Ensure your environment is set up. Best of luck in the coding arena tomorrow!",
		details: [
			{ label: "Contest", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" }
		],
		ctaText: "Review Problem Set"
	}),

	CONTEST_STARTING_1H: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[BeastCode] 1 Hour to Go: ${ph.contestTitle || "Contest"}`,
		headerTitle: "1h Countdown",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "Starts in 1 Hour!",
		leadText: `Hello ${name}, the arena is preparing to open for ${ph.contestTitle || "Contest"}.`,
		description: customContent || "Warm up, prepare your algorithms sheet, and get ready to code.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" }
		],
		ctaText: "Enter Contest Room"
	}),

	CONTEST_STARTING_30M: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[BeastCode] 30 Minutes to Go: ${ph.contestTitle || "Contest"}`,
		headerTitle: "30m Countdown",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: "Starts in 30 Minutes!",
		leadText: `Hello ${name}, only 30 minutes left before ${ph.contestTitle || "Contest"} begins.`,
		description: customContent || "The virtual doors will open shortly. Double check your configuration.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" }
		],
		ctaText: "Get Ready"
	}),

	CONTEST_STARTING_10M: (name, ph, customContent) => ({
		category: "contest",
		priority: "critical",
		subject: `[IMPORTANT] 10 Minutes to Go: ${ph.contestTitle || "Contest"}`,
		headerTitle: "10m Countdown",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Starts in 10 Minutes!",
		leadText: `Hello ${name}, the contest is about to start!`,
		description: customContent || "Open the compiler page now to avoid starting late.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "N/A" }
		],
		ctaText: "Open Contest Arena"
	}),

	CONTEST_STARTED: (name, ph, customContent) => ({
		category: "contest",
		priority: "critical",
		subject: `[LIVE NOW] Contest has started: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Live Now",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "The Arena is Open!",
		leadText: `Hello ${name}, the contest is officially active!`,
		description: customContent || "Start coding immediately. Every second counts towards the speed score.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "End Time", value: ph.endTime || "N/A" }
		],
		ctaText: "Solve Problems Now"
	}),

	CONTEST_ENDING_SOON: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[COUNTDOWN] 15 Minutes Left in ${ph.contestTitle || "Contest"}`,
		headerTitle: "Contest Ending",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Submit Your Final Code",
		leadText: `Hello ${name}, only 15 minutes left to submit your solutions!`,
		description: customContent || "Ensure all solution files are compiled, tested, and submitted before the deadline.",
		details: [
			{ label: "Contest", value: ph.contestTitle || "Contest" },
			{ label: "Ends At", value: ph.endTime || "N/A" }
		],
		ctaText: "Enter Solutions"
	}),

	CONTEST_ENDED: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `[BeastCode] Contest Completed: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Contest Ended",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Arena Closed",
		leadText: `Hello ${name}, congratulations on completing the contest!`,
		description: customContent || "Great job in the arena. Detailed rankings and scoreboard will be finalized shortly.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Finished At", value: new Date().toLocaleTimeString() }
		],
		ctaText: "View Standings"
	}),

	CONTEST_EDITORIAL_RELEASED: (name, ph, customContent) => ({
		category: "problem",
		priority: "normal",
		subject: `[Solutions Released] Editorial for ${ph.contestTitle || "Contest"}`,
		headerTitle: "Editorial Out",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: "Official Editorial Out Now",
		leadText: `Hello ${name}, the editorial for ${ph.contestTitle || "Contest"} has been published!`,
		description: customContent || "Study optimal algorithms, check time/space complexity analysis, and practice upsolving.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Problems Total", value: ph.problemsCount || "N/A" }
		],
		ctaText: "Read Solutions"
	}),

	CONTEST_RESULTS_PUBLISHED: (name, ph, customContent) => ({
		category: "achievements",
		priority: "normal",
		subject: `[Standings] Results Available for ${ph.contestTitle || "Contest"}`,
		headerTitle: "Rankings",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Official Standings Released",
		leadText: `Hello ${name}, results and rating updates are now published!`,
		description: customContent || "Check your leaderboard position, score, and new competitive rating updates.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Your Rank", value: ph.rank || "N/A", isHighlight: true },
			{ label: "Rating Change", value: ph.ratingChange || "0", isHighlight: true }
		],
		ctaText: "Check Standings"
	}),

	CONTEST_CANCELLED: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[Notice] Contest Cancelled: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Contest Cancelled",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Contest Cancellation Notice",
		leadText: `Hello ${name}, we regret to inform you that ${ph.contestTitle || "Contest"} has been cancelled.`,
		description: customContent || "Due to scheduling issues or technical adjustments, this contest will not take place. We apologize for the inconvenience.",
		details: [
			{ label: "Contest", value: ph.contestTitle || "Contest" },
			{ label: "Original Start", value: ph.startTime || "N/A" }
		],
		ctaText: "Check Other Arenas"
	}),

	CONTEST_RESCHEDULED: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `[Rescheduled] New Time for ${ph.contestTitle || "Contest"}`,
		headerTitle: "Rescheduled",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "Contest Rescheduled",
		leadText: `Hello ${name}, ${ph.contestTitle || "Contest"} has been moved to a new time.`,
		description: customContent || "Please update your calendar. If you registered previously, your registration is still valid for the new date.",
		details: [
			{ label: "Contest", value: ph.contestTitle || "Contest" },
			{ label: "New Start Time", value: ph.newStartTime || "N/A", isHighlight: true }
		],
		ctaText: "View New Schedule"
	}),

	VIRTUAL_MODE: (name, ph, customContent) => ({
		category: "problem",
		priority: "normal",
		subject: `[Virtual Arena] Session active: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Virtual Practice",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Virtual Practice Mode Active",
		leadText: `Hello ${name}, your virtual simulation session has begun!`,
		description: customContent || `Solve problems from <strong>${ph.contestTitle || "Contest"}</strong> against the historical timer to test your performance.`,
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Time Allocated", value: ph.durationText || "120 minutes" }
		],
		ctaText: "Enter Virtual Arena"
	}),

	// Problems
	PROB_DAILY: (name, ph, customContent) => ({
		category: "problem",
		priority: "normal",
		subject: `[Daily Challenge] Solve "${ph.problemTitle || "Problem"}" today!`,
		headerTitle: "Daily Challenge",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: ph.problemTitle || "Problem of the Day",
		leadText: `Hello ${name}, here is your daily competitive coding target.`,
		description: customContent || "Solve this problem today to maintain your daily streak and earn XP bonuses.",
		details: [
			{ label: "Problem Title", value: ph.problemTitle || "Problem" },
			{ label: "Difficulty", value: ph.difficulty || "Medium", isHighlight: true },
			{ label: "XP Award", value: "+50 XP" }
		],
		ctaText: "Solve Daily Challenge"
	}),

	PROB_SOLVED_MILESTONE: (name, ph, customContent) => ({
		category: "achievements",
		priority: "high",
		subject: `Milestone Unlocked: ${ph.solvedCount || "100"} Problems Solved!`,
		headerTitle: "Milestone",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: "Coding Milestone Unlocked",
		leadText: `Hello ${name}, congratulations on reaching a massive milestone!`,
		description: customContent || `You have successfully solved ${ph.solvedCount || "100"} unique challenges on BeastCode.`,
		details: [
			{ label: "Problems Solved", value: ph.solvedCount || "100", isHighlight: true },
			{ label: "Current Level", value: ph.level || "1" }
		],
		ctaText: "View Dashboard Stats"
	}),

	PROB_EDITORIAL: (name, ph, customContent) => ({
		category: "problem",
		priority: "normal",
		subject: `[Problem Solution] Editorial published for ${ph.problemTitle || "Problem"}`,
		headerTitle: "Problem Solution",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Optimal Solution Published",
		leadText: `Hello ${name}, the explanation guide for ${ph.problemTitle || "Problem"} is now available.`,
		description: customContent || "Study how to optimize your code structure, improve time complexity, and learn edge case handling.",
		details: [
			{ label: "Problem", value: ph.problemTitle || "Problem" },
			{ label: "Difficulty", value: ph.difficulty || "Medium" }
		],
		ctaText: "Read Explanation"
	}),

	PROB_RECOMMENDED: (name, ph, customContent) => ({
		category: "marketing",
		priority: "low",
		subject: "Recommended practice challenges for you",
		headerTitle: "Recommended",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Curated Practice List",
		leadText: `Hello ${name}, based on your activity, we recommended these challenges to build your skills:`,
		description: customContent || "Practice topics you struggled on to master algorithms and coding patterns.",
		details: [
			{ label: "Difficulty Focus", value: ph.focus || "Medium/Hard" }
		],
		ctaText: "Solve Recommendations"
	}),

	// Threads & Social
	THREAD_REPLY: (name, ph, customContent) => ({
		category: "thread",
		priority: "high",
		subject: `[New Reply] ${ph.replierName || "User"} replied: "${ph.threadTitle || "Thread"}"`,
		headerTitle: "Thread Reply",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "New Reply Activity",
		leadText: `Hello ${name}, ${ph.replierName || "Someone"} has commented on your discussion thread.`,
		description: customContent || `"${ph.excerpt || "Check full reply on site..."}"`,
		details: [
			{ label: "Thread", value: ph.threadTitle || "Thread Title" },
			{ label: "Replied By", value: ph.replierName || "User" }
		],
		ctaText: "Read Full Reply"
	}),

	THREAD_MENTION: (name, ph, customContent) => ({
		category: "thread",
		priority: "high",
		subject: `You were mentioned in "${ph.threadTitle || "Thread"}"`,
		headerTitle: "Mentioned",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "You Were Mentioned",
		leadText: `Hello ${name}, ${ph.replierName || "User"} mentioned you in a comment.`,
		description: customContent || `"${ph.excerpt || "Check comment..."}"`,
		details: [
			{ label: "Thread", value: ph.threadTitle || "Thread Title" }
		],
		ctaText: "Go to Comment"
	}),

	THREAD_LIKE: (name, ph, customContent) => ({
		category: "thread",
		priority: "normal",
		subject: `Someone liked your comment in "${ph.threadTitle || "Thread"}"`,
		headerTitle: "Reaction",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Post Liked!",
		leadText: `Hello ${name}, ${ph.replierName || "Someone"} liked your contribution!`,
		description: customContent || `"${ph.excerpt || ""}"`,
		details: [
			{ label: "Thread", value: ph.threadTitle || "Thread" }
		],
		ctaText: "View Post Activity"
	}),

	THREAD_QUOTE: (name, ph, customContent) => ({
		category: "thread",
		priority: "normal",
		subject: `You were quoted in "${ph.threadTitle || "Thread"}"`,
		headerTitle: "Quoted",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Comment Quoted",
		leadText: `Hello ${name}, your comment has been quoted.`,
		description: customContent || `"${ph.excerpt || ""}"`,
		details: [
			{ label: "Thread", value: ph.threadTitle || "Thread" }
		],
		ctaText: "View Quote Context"
	}),

	// Chat & Messaging
	CHAT_DIRECT_MESSAGE: (name, ph, customContent) => ({
		category: "thread",
		priority: "high",
		subject: `New message from ${ph.senderName || "a user"}`,
		headerTitle: "Direct Message",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: `Message from ${ph.senderName || "User"}`,
		leadText: `Hello ${name}, you received a new message.`,
		description: customContent || `"${ph.messagePreview || "Sent you a message"}"`,
		details: [
			{ label: "Sender", value: ph.senderName || "User" }
		],
		ctaText: "Open Chat",
		ctaUrl: ph.chatUrl || "/messages"
	}),

	CHAT_MENTION: (name, ph, customContent) => ({
		category: "thread",
		priority: "high",
		subject: `You were mentioned in ${ph.channelName || "Chat"}`,
		headerTitle: "Chat Mention",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Mentioned in Chat",
		leadText: `Hello ${name}, ${ph.senderName || "User"} mentioned you in ${ph.channelName || "Chat"}.`,
		description: customContent || `"${ph.messagePreview || "Check channel"}"`,
		details: [
			{ label: "Channel", value: ph.channelName || "General" },
			{ label: "By", value: ph.senderName || "User" }
		],
		ctaText: "Go to Channel",
		ctaUrl: ph.chatUrl || "/messages"
	}),

	// Account
	ACC_PROFILE_UPDATED: (name, ph, customContent) => ({
		category: "account",
		priority: "normal",
		subject: "BeastCode Profile Settings Changed",
		headerTitle: "Profile Alert",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "Settings Updated",
		leadText: `Hello ${name}, your profile and personal details were updated.`,
		description: customContent || "If you did not execute this update, please change your password immediately and review active sessions.",
		details: [
			{ label: "Action Time", value: new Date().toLocaleString() }
		],
		ctaText: "View Profile"
	}),

	ACC_PASSWORD_CHANGED: (name, ph, customContent) => ({
		category: "security",
		priority: "high",
		subject: "Security Alert: Password Changed - BeastCode",
		headerTitle: "Security Notice",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Password Updated",
		leadText: `Hello ${name}, your account password has been changed.`,
		description: customContent || "If you did not authorize this change, contact BeastCode Support immediately to freeze your account.",
		details: [
			{ label: "IP Address", value: ph.ip || "N/A" },
			{ label: "Update Time", value: new Date().toLocaleString() }
		],
		ctaText: "Go to Settings"
	}),

	ACC_ROLE_CHANGED: (name, ph, customContent) => ({
		category: "account",
		priority: "high",
		subject: "BeastCode Access Role Updated",
		headerTitle: "System Role",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "System Access Role Changed",
		leadText: `Hello ${name}, your admin access tier has been updated.`,
		description: customContent || "A system administrator modified your security policy role on the BeastCode platform.",
		details: [
			{ label: "New Role Title", value: ph.newRole || "User", isHighlight: true }
		],
		ctaText: "Open Dashboard"
	}),

	ACC_WARNING: (name, ph, customContent) => ({
		category: "account",
		priority: "critical",
		subject: "Official Warning Notice: BeastCode Policy",
		headerTitle: "Policy Warning",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Account Behavior Alert",
		leadText: `Hello ${name}, your account has received an official warning for community violations.`,
		description: customContent || "Repeated violations can result in permanent account locking and IP ban.",
		details: [
			{ label: "Incident Category", value: ph.reason || "Guideline Violation" },
			{ label: "Action Date", value: new Date().toLocaleDateString() }
		],
		ctaText: "Read Community Policy"
	}),

	// System
	SYS_MAINTENANCE: (name, ph, customContent) => ({
		category: "system",
		priority: "high",
		subject: "Scheduled Downtime Maintenance Notice - BeastCode",
		headerTitle: "Maintenance",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "Scheduled Maintenance Window",
		leadText: `Hello ${name}, scheduled infrastructure maintenance will take place soon.`,
		description: customContent || "During this window, the submission queue and compilers may be offline. Please plan submissions accordingly.",
		details: [
			{ label: "Scheduled Date", value: ph.date || "N/A" },
			{ label: "Duration Window", value: ph.duration || "2 Hours" },
			{ label: "Impact", value: "Compilers Offline", isHighlight: true }
		],
		ctaText: "Check Server Status"
	}),

	SYS_DOWNTIME: (name, ph, customContent) => ({
		category: "system",
		priority: "critical",
		subject: "System Outage Alert - BeastCode Service Interrupted",
		headerTitle: "Service Down",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Temporary Service Interruption",
		leadText: `Hello ${name}, we are experiencing unexpected infrastructure issues.`,
		description: customContent || "Our engineering team is actively investigating the outage. All problem judging queues have been paused.",
		details: [
			{ label: "Outage Triggered", value: new Date().toLocaleTimeString() }
		],
		ctaText: "Outage Status Page"
	}),

	SYS_RESTORED: (name, ph, customContent) => ({
		category: "system",
		priority: "high",
		subject: "All Systems Operational: Service Restored",
		headerTitle: "Service Online",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: "Services Restored",
		leadText: `Hello ${name}, all database and judging services are fully active!`,
		description: customContent || "All services are operating at maximum capacity. Thank you for your patience.",
		details: [
			{ label: "Restored At", value: new Date().toLocaleTimeString() }
		],
		ctaText: "Enter Code Arena"
	}),

	SYS_NEW_FEATURE: (name, ph, customContent) => ({
		category: "marketing",
		priority: "low",
		subject: "Discover new features on BeastCode!",
		headerTitle: "New Feature",
		accentColor: "#10b981",
		accentGlowColor: "rgba(16, 185, 129, 0.15)",
		title: ph.featureTitle || "New Platform Update",
		leadText: `Hello ${name}, we just pushed an amazing update to the BeastCode platform!`,
		description: customContent || "Check it out and start using it to improve your workflow.",
		details: [
			{ label: "Feature Name", value: ph.featureTitle || "Feature" }
		],
		ctaText: "Learn More"
	}),

	SYS_NEWSLETTER: (name, ph, customContent) => ({
		category: "marketing",
		priority: "low",
		subject: "BeastCode Gazette - Monthly Developer Update",
		headerTitle: "Newsletter",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Monthly Digest",
		leadText: `Hello ${name}, here is your monthly summary of competitive programming news.`,
		description: customContent || "Stay updated with global contest results, upsolve techniques, and system improvements.",
		details: [
			{ label: "Month", value: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }) }
		],
		ctaText: "Read Gazette"
	}),

	// Achievements
	ACH_BADGE: (name, ph, customContent) => ({
		category: "achievements",
		priority: "high",
		subject: "Badge Earned! New Achievement Unlocked!",
		headerTitle: "Badge Unlocked",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Digital Badge Awarded",
		leadText: `Hello ${name}, congratulations on earning a new digital showcase badge!`,
		description: customContent || "This badge has been added to your profile card and is visible to other competitors.",
		details: [
			{ label: "Badge Awarded", value: ph.badgeName || "Top Coder", isHighlight: true }
		],
		ctaText: "View Profile Showcase"
	}),

	ACH_LEVEL_UP: (name, ph, customContent) => ({
		category: "achievements",
		priority: "high",
		subject: `Level Up! You reached Level ${ph.newLevel || "1"}!`,
		headerTitle: "Level Up",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Congratulations, Level Up!",
		leadText: `Hello ${name}, you successfully leveled up in coding ranks!`,
		description: customContent || "Keep solving coding problems daily to earn XP multipliers and climb the leaderboards.",
		details: [
			{ label: "New Level", value: ph.newLevel || "1", isHighlight: true },
			{ label: "Total XP Count", value: ph.totalXp || "100" }
		],
		ctaText: "View Coding Stats"
	}),

	ACH_XP_MILESTONE: (name, ph, customContent) => ({
		category: "achievements",
		priority: "normal",
		subject: `XP Milestone Unlocked!`,
		headerTitle: "XP Milestone",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "XP Target Cleared",
		leadText: `Hello ${name}, you cleared your XP target milestone!`,
		description: customContent || "",
		details: [
			{ label: "Total XP", value: ph.xp || "1000 XP", isHighlight: true }
		],
		ctaText: "Check Rankings"
	}),

	ACH_STREAK_REMINDER: (name, ph, customContent) => ({
		category: "problem",
		priority: "normal",
		subject: `Save your ${ph.streakDays || "0"}-Day Coding Streak!`,
		headerTitle: "Streak Alert",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: "Keep the Streak Alive!",
		leadText: `Hello ${name}, don't lose your daily practice streak!`,
		description: customContent || `You have an active ${ph.streakDays || "0"}-day coding streak. Solve a quick problem today to extend it.`,
		details: [
			{ label: "Current Streak", value: `${ph.streakDays || "0"} Days`, isHighlight: true },
			{ label: "Time Remaining", value: ph.timeLeft || "6 Hours" }
		],
		ctaText: "Solve a Problem Now"
	}),

	ACH_STREAK_WARN: (name, ph, customContent) => ({
		category: "problem",
		priority: "high",
		subject: `Streak Lost Warning: Solve today!`,
		headerTitle: "Warning",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Daily Streak in Danger",
		leadText: `Hello ${name}, your daily coding streak is about to reset tomorrow!`,
		description: customContent || "Solve any pending challenge in the problem database now to keep your streak progress.",
		details: [
			{ label: "Streak in Jeopardy", value: `${ph.streakDays || "0"} Days` }
		],
		ctaText: "Save Coding Streak"
	}),

	// University
	UNI_INVITE: (name, ph, customContent) => ({
		category: "university",
		priority: "normal",
		subject: `[University Invite] Join ${ph.universityName || "University"}`,
		headerTitle: "Invitation",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "University Portal Invite",
		leadText: `Hello ${name}, you have been invited to link your profile to ${ph.universityName || "University"}.`,
		description: customContent || "Linking enables you to register for university-restricted mock contests and class groups.",
		details: [
			{ label: "University", value: ph.universityName || "University" },
			{ label: "Invited By", value: ph.inviter || "Admin" }
		],
		ctaText: "Accept Invite Link"
	}),

	UNI_CONTEST_INVITE: (name, ph, customContent) => ({
		category: "university",
		priority: "normal",
		subject: `[Exclusive Contest] Invite to participate: ${ph.contestTitle || "Contest"}`,
		headerTitle: "Exclusive Invite",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Closed Contest Invitation",
		leadText: `Hello ${name}, you are invited to link and compete in a closed university contest.`,
		description: customContent || "",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "University", value: ph.universityName || "University" }
		],
		ctaText: "Register to Contest"
	}),

	UNI_TEAM_INVITE: (name, ph, customContent) => ({
		category: "university",
		priority: "normal",
		subject: `[Team Invite] Join group ${ph.teamName || "Team"}`,
		headerTitle: "Team Invite",
		accentColor: "#3b82f6",
		accentGlowColor: "rgba(59, 130, 246, 0.15)",
		title: "University Team Invitation",
		leadText: `Hello ${name}, you have been invited to join the competitive coding team "${ph.teamName || "Team"}".`,
		description: customContent || "",
		details: [
			{ label: "Team Name", value: ph.teamName || "Team" },
			{ label: "Inviter", value: ph.inviter || "Teacher" }
		],
		ctaText: "Join Team"
	}),

	CONTEST_REG_REMINDER: (name, ph, customContent) => ({
		category: "contest",
		priority: "normal",
		subject: `Reminder: Register for ${ph.contestTitle || "Contest"}`,
		headerTitle: "Registration Reminder",
		accentColor: "#f59e0b",
		accentGlowColor: "rgba(245, 158, 11, 0.15)",
		title: "Contest Registration Reminder",
		leadText: `Hello ${name}, registration for the upcoming contest "${ph.contestTitle || "Contest"}" is closing soon.`,
		description: customContent || "Register now to secure your spot in the arena and compete against peers.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Starts At", value: ph.startTime || "Soon" }
		],
		ctaText: "Register Now"
	}),

	CONTEST_SOON: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `Contest "${ph.contestTitle || "Contest"}" is starting soon!`,
		headerTitle: "Starting Soon",
		accentColor: "#f97316",
		accentGlowColor: "rgba(249, 115, 22, 0.15)",
		title: "Contest Starting Soon",
		leadText: `Hello ${name}, the contest "${ph.contestTitle || "Contest"}" is starting shortly.`,
		description: customContent || "Prepare your development environment and log in to the coding space.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Time Remaining", value: ph.timeRemaining || "Soon" }
		],
		ctaText: "Enter Arena"
	}),

	CONTEST_ENDING: (name, ph, customContent) => ({
		category: "contest",
		priority: "high",
		subject: `Contest "${ph.contestTitle || "Contest"}" is ending soon!`,
		headerTitle: "Ending Soon",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Contest Ending Soon",
		leadText: `Hello ${name}, the active contest "${ph.contestTitle || "Contest"}" is about to finish.`,
		description: customContent || "Make sure to submit your final solutions and fix any remaining bugs before the timer runs out.",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Time Remaining", value: ph.timeRemaining || "Ending soon" }
		],
		ctaText: "Go to Contest"
	}),

	CONTEST_WINNER: (name, ph, customContent) => ({
		category: "achievements",
		priority: "high",
		subject: `Congratulations! You won the contest "${ph.contestTitle || "Contest"}"!`,
		headerTitle: "Contest Winner",
		accentColor: "#a855f7",
		accentGlowColor: "rgba(168, 85, 247, 0.15)",
		title: "Victory in the Arena!",
		leadText: `Congratulations ${name}! You achieved a winning rank in "${ph.contestTitle || "Contest"}".`,
		description: customContent || "Your exceptional performance has secured you a place on the podium. Keep up the amazing work!",
		details: [
			{ label: "Contest Name", value: ph.contestTitle || "Contest" },
			{ label: "Final Rank", value: ph.rank || "1st Place", isHighlight: true }
		],
		ctaText: "View Standings"
	}),

	ACC_SUSPICIOUS_LOGIN: (name, ph, customContent) => ({
		category: "security",
		priority: "critical",
		subject: "Suspicious Login Alert - BeastCode",
		headerTitle: "Security Alert",
		accentColor: "#ef4444",
		accentGlowColor: "rgba(239, 68, 68, 0.15)",
		title: "Suspicious Login Detected",
		leadText: `Hello ${name}, we detected an unusual login attempt on your account.`,
		description: customContent || "If this was not you, please secure your account by changing your password immediately.",
		details: [
			{ label: "IP Address", value: ph.ip || "Unknown" },
			{ label: "Location", value: ph.location || "Unknown" },
			{ label: "Device/Browser", value: ph.device || "Unknown" }
		],
		ctaText: "Secure Account"
	})
};

export function getEventConfig(eventType: BeastNotificationEvent, name: string, ph: Record<string, string>, customContent?: string): TemplateConfig {
	const templateFn = EVENT_TEMPLATES[eventType];
	if (!templateFn) {
		// Fallback
		return {
			category: "system",
			priority: "normal",
			subject: `[BeastCode] System notification`,
			headerTitle: "Notification",
			accentColor: "#f97316",
			accentGlowColor: "rgba(249, 115, 22, 0.15)",
			title: "BeastCode Update",
			leadText: `Hello ${name},`,
			description: customContent || "There is an update available regarding your BeastCode account.",
			details: [],
			ctaText: "View details"
		};
	}
	return templateFn(name, ph, customContent);
}
