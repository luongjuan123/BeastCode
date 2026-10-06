import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return res.status(400).json({ success: false, error: "Session ID is required." });
	}

	try {
		const db = getAdminFirestore();
		const sessionRef = db.collection("activeSessions").doc(id);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			return res.status(404).json({ success: false, error: "Session not found." });
		}

		if (sessionDoc.data()?.userId !== user.uid) {
			return res.status(403).json({ success: false, error: "Forbidden. You cannot revoke another user's session." });
		}

		await sessionRef.delete();

		return res.status(200).json({ success: true, message: "Session revoked successfully." });
	} catch (error: any) {
		console.error("[Revoke Session] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to revoke session." });
	}
}

export default withAuthAndModeration(handler);
