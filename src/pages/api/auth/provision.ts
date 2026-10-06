import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { ProvisionResponse } from "@/utils/types";

// In-memory provisioning rate-limit: 10 attempts per UID per hour
const rlMap = new Map<string, number[]>();
const RL_MAX = 10;
const RL_WINDOW = 3_600_000;

function isRateLimited(uid: string): boolean {
	const now = Date.now();
	const hits = (rlMap.get(uid) ?? []).filter((t) => t > now - RL_WINDOW);
	if (hits.length >= RL_MAX) return true;
	rlMap.set(uid, [...hits, now]);
	return false;
}

/**
 * Derives a normalised username handle from a display name or email prefix.
 * Output is guaranteed lowercase, alphanumeric + underscores, 3-15 chars,
 * with a numeric suffix appended to ensure reasonable uniqueness.
 */
function deriveUsername(displayName: string | null, email: string | null): string {
	const raw = (displayName ?? email?.split("@")[0] ?? "user")
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 12);

	const base = raw.length >= 3 ? raw : `user_${raw}`.slice(0, 12);
	const suffix = Math.floor(1000 + Math.random() * 9000);
	return `${base}_${suffix}`.slice(0, 15);
}

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ProvisionResponse>
) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	// ── Extract Bearer token ────────────────────────────────────────────────────
	const authHeader = req.headers.authorization ?? "";
	if (!authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, message: "Missing or invalid Authorization header." });
	}
	const idToken = authHeader.slice(7);

	// ── Verify the Firebase ID token ────────────────────────────────────────────
	let decodedToken: DecodedIdToken | null = null;

	try {
		decodedToken = await getAdminAuth().verifyIdToken(idToken, true);
	} catch {
		return res.status(401).json({ success: false, message: "Invalid or expired session token." });
	}

	if (!decodedToken) {
		return res.status(401).json({ success: false, message: "Token verification failed." });
	}

	if (!decodedToken.email_verified) {
		return res.status(403).json({ success: false, message: "Email verification is required before provisioning your profile." });
	}

	const uid = decodedToken.uid;
	const email = decodedToken.email ?? "";
	const displayName = decodedToken.name ?? null;

	const db = getAdminFirestore();
	const userRef = db.collection("users").doc(uid);

	// Fast-path: check if account is already provisioned.
	// Returning early avoids burning rate limit quota and prevents unnecessary write transactions.
	const existingSnap = await userRef.get();
	if (existingSnap.exists) {
		return res.status(200).json({ success: true, message: "Account already provisioned.", alreadyProvisioned: true });
	}

	// ── Rate limit by UID (only applied for genuine new provisioning attempts) ──
	if (isRateLimited(uid)) {
		return res.status(429).json({ success: false, message: "Too many provisioning requests. Please wait." });
	}

	// ── Atomic idempotent write ─────────────────────────────────────────────────
	// Use a Firestore transaction to ensure we never double-write.
	let alreadyProvisioned = false;

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(userRef);
		if (snap.exists) {
			alreadyProvisioned = true;
			return;
		}

		const username = deriveUsername(displayName, email);
		const now = Date.now();

		// 1. users/{uid}
		tx.set(userRef, {
			uid,
			username,
			displayName: displayName ?? username,
			email,
			experienceLevel: "Newbie",
			solvedProblems: [],
			easyCount: 0,
			mediumCount: 0,
			hardCount: 0,
			mlCount: 0,
			xp: 0,
			role: "user",
			likedProblems: [],
			dislikedProblems: [],
			starredProblems: [],
			showStudentInfo: true,
			isOnboarded: false,
			createdAt: now,
			updatedAt: now,
		});

		// 2. profiles/{uid}
		const profileRef = db.collection("profiles").doc(uid);
		tx.set(profileRef, {
			uid,
			username,
			displayName: displayName ?? username,
			avatarUrl: "",
			bio: "",
			createdAt: now,
			updatedAt: now,
		});

		// 3. settings/{uid}
		const settingsRef = db.collection("settings").doc(uid);
		tx.set(settingsRef, {
			uid,
			theme: "default",
			language: "javascript",
			showStudentInfo: true,
			createdAt: now,
			updatedAt: now,
		});

		// 4. statistics/{uid}
		const statisticsRef = db.collection("statistics").doc(uid);
		tx.set(statisticsRef, {
			uid,
			xp: 0,
			easyCount: 0,
			mediumCount: 0,
			hardCount: 0,
			solvedProblemsCount: 0,
			rank: 0,
			createdAt: now,
			updatedAt: now,
		});

		// 5. solvedProblems/{uid}
		const solvedProblemsRef = db.collection("solvedProblems").doc(uid);
		tx.set(solvedProblemsRef, {
			uid,
			solvedList: [],
			createdAt: now,
			updatedAt: now,
		});

		// 6. contestHistory/{uid}
		const contestHistoryRef = db.collection("contestHistory").doc(uid);
		tx.set(contestHistoryRef, {
			uid,
			contests: [],
			rating: 1500,
			createdAt: now,
			updatedAt: now,
		});

		// 7. threads/{uid}
		const threadsRef = db.collection("threads").doc(uid);
		tx.set(threadsRef, {
			uid,
			threadIds: [],
			createdAt: now,
			updatedAt: now,
		});

		// 8. notifications/{uid}
		const notificationsRef = db.collection("notifications").doc(uid);
		tx.set(notificationsRef, {
			uid,
			unreadCount: 0,
			list: [],
			createdAt: now,
			updatedAt: now,
		});

		// 9. notificationSettings/{uid}
		const notificationSettingsRef = db.collection("notificationSettings").doc(uid);
		tx.set(notificationSettingsRef, {
			uid,
			reminders: true,
			achievements: true,
			editorials: true,
			upsolve: true,
			social: true,
			university: true,
			announcements: true,
			marketing: true,
			digest: true,
			createdAt: now,
			updatedAt: now,
		});

		// 10. security/{uid}
		const securityRef = db.collection("security").doc(uid);
		tx.set(securityRef, {
			uid,
			mfaEnabled: false,
			recoveryCodes: [],
			createdAt: now,
			updatedAt: now,
		});

		// 11. sessions/{uid}
		const sessionsRef = db.collection("sessions").doc(uid);
		tx.set(sessionsRef, {
			uid,
			activeSessions: [],
			createdAt: now,
			updatedAt: now,
		});

		// 12. organizationMembership/{uid}
		const orgMembershipRef = db.collection("organizationMembership").doc(uid);
		tx.set(orgMembershipRef, {
			uid,
			organizations: [],
			createdAt: now,
			updatedAt: now,
		});

		// 13. achievements/{uid}
		const achievementsRef = db.collection("achievements").doc(uid);
		tx.set(achievementsRef, {
			uid,
			unlocked: [],
			points: 0,
			createdAt: now,
			updatedAt: now,
		});

		// 14. bookmarks/{uid}
		const bookmarksRef = db.collection("bookmarks").doc(uid);
		tx.set(bookmarksRef, {
			uid,
			problemIds: [],
			threadIds: [],
			createdAt: now,
			updatedAt: now,
		});

		// 15. preferences/{uid}
		const preferencesRef = db.collection("preferences").doc(uid);
		tx.set(preferencesRef, {
			uid,
			difficultyFilter: "all",
			statusFilter: "all",
			createdAt: now,
			updatedAt: now,
		});

		// 16. theme/{uid}
		const themeRef = db.collection("theme").doc(uid);
		tx.set(themeRef, {
			uid,
			currentTheme: "default",
			createdAt: now,
			updatedAt: now,
		});

		// 17. language/{uid}
		const languageRef = db.collection("language").doc(uid);
		tx.set(languageRef, {
			uid,
			preferredLanguage: "javascript",
			editorKeymap: "sublime",
			createdAt: now,
			updatedAt: now,
		});

		// 18. privacy/{uid}
		const privacyRef = db.collection("privacy").doc(uid);
		tx.set(privacyRef, {
			uid,
			profileVisibility: "public",
			studentInfoVisibility: "public",
			createdAt: now,
			updatedAt: now,
		});
	});

	if (alreadyProvisioned) {
		return res.status(200).json({ success: true, message: "Account already provisioned.", alreadyProvisioned: true });
	}

	// ── Audit log (non-blocking) ────────────────────────────────────────────────
	db.collection("securityLogs").add({
		action: "ACCOUNT_PROVISIONED",
		uid,
		email,
		timestamp: Date.now(),
		ip: ((req.headers["x-forwarded-for"] as string) ?? req.socket?.remoteAddress ?? "unknown")
			.split(",")[0]
			.trim(),
	}).catch(() => {});

	return res.status(201).json({ success: true, message: "Account provisioned successfully.", alreadyProvisioned: false });
}

export default withApiErrorHandler(handler);
