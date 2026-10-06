import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { linkId } = req.query;
	const token = linkId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const linkRef = db.collection("organizationInviteLinks").doc(token);
		const linkSnap = await linkRef.get();
		if (!linkSnap.exists) {
			return res.status(404).json({ success: false, error: "Invite link not found or invalid" });
		}

		const linkData = linkSnap.data() || {};

		if (linkData.status !== "active") {
			return res.status(400).json({ success: false, error: "This invite link is no longer active" });
		}

		if (linkData.expiresAt && linkData.expiresAt <= Date.now()) {
			await linkRef.update({ status: "expired" });
			return res.status(410).json({ success: false, error: "This invite link has expired" });
		}

		if (linkData.maxUses > 0 && linkData.useCount >= linkData.maxUses) {
			await linkRef.update({ status: "expired" });
			return res.status(410).json({ success: false, error: "This invite link has reached its use limit" });
		}

		// Resolve org info
		const orgDoc = await db.collection("organizations").doc(linkData.organizationId).get();
		if (!orgDoc.exists) {
			return res.status(404).json({ success: false, error: "Organization not found" });
		}
		const orgData = orgDoc.data() || {};

		return res.status(200).json({
			success: true,
			inviteLink: {
				linkId: token,
				organizationId: linkData.organizationId,
				organizationName: orgData.displayName || orgData.name || "Workspace",
				organizationLogo: orgData.avatar || "",
				memberCount: orgData.memberCount || 0,
				roleId: linkData.roleId,
				passwordRequired: !!linkData.password,
				expiresAt: linkData.expiresAt,
			}
		});
	} catch (error: any) {
		console.error("GET /api/invite-links/[linkId] error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
