import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.viewAuditLogs");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const { limit = "50", offset = "0" } = req.query;
		const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
		const parsedOffset = Math.max(0, parseInt(offset as string, 10));

		// Retrieve logs sorted by timestamp descending
		const snapshot = await db
			.collection("organizationAuditLogs")
			.where("organizationId", "==", org.id)
			.get();

		const list: any[] = [];
		snapshot.forEach((doc) => {
			list.push(doc.data());
		});

		list.sort((a, b) => b.timestamp - a.timestamp);
		const paginated = list.slice(parsedOffset, parsedOffset + parsedLimit);

		// Resolve actor names
		const actorIds = Array.from(new Set(paginated.map((log) => log.actorUid)));
		const actorProfiles: Record<string, any> = {};
		if (actorIds.length > 0) {
			const chunks = [];
			for (let i = 0; i < actorIds.length; i += 30) {
				chunks.push(actorIds.slice(i, i + 30));
			}
			const promises = chunks.map((chunk) =>
				db.collection("users").where("__name__", "in", chunk).get()
			);
			const snaps = await Promise.all(promises);
			snaps.forEach((snap) => {
				snap.forEach((doc) => {
					actorProfiles[doc.id] = doc.data();
				});
			});
		}

		const detailedLogs = paginated.map((log) => {
			const profile = actorProfiles[log.actorUid] || {};
			return {
				...log,
				actorName: profile.displayName || profile.username || "System Member",
				actorAvatar: profile.avatarUrl || "",
			};
		});

		return res.status(200).json({ success: true, total: list.length, logs: detailedLogs });
	} catch (error: any) {
		console.error("GET /api/organizations/:id/audit-logs error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
