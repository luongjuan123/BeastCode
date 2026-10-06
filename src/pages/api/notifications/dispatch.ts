import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { BeastNotificationEvent } from "@/utils/notificationTypes";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";

const USER_ALLOWED_EVENTS = new Set([
	"THREAD_REPLY",
	"THREAD_MENTION",
	"THREAD_LIKE",
	"THREAD_QUOTE",
	"CHAT_DIRECT_MESSAGE",
	"CHAT_MENTION",
]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		// 1. Authenticate Request
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ success: false, message: "Unauthorized: Missing or invalid token" });
		}
		const token = authHeader.split("Bearer ")[1]?.trim();
		if (!token) {
			return res.status(401).json({ success: false, message: "Unauthorized: Empty token" });
		}

		let decodedToken: any;
		try {
			decodedToken = await getAdminAuth().verifyIdToken(token, true);
		} catch (tokenErr: any) {
			return res.status(401).json({ success: false, message: "Unauthorized: Token verification failed" });
		}

		const senderUid = decodedToken.uid;

		// 2. Parse request body
		const { eventType, recipientUid, placeholders = {}, ctaUrl, customContent, metadata = {} } = req.body;
		if (!eventType || !recipientUid) {
			return res.status(400).json({ success: false, message: "Missing required parameters: eventType, recipientUid" });
		}

		// 3. Enforce event authorization
		if (!USER_ALLOWED_EVENTS.has(eventType)) {
			const { isPlatformAdmin } = await verifyPlatformAdmin(senderUid, decodedToken);
			if (!isPlatformAdmin) {
				return res.status(403).json({ success: false, message: "Forbidden: Administrative access required to dispatch this notification event" });
			}
		}

		const db = getAdminFirestore();

		// 3. Fetch recipient details
		const recipientDoc = await db.collection("users").doc(recipientUid).get();
		if (!recipientDoc.exists) {
			return res.status(404).json({ success: false, message: "Recipient user not found" });
		}
		const recipientData = recipientDoc.data() || {};
		const recipientEmail = recipientData.email || "";
		const recipientName = recipientData.displayName || recipientData.username || "User";

		if (!recipientEmail) {
			return res.status(400).json({ success: false, message: "Recipient email not found in profile" });
		}

		// 4. Fetch sender details for social context
		let fromDisplayName = "BeastCode Platform";
		let fromAvatarUrl = "";

		if (senderUid && senderUid !== "system") {
			const senderDoc = await db.collection("users").doc(senderUid).get();
			if (senderDoc.exists) {
				const senderData = senderDoc.data() || {};
				fromDisplayName = senderData.displayName || senderData.username || "User";
				fromAvatarUrl = senderData.avatarUrl || "";
			}
		}

		// Add replierName or sender information to placeholders automatically if not present
		if (!placeholders.replierName && fromDisplayName) {
			placeholders.replierName = fromDisplayName;
		}

		// 5. Dispatch notification
		const result = await NotificationDispatcher.dispatch(eventType as BeastNotificationEvent, {
			toEmail: recipientEmail,
			toUid: recipientUid,
			userName: recipientName,
			placeholders,
			ctaUrl,
			customContent,
			metadata,
			fromUid: senderUid,
			fromDisplayName,
			fromAvatarUrl,
			eventId: placeholders.eventId || `${eventType}-${recipientUid}-${Date.now()}`
		});

		return res.status(200).json(result);
	} catch (error: any) {
		console.error("Error in dispatch API:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(handler);
