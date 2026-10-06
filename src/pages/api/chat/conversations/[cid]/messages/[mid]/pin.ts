import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { resolveOrgAndMembership } from "@/utils/orgEngine";
import { Conversation } from "@/types/chat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { cid, mid } = req.query;
	const conversationId = cid as string;
	const messageId = mid as string;

	if (!conversationId || !messageId) {
		return res.status(400).json({ success: false, error: "Missing parameters" });
	}

	const db = getAdminFirestore();
	const convRef = db.collection("conversations").doc(conversationId);
	const convSnap = await convRef.get();

	if (!convSnap.exists) {
		return res.status(404).json({ success: false, error: "Conversation not found" });
	}

	const convData = convSnap.data() as Conversation;

	// Check permission
	let canPin = false;
	if (convData.type === "direct") {
		canPin = (convData.participantUids || []).includes(user.uid);
	} else if (convData.type === "organization_channel" && convData.organizationId) {
		const { member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
		if (member && ["owner", "admin", "coach", "instructor"].includes(member.roleId)) {
			canPin = true;
		}
	} else if (user.isAdmin) {
		canPin = true;
	}

	if (!canPin) {
		return res.status(403).json({ success: false, error: "You do not have permission to pin messages in this channel" });
	}

	const msgRef = convRef.collection("messages").doc(messageId);
	const msgSnap = await msgRef.get();

	if (!msgSnap.exists) {
		return res.status(404).json({ success: false, error: "Message not found" });
	}

	const msgData = msgSnap.data() || {};
	const currentlyPinned = !!msgData.isPinned;
	const now = Date.now();

	const updates = {
		isPinned: !currentlyPinned,
		pinnedAt: !currentlyPinned ? now : null,
		pinnedBy: !currentlyPinned ? user.uid : null,
	};

	await msgRef.update(updates);

	return res.status(200).json({
		success: true,
		isPinned: !currentlyPinned,
		pinnedAt: updates.pinnedAt,
	});
}

export default withApiErrorHandler(withAuthAndModeration(handler));
