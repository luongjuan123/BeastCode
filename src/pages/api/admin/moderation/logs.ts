import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		const db = getAdminFirestore();

		const snapshot = await db.collection("moderationLogs").orderBy("timestamp", "desc").get();
		const logs: any[] = [];
		
		const usersSnap = await db.collection("users").get();
		const usersMap = new Map();
		usersSnap.forEach(doc => {
			usersMap.set(doc.id, doc.data());
		});

		snapshot.forEach(docSnap => {
			const data = docSnap.data();
			const adminUser = usersMap.get(data.adminUid) || { displayName: data.adminUid === "SYSTEM" ? "System Auto-Unban" : "Unknown Admin" };
			const targetUser = usersMap.get(data.targetUid) || { displayName: "Deleted Account" };

			logs.push({
				id: docSnap.id,
				...data,
				adminName: adminUser.displayName || adminUser.email || "Admin",
				targetName: targetUser.displayName || targetUser.email || "User"
			});
		});

		return res.status(200).json({ success: true, logs });
	} catch (error: any) {
		console.error("GET moderation logs error:", error);
		return res.status(500).json({ success: false, error: error.message });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
