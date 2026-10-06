import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { cid } = req.query;
	const conversationId = cid as string;

	if (!conversationId) {
		return res.status(400).json({ success: false, error: "Missing conversation ID" });
	}

	const db = getAdminFirestore();
	const typingRef = db
		.collection("conversations")
		.doc(conversationId)
		.collection("typing")
		.doc(user.uid);

	if (req.method === "POST") {
		const userDoc = await db.collection("users").doc(user.uid).get();
		const userData = userDoc.data() || {};
		const displayName = userData.displayName || userData.username || "User";

		const now = Date.now();
		await typingRef.set({
			uid: user.uid,
			displayName,
			expiresAt: now + 4000,
		});

		return res.status(200).json({ success: true });
	}

	if (req.method === "DELETE") {
		await typingRef.delete();
		return res.status(200).json({ success: true });
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
