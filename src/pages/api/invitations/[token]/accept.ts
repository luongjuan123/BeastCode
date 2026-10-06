import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	emitOrgEvent,
	OrganizationMember,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { token } = req.query;
	const inviteToken = token as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (!inviteToken) {
		return res.status(400).json({ success: false, error: "Validation Error: Missing token" });
	}

	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Look up invitation by token
		const inviteSnap = await db
			.collection("organizationInvitations")
			.where("token", "==", inviteToken)
			.where("status", "==", "Pending")
			.limit(1)
			.get();

		if (inviteSnap.empty) {
			return res.status(404).json({ success: false, error: "Not Found: Invitation not found or already accepted" });
		}

		const inviteDoc = inviteSnap.docs[0];
		const inviteData = inviteDoc.data();

		if (inviteData.expiresAt <= Date.now()) {
			await inviteDoc.ref.update({ status: "Expired" });
			return res.status(410).json({ success: false, error: "Expired: This invitation has expired" });
		}

		if (inviteData.uid && inviteData.uid !== uid) {
			return res.status(403).json({ success: false, error: "Forbidden: This invitation was issued to a different user account" });
		}

		const orgId = inviteData.organizationId;
		const memberDocId = `${orgId}_${uid}`;

		// Verify target user is not already a member
		const existingMemberDoc = await db.collection("organizationMembers").doc(memberDocId).get();
		if (existingMemberDoc.exists && existingMemberDoc.data()?.status === "active") {
			return res.status(400).json({ success: false, error: "Validation Error: You are already a member of this organization" });
		}

		const targetUserDoc = await db.collection("users").doc(uid).get();
		const targetProfile = targetUserDoc.data() || {};
		const nickname = targetProfile.displayName || "Member";

		const newMember: OrganizationMember = {
			organizationId: orgId,
			uid,
			roleId: inviteData.roleId || "member",
			nickname,
			title: "Member",
			department: "General",
			status: "active",
			joinedAt: Date.now(),
			joinedBy: inviteData.createdBy,
			lastActive: Date.now(),
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		};

		const orgRef = db.collection("organizations").doc(orgId);

		// Transactional accept: Set invite to Accepted, create member, increment count
		await db.runTransaction(async (transaction) => {
			const orgSnap = await transaction.get(orgRef);
			if (!orgSnap.exists) throw new Error("Organization not found");
			const currentCount = orgSnap.data()?.memberCount || 0;

			transaction.update(inviteDoc.ref, {
				status: "Accepted",
				acceptedAt: Date.now(),
				uid,
			});
			transaction.set(db.collection("organizationMembers").doc(memberDocId), newMember);
			transaction.update(orgRef, { memberCount: currentCount + 1 });
		});

		// Trigger notifications & emails
		await emitOrgEvent(
			orgId,
			inviteData.createdBy,
			"member.joined",
			uid,
			"organizationMembers",
			memberDocId,
			{},
			req.socket.remoteAddress || "127.0.0.1"
		);

		return res.status(200).json({ success: true, message: "Invitation accepted successfully" });
	} catch (error: any) {
		console.error("POST /api/invitations/:token/accept error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
