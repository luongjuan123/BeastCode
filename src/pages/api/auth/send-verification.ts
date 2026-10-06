import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth } from "@/firebase/firebaseAdmin";
import { EmailService } from "@/utils/emailService";
import { getEmailHtml } from "@/utils/emailTemplate";
import { buildAbsoluteUrl } from "@/utils/siteConfig";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method not allowed." });
	}

	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, message: "Unauthorized. Missing token." });
	}

	const token = authHeader.split("Bearer ")[1];

	try {
		console.log(`[EMAIL DEBUG] Registration / Verification trigger start`);
		const decodedToken = await getAdminAuth().verifyIdToken(token, true);
		const email = decodedToken.email;
		if (!email) {
			console.error(`[EMAIL DEBUG] Verification trigger failed: No email on account (UID: ${decodedToken.uid})`);
			return res.status(400).json({ success: false, message: "No email associated with this account." });
		}

		console.log(`[EMAIL DEBUG] Account email verified from ID token: ${email}`);

		// Generate verification link redirecting back to verify-email route using canonical host
		const verificationLink = await getAdminAuth().generateEmailVerificationLink(email, {
			url: buildAbsoluteUrl("/auth/verify-email"),
		});

		console.log(`[EMAIL DEBUG] Verification link generated successfully`);

		// Build email payload in the unified BeastCode template design
		const html = getEmailHtml({
			headerTitle: "Account Security",
			title: "Welcome to BeastCode!",
			leadText: "We're excited to have you join our competitive programming community. Please verify your email address to complete registration.",
			description: "Please click the button below to verify your email. For your protection, this verification link will expire in 3 days. If you did not sign up for a BeastCode account, you can safely ignore this email.",
			ctaText: "Verify Email",
			ctaUrl: verificationLink,
			details: [
				{ label: "Account Email", value: email },
				{ label: "Security Notice", value: "BeastCode system alerts are automated. Never share your password or verification links with anyone." }
			],
			recipientEmail: email,
			preferenceType: "security"
		});

		// Send email directly via canonical EmailService
		const deliveryResult = await EmailService.sendDirectEmailResult(email, "Verify Your BeastCode Account", html);
		if (!deliveryResult.success) {
			console.error(`[EMAIL DEBUG] Verification email delivery FAILED for ${email}: ${deliveryResult.error}`);
			return res.status(500).json({
				success: false,
				code: "EMAIL_SEND_FAILED",
				message: deliveryResult.error || "Failed to deliver verification email via SMTP provider."
			});
		}

		console.log(`[EMAIL DEBUG] Verification email delivered successfully to ${email}. Message ID: ${deliveryResult.messageId}`);
		return res.status(200).json({
			success: true,
			message: "Verification email sent successfully.",
			messageId: deliveryResult.messageId
		});
	} catch (err: any) {
		console.error("[EMAIL DEBUG] [Send Verification Email Exception]:", err);
		return res.status(500).json({ success: false, code: "EMAIL_SEND_FAILED", message: err.message || "Failed to deliver verification email." });
	}
}
