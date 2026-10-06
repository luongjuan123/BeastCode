/**
 * Organization Avatar Utility Functions
 *
 * Provides canonical avatar resolution, Unicode/Vietnamese-aware initials generation,
 * and deterministic color generation for fallbacks.
 */

// Curated high-contrast, accessible theme palette pairings
const DETERMINISTIC_PALETTES = [
	{
		bg: "bg-amber-950/40",
		text: "text-amber-400",
		border: "border-amber-500/30",
		glow: "rgba(245, 158, 11, 0.15)",
		solidBg: "#2d1f10",
		solidText: "#f59e0b",
	},
	{
		bg: "bg-emerald-950/40",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
		glow: "rgba(16, 185, 129, 0.15)",
		solidBg: "#0c2c1c",
		solidText: "#10b981",
	},
	{
		bg: "bg-blue-950/40",
		text: "text-blue-400",
		border: "border-blue-500/30",
		glow: "rgba(59, 130, 246, 0.15)",
		solidBg: "#0f1b3c",
		solidText: "#3b82f6",
	},
	{
		bg: "bg-rose-950/40",
		text: "text-rose-400",
		border: "border-rose-500/30",
		glow: "rgba(244, 63, 94, 0.15)",
		solidBg: "#330a15",
		solidText: "#f43f5e",
	},
	{
		bg: "bg-purple-950/40",
		text: "text-purple-400",
		border: "border-purple-500/30",
		glow: "rgba(168, 85, 247, 0.15)",
		solidBg: "#240e3b",
		solidText: "#a855f7",
	},
	{
		bg: "bg-cyan-950/40",
		text: "text-cyan-400",
		border: "border-cyan-500/30",
		glow: "rgba(6, 182, 212, 0.15)",
		solidBg: "#082730",
		solidText: "#06b6d4",
	},
	{
		bg: "bg-orange-950/40",
		text: "text-brand-orange",
		border: "border-brand-orange/30",
		glow: "rgba(255, 161, 22, 0.15)",
		solidBg: "#301a08",
		solidText: "#ffa116",
	},
	{
		bg: "bg-indigo-950/40",
		text: "text-indigo-400",
		border: "border-indigo-500/30",
		glow: "rgba(99, 102, 241, 0.15)",
		solidBg: "#14163b",
		solidText: "#6366f1",
	},
];

/**
 * Resolves canonical avatar URL from any organization data structure.
 * Guards against empty strings, "undefined", "null", or invalid blob URLs.
 */
export function resolveOrganizationAvatar(
	orgOrUrl?: {
		avatar?: string | null;
		avatarUrl?: string | null;
		orgLogo?: string | null;
		organizationLogo?: string | null;
	} | string | null
): string | null {
	if (!orgOrUrl) return null;

	let candidate: string | null = null;
	if (typeof orgOrUrl === "string") {
		candidate = orgOrUrl.trim();
	} else if (typeof orgOrUrl === "object") {
		candidate = (
			orgOrUrl.avatarUrl ||
			orgOrUrl.avatar ||
			orgOrUrl.orgLogo ||
			orgOrUrl.organizationLogo ||
			null
		);
		if (candidate) candidate = candidate.trim();
	}

	if (!candidate) return null;

	// Reject invalid literal strings or persisted local blob URLs
	if (
		candidate === "undefined" ||
		candidate === "null" ||
		candidate === "[object Object]" ||
		candidate.startsWith("blob:")
	) {
		return null;
	}

	return candidate;
}

/**
 * Generates Unicode-safe initials for organizations, fully supporting Vietnamese,
 * CJK (Chinese, Japanese, Korean), accented European characters, and single-letter names.
 * Strips leading/trailing emojis and symbols cleanly.
 *
 * Examples:
 *  - "BẮC TÔI" -> "BT"
 *  - "Đại học Bách Khoa" -> "ĐK"
 *  - "AI Lab" -> "AL"
 *  - "北京大学" -> "北"
 *  - "株式会社テスト" -> "株"
 *  - "🚀 Space Code" -> "SC"
 *  - "A" -> "A"
 */
export function getOrganizationInitials(name?: string | null): string {
	if (!name || typeof name !== "string") return "O";

	// Strip common emoji ranges and decorative symbols
	const cleaned = name
		.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, "")
		.trim() || name.trim();

	const words = cleaned.split(/\s+/).filter(Boolean);
	if (words.length === 0) return "O";

	if (words.length === 1) {
		// Single word: return first grapheme
		const graphemes = Array.from(words[0]);
		return (graphemes[0] || "O").toUpperCase();
	}

	// Multi-word: take first grapheme of first word + first grapheme of last word
	const firstGraphemes = Array.from(words[0]);
	const lastGraphemes = Array.from(words[words.length - 1]);

	const first = firstGraphemes[0] || "";
	const last = lastGraphemes[0] || "";

	const combined = (first + last).toUpperCase();
	return combined || "O";
}

/**
 * Hashes an organization identifier or name to select a deterministic palette.
 * Prevents color shifting across renders and tabs.
 */
export function getOrganizationDeterministicColor(identifier?: string | null) {
	if (!identifier || typeof identifier !== "string") {
		return DETERMINISTIC_PALETTES[0];
	}

	let hash = 0;
	for (let i = 0; i < identifier.length; i++) {
		hash = (hash << 5) - hash + identifier.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}

	const index = Math.abs(hash) % DETERMINISTIC_PALETTES.length;
	return DETERMINISTIC_PALETTES[index];
}
