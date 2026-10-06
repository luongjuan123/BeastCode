/**
 * Translates Firebase Auth error codes into human-readable strings.
 */
export const translateFirebaseError = (code: string): string => {
	switch (code) {
		case "auth/invalid-email":
			return "The email address you entered is invalid.";
		case "auth/user-disabled":
			return "This account has been deactivated.";
		case "auth/user-not-found":
			return "No account matches this email address.";
		case "auth/wrong-password":
			return "Incorrect credentials. Please verify your password.";
		case "auth/email-already-in-use":
			return "An account with this email address already exists.";
		case "auth/weak-password":
			return "Password is too weak. Use at least 6 characters.";
		case "auth/popup-closed-by-user":
			return "Authentication popup closed. Please try again.";
		case "auth/cancelled-popup-request":
			return "Multiple popup requests detected. Please wait.";
		case "auth/operation-not-allowed":
			return "This sign-in method is currently disabled.";
		case "auth/network-request-failed":
			return "Network connection issue. Please check your internet.";
		case "auth/popup-blocked":
			return "The browser blocked the authentication popup. Please enable popups for this site.";
		case "auth/too-many-requests":
			return "Too many requests. Please try again later.";
		case "auth/expired-action-code":
			return "The action code/link has expired or is invalid.";
		case "auth/credential-already-in-use":
			return "This credential is already linked to another account.";
		case "auth/invalid-credential":
		case "auth/invalid-login-credentials":
			return "Invalid login credentials. Please check your email or password.";
		default:
			return "An unexpected error occurred. Please try again.";
	}
};
