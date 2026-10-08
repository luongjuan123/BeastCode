export interface LeaderboardUser {
	uid: string;
	displayName: string;
	avatarUrl?: string;
	school: string;
	country: string;
	score: number;
	xp: number;
	rating: number;
	contestRating: number;
	mlRating: number;
	problemSolvingRating: number;
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	rank?: number;
}

export interface ModerationRecord {
	status?: string;
	reason?: string;
	duration?: string;
	bannedAt?: number | null;
	expiresAt?: number | null;
}

/**
 * Checks whether an account identifier or email represents an internal automated test runner fixture.
 */
/**
 * Checks whether an account identifier, email, or display name represents an internal automated test runner fixture.
 */
export function isTestAccount(
	uidOrUser?: string | { uid?: string; email?: string; displayName?: string },
	emailArg?: string
): boolean {
	const uid = typeof uidOrUser === "string" ? uidOrUser : uidOrUser?.uid;
	const email = typeof uidOrUser === "string" ? emailArg : (uidOrUser?.email || emailArg);
	const displayName = typeof uidOrUser === "object" ? uidOrUser?.displayName : "";

	const rawUid = uid || "";
	const rawEmail = (email || "").toLowerCase().trim();
	const rawName = (displayName || "").toLowerCase().trim();

	// Explicit QA test account identifiers
	if (
		rawUid.startsWith("QA_AUTOMATED_USER_") ||
		rawUid.startsWith("qa_staff_") ||
		rawUid.startsWith("qa_user_") ||
		rawUid.startsWith("test_chat_user_") ||
		rawUid === "QA_AUTOMATED_USER_OUTSIDER" ||
		rawUid === "test_fixture_uid" ||
		rawUid === "test_outsider_c" ||
		rawUid === "test_qa_probe" ||
		rawUid === "test_rule_client_user"
	) {
		return true;
	}

	// Test fixture email domains and patterns
	if (
		rawEmail.endsWith("@beastcode-test.qa") ||
		rawEmail.endsWith("@beastcode.test") ||
		rawEmail.includes("test_chat_user_") ||
		rawEmail.includes("test_e2e_verified")
	) {
		return true;
	}

	// Test fixture display names
	if (
		rawName.startsWith("qa_automated_user_") ||
		rawName.startsWith("qa_staff_") ||
		rawName.startsWith("qa_user_") ||
		rawName.startsWith("test_chat_user_") ||
		rawName.includes("fixture") ||
		rawName === "auto_tester"
	) {
		return true;
	}

	return false;
}

/**
 * Single Authoritative Source of Truth for ranking eligibility.
 *
 * Rules:
 * - Must be an existing user record with a valid UID.
 * - Must NOT be banned or suspended (in users document or userModeration).
 * - Must NOT be marked as pending deletion (GDPR/self-delete/admin scheduled).
 * - Must NOT be an automated test runner fixture.
 * - Users with 0 score, 0 XP, or 0 solved problems ARE eligible.
 * - Missing profile fields (e.g. avatar, country, school) DO NOT disqualify users.
 */
export function isEligibleRankingUser(
	user: { uid?: string; email?: string; displayName?: string; status?: string; isTest?: boolean },
	mod?: ModerationRecord | null
): boolean {
	if (!user || !user.uid) return false;

	// 1. Explicit test flag or test account patterns
	if (user.isTest === true || user.status === "TEST_FIXTURE") return false;
	if (isTestAccount(user)) return false;

	// 2. Moderation & account suspension checks
	const userStatus = (user.status || "ACTIVE").toUpperCase();
	if (userStatus === "BANNED" || userStatus === "SUSPENDED" || userStatus === "PENDING_DELETION") {
		return false;
	}

	if (mod && mod.status) {
		const modStatus = mod.status.toUpperCase();
		if (modStatus === "BANNED" || modStatus === "SUSPENDED" || modStatus === "PENDING_DELETION") {
			// Check if temporary ban has expired
			if (mod.expiresAt && Date.now() > mod.expiresAt) {
				// Expired ban; treated as active
			} else {
				return false;
			}
		}
	}

	return true;
}

/**
 * Safely normalizes raw user document data into a complete LeaderboardUser,
 * ensuring all scoring and ranking metrics have authoritative default values.
 */
export function formatRankingUser(
	uidOrData: string | ({ uid?: string } & Record<string, any>),
	dataArg?: any,
	rank?: number
): LeaderboardUser {
	const uid = typeof uidOrData === "string" ? uidOrData : (uidOrData?.uid || "");
	const data = typeof uidOrData === "string" ? dataArg : uidOrData;

	const score = typeof data?.score === "number" && !isNaN(data.score) ? data.score : 0;
	const xp = typeof data?.xp === "number" && !isNaN(data.xp) ? data.xp : score;
	const rating = typeof data?.rating === "number" && !isNaN(data.rating) ? data.rating : 1500;
	const contestRating = typeof data?.contestRating === "number" && !isNaN(data.contestRating) ? data.contestRating : 1500;
	const mlRating = typeof data?.mlRating === "number" && !isNaN(data.mlRating) ? data.mlRating : 1000;
	const problemSolvingRating = typeof data?.problemSolvingRating === "number" && !isNaN(data.problemSolvingRating) ? data.problemSolvingRating : 1000;
	const easyCount = typeof data?.easyCount === "number" && !isNaN(data.easyCount) ? data.easyCount : 0;
	const mediumCount = typeof data?.mediumCount === "number" && !isNaN(data.mediumCount) ? data.mediumCount : 0;
	const hardCount = typeof data?.hardCount === "number" && !isNaN(data.hardCount) ? data.hardCount : 0;

	return {
		uid,
		displayName: data?.displayName || data?.username || "Anonymous User",
		avatarUrl: data?.avatarUrl || undefined,
		school: data?.school || "",
		country: data?.country || "",
		score,
		xp,
		rating,
		contestRating,
		mlRating,
		problemSolvingRating,
		easyCount,
		mediumCount,
		hardCount,
		...(rank !== undefined ? { rank } : {}),
	};
}

export const DEFAULT_USER_STATS = {
	score: 0,
	xp: 0,
	rating: 1500,
	contestRating: 1500,
	mlRating: 1000,
	problemSolvingRating: 1000,
	easyCount: 0,
	mediumCount: 0,
	hardCount: 0,
	country: "",
	school: "",
};
