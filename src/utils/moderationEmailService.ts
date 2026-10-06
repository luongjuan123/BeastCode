import { EmailService } from "./emailService";
import { getEmailHtml } from "./emailTemplate";
import { getSiteUrl } from "./siteConfig";

const origin = getSiteUrl();

export class ModerationEmailService {
	public static async sendWarningEmail(email: string, reason: string, description: string, expiresAt: number, refId: string): Promise<boolean> {
		const expiryString = new Date(expiresAt).toLocaleDateString();
		const subject = `[BeastCode] Account Security Warning (Ref: ${refId})`;

		const html = getEmailHtml({
			headerTitle: "ACCOUNT WARNING",
			accentColor: "#f59e0b",
			accentGlowColor: "rgba(245, 158, 11, 0.25)",
			title: "Official Account Warning Strike",
			leadText: "Hello, an administrator has issued an official warning strike to your account due to community standards violations.",
			description: "Please note that warnings accumulate. Further violations may result in the temporary or permanent suspension of your account.",
			details: [
				{ label: "Reason", value: reason },
				{ label: "Description", value: description },
				{ label: "Expires At", value: expiryString },
				{ label: "Reference ID", value: refId, isHighlight: true }
			],
			ctaText: "Review Community Guidelines",
			ctaUrl: `${origin}/settings`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendSuspensionEmail(
		email: string,
		isPermanent: boolean,
		duration: string,
		reason: string,
		expiresAt: number | null,
		refId: string
	): Promise<boolean> {
		const subject = `[BeastCode] Account Status Update: ${isPermanent ? "Permanent Ban" : "Suspension"} (Ref: ${refId})`;
		const expiryString = expiresAt ? new Date(expiresAt).toLocaleString() : "Indefinite";

		const html = getEmailHtml({
			headerTitle: "ACCOUNT RESTRICTION",
			accentColor: "#ef4444",
			accentGlowColor: "rgba(239, 68, 68, 0.25)",
			title: isPermanent ? "Account Permanently Banned" : "Account Temporarily Suspended",
			leadText: "Hello, your access to the BeastCode platform has been restricted due to violations of our community terms.",
			description: "While suspended, you will not be able to log in, participate in contests, write threads, post comments, or perform other community actions. You may submit an appeal using the portal below.",
			details: [
				{ label: "Status", value: isPermanent ? "Permanently Banned" : `Suspended for ${duration}` },
				{ label: "Reason", value: reason },
				{ label: "Ends At", value: expiryString },
				{ label: "Reference ID", value: refId, isHighlight: true }
			],
			ctaText: "Submit Account Appeal",
			ctaUrl: `${origin}/account-appeal?refId=${refId}`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendBanRemovedEmail(email: string, refId: string): Promise<boolean> {
		const subject = `[BeastCode] Account Reinstated (Ref: ${refId})`;

		const html = getEmailHtml({
			headerTitle: "ACCOUNT REINSTATED",
			accentColor: "#10b981",
			accentGlowColor: "rgba(16, 185, 129, 0.25)",
			title: "Your Account Has Been Reinstated",
			leadText: "Hello, we are pleased to inform you that your account suspension has been lifted, and full access has been restored.",
			description: "You can now log in, submit codes, compete in contests, and participate in community threads as normal.",
			details: [
				{ label: "Status", value: "Active", isHighlight: true },
				{ label: "Reference ID", value: refId }
			],
			ctaText: "Log In to BeastCode",
			ctaUrl: `${origin}/auth`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendDeletionScheduledEmail(
		email: string,
		deletionDate: string,
		appealDeadline: string,
		reason: string,
		refId: string
	): Promise<boolean> {
		const subject = `[BeastCode] Account Scheduled For Deletion (Ref: ${refId})`;

		const html = getEmailHtml({
			headerTitle: "DELETION SCHEDULED",
			accentColor: "#ef4444",
			accentGlowColor: "rgba(239, 68, 68, 0.25)",
			title: "Account Scheduled for Permanent Deletion",
			leadText: "Hello, this is a formal notice that your account is scheduled for permanent deletion following administrative action.",
			description: "All personal profile documents, credentials, and authentication records will be deleted irreversibly. Submitting an appeal before the deadline will temporarily pause the deletion countdown.",
			details: [
				{ label: "Status", value: "Pending Deletion" },
				{ label: "Reason", value: reason },
				{ label: "Deletion Date", value: deletionDate },
				{ label: "Appeal Deadline", value: appealDeadline },
				{ label: "Reference ID", value: refId, isHighlight: true }
			],
			ctaText: "File An Appeal",
			ctaUrl: `${origin}/account-appeal?refId=${refId}`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendDeletionCancelledEmail(email: string, refId: string): Promise<boolean> {
		const subject = `[BeastCode] Account Deletion Cancelled (Ref: ${refId})`;

		const html = getEmailHtml({
			headerTitle: "DELETION CANCELLED",
			accentColor: "#10b981",
			accentGlowColor: "rgba(16, 185, 129, 0.25)",
			title: "Scheduled Account Deletion Cancelled",
			leadText: "Hello, this email confirms that the scheduled deletion of your BeastCode account has been cancelled.",
			description: "Your account is now fully restored with all your history, contests, and submissions preserved.",
			details: [
				{ label: "Status", value: "Active", isHighlight: true },
				{ label: "Reference ID", value: refId }
			],
			ctaText: "Go to Dashboard",
			ctaUrl: `${origin}/`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendAppealReceivedEmail(email: string, refId: string): Promise<boolean> {
		const subject = `[BeastCode] Appeal Received (Ref: ${refId})`;

		const html = getEmailHtml({
			headerTitle: "APPEAL RECEIVED",
			accentColor: "#3b82f6",
			accentGlowColor: "rgba(59, 130, 246, 0.25)",
			title: "Your Appeal Has Been Received",
			leadText: "Hello, we have successfully received your appeal regarding the administrative action on your account.",
			description: "Your case is currently pending review by our Trust & Safety moderation team. The deletion timer (if applicable) is paused while we evaluate your appeal.",
			details: [
				{ label: "Appeal Status", value: "Pending Review" },
				{ label: "Reference ID", value: refId, isHighlight: true }
			],
			ctaText: "Check Appeal Status",
			ctaUrl: `${origin}/account-appeal?refId=${refId}`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendAppealResolvedEmail(email: string, status: "APPROVED" | "REJECTED", message: string, refId: string): Promise<boolean> {
		const subject = `[BeastCode] Account Appeal Decision: ${status === "APPROVED" ? "Approved" : "Rejected"} (Ref: ${refId})`;
		const isApproved = status === "APPROVED";

		const html = getEmailHtml({
			headerTitle: "APPEAL RESOLVED",
			accentColor: isApproved ? "#10b981" : "#ef4444",
			accentGlowColor: isApproved ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
			title: isApproved ? "Account Appeal Approved" : "Account Appeal Rejected",
			leadText: "Hello, our moderation team has completed reviewing the appeal submitted for your account.",
			description: isApproved
				? "Your account access has been fully restored, or your scheduled deletion cancelled."
				: "The original administrative action stands. If your account was scheduled for deletion, it will resume its deletion timeline.",
			details: [
				{ label: "Decision", value: isApproved ? "Appeal Approved" : "Appeal Rejected", isHighlight: true },
				{ label: "Moderator Notes", value: message },
				{ label: "Reference ID", value: refId }
			],
			ctaText: isApproved ? "Go to BeastCode" : "Check Appeal Portal",
			ctaUrl: isApproved ? `${origin}/auth` : `${origin}/account-appeal?refId=${refId}`,
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}

	public static async sendAccountDeletedEmail(email: string, refId: string): Promise<boolean> {
		const subject = `[BeastCode] Account Deleted Permanently`;

		const html = getEmailHtml({
			headerTitle: "ACCOUNT DELETED",
			accentColor: "#71717a",
			accentGlowColor: "rgba(113, 113, 122, 0.25)",
			title: "Account Permanently Deleted",
			leadText: "Hello, this confirmation email serves to notify you that your BeastCode account has been permanently and irreversibly deleted.",
			description: "All associated profiles, private keys, warning states, and user history documents have been expunged from our database according to user data compliance and administrative cleanup rules.",
			details: [
				{ label: "Status", value: "Deleted", isHighlight: true },
				{ label: "Reference ID", value: refId }
			],
			recipientEmail: email
		});

		return EmailService.sendDirectEmail(email, subject, html);
	}
}
