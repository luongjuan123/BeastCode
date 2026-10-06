import type { NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";
import { COLORS } from "@/utils/emailComponents";
import { getEmailHtml } from "@/utils/emailTemplate";
import { analysePassword } from "@/utils/passwordPolicy";
import { createVerificationCode, sha256 } from "@/utils/securityHelpers";

export function buildVerificationCodeEmail(code: string): string {
	return getEmailHtml({
		headerTitle: "SECURITY VERIFICATION",
		accentColor: COLORS.primary,
		title: "Verify Your Identity",
		leadText: "Someone requested to change the password for your BeastCode account.",
		description: "If you did not initiate this password change request, please ignore this email. Your password will remain unchanged.",
		otpCode: code,
		otpExpiration: "10 minutes"
	});
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { currentPassword, newPassword, confirmPassword } = req.body;

	if (!currentPassword || !newPassword || !confirmPassword) {
		return res.status(400).json({ success: false, error: "All fields are required." });
	}

	if (newPassword !== confirmPassword) {
		return res.status(400).json({ success: false, error: "New passwords do not match." });
	}

	try {
		const adminAuth = getAdminAuth();
		const db = getAdminFirestore();

		const userRecord = await adminAuth.getUser(user.uid);
		const userEmail = userRecord.email;
		if (!userEmail) {
			return res.status(400).json({ success: false, error: "User email not found." });
		}

		// 1. Verify current password via REST api
		const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
		if (!apiKey) {
			return res.status(500).json({ success: false, error: "Server configuration error: Firebase API key is missing." });
		}

		const verifyRes = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: userEmail, password: currentPassword, returnSecureToken: false }),
			}
		);

		if (!verifyRes.ok) {
			const errBody = await verifyRes.json().catch(() => ({}));
			const errCode = errBody?.error?.message || "";
			if (errCode.includes("INVALID_PASSWORD") || errCode.includes("INVALID_LOGIN_CREDENTIALS")) {
				return res.status(400).json({ success: false, error: "Current password is incorrect." });
			}
			return res.status(400).json({ success: false, error: "Failed to verify current password." });
		}

		// 2. Validate password policy
		const analysis = analysePassword(newPassword, { email: userEmail, displayName: userRecord.displayName || "" });
		if (!analysis.isValid) {
			return res.status(400).json({ success: false, error: analysis.firstError || "Password does not meet requirements." });
		}

		// 3. Password history check
		const historySnap = await db.collection("passwordHistory")
			.where("userId", "==", user.uid)
			.get();

		const historyHashes = historySnap.docs
			.map((d) => d.data() as { hash: string; createdAt: number })
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, 5);

		const newHash = sha256(newPassword);
		const usedBefore = historyHashes.some((h) => h.hash === newHash);
		if (usedBefore) {
			return res.status(400).json({ success: false, error: "You've recently used this password. Please choose a different one." });
		}

		// Rate limit check: 60 seconds
		const recentCodesSnap = await db.collection("verificationCodes")
			.where("userId", "==", user.uid)
			.where("purpose", "==", "change-password")
			.where("createdAt", ">", Date.now() - 60 * 1000)
			.get();

		if (!recentCodesSnap.empty) {
			const youngest = recentCodesSnap.docs
				.map((d) => d.data().createdAt || 0)
				.reduce((max, current) => Math.max(max, current), 0);
			const timeLeft = Math.ceil((60 * 1000 - (Date.now() - youngest)) / 1000);
			return res.status(429).json({ success: false, error: `Please wait ${timeLeft} seconds before requesting a new code.` });
		}

		// 4. Generate verification code
		const code = await createVerificationCode(user.uid, "change-password");

		// 5. Send email
		console.log(`[EMAIL DEBUG] Password change OTP trigger start for user email: ${userEmail}`);
		const emailHtml = buildVerificationCodeEmail(code);
		const deliveryResult = await EmailService.sendDirectEmailResult(userEmail, "BeastCode Security Verification", emailHtml);
		if (!deliveryResult.success) {
			console.error(`[EMAIL DEBUG] Password change OTP delivery FAILED for ${userEmail}: ${deliveryResult.error}`);
			return res.status(500).json({ success: false, code: "EMAIL_SEND_FAILED", error: deliveryResult.error || "Failed to send verification code email." });
		}

		console.log(`[EMAIL DEBUG] Password change OTP delivered successfully to ${userEmail}. Message ID: ${deliveryResult.messageId}`);
		return res.status(200).json({ success: true, message: "Verification code sent to your email.", messageId: deliveryResult.messageId });
	} catch (error: any) {
		console.error("[Change Password Request] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "An unexpected error occurred." });
	}
}

export default withAuthAndModeration(handler);
