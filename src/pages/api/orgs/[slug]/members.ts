import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission, logOrgAction } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	// 1. Verify VIEW_ORG for list, MANAGE_MEMBERS / INVITE_MEMBERS for mutations
	if (req.method === "GET") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "VIEW_ORG");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			const { search, limit = "50", offset = "0" } = req.query;
			const limitNum = parseInt(limit as string, 10);
			const offsetNum = parseInt(offset as string, 10);

			let memberQuery = db
				.collection("organizationMembers")
				.where("orgSlug", "==", orgSlug);

			const snapshot = await memberQuery.get();
			let list: any[] = [];

			snapshot.forEach((doc) => {
				const data = doc.data();
				if (search) {
					const searchStr = (search as string).toLowerCase();
					const displayMatch = data.displayName?.toLowerCase().includes(searchStr);
					const usernameMatch = data.username?.toLowerCase().includes(searchStr);
					const uidMatch = data.uid?.toLowerCase().includes(searchStr);
					if (!displayMatch && !usernameMatch && !uidMatch) {
						return;
					}
				}
				list.push({
					uid: data.uid,
					displayName: data.displayName || "Anonymous",
					username: data.username || "",
					avatarUrl: data.avatarUrl || "",
					email: data.email || "",
					role: data.role || "member",
					joinedAt: data.joinedAt || 0,
					problemsSolved: data.problemsSolved || 0,
					contestRating: data.contestRating || 0,
					status: data.status || "active",
				});
			});

			// Sort by role precedence and then joinedAt
			const roleOrder: Record<string, number> = {
				owner: 1,
				admin: 2,
				moderator: 3,
				contest_manager: 4,
				problem_manager: 4,
				recruiter: 4,
				announcement_manager: 4,
				member: 5,
				guest: 6,
			};

			list.sort((a, b) => {
				const orderA = roleOrder[a.role] || 99;
				const orderB = roleOrder[b.role] || 99;
				if (orderA !== orderB) return orderA - orderB;
				return b.joinedAt - a.joinedAt;
			});

			const total = list.length;
			list = list.slice(offsetNum, offsetNum + limitNum);

			return res.status(200).json({ success: true, members: list, total });
		} catch (error: any) {
			console.error("GET org members error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		// Invite/Add Member
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "INVITE_MEMBERS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to invite members." });
			}

			const { targetIdentifier, role = "member" } = req.body;
			if (!targetIdentifier) {
				return res.status(400).json({ success: false, error: "Username, Email, or UID of target user is required." });
			}

			// Find user in db
			let targetUserDoc: any = null;

			// Check if target is a UID
			const userDocById = await db.collection("users").doc(targetIdentifier).get();
			if (userDocById.exists) {
				targetUserDoc = userDocById;
			} else {
				// Search by email
				const emailSnap = await db.collection("users").where("email", "==", targetIdentifier).get();
				if (!emailSnap.empty) {
					targetUserDoc = emailSnap.docs[0];
				} else {
					// Search by username
					const usernameSnap = await db.collection("users").where("username", "==", targetIdentifier.toLowerCase()).get();
					if (!usernameSnap.empty) {
						targetUserDoc = usernameSnap.docs[0];
					}
				}
			}

			if (!targetUserDoc || !targetUserDoc.exists) {
				return res.status(404).json({ success: false, error: "User not found." });
			}

			const targetUserData = targetUserDoc.data();
			const targetUid = targetUserDoc.id;

			// Check if already a member
			const existingMember = await db.collection("organizationMembers").doc(`${orgSlug}_${targetUid}`).get();
			if (existingMember.exists) {
				return res.status(400).json({ success: false, error: "User is already a member of this organization." });
			}

			// Add direct member or create invitation
			// For testing or simplified flow, we can directly add the member, but let's also create an invitation record
			const now = Date.now();
			const newMember = {
				orgSlug,
				uid: targetUid,
				displayName: targetUserData.displayName || "Member",
				username: targetUserData.username || "",
				avatarUrl: targetUserData.avatarUrl || "",
				email: targetUserData.email || "",
				role,
				joinedAt: now,
				problemsSolved: (targetUserData.solvedProblems || []).length,
				contestRating: targetUserData.contestRating || 0,
				status: "active",
			};

			await db.collection("organizationMembers").doc(`${orgSlug}_${targetUid}`).set(newMember);

			// Increment memberCount on the organization doc
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.memberCount || 0;
					transaction.update(orgRef, { memberCount: currentCount + 1 });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"MEMBER_ADDED",
				targetUid,
				{ role, displayName: targetUserData.displayName },
				req.socket.remoteAddress || "127.0.0.1"
			);

			// Dispatch in-app notification to the invited user
			await db.collection("notifications").add({
				userId: targetUid,
				title: `Welcome to ${orgSlug}`,
				message: `You have been added to the organization ${orgSlug} as a ${role}.`,
				isRead: false,
				createdAt: Date.now(),
				type: "ORG_ADD",
			}).catch(() => {});

			return res.status(201).json({ success: true, member: newMember });
		} catch (error: any) {
			console.error("Add org member error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "PUT") {
		// Promote/Demote member
		try {
			const { allowed, role: currentUserRole } = await verifyUserPermission(orgSlug, uid, "MANAGE_MEMBERS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to manage member roles." });
			}

			const { targetUid, role: newRole } = req.body;
			if (!targetUid || !newRole) {
				return res.status(400).json({ success: false, error: "Target UID and new role are required." });
			}

			const memberRef = db.collection("organizationMembers").doc(`${orgSlug}_${targetUid}`);
			const memberDoc = await memberRef.get();
			if (!memberDoc.exists) {
				return res.status(404).json({ success: false, error: "Member not found in organization." });
			}

			const memberData = memberDoc.data();

			// Only owner can promote/demote to/from owner or admin
			if (currentUserRole !== "owner" && (newRole === "owner" || newRole === "admin" || memberData?.role === "admin" || memberData?.role === "owner")) {
				return res.status(403).json({ success: false, error: "Only the organization Owner can manage Admin or Owner roles." });
			}

			await memberRef.update({ role: newRole });

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"MEMBER_ROLE_UPDATED",
				targetUid,
				{ oldRole: memberData?.role, newRole },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Member role updated successfully." });
		} catch (error: any) {
			console.error("Update org member role error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		// Remove Member / Leave Organization
		try {
			const { targetUid } = req.body;
			if (!targetUid) {
				return res.status(400).json({ success: false, error: "Target UID is required." });
			}

			const isSelf = targetUid === uid;
			const { allowed, role: currentUserRole } = await verifyUserPermission(orgSlug, uid, "MANAGE_MEMBERS");

			if (!isSelf && !allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to remove members." });
			}

			const memberRef = db.collection("organizationMembers").doc(`${orgSlug}_${targetUid}`);
			const memberDoc = await memberRef.get();
			if (!memberDoc.exists) {
				return res.status(404).json({ success: false, error: "Member not found in organization." });
			}

			const memberData = memberDoc.data();

			// Owner cannot be removed. They must transfer ownership first or delete the organization.
			if (memberData?.role === "owner") {
				return res.status(400).json({ success: false, error: "The Owner cannot be removed from the organization. You must transfer ownership first." });
			}

			// Non-owners cannot remove admins
			if (!isSelf && currentUserRole !== "owner" && memberData?.role === "admin") {
				return res.status(403).json({ success: false, error: "Only the organization Owner can remove administrators." });
			}

			await memberRef.delete();

			// Decrement memberCount on organization doc
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.memberCount || 1;
					transaction.update(orgRef, { memberCount: Math.max(1, currentCount - 1) });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Member",
				isSelf ? "MEMBER_LEFT" : "MEMBER_REMOVED",
				targetUid,
				{ displayName: memberData?.displayName },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: isSelf ? "You have left the organization." : "Member removed successfully." });
		} catch (error: any) {
			console.error("Remove org member error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
