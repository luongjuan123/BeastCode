import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { getClientInfo } from "@/utils/securityHelpers";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const sessionsSnap = await db.collection("activeSessions")
				.where("userId", "==", user.uid)
				.get();

			const sessions = sessionsSnap.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			return res.status(200).json({ success: true, sessions });
		} catch (error: any) {
			console.error("[Get Sessions] Error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to fetch active sessions." });
		}
	}

	if (req.method === "POST") {
		// Update/register current session
		const { sessionId } = req.body;
		if (!sessionId) {
			return res.status(400).json({ success: false, error: "Session ID is required." });
		}

		try {
			const clientInfo = getClientInfo(req);
			const sessionRef = db.collection("activeSessions").doc(sessionId);

			const sessionDoc = await sessionRef.get();
			const now = Date.now();

			if (sessionDoc.exists) {
				await sessionRef.update({
					lastActive: now,
					ip: clientInfo.ip,
					country: clientInfo.country,
					userAgent: clientInfo.userAgent,
					browser: clientInfo.browser,
					os: clientInfo.os
				});
			} else {
				await sessionRef.set({
					userId: user.uid,
					sessionId,
					createdAt: now,
					lastActive: now,
					ip: clientInfo.ip,
					country: clientInfo.country,
					userAgent: clientInfo.userAgent,
					browser: clientInfo.browser,
					os: clientInfo.os
				});

				// Log to login history!
				await db.collection("loginHistory").add({
					userId: user.uid,
					timestamp: now,
					status: "Successful Login",
					ip: clientInfo.ip,
					country: clientInfo.country,
					userAgent: clientInfo.userAgent,
					browser: clientInfo.browser,
					os: clientInfo.os
				});
			}

			return res.status(200).json({ success: true, message: "Session tracked successfully." });
		} catch (error: any) {
			console.error("[Track Session] Error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to track session." });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuthAndModeration(handler);
