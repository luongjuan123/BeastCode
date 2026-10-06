/**
 * Shared password policy — used by frontend (live validation) and backend (server-side enforcement).
 * This file must remain importable from both sides (no Node-only APIs).
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Sequences that are never allowed regardless of other complexity */
export const BANNED_SEQUENCES = [
	"123456", "1234567", "12345678", "123456789", "1234567890",
	"abcdef", "abcdefg", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn",
	"111111", "222222", "333333", "000000", "999999",
	"password", "passw0rd", "pass1234", "welcome", "letmein",
	"admin", "beastcode", "iloveyou", "monkey", "dragon",
	"master", "superman", "trustno1",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PasswordRequirement {
	id: string;
	label: string;
	met: boolean;
}

export type PasswordStrengthLevel = "none" | "very-weak" | "weak" | "medium" | "strong" | "very-strong";

export interface PasswordAnalysis {
	score: number; // 0-5
	level: PasswordStrengthLevel;
	label: string;
	requirements: PasswordRequirement[];
	suggestions: string[];
	isValid: boolean;
	/** Filled when isValid is false */
	firstError: string | null;
}

// ─── Core Analyser ────────────────────────────────────────────────────────────
export function analysePassword(
	password: string,
	opts: { email?: string; displayName?: string } = {}
): PasswordAnalysis {
	const { email = "", displayName = "" } = opts;

	const checks = {
		length:    password.length >= PASSWORD_MIN_LENGTH,
		maxLength: password.length <= PASSWORD_MAX_LENGTH,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number:    /[0-9]/.test(password),
		symbol:    /[^A-Za-z0-9]/.test(password),
		notBanned: !BANNED_SEQUENCES.some((seq) => password.toLowerCase().includes(seq)),
		notEmail:  !email || !password.toLowerCase().includes(email.split("@")[0].toLowerCase()),
		notName:   !displayName || !password.toLowerCase().includes(displayName.toLowerCase().slice(0, 4)),
	};

	const requirements: PasswordRequirement[] = [
		{ id: "length",    label: `${PASSWORD_MIN_LENGTH}+ characters`,     met: checks.length },
		{ id: "uppercase", label: "Uppercase letter (A–Z)",                  met: checks.uppercase },
		{ id: "lowercase", label: "Lowercase letter (a–z)",                  met: checks.lowercase },
		{ id: "number",    label: "Number (0–9)",                            met: checks.number },
		{ id: "symbol",    label: "Special character (!@#$...)",             met: checks.symbol },
	];

	// Complexity score (0–5 — one point per satisfied requirement)
	const coreScore = [checks.length, checks.uppercase, checks.lowercase, checks.number, checks.symbol]
		.filter(Boolean).length;

	// Bonus: length > 16 bumps score by 1 (capped at 5)
	const bonusLength = password.length >= 16 ? 1 : 0;
	const rawScore    = Math.min(5, coreScore + bonusLength);

	// Penalise banned / personal patterns
	const penalised = !checks.notBanned || !checks.notEmail || !checks.notName;
	const score     = penalised ? Math.min(rawScore, 2) : rawScore;

	const levelMap: Record<number, PasswordStrengthLevel> = {
		0: "none",
		1: "very-weak",
		2: "weak",
		3: "medium",
		4: "strong",
		5: "very-strong",
	};

	const labelMap: Record<PasswordStrengthLevel, string> = {
		"none":       "Not entered",
		"very-weak":  "Very Weak",
		"weak":       "Weak",
		"medium":     "Medium",
		"strong":     "Strong",
		"very-strong":"Very Strong",
	};

	const level = password.length === 0 ? "none" : levelMap[score];
	const label = labelMap[level];

	// Suggestions
	const suggestions: string[] = [];
	if (!checks.length)    suggestions.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
	if (!checks.uppercase) suggestions.push("Add at least one uppercase letter.");
	if (!checks.lowercase) suggestions.push("Add at least one lowercase letter.");
	if (!checks.number)    suggestions.push("Include at least one number.");
	if (!checks.symbol)    suggestions.push("Include a special character (!, @, #, $, etc.).");
	if (penalised)         suggestions.push("Avoid common words, sequences, or personal info.");
	if (password.length < 16 && score >= 4) suggestions.push("Try a longer password for extra strength.");

	// Overall validity
	const isValid = checks.length && checks.maxLength && checks.uppercase &&
	                checks.lowercase && checks.number && checks.symbol &&
	                checks.notBanned && checks.notEmail && checks.notName;

	// First user-facing error
	let firstError: string | null = null;
	if (password.length > PASSWORD_MAX_LENGTH) {
		firstError = `Password must be no longer than ${PASSWORD_MAX_LENGTH} characters.`;
	} else if (!checks.length) {
		firstError = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
	} else if (!checks.uppercase) {
		firstError = "Password must include at least one uppercase letter.";
	} else if (!checks.lowercase) {
		firstError = "Password must include at least one lowercase letter.";
	} else if (!checks.number) {
		firstError = "Password must include at least one number.";
	} else if (!checks.symbol) {
		firstError = "Password must include at least one special character.";
	} else if (!checks.notBanned) {
		firstError = "Password contains a common or banned sequence. Please choose a more secure password.";
	} else if (!checks.notEmail) {
		firstError = "Password must not contain your email address.";
	} else if (!checks.notName) {
		firstError = "Password must not contain your display name.";
	}

	return { score, level, label, requirements, suggestions, isValid, firstError };
}

/** Colour class for each strength level — aligned to BeastCode design tokens. */
export function strengthColor(level: PasswordStrengthLevel): string {
	switch (level) {
		case "very-weak":  return "#ef4444"; // red
		case "weak":       return "#f97316"; // orange
		case "medium":     return "#eab308"; // yellow
		case "strong":     return "#22c55e"; // green
		case "very-strong":return "#10b981"; // emerald
		default:           return "transparent";
	}
}
