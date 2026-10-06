import type { NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";
import { createVerificationCode } from "@/utils/securityHelpers";
import { buildVerificationCodeEmail } from "./change-password/request";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { purpose } = req.body;
	if (!purpose) {
		return res.status(400).json({ success: false, error: "Purpose is required." });
	}

	try {
		const db = getAdminFirestore();
		
		// Rate limit check: 60 seconds
		const recentCodesSnap = await db.collection("verificationCodes")
			.where("userId", "==", user.uid)
			.where("purpose", "==", purpose)
			.where("createdAt", ">", Date.now() - 60 * 1000)
			.get();

		if (!recentCodesSnap.empty) {
			const youngest = recentCodesSnap.docs
				.map((d) => d.data().createdAt || 0)
				.reduce((max, current) => Math.max(max, current), 0);
			const timeLeft = Math.ceil((60 * 1000 - (Date.now() - youngest)) / 1000);
			return res.status(429).json({ success: false, error: `Please wait ${timeLeft} seconds before requesting a new code.` });
		}

		const adminAuth = getAdminAuth();
		const userRecord = await adminAuth.getUser(user.uid);
		const userEmail = userRecord.email;

		if (!userEmail) {
			return res.status(400).json({ success: false, error: "User email not found." });
		}

		// Generate verification code
		const code = await createVerificationCode(user.uid, purpose);

		// Send email
		const emailHtml = buildVerificationCodeEmail(code);
		await EmailService.sendDirectEmail(userEmail, "BeastCode Security Verification", emailHtml);

		return res.status(200).json({ success: true, message: "Verification code resent successfully." });
	} catch (error: any) {
		console.error("[Resend Code] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "An unexpected error occurred." });
	}
}

export default withAuthAndModeration(handler);
