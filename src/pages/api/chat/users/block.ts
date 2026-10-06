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

	const { targetUid, action } = req.body;

	if (!targetUid || typeof targetUid !== "string") {
		return res.status(400).json({ success: false, error: "Missing target user ID" });
	}

	if (targetUid === user.uid) {
		return res.status(400).json({ success: false, error: "Cannot block yourself" });
	}

	const db = getAdminFirestore();
	const blockRef = db.collection("userBlocks").doc(`${user.uid}_${targetUid}`);

	if (action === "unblock") {
		await blockRef.delete();
		return res.status(200).json({ success: true, isBlocked: false });
	}

	await blockRef.set({
		blockerUid: user.uid,
		blockedUid: targetUid,
		createdAt: Date.now(),
	});

	return res.status(200).json({ success: true, isBlocked: true });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
