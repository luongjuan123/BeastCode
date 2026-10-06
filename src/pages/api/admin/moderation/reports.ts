import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const { status, priority, search } = req.query;
			const reportsSnap = await db.collection("userReports").get();
			let reports = reportsSnap.docs.map((doc: any) => ({
				id: doc.id,
				...doc.data()
			}));

			// Apply status filter in memory
			if (status) {
				reports = reports.filter((r: any) => r.status === status);
			}

			// Apply priority filter in memory
			if (priority) {
				reports = reports.filter((r: any) => r.priority === priority);
			}

			// Apply search in memory
			if (search) {
				const searchLower = String(search).toLowerCase();
				reports = reports.filter((r: any) => 
					(r.targetName && r.targetName.toLowerCase().includes(searchLower)) ||
					(r.reporterName && r.reporterName.toLowerCase().includes(searchLower)) ||
					(r.reason && r.reason.toLowerCase().includes(searchLower))
				);
			}

			// Sort by timestamp desc in memory
			reports.sort((a: any, b: any) => {
				const timeA = a.timestamp || 0;
				const timeB = b.timestamp || 0;
				return timeB - timeA;
			});

			return res.status(200).json({ success: true, reports });
		} catch (error: any) {
			console.error("[Admin Reports GET] Failed to fetch reports:", error);
			return res.status(500).json({ success: false, error: "Failed to fetch reports list." });
		}
	}

	if (req.method === "POST") {
		const { reportId, action, notes, priority, moderatorUid, targetReportId } = req.body;

		if (!reportId || !action) {
			return res.status(400).json({ success: false, error: "Missing reportId or action" });
		}

		try {
			const reportRef = db.collection("userReports").doc(reportId);
			const reportSnap = await reportRef.get();
			if (!reportSnap.exists) {
				return res.status(404).json({ success: false, error: "Report not found" });
			}

			const reportData = reportSnap.data() || {};

			if (action === "assign") {
				if (!moderatorUid) {
					return res.status(400).json({ success: false, error: "Missing moderatorUid" });
				}
				await reportRef.update({ assignedModerator: moderatorUid, status: "REVIEWING" });
				
				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid: reportData.targetUid,
					targetName: reportData.targetName,
					action: "REPORT_ASSIGN",
					reason: `Assigned moderator UID: ${moderatorUid}`,
					oldState: reportData.status,
					newState: "REVIEWING",
					timestamp: Date.now(),
					ip: req.socket.remoteAddress || "127.0.0.1"
				});

				return res.status(200).json({ success: true, message: "Moderator assigned successfully." });
			}

			if (action === "escalate") {
				const newPriority = priority || "HIGH";
				await reportRef.update({ priority: newPriority, status: "REVIEWING" });

				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid: reportData.targetUid,
					targetName: reportData.targetName,
					action: "REPORT_ESCALATE",
					reason: `Escalated priority to ${newPriority}`,
					oldState: reportData.priority,
					newState: newPriority,
					timestamp: Date.now(),
					ip: req.socket.remoteAddress || "127.0.0.1"
				});

				return res.status(200).json({ success: true, message: "Report priority escalated successfully." });
			}

			if (action === "merge") {
				if (!targetReportId) {
					return res.status(400).json({ success: false, error: "Missing targetReportId to merge into" });
				}
				
				await reportRef.update({
					status: "MERGED",
					mergedInto: targetReportId,
					notes: `Merged into report ${targetReportId}. ` + (notes || "")
				});

				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid: reportData.targetUid,
					targetName: reportData.targetName,
					action: "REPORT_MERGE",
					reason: `Merged duplicate report into ${targetReportId}`,
					oldState: reportData.status,
					newState: "MERGED",
					timestamp: Date.now(),
					ip: req.socket.remoteAddress || "127.0.0.1"
				});

				return res.status(200).json({ success: true, message: "Reports merged successfully." });
			}

			if (action === "dismiss") {
				await reportRef.update({ status: "DISMISSED", resolution: "Dismissed by admin", notes: notes || "" });

				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid: reportData.targetUid,
					targetName: reportData.targetName,
					action: "REPORT_DISMISS",
					reason: notes || "No violation found",
					oldState: reportData.status,
					newState: "DISMISSED",
					timestamp: Date.now(),
					ip: req.socket.remoteAddress || "127.0.0.1"
				});

				return res.status(200).json({ success: true, message: "Report dismissed." });
			}

			return res.status(400).json({ success: false, error: "Invalid action" });
		} catch (error: any) {
			console.error("[Admin Reports POST] Action failed:", error);
			return res.status(500).json({ success: false, error: "Action processing failed." });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAdminGuard(handler));
