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
	const { id } = req.query;
	const orgIdentifier = id as string;

	// Resolve the organization first
	const { org, member: callerMember } = await resolveOrgAndMembership(orgIdentifier, uid || null);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// Security: If private or secret organization, guests/non-members cannot list members directory
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	// GET /api/organizations/:id/members - List members
	if (req.method === "GET") {
		try {
			const { q = "", limit = "50", offset = "0" } = req.query;

			const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
			const parsedOffset = Math.max(0, parseInt(offset as string, 10));

			const membersSnap = await db
				.collection("organizationMembers")
				.where("organizationId", "==", org.id)
				.where("status", "==", "active")
				.get();

			const membersList: OrganizationMember[] = [];
			membersSnap.forEach((doc) => {
				membersList.push(doc.data() as OrganizationMember);
			});

			if (membersList.length === 0) {
				return res.status(200).json({ success: true, total: 0, members: [] });
			}

			// Batch resolve user profiles from 'users' collection to avoid duplicated details
			const userIds = membersList.map((m) => m.uid);
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

			// Map members details
			let detailedMembers = membersList.map((m) => {
				const profile = userProfiles[m.uid] || {};
				return {
					...m,
					displayName: profile.displayName || "Anonymous",
					username: profile.username || "",
					avatarUrl: profile.avatarUrl || "",
					email: profile.email || "",
					problemsSolved: (profile.solvedProblems || []).length,
					contestRating: profile.contestRating !== undefined ? profile.contestRating : 1500,
				};
			});

			// Apply search filter (matching nickname, displayName, username, department, email)
			const searchStr = (q as string).toLowerCase().trim();
			if (searchStr) {
				detailedMembers = detailedMembers.filter(
					(m) =>
						m.nickname.toLowerCase().includes(searchStr) ||
						m.displayName.toLowerCase().includes(searchStr) ||
						m.username.toLowerCase().includes(searchStr) ||
						m.department.toLowerCase().includes(searchStr) ||
						m.email.toLowerCase().includes(searchStr)
				);
			}

			const paginated = detailedMembers.slice(parsedOffset, parsedOffset + parsedLimit);

			return res.status(200).json({
				success: true,
				total: detailedMembers.length,
				members: paginated,
			});
		} catch (error: any) {
			console.error("GET /api/organizations/:id/members error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/members - Direct add/invite member
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			const { targetUid, roleId = "member", nickname = "", title = "", department = "" } = req.body;

			if (!targetUid) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing targetUid" });
			}

			// Verify target user exists
			const targetUserDoc = await db.collection("users").doc(targetUid).get();
			if (!targetUserDoc.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Target user does not exist" });
			}

			const targetProfile = targetUserDoc.data() || {};
			const cleanNickname = nickname.trim() || targetProfile.displayName || "Member";

			const memberDocId = `${org.id}_${targetUid}`;
			const existingMemberDoc = await db.collection("organizationMembers").doc(memberDocId).get();

			if (existingMemberDoc.exists && existingMemberDoc.data()?.status === "active") {
				return res.status(409).json({ success: false, error: "Conflict: User is already a member" });
			}

			const now = Date.now();
			const newMember: OrganizationMember = {
				organizationId: org.id,
				uid: targetUid,
				roleId,
				nickname: cleanNickname,
				title: title.trim(),
				department: department.trim(),
				status: "active",
				joinedAt: now,
				joinedBy: uid,
				lastActive: now,
				permissionsVersion: 1,
				isHidden: false,
				isFavorite: false,
			};

			const orgRef = db.collection("organizations").doc(org.id);
			const memberRef = db.collection("organizationMembers").doc(memberDocId);

			// Transaction: Save member and increment count
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.memberCount || 0;

				transaction.set(memberRef, newMember);
				transaction.update(orgRef, { memberCount: currentCount + 1 });
			});

			// Trigger notifications and email via emitOrgEvent
			await emitOrgEvent(
				org.id,
				uid,
				"member.joined",
				targetUid,
				"organizationMembers",
				memberDocId,
				{ roleId },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, member: newMember });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/members error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
