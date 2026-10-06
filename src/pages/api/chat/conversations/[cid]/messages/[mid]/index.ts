import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { resolveOrgAndMembership } from "@/utils/orgEngine";
import { ChatMessage, Conversation } from "@/types/chat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { cid, mid } = req.query;
	const conversationId = cid as string;
	const messageId = mid as string;

	if (!conversationId || !messageId) {
		return res.status(400).json({ success: false, error: "Missing conversation or message ID" });
	}

	const db = getAdminFirestore();
	const convRef = db.collection("conversations").doc(conversationId);
	const convSnap = await convRef.get();

	if (!convSnap.exists) {
		return res.status(404).json({ success: false, error: "Conversation not found" });
	}

	const convData = convSnap.data() as Conversation;
	const msgRef = convRef.collection("messages").doc(messageId);
	const msgSnap = await msgRef.get();

	if (!msgSnap.exists) {
		return res.status(404).json({ success: false, error: "Message not found" });
	}

	const msgData = msgSnap.data() as ChatMessage;

	// Check if user is org staff
	let isOrgStaff = false;
	if (convData.type === "organization_channel" && convData.organizationId) {
		const { member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
		if (member && ["owner", "admin", "moderator"].includes(member.roleId)) {
			isOrgStaff = true;
		}
	}

	const isAuthor = msgData.senderId === user.uid;
	const canDelete = isAuthor || isOrgStaff || user.isAdmin;

	// ─── PATCH: Edit Message ───────────────────────────────────────────────────
	if (req.method === "PATCH") {
		if (!isAuthor) {
			return res.status(403).json({ success: false, error: "You can only edit your own messages" });
		}

		if (msgData.isDeleted) {
			return res.status(400).json({ success: false, error: "Cannot edit a deleted message" });
		}

		// Edit window: 24 hours
		const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
		if (Date.now() - msgData.createdAt > EDIT_WINDOW_MS) {
			return res.status(400).json({ success: false, error: "Messages can only be edited within 24 hours" });
		}

		const { text, code } = req.body;
		const trimmedText = (text || "").trim();

		if (!trimmedText && !code) {
			return res.status(400).json({ success: false, error: "Message content cannot be empty" });
		}

		const now = Date.now();
		const updates: Partial<ChatMessage> = {
			text: trimmedText,
			...(code !== undefined ? { code } : {}),
			isEdited: true,
			editedAt: now,
		};

		await msgRef.update(updates);

		return res.status(200).json({
			success: true,
			message: { ...msgData, ...updates, id: messageId },
		});
	}

	// ─── DELETE: Soft Delete Message ───────────────────────────────────────────
	if (req.method === "DELETE") {
		if (!canDelete) {
			return res.status(403).json({ success: false, error: "You do not have permission to delete this message" });
		}

		const now = Date.now();
		const updates: Partial<ChatMessage> = {
			isDeleted: true,
			deletedAt: now,
			deletedBy: user.uid,
			text: "This message was deleted",
			attachments: [],
			hasAttachments: false,
		};

		await msgRef.update(updates);

		return res.status(200).json({
			success: true,
			message: { ...msgData, ...updates, id: messageId },
		});
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
