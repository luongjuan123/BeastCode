import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	OrganizationJoinRequest,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, status = "Pending" } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Resolve org first
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.manageRecruitment");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const snapshot = await db
			.collection("organizationJoinRequests")
			.where("organizationId", "==", org.id)
			.where("status", "==", status)
			.get();

		const list: OrganizationJoinRequest[] = [];
		snapshot.forEach((doc) => {
			list.push(doc.data() as OrganizationJoinRequest);
		});

		if (list.length === 0) {
			return res.status(200).json({ success: true, requests: [] });
		}

		// Resolve applying user profile information (Display Name, avatar, email)
		const userIds = list.map((r) => r.uid);
		const chunks: string[][] = [];
		for (let i = 0; i < userIds.length; i += 30) {
			chunks.push(userIds.slice(i, i + 30));
		}

		const userProfiles: Record<string, any> = {};
		const profilesPromises = chunks.map((chunk) =>
			db.collection("users").where("__name__", "in", chunk).get()
		);
		const profilesSnaps = await Promise.all(profilesPromises);
		profilesSnaps.forEach((snap) => {
			snap.forEach((doc) => {
				userProfiles[doc.id] = doc.data();
			});
		});

		const detailedRequests = list.map((r) => {
			const profile = userProfiles[r.uid] || {};
			return {
				...r,
				displayName: profile.displayName || "Anonymous",
				username: profile.username || "",
				avatarUrl: profile.avatarUrl || "",
				email: profile.email || "",
			};
		});

		return res.status(200).json({ success: true, requests: detailedRequests });
	} catch (error: any) {
		console.error("GET /api/organizations/:id/join-requests error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
