import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { getEmailHtml } from "./emailTemplate";
import { EmailService } from "./emailService";
import { BeastNotificationEvent, NotificationPayload, DispatchResult } from "./notificationTypes";
export type { BeastNotificationEvent, NotificationPayload, DispatchResult };
import { getEventConfig } from "./notificationTemplates";
import { getSiteUrl } from "./siteConfig";

export function isChannelEnabled(
	prefs: any,
	category: string,
	channel: "inApp" | "email"
): boolean {
	if (!prefs) return true;
	const pref = prefs[category];
	if (pref === undefined) {
		// Default exclusions
		if (category === "marketing") return channel === "email"; // marketing email by default, inApp false
		if (category === "admin") return false; // admin notifications off by default
		return true;
	}
	if (typeof pref === "boolean") {
		if (channel === "email") return pref;
		return true; // old format only disabled email
	}
	if (typeof pref === "object") {
		if (channel === "inApp") return pref.inApp !== false;
		if (channel === "email") return pref.email !== false;
	}
	return true;
}

export class NotificationDispatcher {
	/**
	 * Dispatches notifications asynchronously. Inserts an in-app notification doc,
	 * verifies user categories opt-outs, and places the email task into `emailQueue`.
	 */
	public static async dispatch(
		eventType: BeastNotificationEvent,
		payload: NotificationPayload
	): Promise<DispatchResult> {
		const emailLower = payload.toEmail.toLowerCase().trim();
		const db = getAdminFirestore();

		const config = getEventConfig(eventType, payload.userName, payload.placeholders || {}, payload.customContent);

		// 1. Log a historical trace entry
		let historyRef: any = null;
		try {
			historyRef = await db.collection("notificationHistory").add({
				eventType,
				userId: payload.toUid,
				userEmail: emailLower,
				category: config.category,
				status: "pending",
				timestamp: Date.now(),
				metadata: payload.metadata || null
			});
		} catch (dbErr) {
			console.warn("[History Trace Warning] Failed to initialize history trace:", dbErr);
		}

		// 2. Gatekeeper rule check (Opt-outs and preferences)
		let inAppAllowed = true;
		let emailAllowed = true;
		let skipReasonInApp = "";
		let skipReasonEmail = "";

		try {
			// A. Global Opt-out Check
			const optOutDoc = await db.collection("globalOptOuts").doc(emailLower).get();
			if (optOutDoc.exists) {
				const optType = optOutDoc.data()?.type || "all";
				if (optType === "all" || optType === config.category) {
					emailAllowed = false;
					skipReasonEmail = `Email unsubscribed via global opt-outs list (Type: ${optType})`;
				}
			}

			// B. User profile preferences check
			if (payload.toUid) {
				const userDoc = await db.collection("users").doc(payload.toUid).get();
				if (userDoc.exists) {
					const userData = userDoc.data() || {};
					const prefs = userData.notificationPreferences || {};
					
					inAppAllowed = isChannelEnabled(prefs, config.category, "inApp");
					if (!inAppAllowed) {
						skipReasonInApp = `User disabled inApp notifications for category: ${config.category}`;
					}

					if (emailAllowed) {
						emailAllowed = isChannelEnabled(prefs, config.category, "email");
						if (!emailAllowed) {
							skipReasonEmail = `User disabled email notifications for category: ${config.category}`;
						}
					}
				}
			}
		} catch (gatekeeperErr: any) {
			console.warn("[Gatekeeper Warn] Verification checks skipped:", gatekeeperErr.message);
		}

		// 3. Render HTML for Email
		const defaultAppUrl = getSiteUrl();
		const resolvedCtaUrl = payload.ctaUrl || (config.ctaText ? defaultAppUrl : undefined);

		const emailHtml = getEmailHtml({
			headerTitle: config.headerTitle,
			accentColor: config.accentColor,
			accentGlowColor: config.accentGlowColor,
			title: config.title,
			leadText: config.leadText,
			description: config.description,
			details: config.details,
			contestCard: config.contestCard,
			orgCard: config.orgCard,
			otpCode: config.otpCode,
			otpExpiration: config.otpExpiration,
			ctaText: config.ctaText,
			ctaUrl: resolvedCtaUrl,
			recipientEmail: emailLower,
			preferenceType: config.category,
			footerText: (config as any).footerText
		});

		// 4. Save In-App Notification (Notification Center Integration)
		if (inAppAllowed) {
			try {
				await db.collection("notifications").add({
					toUid: payload.toUid,
					fromUid: payload.fromUid || "system",
					fromDisplayName: payload.fromDisplayName || "BeastCode Platform",
					fromAvatarUrl: payload.fromAvatarUrl || "",
					type: eventType,
					title: config.title,
					body: config.description || config.leadText,
					category: config.category,
					priority: config.priority,
					createdAt: Date.now(),
					read: false,
					ctaText: config.ctaText || "View Detail",
					ctaUrl: payload.ctaUrl || "",
					threadId: payload.metadata?.threadId || payload.placeholders?.threadId || "",
					contestId: payload.metadata?.contestId || payload.placeholders?.contestId || "",
					problemId: payload.metadata?.problemId || payload.placeholders?.problemId || "",
					metadata: payload.metadata || null
				});
			} catch (inAppErr: any) {
				console.warn("[In-App Notification Center Warning] Failed to log in-app notification:", inAppErr.message);
			}
		}

		// 5. Place in Outgoing Email Queue (Queue System Integration)
		if (emailAllowed) {
			let queuedRef: any = null;
			try {
				const eventId = payload.eventId || `evt-${eventType}-${payload.toUid}-${Date.now()}`;
				
				// Duplicate check in queue to prevent duplicate delivery of identical emails
				const dupQuery = await db.collection("emailQueue")
					.where("eventId", "==", eventId)
					.where("status", "in", ["pending", "sent"])
					.limit(1)
					.get();

				if (!dupQuery.empty) {
					if (historyRef) {
						await historyRef.update({ status: "skipped", reason: "Duplicate skipped: eventId already exists in queue." });
					}
					return {
						success: true,
						message: "Skipped: Duplicate eventId detected.",
						status: "skipped",
						logId: historyRef?.id
					};
				}

				queuedRef = await db.collection("emailQueue").add({
					toEmail: emailLower,
					toUid: payload.toUid,
					category: config.category,
					eventType,
					subject: config.subject,
					emailHtml,
					status: "pending",
					retryCount: 0,
					nextRetryAt: Date.now(),
					createdAt: Date.now(),
					eventId,
					metadata: payload.metadata || null
				});

				if (historyRef) {
					await historyRef.update({ status: "queued", queuedId: queuedRef.id });
				}

				// Immediately trigger background queue processor so the email delivers without waiting for manual admin clicks
				EmailService.processQueue().catch((qErr) => {
					console.error("[EMAIL DEBUG] Immediate queue processor trigger error:", qErr);
				});

				return {
					success: true,
					message: "Email placed in queue for delivery.",
					status: "queued",
					logId: historyRef?.id,
					queuedId: queuedRef.id
				};
			} catch (queueErr: any) {
				console.error("[Queue Error] Failed to queue email task:", queueErr);
				if (historyRef) {
					await historyRef.update({ status: "failed", error: `Queuing failed: ${queueErr.message}` });
				}
				return {
					success: false,
					message: `Queuing failed: ${queueErr.message}`,
					status: "failed",
					logId: historyRef?.id
				};
			}
		} else {
			if (historyRef) {
				await historyRef.update({ status: "skipped", reason: skipReasonEmail });
			}
			return {
				success: true,
				message: `Email skipped: ${skipReasonEmail}`,
				status: "skipped",
				logId: historyRef?.id
			};
		}
	}
}
