import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { emitOrgEvent, OrganizationMember } from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { inviteId } = req.query;
	const invitationId = inviteId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		const { action } = req.body; // "accept" or "decline"
		if (action !== "accept" && action !== "decline") {
			return res.status(400).json({ success: false, error: "Validation Error: action must be 'accept' or 'decline'" });
		}

		// Look up invitation
		const inviteRef = db.collection("organizationInvitations").doc(invitationId);
		const inviteSnap = await inviteRef.get();
		if (!inviteSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Invitation not found" });
		}

		const inviteData = inviteSnap.data() || {};

		// Verify target user ownership of this invitation (UID or Email matching)
		const userDoc = await db.collection("users").doc(uid).get();
		const userData = userDoc.data() || {};
		const email = userData.email?.toLowerCase().trim() || "";

		const matchesUid = inviteData.uid === uid;
		const matchesEmail = inviteData.email?.toLowerCase().trim() === email;

		if (!matchesUid && !matchesEmail) {
			return res.status(403).json({ success: false, error: "Forbidden: You are not the recipient of this invitation" });
		}

		if (inviteData.status !== "Pending") {
			return res.status(400).json({ success: false, error: `Validation Error: Invitation is already ${inviteData.status}` });
		}

		if (inviteData.expiresAt <= Date.now()) {
			await inviteRef.update({ status: "Expired" });
			return res.status(410).json({ success: false, error: "Expired: This invitation has expired" });
		}

		const orgId = inviteData.organizationId;
		const memberDocId = `${orgId}_${uid}`;

		if (action === "decline") {
			// Update status to Declined
			await inviteRef.update({
				status: "Declined",
				declinedAt: Date.now(),
			});

			await emitOrgEvent(
				orgId,
				uid,
				"member.rejected", // or member.declined
				uid,
				"organizationInvitations",
				invitationId,
				{ status: "Declined" },
				req.socket.remoteAddress || "127.0.0.1"
			);

			// Find and update notifications pointing to this inviteId
			try {
				const notifsSnap = await db
					.collection("notifications")
					.where("metadata.inviteId", "==", invitationId)
					.get();

				if (!notifsSnap.empty) {
					const batch = db.batch();
					notifsSnap.forEach((doc) => {
						batch.update(doc.ref, {
							read: true,
							"metadata.status": "Declined",
						});
					});
					await batch.commit();
				}
			} catch (notifErr) {
				console.error("Failed to update related notifications:", notifErr);
			}

			return res.status(200).json({ success: true, message: "Invitation declined successfully" });
		}

		// action === "accept"
		// Verify target user is not already a member
		const existingMemberDoc = await db.collection("organizationMembers").doc(memberDocId).get();
		if (existingMemberDoc.exists && existingMemberDoc.data()?.status === "active") {
			return res.status(400).json({ success: false, error: "Validation Error: You are already a member of this organization" });
		}

		const nickname = userData.displayName || userData.username || "Member";

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

			transaction.update(inviteRef, {
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

		// Find and update notifications pointing to this inviteId
		try {
			const notifsSnap = await db
				.collection("notifications")
				.where("metadata.inviteId", "==", invitationId)
				.get();

			if (!notifsSnap.empty) {
				const batch = db.batch();
				notifsSnap.forEach((doc) => {
					batch.update(doc.ref, {
						read: true,
						"metadata.status": "Accepted",
					});
				});
				await batch.commit();
			}
		} catch (notifErr) {
			console.error("Failed to update related notifications:", notifErr);
		}

		return res.status(200).json({ success: true, message: "Invitation accepted successfully" });
	} catch (error: any) {
		console.error("POST /api/users/invitations/[inviteId]/respond error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
