import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";
import { getSiteUrl } from "@/utils/siteConfig";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

type ResponseData = {
	success: boolean;
	message: string;
	recipientCount?: number;
};

async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<ResponseData>
) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {

		// 2. Parse Request Body
		const {
			contestId,
			title,
			action, // "enabled" | "disabled"
			visibility,
			university,
			origin
		} = req.body;

		if (!contestId || !title || !action) {
			return res.status(400).json({ success: false, message: "Missing required parameters" });
		}

		// 3. Fetch Registered Users dynamically
		let eligibleUsers: { uid: string; email: string; displayName: string }[] = [];
		try {
			eligibleUsers = await NotificationRecipientService.resolveRecipients("VIRTUAL_MODE", contestId, {
				university,
				visibility
			});
		} catch (resolveErr: any) {
			console.error("[Recipient Resolution Failure] Aborting:", resolveErr.message);
			return res.status(500).json({ success: false, message: `Recipient resolution failed: ${resolveErr.message}` });
		}

		if (eligibleUsers.length === 0) {
			return res.status(200).json({ success: true, message: "No eligible recipients found to email.", recipientCount: 0 });
		}

		// Send response immediately to keep UI fast & responsive
		res.status(200).json({
			success: true,
			message: `Virtual mode notification email dispatch started for ${eligibleUsers.length} user(s) in the background.`,
			recipientCount: eligibleUsers.length
		});

		// 4. Asynchronously queue emails using central dispatcher
		const appOrigin = (origin && !origin.includes(".run.app") && !origin.includes(".hosted.app")) ? origin : getSiteUrl();
		const contestUrl = `${appOrigin}/contests/${contestId}`;
		
		(async () => {
			for (const u of eligibleUsers) {
				try {
					await NotificationDispatcher.dispatch("VIRTUAL_MODE", {
						toEmail: u.email,
						toUid: u.uid,
						userName: u.displayName,
						ctaUrl: contestUrl,
						placeholders: {
							contestTitle: title,
							durationText: "120 minutes"
						},
						customContent: action === "enabled"
							? "Virtual Participation has been enabled for this contest. If you missed the live contest, you can now enter and solve the problems under simulated real-time conditions."
							: "Please note that Virtual Participation for this contest has been closed by the administrator. No new virtual sessions can be started.",
						eventId: `contest-virtual-${action}-${contestId}-${u.uid}`
					});
				} catch (dispatchErr: any) {
					console.error(`[Virtual Update Queue Failure] Failed for ${u.email}:`, dispatchErr.message);
				}
			}
		})();

	} catch (error: any) {
		console.error("Error sending virtual mode update email:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
