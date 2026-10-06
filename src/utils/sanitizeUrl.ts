/**
 * Sanitizes and validates internal redirect URLs to prevent open-redirect
 * vulnerabilities, protocol-relative exploits (e.g. //evil.com),
 * and infinite redirect loops back to auth routes.
 */
export function getSafeRedirectUrl(
	rawTarget?: string | string[] | null,
	fallback: string = "/"
): string {
	if (!rawTarget) return fallback;

	const target = Array.isArray(rawTarget) ? rawTarget[0] : rawTarget;
	if (typeof target !== "string") return fallback;

	const trimmed = target.trim();
	if (!trimmed) return fallback;

	// Must start with single slash and NOT double slash (protocol-relative)
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
		return fallback;
	}

	// Must not contain javascript: or data: URIs
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
		return fallback;
	}

	// Prevent redirecting back to authentication or error loops
	const pathOnly = trimmed.split("?")[0].toLowerCase();
	if (
		pathOnly === "/auth" ||
		pathOnly === "/auth/verify-email" ||
		pathOnly === "/verify-email" ||
		pathOnly === "/reset-password" ||
		pathOnly === "/error"
	) {
		return fallback;
	}

	return trimmed;
}
