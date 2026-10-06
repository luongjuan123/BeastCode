/**
 * Utility to filter and sanitize error messages shown to the user.
 * It hides raw Firestore paths, Firebase codes, network stack traces, and internal API responses,
 * returning friendly production messages while preserving the raw error for developer logs.
 */
export function getFriendlyErrorMessage(error: any, fallbackMessage: string = "Something unexpected happened. Please try again."): string {
	if (!error) return fallbackMessage;

	// In production, we log developer diagnostic details privately to window.__developer_errors
	if (typeof window !== "undefined") {
		const devErrors = (window as any).__developer_errors || [];
		devErrors.push({ error, timestamp: Date.now() });
		(window as any).__developer_errors = devErrors;
	}

	// In development mode, output full details to console
	if (process.env.NODE_ENV !== "production") {
		console.error("[Developer Diagnosis Log]:", error);
	}

	const message = typeof error === "string" ? error : error.message || "";
	const lowerMsg = message.toLowerCase();

	// Check for Firebase Authentication errors
	if (lowerMsg.includes("auth/") || lowerMsg.includes("user-not-found") || lowerMsg.includes("wrong-password")) {
		return "Invalid credentials. Please verify your email and password.";
	}
	if (lowerMsg.includes("email-already-in-use")) {
		return "This email address is already registered.";
	}
	if (lowerMsg.includes("weak-password")) {
		return "Your password is too weak. Please use a stronger password.";
	}

	// Check for Firestore permission/path leaks
	if (lowerMsg.includes("permission-denied") || lowerMsg.includes("missing or insufficient permissions")) {
		return "Access denied. You do not have permission to perform this action.";
	}
	if (lowerMsg.includes("firestore") || lowerMsg.includes("@google-cloud/firestore") || lowerMsg.includes("firestore/")) {
		return "Database connection failure. Please try again later.";
	}

	// Check for Network/CORS/Server issues
	if (lowerMsg.includes("network") || lowerMsg.includes("failed to fetch") || lowerMsg.includes("cors")) {
		return "Network connection issue. Please check your internet connection.";
	}
	if (lowerMsg.includes("status code 500") || lowerMsg.includes("internal server error")) {
		return "Our servers encountered an issue. Please try again later.";
	}

	// Check for Judge0 / Runner errors
	if (lowerMsg.includes("judge0") || lowerMsg.includes("piston") || lowerMsg.includes("compilation") || lowerMsg.includes("compile") || lowerMsg.includes("422")) {
		return "Unable to run or compile code. Please check your syntax and try again.";
	}

	// Check for specific contest errors
	if (lowerMsg.includes("contest") && lowerMsg.includes("ended")) {
		return "This contest has ended. Submissions are no longer accepted.";
	}
	if (lowerMsg.includes("not registered")) {
		return "You are not registered for this contest.";
	}
	if (lowerMsg.includes("terminated")) {
		return "Your session has been terminated due to security violations.";
	}

	// If the message is a short, simple, user-friendly validation sentence, let it pass.
	// Otherwise, return fallback
	if (message && message.length < 100 && !/[{}<>[\]/\\:_]/.test(message)) {
		return message;
	}

	return fallbackMessage;
}
