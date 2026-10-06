import type { NextApiResponse } from "next";
import { EmailService } from "@/utils/emailService";
import { getEmailHtml } from "@/utils/emailTemplate";
import { COLORS } from "@/utils/emailComponents";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method not allowed. Use POST." });
	}

	const targetEmail = (req.query.email as string) || (req.body?.email as string) || "dungpubgame@gmail.com";
	const now = new Date().toISOString();

	console.log(`[EMAIL DIAGNOSTIC] Initiating direct delivery test to: ${targetEmail}`);

	const host = process.env.SMTP_HOST || "missing";
	const port = process.env.SMTP_PORT || "missing";
	const user = process.env.SMTP_USER || process.env.EMAIL_USER || "missing";
	const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || "missing";

	const html = getEmailHtml({
		headerTitle: "SYSTEM DIAGNOSTICS",
		accentColor: COLORS.primary,
		title: "P0 Email Delivery Diagnostic Test",
		leadText: "This is an automated diagnostic email to confirm active SMTP delivery for the BeastCode platform.",
		description: "If you received this message, the backend email pipeline has successfully established connection with the mail provider, authenticated, and delivered the payload.",
		details: [
			{ label: "Recipient", value: targetEmail },
			{ label: "Timestamp", value: now },
			{ label: "SMTP Host", value: host },
			{ label: "SMTP Port", value: port },
			{ label: "Status", value: "DELIVERED", isHighlight: true }
		],
		recipientEmail: targetEmail,
		preferenceType: "system"
	});

	try {
		const result = await EmailService.sendDirectEmailResult(targetEmail, `[BeastCode] P0 Email Delivery Diagnostic - ${now}`, html);

		if (result.success) {
			return res.status(200).json({
				success: true,
				provider: "SMTP",
				host: host !== "missing" ? "configured" : "missing",
				port: port !== "missing" ? "configured" : "missing",
				user: user !== "missing" ? "configured" : "missing",
				authentication: "success",
				tls: "success",
				sender: from,
				recipient: targetEmail,
				providerResponse: result.response,
				messageId: result.messageId,
				timestamp: now
			});
		} else {
			return res.status(500).json({
				success: false,
				code: "EMAIL_SEND_FAILED",
				provider: "SMTP",
				host: host !== "missing" ? "configured" : "missing",
				port: port !== "missing" ? "configured" : "missing",
				user: user !== "missing" ? "configured" : "missing",
				authentication: result.error?.includes("Invalid login") ? "failed" : "success",
				error: result.error,
				timestamp: now
			});
		}
	} catch (err: any) {
		console.error("[EMAIL DIAGNOSTIC EXCEPTION]:", err);
		return res.status(500).json({
			success: false,
			code: "EMAIL_SEND_FAILED",
			error: err.message || "Failed to execute email diagnostic test."
		});
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
