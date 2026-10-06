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

	const { cid } = req.query;
	const conversationId = cid as string;
	const { messageId, readTimestamp } = req.body;

	if (!conversationId) {
		return res.status(400).json({ success: false, error: "Missing conversation ID" });
	}

	const db = getAdminFirestore();
	const now = readTimestamp && typeof readTimestamp === "number" ? readTimestamp : Date.now();

	const metaRef = db.collection("userConversationMeta").doc(`${user.uid}_${conversationId}`);
	const convRef = db.collection("conversations").doc(conversationId);

	await Promise.all([
		metaRef.set(
			{
				uid: user.uid,
				conversationId,
				lastReadAt: now,
				...(messageId ? { lastReadMessageId: messageId } : {}),
				updatedAt: now,
			},
			{ merge: true }
		),
		convRef.set(
			{
				readPointers: {
					[user.uid]: now,
				},
			},
			{ merge: true }
		),
	]);

	return res.status(200).json({
		success: true,
		lastReadAt: now,
	});
}

export default withApiErrorHandler(withAuthAndModeration(handler));
