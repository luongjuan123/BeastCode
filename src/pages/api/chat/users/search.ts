import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { q = "" } = req.query;
	const queryStr = (q as string).toLowerCase().trim();

	if (!queryStr || queryStr.length < 2) {
		return res.status(200).json({ success: true, users: [] });
	}

	const db = getAdminFirestore();

	try {
		// Query users matching username or displayName
		const usersSnap = await db.collection("users").limit(100).get();
		const results: any[] = [];

		usersSnap.forEach((doc) => {
			if (doc.id === user.uid) return;
			const data = doc.data();
			const username = (data.username || "").toLowerCase();
			const displayName = (data.displayName || "").toLowerCase();

			if (username.includes(queryStr) || displayName.includes(queryStr)) {
				results.push({
					uid: doc.id,
					username: data.username || "user",
					displayName: data.displayName || data.username || "Anonymous",
					avatarUrl: data.avatarUrl || "",
					role: data.role || "user",
				});
			}
		});

		return res.status(200).json({
			success: true,
			users: results.slice(0, 15),
		});
	} catch (error: any) {
		console.error("[User Search Error]:", error);
		return res.status(500).json({ success: false, error: error.message || "Search failed" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
