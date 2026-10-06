import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";
import { EmailService } from "@/utils/emailService";
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
		// 1. Authorized via withAdminGuard

		// 2. Parse Request Body
		const {
			contestId,
			title,
			description,
			banner,
			startTime,
			endTime,
			duration,
			visibility,
			university,
			origin
		} = req.body;

		if (!contestId || !title || !startTime || !endTime) {
			return res.status(400).json({ success: false, message: "Missing required contest parameters" });
		}

		// 3. Fetch Registered Users dynamically
		let eligibleUsers: { uid: string; email: string; displayName: string }[] = [];
		try {
			eligibleUsers = await NotificationRecipientService.resolveRecipients("CONTEST_PUBLISHED", contestId, {
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

		// 4. Queue emails using central dispatcher in parallel and process delivery in background
		const appOrigin = (origin && !origin.includes(".run.app") && !origin.includes(".hosted.app")) ? origin : getSiteUrl();
		const contestUrl = `${appOrigin}/contests/${contestId}`;
		
		const dispatchResults = await Promise.allSettled(
			eligibleUsers.map((u) =>
				NotificationDispatcher.dispatch("CONTEST_PUBLISHED", {
					toEmail: u.email,
					toUid: u.uid,
					userName: u.displayName,
					ctaUrl: contestUrl,
					customContent: description,
					placeholders: {
						contestTitle: title,
						startTime: new Date(startTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
						durationText: `${duration} Minutes`,
						bannerUrl: banner || undefined
					},
					eventId: `contest-published-${contestId}-${u.uid}`
				})
			)
		);

		const sentCount = dispatchResults.filter((r) => r.status === "fulfilled").length;

		// Trigger background email queue processing asynchronously without delaying the HTTP response
		setTimeout(() => {
			EmailService.processQueue().catch((err) => {
				console.error("[Contest Announcement Background Email Error]:", err);
			});
		}, 10);

		return res.status(200).json({
			success: true,
			message: `Contest announcement emails queued for ${sentCount} user(s).`,
			recipientCount: sentCount
		});

	} catch (error: any) {
		console.error("Error sending contest announcement email:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
