import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	SYSTEM_ROLES_TEMPLATES,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, uid: targetUid } = req.query;

	const orgIdentifier = id as string;
	const memberUid = targetUid as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (!orgIdentifier || !memberUid) {
		return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
	}

	// Resolve org and membership
	const { org, member: callerMember, role: callerRole } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	const memberDocId = `${org.id}_${memberUid}`;
	const targetMemberDoc = await db.collection("organizationMembers").doc(memberDocId).get();
	if (!targetMemberDoc.exists) {
		return res.status(404).json({ success: false, error: "Not Found: Member not found in organization" });
	}

	const targetMember = targetMemberDoc.data() || {};

	// DELETE /api/organizations/:id/members/:uid - Remove member (or leave workspace)
	if (req.method === "DELETE") {
		try {
			const isLeaving = uid === memberUid;

			if (!isLeaving) {
				const { allowed } = await checkOrgPermission(org.id, uid, "organization.removeMember");
				if (!allowed) {
					return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
				}

				// Check priority: caller role priority must be greater than target role priority
				const callerPriority = callerRole?.priority || 0;
				const targetRoleTemplate = SYSTEM_ROLES_TEMPLATES.find((t) => t.id === targetMember.roleId);
				const targetPriority = targetRoleTemplate?.priority || 0;

				if (callerPriority <= targetPriority && org.ownerUid !== uid) {
					return res.status(403).json({ success: false, error: "Forbidden: Cannot remove user with equal or higher role priority" });
				}
			}

			// Validate owner cannot leave/be removed unless they transfer ownership first
			if (targetMember.roleId === "owner") {
				return res.status(400).json({ success: false, error: "Validation Error: Owner cannot be removed. Transfer ownership first." });
			}

			const orgRef = db.collection("organizations").doc(org.id);
			const memberRef = db.collection("organizationMembers").doc(memberDocId);

			// Transaction: Delete membership and decrement memberCount
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.memberCount || 1;

				transaction.delete(memberRef);
				transaction.update(orgRef, { memberCount: Math.max(0, currentCount - 1) });
			});

			// Audit and Notify
			await emitOrgEvent(
				org.id,
				uid,
				isLeaving ? "member.left" : "member.removed",
				memberUid,
				"organizationMembers",
				memberDocId,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Member removed successfully" });
		} catch (error: any) {
			console.error("DELETE /api/organizations/:id/members/:uid error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// PATCH /api/organizations/:id/members/:uid - Update membership details
	if (req.method === "PATCH") {
		try {
			const { roleId, nickname, title, department, isHidden, isFavorite } = req.body;

			const updateData: any = {};

			// Update roleId check
			if (roleId !== undefined) {
				const { allowed } = await checkOrgPermission(org.id, uid, "organization.assignRole");
				if (!allowed) {
					return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
				}

				if (uid === memberUid) {
					return res.status(400).json({ success: false, error: "Validation Error: Cannot change your own role" });
				}

				// Priority protection
				const callerPriority = callerRole?.priority || 0;
				const targetRoleTemplate = SYSTEM_ROLES_TEMPLATES.find((t) => t.id === targetMember.roleId);
				const targetPriority = targetRoleTemplate?.priority || 0;

				if (callerPriority <= targetPriority && org.ownerUid !== uid) {
					return res.status(403).json({ success: false, error: "Forbidden: Cannot change role of equal or higher priority members" });
				}

				const newRoleTemplate = SYSTEM_ROLES_TEMPLATES.find((t) => t.id === roleId);
				if (!newRoleTemplate) {
					return res.status(400).json({ success: false, error: "Validation Error: Role template not found" });
				}

				if (callerPriority <= newRoleTemplate.priority && org.ownerUid !== uid) {
					return res.status(403).json({ success: false, error: "Forbidden: Cannot assign a role priority higher than or equal to yours" });
				}

				updateData.roleId = roleId;
			}

			// Authorization check for profile fields and workspace preferences
			const isSelf = uid === memberUid;
			const hasAssignRole = callerRole?.permissions?.includes("organization.assignRole") || org.ownerUid === uid;

			if (!isSelf && !hasAssignRole && (nickname !== undefined || title !== undefined || department !== undefined)) {
				return res.status(403).json({ success: false, error: "Forbidden: Cannot edit another member's profile" });
			}

			if (!isSelf && (isHidden !== undefined || isFavorite !== undefined)) {
				return res.status(403).json({ success: false, error: "Forbidden: Cannot edit another member's preferences" });
			}

			// Nickname, title, department check (Self can edit, or managers)
			if (nickname !== undefined) updateData.nickname = nickname.trim();
			if (title !== undefined) updateData.title = title.trim();
			if (department !== undefined) updateData.department = department.trim();
			if (isHidden !== undefined) updateData.isHidden = isHidden;
			if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

			if (Object.keys(updateData).length === 0) {
				return res.status(400).json({ success: false, error: "Validation Error: Nothing to update" });
			}

			await db.collection("organizationMembers").doc(memberDocId).update(updateData);

			if (updateData.roleId) {
				await emitOrgEvent(
					org.id,
					uid,
					"role.changed",
					memberUid,
					"organizationMembers",
					memberDocId,
					{ newRole: updateData.roleId },
					req.socket.remoteAddress || "127.0.0.1"
				);
			}

			return res.status(200).json({ success: true, message: "Member updated successfully" });
		} catch (error: any) {
			console.error("PATCH /api/organizations/:id/members/:uid error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
