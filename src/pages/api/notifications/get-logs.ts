import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		const db = getAdminFirestore();

		// 2. Query data
		// A. Fetch recent 50 queue items
		const queueSnap = await db.collection("emailQueue")
			.orderBy("createdAt", "desc")
			.limit(50)
			.get();

		const queueItems = queueSnap.docs.map(doc => ({
			id: doc.id,
			toEmail: doc.data().toEmail || "",
			category: doc.data().category || "",
			eventType: doc.data().eventType || "",
			subject: doc.data().subject || "",
			status: doc.data().status || "pending",
			retryCount: doc.data().retryCount || 0,
			nextRetryAt: doc.data().nextRetryAt || 0,
			createdAt: doc.data().createdAt || 0,
			error: doc.data().error || null,
			deliveryDurationMs: doc.data().deliveryDurationMs || null,
			previewUrl: doc.data().previewUrl || null
		}));

		// B. Fetch recent 30 history traces
		const historySnap = await db.collection("notificationHistory")
			.orderBy("timestamp", "desc")
			.limit(30)
			.get();

		const historyItems = historySnap.docs.map(doc => ({
			id: doc.id,
			eventType: doc.data().eventType || "",
			userEmail: doc.data().userEmail || "",
			category: doc.data().category || "",
			status: doc.data().status || "pending",
			timestamp: doc.data().timestamp || 0,
			reason: doc.data().reason || null,
			error: doc.data().error || null
		}));

		// C. Fetch general analytics metrics
		const statsDoc = await db.collection("emailStats").doc("analytics").get();
		const stats = statsDoc.exists ? statsDoc.data() : {
			sentCount: 0,
			failedCount: 0,
			totalDurationMs: 0,
			averageDurationMs: 0
		};

		return res.status(200).json({
			success: true,
			queue: queueItems,
			history: historyItems,
			analytics: stats
		});
	} catch (error: any) {
		console.error("Error retrieving notification logs:", error);
		return res.status(500).json({ success: false, message: error.message || "Failed to retrieve notification records" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
