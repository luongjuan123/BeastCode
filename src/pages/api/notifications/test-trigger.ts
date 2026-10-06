import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { NotificationDispatcher, BeastNotificationEvent } from "@/utils/notificationDispatcher";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		// 1. Authenticated as platform admin via withAdminGuard
		const adminUid = req.user!.uid;

		// 2. Parse request arguments
		const { eventType, recipientEmail, recipientName, customContent, placeholders } = req.body;
		if (!eventType || !recipientEmail || !recipientName) {
			return res.status(400).json({ success: false, message: "Missing required parameters: eventType, recipientEmail, recipientName" });
		}

		const event = eventType as BeastNotificationEvent;

		// 3. Dispatch via central NotificationDispatcher
		const result = await NotificationDispatcher.dispatch(event, {
			toEmail: recipientEmail,
			toUid: adminUid,
			userName: recipientName,
			customContent: customContent || "",
			placeholders: placeholders || {
				contestTitle: "Weekly Coding Cup #48",
				problemTitle: "LRU Cache Optimization",
				difficulty: "Medium",
				focus: "Dynamic Programming, Trees",
				timeLeft: "15 Minutes",
				timeLeftText: "Starts in 15 Minutes",
				startTime: new Date(Date.now() + 15 * 60 * 1000).toLocaleString(),
				endTime: new Date(Date.now() + 135 * 60 * 1000).toLocaleString(),
				durationText: "120 Minutes",
				rank: "3rd",
				ratingChange: "+45",
				solvedCount: "250",
				level: "8",
				badgeName: "Binary Search Beast",
				universityName: "Stanford University",
				inviter: "Professor Alex",
				replierName: "Dung Chi",
				threadTitle: "Optimizing Dijkstra with Fibonacci Heaps",
				excerpt: "Have you tried matching it with a d-ary heap layout instead? It performs significantly better.",
				newRole: "Moderator"
			},
			eventId: `test-trigger-${event}-${recipientEmail}-${Date.now()}`
		});

		return res.status(200).json(result);
	} catch (error: any) {
		console.error("Error triggering test event:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
