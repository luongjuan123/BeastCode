import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	OrganizationMember,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, requestId } = req.query;

	const orgIdentifier = id as string;
	const reqId = requestId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "PATCH") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.manageRecruitment");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const requestRef = db.collection("organizationJoinRequests").doc(reqId);
		const requestSnap = await requestRef.get();
		if (!requestSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Join request not found" });
		}

		const requestData = requestSnap.data() || {};
		if (requestData.organizationId !== org.id) {
			return res.status(400).json({ success: false, error: "Validation Error: Request does not belong to this organization" });
		}

		if (requestData.status !== "Pending") {
			return res.status(400).json({ success: false, error: `Validation Error: Request has already been reviewed (${requestData.status})` });
		}

		const { action, adminNote = "" } = req.body;
		if (action !== "approve" && action !== "reject") {
			return res.status(400).json({ success: false, error: "Validation Error: action must be 'approve' or 'reject'" });
		}

		const now = Date.now();
		const targetUid = requestData.uid;

		if (action === "approve") {
			const memberDocId = `${org.id}_${targetUid}`;
			const memberRef = db.collection("organizationMembers").doc(memberDocId);
			const orgRef = db.collection("organizations").doc(org.id);

			// Fetch target profile nickname fallback
			const targetUserDoc = await db.collection("users").doc(targetUid).get();
			const targetProfile = targetUserDoc.data() || {};
			const nickname = targetProfile.displayName || "Member";

			const newMember: OrganizationMember = {
				organizationId: org.id,
				uid: targetUid,
				roleId: "member",
				nickname,
				title: "Member",
				department: "General",
				status: "active",
				joinedAt: now,
				joinedBy: uid,
				lastActive: now,
				permissionsVersion: 1,
				isHidden: false,
				isFavorite: false,
			};

			// Transactional approval: Create member and increment count
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.memberCount || 0;

				transaction.update(requestRef, {
					status: "Approved",
					reviewedBy: uid,
					reviewedAt: now,
					adminNote: adminNote.trim(),
				});
				transaction.set(memberRef, newMember);
				transaction.update(orgRef, { memberCount: currentCount + 1 });
			});

			// Trigger event logs & user notifications/emails
			await emitOrgEvent(
				org.id,
				uid,
				"member.joined",
				targetUid,
				"organizationMembers",
				memberDocId,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);
		} else {
			// Reject application
			await requestRef.update({
				status: "Rejected",
				reviewedBy: uid,
				reviewedAt: now,
				adminNote: adminNote.trim(),
			});

			await emitOrgEvent(
				org.id,
				uid,
				"member.rejected",
				targetUid,
				"organizationJoinRequests",
				reqId,
				{ adminNote },
				req.socket.remoteAddress || "127.0.0.1"
			);
		}

		return res.status(200).json({ success: true, message: `Request successfully ${action}d` });
	} catch (error: any) {
		console.error("PATCH /api/organizations/:id/join-requests/:requestId error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
