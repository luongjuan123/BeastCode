import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

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
	const { emoji } = req.body;

	if (!conversationId || !messageId) {
		return res.status(400).json({ success: false, error: "Missing parameters" });
	}

	if (!emoji || typeof emoji !== "string" || emoji.length > 10) {
		return res.status(400).json({ success: false, error: "Invalid emoji" });
	}

	const db = getAdminFirestore();
	const msgRef = db.collection("conversations").doc(conversationId).collection("messages").doc(messageId);

	const updatedReactions = await db.runTransaction(async (tx) => {
		const snap = await tx.get(msgRef);
		if (!snap.exists) {
			throw new Error("Message not found");
		}

		const data = snap.data() || {};
		const reactions: Record<string, string[]> = data.reactions || {};
		const currentUids: string[] = reactions[emoji] || [];

		let newUids: string[];
		if (currentUids.includes(user.uid)) {
			// Toggle off
			newUids = currentUids.filter((u) => u !== user.uid);
		} else {
			// Toggle on
			newUids = [...currentUids, user.uid];
		}

		if (newUids.length > 0) {
			reactions[emoji] = newUids;
		} else {
			delete reactions[emoji];
		}

		tx.update(msgRef, { reactions });
		return reactions;
	});

	return res.status(200).json({
		success: true,
		reactions: updatedReactions,
	});
}

export default withApiErrorHandler(withAuthAndModeration(handler));
