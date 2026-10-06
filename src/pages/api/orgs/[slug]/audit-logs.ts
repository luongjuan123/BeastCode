import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "GET") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "VIEW_AUDIT_LOGS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to view audit logs." });
			}

			const snapshot = await db
				.collection("organizationAuditLogs")
				.where("orgSlug", "==", orgSlug)
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				list.push({
					id: doc.id,
					timestamp: data.timestamp,
					actorUid: data.actorUid,
					actorName: data.actorName,
					action: data.action,
					target: data.target,
					metadata: data.metadata || {},
					ip: data.ip || "unknown",
				});
			});

			list.sort((a, b) => b.timestamp - a.timestamp);

			return res.status(200).json({ success: true, logs: list });
		} catch (error: any) {
			console.error("GET audit logs error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
