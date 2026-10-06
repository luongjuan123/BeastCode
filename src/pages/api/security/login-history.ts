import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const db = getAdminFirestore();
		const historySnap = await db.collection("loginHistory")
			.where("userId", "==", user.uid)
			.get();

		const history = historySnap.docs
			.map((doc) => ({
				id: doc.id,
				...(doc.data() as { timestamp?: number; ip?: string; country?: string; userAgent?: string; browser?: string; os?: string; status?: string })
			}))
			.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
			.slice(0, 50); // limit to last 50 entries

		return res.status(200).json({ success: true, history });
	} catch (error: any) {
		console.error("[Get Login History] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to fetch login history." });
	}
}

export default withAuthAndModeration(handler);
