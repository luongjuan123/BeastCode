import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { EmailService } from "@/utils/emailService";
import { COLORS } from "@/utils/emailComponents";
import { getEmailHtml } from "@/utils/emailTemplate";
import crypto from "crypto";

type ResponseData = {
	success: boolean;
	message: string;
	email?: string;
};

function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function parseUA(ua: string): string {
	let os = "Unknown OS";
	if (/windows/i.test(ua))           os = "Windows";
	else if (/mac os x/i.test(ua))     os = "macOS";
	else if (/linux/i.test(ua))        os = "Linux";
	else if (/android/i.test(ua))      os = "Android";
	else if (/iphone|ipad/i.test(ua))  os = "iOS";

	let browser = "Unknown Browser";
	if      (/chrome|crios/i.test(ua) && !/edge|edg|opr/i.test(ua)) browser = "Chrome";
	else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua))        browser = "Safari";
	else if (/firefox|fxios/i.test(ua))                               browser = "Firefox";
	else if (/edge|edg/i.test(ua))                                    browser = "Edge";
	else if (/opr/i.test(ua))                                         browser = "Opera";

	return `${browser} on ${os}`;
}

const COMMON_PASSWORDS = [
	"password", "123456789", "1234567890", "password123",
	"beastcode123", "qwertyuiop", "admin12345", "welcome123",
	"letmein123", "admin123", "welcome", "beastcode",
];

function validatePassword(pwd: string): string | null {
	if (pwd.length < 10)                return "Password must be at least 10 characters long.";
	if (!/[A-Z]/.test(pwd))            return "Password must include at least one uppercase letter.";
	if (!/[a-z]/.test(pwd))            return "Password must include at least one lowercase letter.";
	if (!/[0-9]/.test(pwd))            return "Password must include at least one number.";
	if (!/[^A-Za-z0-9]/.test(pwd))    return "Password must include at least one special character.";
	if (COMMON_PASSWORDS.includes(pwd.toLowerCase().trim())) return "This password is too common. Please choose a more secure password.";
	return null;
}

const INVALID_TOKEN_MSG = "This link is invalid. Please request a new password reset.";
const EXPIRED_TOKEN_MSG = "This link has expired. Please request a new password reset.";
const USED_TOKEN_MSG = "This link has already been used. Please request a new password reset.";

function buildSecurityEmail(ip: string, city: string, country: string, device: string, time: string): string {
	return getEmailHtml({
		headerTitle: "SECURITY NOTICE",
		accentColor: COLORS.danger,
		title: "Security Notice: Password Changed",
		leadText: "Hello,",
		description: "The password for your BeastCode account was recently updated. Here are the security details for this action. If you did not perform this change, please contact support immediately to secure your account.",
		details: [
			{ label: "Time", value: time },
			{ label: "IP Address", value: ip },
			{ label: "Location", value: `${city}, ${country}` },
			{ label: "Device", value: device }
		]
	});
}

// ─── Handler ──────────────────────────────────────────────────────────────────
async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {

	// ── GET: validate token on page load ──────────────────────────────────────
	if (req.method === "GET") {
		const { token } = req.query as { token?: string };

		if (!token || typeof token !== "string" || token.length < 60) {
			return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
		}

		// Support local mock testing token
		if (token.startsWith("mock-token-")) {
			const mockEmail = (req.query.email as string) || "dungpubgame@gmail.com";
			if (token.includes("expired")) {
				return res.status(400).json({ success: false, message: EXPIRED_TOKEN_MSG });
			}
			if (token.includes("used")) {
				return res.status(400).json({ success: false, message: USED_TOKEN_MSG });
			}
			if (token.includes("invalid")) {
				return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
			}
			return res.status(200).json({ success: true, message: "Token valid.", email: mockEmail });
		}

		const db  = getAdminFirestore();
		const now = Date.now();

		try {
			const snap = await db.collection("passwordResetTokens")
				.where("hashedToken", "==", hashToken(token))
				.limit(1)
				.get();

			if (snap.empty) {
				return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
			}

			const doc  = snap.docs[0];
			const data = doc.data();

			if (data.used) {
				return res.status(400).json({ success: false, message: USED_TOKEN_MSG });
			}

			if (now > (data.expiresAt ?? 0)) {
				return res.status(400).json({ success: false, message: EXPIRED_TOKEN_MSG });
			}

			return res.status(200).json({ success: true, message: "Token valid.", email: data.email });
		} catch (err) {
			console.error("[Reset Password GET] Token lookup failed:", err);
			throw err;
		}
	}

	// ── POST: submit new password ──────────────────────────────────────────────
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	const { token, newPassword, confirmPassword } = req.body as {
		token?: string;
		newPassword?: string;
		confirmPassword?: string;
	};

	if (!token || typeof token !== "string" || token.length < 60) {
		return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
	}

	if (!newPassword || !confirmPassword) {
		return res.status(400).json({ success: false, message: "All fields are required." });
	}

	if (newPassword !== confirmPassword) {
		return res.status(400).json({ success: false, message: "Passwords do not match." });
	}

	const pwdErr = validatePassword(newPassword);
	if (pwdErr) return res.status(400).json({ success: false, message: pwdErr });

	const ip        = ((req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
	const userAgent = (req.headers["user-agent"] ?? "Unknown UA") as string;
	const country   = ((req.headers["cf-ipcountry"] ?? req.headers["x-country-code"] ?? "Unknown") as string);
	const city      = ((req.headers["x-city-code"] ?? "Unknown") as string);
	const now       = Date.now();

	// Support local mock testing token
	if (token.startsWith("mock-token-")) {
		if (token.includes("expired")) {
			return res.status(400).json({ success: false, message: EXPIRED_TOKEN_MSG });
		}
		if (token.includes("used")) {
			return res.status(400).json({ success: false, message: USED_TOKEN_MSG });
		}
		if (token.includes("invalid")) {
			return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
		}
		return res.status(200).json({ success: true, message: "Your password has been changed successfully." });
	}

	const db = getAdminFirestore();

	try {
		// 1. Look up hashed token
		const snap = await db.collection("passwordResetTokens")
			.where("hashedToken", "==", hashToken(token))
			.limit(1)
			.get();

		if (snap.empty) {
			db.collection("securityLogs").add({ action: "INVALID_TOKEN", timestamp: now, ip, userAgent, country, city, email: "", userId: null }).catch(() => {});
			return res.status(400).json({ success: false, message: INVALID_TOKEN_MSG });
		}

		const tokenDoc  = snap.docs[0];
		const tokenData = tokenDoc.data();

		// 2. Reuse check
		if (tokenData.used) {
			db.collection("securityLogs").add({ action: "INVALID_TOKEN", timestamp: now, ip, userAgent, country, city, email: tokenData.email ?? "", userId: tokenData.userId ?? null, details: { reason: "reused" } }).catch(() => {});
			return res.status(400).json({ success: false, message: USED_TOKEN_MSG });
		}

		// 3. Expiry check
		if (now > (tokenData.expiresAt ?? 0)) {
			db.collection("securityLogs").add({ action: "EXPIRED_TOKEN", timestamp: now, ip, userAgent, country, city, email: tokenData.email ?? "", userId: tokenData.userId ?? null }).catch(() => {});
			return res.status(400).json({ success: false, message: EXPIRED_TOKEN_MSG });
		}

		const userId    = tokenData.userId as string;
		const userEmail = tokenData.email as string;

		// 4. Update password via Firebase Admin SDK
		await getAdminAuth().updateUser(userId, { password: newPassword });

		// 5. Revoke all active sessions
		await getAdminAuth().revokeRefreshTokens(userId);

		// 6. Mark token as used (single-use)
		await tokenDoc.ref.update({
			used: true,
			usedAt: now
		});

		// 7. Security notification email
		const device = parseUA(userAgent);
		const time   = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "medium" }) + " UTC";

		EmailService.sendDirectEmail(
			userEmail,
			"Your BeastCode Password Was Changed",
			buildSecurityEmail(ip, city, country, device, time)
		).catch((e) => console.error("[Reset Password] Security email failed:", e));

		// 8. Audit log
		db.collection("securityLogs").add({ action: "PASSWORD_RESET_COMPLETED", timestamp: now, ip, userAgent, country, city, email: userEmail, userId }).catch(() => {});

		return res.status(200).json({ success: true, message: "Your password has been changed successfully." });

	} catch (err: any) {
		console.error("[Reset Password POST] Unexpected error:", err);
		throw err;
	}
}

export default withApiErrorHandler(handler);
