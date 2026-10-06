import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { BeastNotificationEvent } from "./notificationTypes";
import { sanitizeAutofilledEmail } from "./sanitizeEmail";

export interface RecipientInfo {
	uid: string;
	email: string;
	displayName: string;
}

export class NotificationRecipientService {
	/**
	 * Maps an event type to a user preferences category key.
	 * Returns null if the event is transactional/security and should bypass preferences.
	 */
	private static getPreferenceCategory(eventType: BeastNotificationEvent): string | null {
		switch (eventType) {
			case "CONTEST_PUBLISHED":
			case "CONTEST_REG_OPEN":
			case "CONTEST_CANCELLED":
			case "CONTEST_RESCHEDULED":
			case "VIRTUAL_MODE":
				return "announcements";
			case "CONTEST_REG_REMINDER":
			case "CONTEST_SOON":
			case "CONTEST_STARTED":
			case "CONTEST_ENDING":
				return "reminders";
			case "CONTEST_EDITORIAL_RELEASED":
			case "PROB_EDITORIAL":
				return "editorials";
			case "CONTEST_RESULTS_PUBLISHED":
			case "CONTEST_WINNER":
			case "ACH_BADGE":
			case "ACH_LEVEL_UP":
			case "ACH_XP_MILESTONE":
				return "achievements";
			case "THREAD_REPLY":
			case "THREAD_MENTION":
			case "THREAD_LIKE":
			case "THREAD_QUOTE":
				return "social";
			case "SYS_MAINTENANCE":
			case "SYS_DOWNTIME":
			case "SYS_RESTORED":
			case "SYS_NEW_FEATURE":
				return "announcements";
			case "SYS_NEWSLETTER":
				return "digest";
			case "PROB_DAILY":
			case "PROB_RECOMMENDED":
				return "upsolve";
			// Transactional & security: bypass category opt-out check
			case "CONTEST_REG_CONFIRM":
			case "SECURE_TERMINATION":
			case "AUTH_WELCOME":
			case "AUTH_VERIFY":
			case "AUTH_RESET":
			case "AUTH_CHANGE_CONFIRM":
			case "AUTH_LOGIN_ALERT":
			case "ACC_PROFILE_UPDATED":
			case "ACC_PASSWORD_CHANGED":
			case "ACC_ROLE_CHANGED":
			case "ACC_WARNING":
			case "ACC_SUSPICIOUS_LOGIN":
			default:
				return null;
		}
	}

	/**
	 * Checks if a user has opted out of email notifications for a specific category.
	 */
	private static isEmailEnabled(prefs: any, category: string): boolean {
		if (!prefs) return true;
		const pref = prefs[category];
		if (pref === undefined) {
			if (category === "marketing") return true;
			if (category === "admin") return false;
			return true;
		}
		if (typeof pref === "boolean") {
			return pref;
		}
		if (typeof pref === "object") {
			return pref.email !== false;
		}
		return true;
	}

	/**
	 * Resolves eligible recipient profiles for any contest or system notification event dynamically.
	 */
	public static async resolveRecipients(
		eventType: BeastNotificationEvent,
		contestId?: string,
		options: {
			targetUid?: string; // Direct single user target bypass
			university?: string; // University restriction domain suffix
			visibility?: "public" | "university" | "private";
		} = {}
	): Promise<RecipientInfo[]> {
		const db = getAdminFirestore();
		let resolved: RecipientInfo[] = [];

		const blacklist: string[] = [];

		// 1. Resolve Raw User Candidates
		if (options.targetUid) {
			// Scenario A: Single recipient targeted explicitly
			try {
				const userDoc = await db.collection("users").doc(options.targetUid).get();
				if (userDoc.exists) {
					const data = userDoc.data() || {};
					resolved.push({
						uid: userDoc.id,
						email: sanitizeAutofilledEmail(data.email || "").toLowerCase().trim(),
						displayName: data.displayName || data.username || "User"
					});
				}
			} catch (err) {
				console.error(`[Recipient Service] Error resolving user ${options.targetUid}:`, err);
			}
		} else if (
			contestId &&
			[
				"CONTEST_REG_REMINDER",
				"CONTEST_SOON",
				"CONTEST_STARTED",
				"CONTEST_ENDING",
				"CONTEST_ENDED",
				"CONTEST_EDITORIAL_RELEASED",
				"CONTEST_RESULTS_PUBLISHED",
				"CONTEST_WINNER",
				"CONTEST_CANCELLED",
				"CONTEST_RESCHEDULED"
			].includes(eventType)
		) {
			// Scenario B: Target registered participants of a contest
			try {
				const partSnap = await db.collection("contest_participants")
					.where("contestId", "==", contestId)
					.get();

				const participantUids = partSnap.docs
					.map(doc => doc.data()?.uid)
					.filter(Boolean) as string[];

				if (participantUids.length > 0) {
					// Chunk UID lookups (Firestore limits "in" queries to 30 items)
					const chunks: string[][] = [];
					for (let i = 0; i < participantUids.length; i += 30) {
						chunks.push(participantUids.slice(i, i + 30));
					}

					for (const chunk of chunks) {
						const usersSnap = await db.collection("users")
							.where("__name__", "in", chunk)
							.get();

						usersSnap.forEach(doc => {
							const data = doc.data();
							resolved.push({
								uid: doc.id,
								email: sanitizeAutofilledEmail(data.email || "").toLowerCase().trim(),
								displayName: data.displayName || data.username || "User"
							});
						});
					}
				}
			} catch (err) {
				console.error(`[Recipient Service] Error fetching participants for contest ${contestId}:`, err);
			}
		} else {
			// Scenario C: Global target (announcements, publications)
			try {
				const usersSnap = await db.collection("users").get();
				usersSnap.forEach(doc => {
					const data = doc.data();
					resolved.push({
						uid: doc.id,
						email: sanitizeAutofilledEmail(data.email || "").toLowerCase().trim(),
						displayName: data.displayName || data.username || "User"
					});
				});
			} catch (err) {
				console.error("[Recipient Service] Error loading global users list:", err);
			}
		}

		// 2. Filter Candidates (Validation, Blacklist, University domain, Preferences)
		const category = this.getPreferenceCategory(eventType);
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		let eligible = resolved.filter(user => {
			// Check valid format
			if (!user.email || !emailRegex.test(user.email)) return false;

			// Prevent blacklisted emails from receiving
			if (blacklist.includes(user.email)) return false;

			// Check university restrictions
			if (options.visibility === "university" && options.university) {
				const uniSuffix = options.university.trim().toLowerCase();
				if (!user.email.endsWith(`@${uniSuffix}`) && !user.email.endsWith(`.${uniSuffix}`)) {
					return false;
				}
			}

			return true;
		});

		// 3. User Notification Preferences Verification
		if (category) {
			try {
				const uids = eligible.map(u => u.uid);
				if (uids.length > 0) {
					const prefMap: Record<string, boolean> = {};

					// Load preferences in batches of 30
					const chunks: string[][] = [];
					for (let i = 0; i < uids.length; i += 30) {
						chunks.push(uids.slice(i, i + 30));
					}

					for (const chunk of chunks) {
						const snaps = await db.collection("users")
							.where("__name__", "in", chunk)
							.get();

						snaps.forEach(doc => {
							const data = doc.data() || {};
							const prefs = data.notificationPreferences || {};
							prefMap[doc.id] = this.isEmailEnabled(prefs, category);
						});
					}

					eligible = eligible.filter(user => prefMap[user.uid] !== false);
				}
			} catch (prefErr) {
				console.warn("[Recipient Service Warn] Preference check skipped due to error:", prefErr);
			}
		}

		// Remove duplicate recipients
		const seenEmails = new Set<string>();
		eligible = eligible.filter(user => {
			if (seenEmails.has(user.email)) return false;
			seenEmails.add(user.email);
			return true;
		});

		// 4. Admin Test Mode Override (Only if explicitly enabled with non-empty ADMIN_TEST_EMAILS)
		const testModeEnabled = process.env.ADMIN_TEST_MODE === "true";
		const testEmailsConf = process.env.ADMIN_TEST_EMAILS;
		if (testModeEnabled && testEmailsConf && testEmailsConf.trim().length > 0) {
			const testEmailsList = testEmailsConf.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

			console.log(`[Notification Test Mode] Activating override. Resolved ${eligible.length} original recipient(s). Redirecting delivery to test accounts:`, testEmailsList);

			// Map test emails to mock profiles for target dispatching
			eligible = testEmailsList.map((email, idx) => ({
				uid: `test_mode_user_${idx}`,
				email,
				displayName: `Test Recipient ${idx + 1}`
			}));
		}

		// Internal diagnostics logging (hidden from user response payload)
		console.log(`[Recipient Service Diagnostics] Event: ${eventType}. Final resolved recipient count: ${eligible.length}. UIDs:`, eligible.map(u => u.uid));

		return eligible;
	}
}
