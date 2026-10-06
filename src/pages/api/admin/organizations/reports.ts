import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	// GET /api/admin/organizations/reports - List organization reports
	if (req.method === "GET") {
		try {
			const reportsSnap = await db.collection("organizationReports").get();
			const list: any[] = [];

			// Fetch user details map to resolve reporters
			const usersSnap = await db.collection("users").get();
			const userMap = new Map<string, any>();
			usersSnap.forEach((doc) => {
				userMap.set(doc.id, doc.data());
			});

			// Fetch org details map
			const orgsSnap = await db.collection("organizations").get();
			const orgMap = new Map<string, any>();
			orgsSnap.forEach((doc) => {
				orgMap.set(doc.id, doc.data());
			});

			reportsSnap.forEach((doc) => {
				const data = doc.data();
				const reporter = userMap.get(data.reporterUid) || {};
				const org = orgMap.get(data.organizationId) || {};

				list.push({
					id: doc.id,
					organizationId: data.organizationId || "",
					organizationName: org.displayName || org.name || "Workspace",
					organizationSlug: org.slug || "",
					reporterUid: data.reporterUid || "",
					reporterUsername: reporter.username || "Reporter",
					reason: data.reason || "abuse",
					description: data.description || "",
					evidence: data.evidence || "",
					status: data.status || "pending",
					timestamp: data.timestamp || 0,
				});
			});

			// Sort by timestamp desc
			list.sort((a, b) => b.timestamp - a.timestamp);

			return res.status(200).json({ success: true, reports: list });
		} catch (error: any) {
			console.error("GET admin organization reports error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	// POST /api/admin/organizations/reports - Resolve or Dismiss report
	if (req.method === "POST") {
		try {
			const { reportId, status } = req.body;

			if (!reportId || !status) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
			}

			const reportRef = db.collection("organizationReports").doc(reportId);
			const reportSnap = await reportRef.get();
			if (!reportSnap.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Report not found" });
			}

			await reportRef.update({
				status,
				resolvedAt: Date.now(),
				resolvedBy: req.user?.uid || "admin",
			});

			return res.status(200).json({ success: true, message: `Report marked as ${status} successfully.` });
		} catch (error: any) {
			console.error("POST resolve organization report error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAdminGuard(handler));
