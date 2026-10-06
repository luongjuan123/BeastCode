import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { randomBytes } from "crypto";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, inviteId } = req.query;

	const orgIdentifier = id as string;
	const invitationId = inviteId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const inviteRef = db.collection("organizationInvitations").doc(invitationId);
		const inviteSnap = await inviteRef.get();
		if (!inviteSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Invitation not found" });
		}

		const inviteData = inviteSnap.data() || {};
		if (inviteData.organizationId !== org.id) {
			return res.status(400).json({ success: false, error: "Validation Error: Invitation does not belong to this organization" });
		}

		// DELETE /api/organizations/:id/invitations/:inviteId - Cancel/Revoke invite
		if (req.method === "DELETE") {
			await inviteRef.update({ status: "Cancelled" });

			await emitOrgEvent(
				org.id,
				uid,
				"member.invitation_revoked",
				inviteData.uid,
				"organizationInvitations",
				invitationId,
				{ email: inviteData.email, status: "Cancelled" },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Invitation cancelled successfully" });
		}

		// POST /api/organizations/:id/invitations/:inviteId - Actions: resend or expire
		if (req.method === "POST") {
			const { action } = req.body;

			if (action === "resend") {
				// Generate new token and refresh expiresAt
				const newToken = randomBytes(32).toString("hex");
				const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

				await inviteRef.update({
					token: newToken,
					status: "Pending",
					expiresAt,
					timestamp: Date.now(),
				});

				await emitOrgEvent(
					org.id,
					uid,
					"member.invited",
					inviteData.uid,
					"organizationInvitations",
					invitationId,
					{ email: inviteData.email, token: newToken, inviteId: invitationId },
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, message: "Invitation resent successfully" });
			}

			if (action === "expire") {
				await inviteRef.update({ status: "Expired" });

				await emitOrgEvent(
					org.id,
					uid,
					"member.invitation_expired",
					inviteData.uid,
					"organizationInvitations",
					invitationId,
					{ email: inviteData.email },
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, message: "Invitation expired successfully" });
			}

			return res.status(400).json({ success: false, error: "Validation Error: Invalid action" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (error: any) {
		console.error("error inside /api/organizations/[id]/invitations/[inviteId]:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
