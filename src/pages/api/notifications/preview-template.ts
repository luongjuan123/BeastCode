import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { getEmailHtml } from "@/utils/emailTemplate";
import { NotificationDispatcher, BeastNotificationEvent } from "@/utils/notificationDispatcher";
import { getEventConfig } from "@/utils/notificationTemplates";
import { buildAbsoluteUrl } from "@/utils/siteConfig";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST" && req.method !== "GET") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}


	const eventType = (req.query.eventType || req.body.eventType || "AUTH_WELCOME") as BeastNotificationEvent;
	const name = (req.query.name || req.body.name || "Alex Coder") as string;
	const email = (req.query.email || req.body.email || "alex@beastcode.codes") as string;

	try {
		// Create a mock payload to render
		const mockPayload = {
			toEmail: email,
			toUid: "mock_preview_uid",
			userName: name,
			placeholders: {
				contestTitle: "BeastCode Cup Grand Prix #12",
				problemTitle: "Binary Tree Zigzag Level Order Traversal",
				difficulty: "Medium",
				focus: "Trees, BFS",
				timeLeft: "15 Minutes",
				startTime: new Date(Date.now() + 15 * 60 * 1000).toLocaleString(),
				endTime: new Date(Date.now() + 135 * 60 * 1000).toLocaleString(),
				durationText: "120 Minutes",
				rank: "2nd Place",
				ratingChange: "+64",
				solvedCount: "148",
				level: "7",
				badgeName: "Dynamic Programming Master",
				universityName: "Stanford University",
				inviter: "Professor Alex",
				replierName: "Dung Chi",
				threadTitle: "How to optimize sliding window problems?",
				excerpt: "Try shrinking the left pointer dynamically inside a while loop once the constraint is broken.",
				newRole: "Moderator",
				streakDays: "45",
				timeLeftText: "Save your streak in the next 3 hours!"
			},
			customContent: "This is a custom broadcast body text demonstrating the template content block rendering inside the BeastCode notification engine layout structure.",
			ctaUrl: buildAbsoluteUrl("/")
		};

		// Retrieve the config directly using the getEventConfig utility
		const config = getEventConfig(eventType, mockPayload.userName, mockPayload.placeholders, mockPayload.customContent);

		const emailHtml = getEmailHtml({
			headerTitle: config.headerTitle,
			accentColor: config.accentColor,
			accentGlowColor: config.accentGlowColor,
			title: config.title,
			leadText: config.leadText,
			description: config.description,
			details: config.details,
			ctaText: config.ctaText,
			ctaUrl: config.ctaUrl,
			recipientEmail: email,
			preferenceType: config.category
		});

		if (req.query.raw === "true") {
			res.setHeader("Content-Type", "text/html");
			return res.status(200).send(emailHtml);
		}

		return res.status(200).json({ success: true, html: emailHtml, config });
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message || "Failed to render template preview" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
