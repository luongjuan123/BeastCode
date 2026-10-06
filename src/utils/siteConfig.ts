/**
 * Centralized Canonical Domain & URL Configuration for BeastCode
 *
 * Public Canonical Origin: https://www.bomboclatbeastcode.codes
 *
 * Rule: User-facing public links must NEVER derive from Cloud Run internal container
 * hostnames (e.g. *.run.app) or App Hosting default subdomains (e.g. *.hosted.app).
 */

export const CANONICAL_SITE_URL = "https://www.bomboclatbeastcode.codes";

/**
 * Returns the resolved base URL for public user-facing links.
 * In production, this always resolves deterministically to https://www.bomboclatbeastcode.codes.
 * In development, it defaults to http://localhost:3000 (or custom configured dev URL).
 */
export function getSiteUrl(): string {
	const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

	// In production, enforce the canonical public domain and forbid internal cloud run hosts
	if (process.env.NODE_ENV === "production") {
		if (rawUrl && !rawUrl.includes(".run.app") && !rawUrl.includes(".hosted.app")) {
			return rawUrl.replace(/\/+$/, "");
		}
		return CANONICAL_SITE_URL;
	}

	// In development/test environments
	if (rawUrl) {
		return rawUrl.replace(/\/+$/, "");
	}

	return "http://localhost:3000";
}

/**
 * Builds an absolute user-facing URL pointing to the canonical domain.
 * Sanitizes slashes and asserts that internal Cloud Run hostnames are never leaked.
 *
 * @param path - Relative path (e.g., "/reset-password?token=abc") or full URL
 */
export function buildAbsoluteUrl(path: string): string {
	const base = getSiteUrl();

	let normalizedPath = path.trim();
	if (!normalizedPath.startsWith("/")) {
		normalizedPath = `/${normalizedPath}`;
	}

	const fullUrl = `${base}${normalizedPath}`;

	// Defensive regression guard: never allow *.run.app or *.hosted.app in production links
	if (process.env.NODE_ENV === "production" && (fullUrl.includes(".run.app") || fullUrl.includes(".hosted.app"))) {
		throw new Error(`[Security Violation] Refusing to generate internal Cloud Run/App Hosting URL: ${fullUrl}`);
	}

	return fullUrl;
}
