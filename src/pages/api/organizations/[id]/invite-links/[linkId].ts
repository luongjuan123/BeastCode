import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, linkId } = req.query;

	const orgIdentifier = id as string;
	const token = linkId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const linkRef = db.collection("organizationInviteLinks").doc(token);
		const linkSnap = await linkRef.get();
		if (!linkSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Invite link not found" });
		}

		const linkData = linkSnap.data() || {};
		if (linkData.organizationId !== org.id) {
			return res.status(400).json({ success: false, error: "Validation Error: Invite link does not belong to this organization" });
		}

		// DELETE /api/organizations/:id/invite-links/:linkId - Revoke Link
		if (req.method === "DELETE") {
			await linkRef.update({ status: "revoked" });

			await emitOrgEvent(
				org.id,
				uid,
				"invite_link.revoked",
				null,
				"organizationInviteLinks",
				token,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Invite link revoked successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (error: any) {
		console.error("DELETE /api/organizations/:id/invite-links/:linkId error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
