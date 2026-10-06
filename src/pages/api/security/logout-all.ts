import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "DELETE" && req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { currentSessionId } = req.body;

	try {
		const db = getAdminFirestore();
		const sessionsSnap = await db.collection("activeSessions")
			.where("userId", "==", user.uid)
			.get();

		const batch = db.batch();
		sessionsSnap.docs.forEach((doc) => {
			if (currentSessionId && doc.id === currentSessionId) {
				// Don't delete the current device session
				return;
			}
			batch.delete(doc.ref);
		});

		await batch.commit();

		return res.status(200).json({ success: true, message: "Logged out other devices successfully." });
	} catch (error: any) {
		console.error("[Logout All Other] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to log out other devices." });
	}
}

export default withAuthAndModeration(handler);
