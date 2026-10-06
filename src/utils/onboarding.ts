/**
 * Canonical onboarding and profile completeness evaluation.
 *
 * Distinguishes:
 * 1. Confirmed completed accounts (`isOnboarded === true`)
 * 2. Genuinely incomplete newly provisioned accounts (`isOnboarded === false`)
 * 3. Legacy accounts created before the `isOnboarded` flag was introduced
 */
export function isUserOnboarded(userData: any): boolean {
	if (!userData || typeof userData !== "object") {
		return false;
	}

	// 1. Canonical explicit onboarding flag
	if (userData.isOnboarded === true) {
		return true;
	}

	// 2. Genuinely new or explicitly incomplete account
	if (userData.isOnboarded === false) {
		return false;
	}

	// 3. Legacy account compatibility (userData.isOnboarded === undefined)
	// If the user already has academic details filled out, they are onboarded.
	if (userData.studentId && userData.school && userData.faculty && userData.class) {
		return true;
	}

	// If the user has an established identity (username or displayName) and either:
	// - solve history / score / xp activity, or
	// - a timestamp indicating account creation in the past
	const hasIdentity = Boolean(userData.username || userData.displayName);
	const hasActivity =
		(Array.isArray(userData.solvedProblems) && userData.solvedProblems.length > 0) ||
		(typeof userData.score === "number" && userData.score > 0) ||
		(typeof userData.xp === "number" && userData.xp > 0);
	const hasEstablishedRecord = Boolean(userData.createdAt || userData.updatedAt);

	if (hasIdentity && (hasActivity || hasEstablishedRecord)) {
		return true;
	}

	return false;
}
