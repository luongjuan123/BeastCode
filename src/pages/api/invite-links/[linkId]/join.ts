import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { emitOrgEvent, OrganizationMember } from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
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
		const { password = "" } = req.body;

		// 1. Fetch invite link
		const linkRef = db.collection("organizationInviteLinks").doc(token);
		const linkSnap = await linkRef.get();
		if (!linkSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Invite link not found" });
		}

		const linkData = linkSnap.data() || {};

		// 2. Validate status and expiration
		if (linkData.status !== "active") {
			return res.status(400).json({ success: false, error: "Validation Error: This invite link is no longer active" });
		}

		if (linkData.expiresAt && linkData.expiresAt <= Date.now()) {
			await linkRef.update({ status: "expired" });
			return res.status(410).json({ success: false, error: "Expired: This invite link has expired" });
		}

		// 3. Validate max uses limit
		if (linkData.maxUses > 0 && linkData.useCount >= linkData.maxUses) {
			await linkRef.update({ status: "expired" });
			return res.status(410).json({ success: false, error: "Expired: This invite link has reached its maximum uses limit" });
		}

		// 4. Validate password protection
		if (linkData.password && linkData.password !== password) {
			return res.status(401).json({ success: false, error: "Unauthorized: Incorrect password for this invite link", passwordRequired: true });
		}

		const orgId = linkData.organizationId;
		const memberDocId = `${orgId}_${uid}`;

		// 5. Verify user is not already a member
		const memberDoc = await db.collection("organizationMembers").doc(memberDocId).get();
		if (memberDoc.exists && memberDoc.data()?.status === "active") {
			return res.status(400).json({ success: false, error: "Validation Error: You are already a member of this organization" });
		}

		// 6. Get user profile details
		const userDoc = await db.collection("users").doc(uid).get();
		const userData = userDoc.data() || {};
		const nickname = userData.displayName || userData.username || "Member";

		const newMember: OrganizationMember = {
			organizationId: orgId,
			uid,
			roleId: linkData.roleId || "member",
			nickname,
			title: "Member",
			department: "General",
			status: "active",
			joinedAt: Date.now(),
			joinedBy: linkData.createdBy,
			lastActive: Date.now(),
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		};

		const orgRef = db.collection("organizations").doc(orgId);

		// 7. Execute join in a transaction
		await db.runTransaction(async (transaction) => {
			const orgSnap = await transaction.get(orgRef);
			if (!orgSnap.exists) throw new Error("Organization not found");
			const currentCount = orgSnap.data()?.memberCount || 0;

			// Increment use count
			transaction.update(linkRef, {
				useCount: (linkData.useCount || 0) + 1,
			});

			// If link has a maxUses limit and this is the last use, expire it
			if (linkData.maxUses > 0 && (linkData.useCount || 0) + 1 >= linkData.maxUses) {
				transaction.update(linkRef, { status: "expired" });
			}

			// Add member and increment count
			transaction.set(db.collection("organizationMembers").doc(memberDocId), newMember);
			transaction.update(orgRef, { memberCount: currentCount + 1 });
		});

		// Trigger logs & events
		await emitOrgEvent(
			orgId,
			linkData.createdBy,
			"member.joined",
			uid,
			"organizationMembers",
			memberDocId,
			{ inviteLinkId: token },
			req.socket.remoteAddress || "127.0.0.1"
		);

		// Resolve org slug to redirect on client
		const updatedOrgSnap = await orgRef.get();
		const slug = updatedOrgSnap.data()?.slug || "";

		return res.status(200).json({ success: true, message: "Joined organization successfully", slug });
	} catch (error: any) {
		console.error("POST /api/invite-links/[linkId]/join error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
