import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { BeastNotificationEvent } from "./notificationTypes";

export interface NotificationCheckResult {
	allowed: boolean;
	reason?: string;
}

/**
 * Checks if a channel is enabled based on user preferences.
 */
function isChannelEnabled(
	prefs: any,
	category: string,
	channel: "inApp" | "email"
): boolean {
	if (!prefs) return true;
	const pref = prefs[category];
	if (pref === undefined) {
		if (category === "marketing") return channel === "email";
		if (category === "admin") return false;
		return true;
	}
	if (typeof pref === "boolean") {
		if (channel === "email") return pref;
		return true;
	}
	if (typeof pref === "object") {
		if (channel === "inApp") return pref.inApp !== false;
		if (channel === "email") return pref.email !== false;
	}
	return true;
}

/**
 * Checks if we can send a notification email based on preferences, rate-limiting, and deduplication.
 * @param email Recipient email address
 * @param category The preference type (e.g., 'contest', 'problem', 'thread', etc.)
 * @param eventId Unique identifier for the event to prevent duplicates
 * @param rateLimitWindowMs Optional time window to restrict messages of the same type (default 10 minutes)
 * @param channel The channel type ("inApp" | "email")
 */
export async function canSendNotification(
	email: string,
	category: string,
	eventId?: string,
	rateLimitWindowMs: number = 10 * 60 * 1000,
	channel: "inApp" | "email" = "email"
): Promise<NotificationCheckResult> {
	const emailLower = email.toLowerCase().trim();

	try {
		const db = getAdminFirestore();

		// 1. Global Opt-Out Check (only for email)
		if (channel === "email") {
			const optOutDoc = await db.collection("globalOptOuts").doc(emailLower).get();
			if (optOutDoc.exists) {
				const type = optOutDoc.data()?.type || "all";
				if (type === "all" || type === category) {
					return { allowed: false, reason: `Recipient unsubscribed globally (type: ${type})` };
				}
			}
		}

		// 2. User Preferences Check
		const usersSnap = await db.collection("users")
			.where("email", "==", emailLower)
			.limit(1)
			.get();

		if (!usersSnap.empty) {
			const userData = usersSnap.docs[0].data() || {};
			const prefs = userData.notificationPreferences || {};
			if (!isChannelEnabled(prefs, category, channel)) {
				return { allowed: false, reason: `User disabled ${channel} notifications for category: ${category}` };
			}
		}

		// 3. Deduplication Event Check (only for email)
		if (channel === "email" && eventId) {
			const dupQuery = await db.collection("emailLogs")
				.where("email", "==", emailLower)
				.where("eventId", "==", eventId)
				.limit(1)
				.get();

			if (!dupQuery.empty) {
				return { allowed: false, reason: `Duplicate event detected for eventId: ${eventId}` };
			}
		}

		// 4. Rate Limiting Check (only for email)
		if (channel === "email" && rateLimitWindowMs > 0) {
			const windowStart = Date.now() - rateLimitWindowMs;
			const rateLimitQuery = await db.collection("emailLogs")
				.where("email", "==", emailLower)
				.where("category", "==", category)
				.where("sentAt", ">=", windowStart)
				.limit(1)
				.get();

			if (!rateLimitQuery.empty) {
				return { allowed: false, reason: `Rate limit hit: an email of category '${category}' was sent recently.` };
			}
		}

		return { allowed: true };
	} catch (err: any) {
		console.warn("[Notification Service Warning] Could not verify database checks, allowing fallback:", err.message);
		return { allowed: true };
	}
}

/**
 * Logs a successful notification dispatch to Firestore to enforce rate limiting and deduplication.
 */
export async function logNotificationSent(email: string, category: string, eventId?: string) {
	try {
		const db = getAdminFirestore();
		await db.collection("emailLogs").add({
			email: email.toLowerCase().trim(),
			category,
			eventId: eventId || null,
			sentAt: Date.now(),
		});
	} catch (error) {
		console.warn("Failed to log email notification in Firestore:", error);
	}
}
