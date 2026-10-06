import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { ChatMessage } from "@/types/chat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { mid, conversationId, reason, category = "Harassment" } = req.body;
	const messageId = mid || (req.query.mid as string);

	if (!messageId || !conversationId) {
		return res.status(400).json({ success: false, error: "Missing message ID or conversation ID" });
	}

	const db = getAdminFirestore();
	const msgRef = db.collection("conversations").doc(conversationId).collection("messages").doc(messageId);
	const msgSnap = await msgRef.get();

	if (!msgSnap.exists) {
		return res.status(404).json({ success: false, error: "Message not found" });
	}

	const msgData = msgSnap.data() as ChatMessage;

	const reportDoc = await db.collection("userReports").add({
		reporterUid: user.uid,
		reporterEmail: user.email || "",
		targetUid: msgData.senderId,
		targetUsername: msgData.senderUsername,
		category,
		reason: (reason || "Inappropriate message").trim(),
		resourceType: "chat_message",
		resourceId: messageId,
		conversationId,
		messageSnapshot: {
			text: msgData.text,
			senderId: msgData.senderId,
			senderDisplayName: msgData.senderDisplayName,
			createdAt: msgData.createdAt,
			type: msgData.type,
			hasAttachments: !!msgData.hasAttachments,
		},
		status: "pending",
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	return res.status(201).json({
		success: true,
		reportId: reportDoc.id,
		message: "Message reported successfully. Our moderation team will review it.",
	});
}

export default withApiErrorHandler(withAuthAndModeration(handler));
