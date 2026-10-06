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
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	// Resolve organization
	const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// GET /api/organizations/:id/invitations - List invitations (with status filter or history)
	if (req.method === "GET") {
		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			const snapshot = await db
				.collection("organizationInvitations")
				.where("organizationId", "==", org.id)
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				list.push(data);
			});

			return res.status(200).json({ success: true, invitations: list });
		} catch (error: any) {
			console.error("GET /api/organizations/:id/invitations error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/invitations - Create & Send Invitation
	if (req.method === "POST") {
		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			const { targetUid, email, username, roleId = "member", expiresDays = 7 } = req.body;

			if (!targetUid && !email && !username) {
				return res.status(400).json({ success: false, error: "Validation Error: Must provide UID, email, or username" });
			}

			let inviteeUid: string | null = null;
			let inviteeEmail = "";
			let inviteeName = "Guest User";
			let inviteeUsername = "";

			// 1. Resolve target user
			if (targetUid) {
				const userDoc = await db.collection("users").doc(targetUid).get();
				if (!userDoc.exists) {
					return res.status(404).json({ success: false, error: "Not Found: User not found by UID" });
				}
				const data = userDoc.data() || {};
				inviteeUid = targetUid;
				inviteeEmail = data.email || "";
				inviteeName = data.displayName || data.username || "User";
				inviteeUsername = data.username || "";
			} else if (username) {
				const userSnap = await db.collection("users").where("username", "==", username).limit(1).get();
				if (userSnap.empty) {
					return res.status(404).json({ success: false, error: "Not Found: User not found by username" });
				}
				const doc = userSnap.docs[0];
				const data = doc.data() || {};
				inviteeUid = doc.id;
				inviteeEmail = data.email || "";
				inviteeName = data.displayName || data.username || "User";
				inviteeUsername = data.username || "";
			} else if (email) {
				inviteeEmail = email.toLowerCase().trim();
				// Check if user exists with this email
				const userSnap = await db.collection("users").where("email", "==", inviteeEmail).limit(1).get();
				if (!userSnap.empty) {
					const doc = userSnap.docs[0];
					const data = doc.data() || {};
					inviteeUid = doc.id;
					inviteeName = data.displayName || data.username || "User";
					inviteeUsername = data.username || "";
				}
			}

			// 2. Prevent inviting yourself
			if (inviteeUid && inviteeUid === uid) {
				return res.status(400).json({ success: false, error: "Validation Error: You cannot invite yourself" });
			}

			// 3. Prevent duplicate active/pending membership/invitations
			if (inviteeUid) {
				const memberDoc = await db.collection("organizationMembers").doc(`${org.id}_${inviteeUid}`).get();
				if (memberDoc.exists && memberDoc.data()?.status === "active") {
					return res.status(409).json({ success: false, error: "Conflict: User is already a member" });
				}

				// Check pending invites by UID
				const existingInviteSnap = await db
					.collection("organizationInvitations")
					.where("organizationId", "==", org.id)
					.where("uid", "==", inviteeUid)
					.where("status", "==", "Pending")
					.limit(1)
					.get();

				if (!existingInviteSnap.empty) {
					return res.status(409).json({ success: false, error: "Conflict: User already has a pending invitation" });
				}
			}

			if (inviteeEmail) {
				// Check pending invites by Email
				const existingInviteSnap = await db
					.collection("organizationInvitations")
					.where("organizationId", "==", org.id)
					.where("email", "==", inviteeEmail)
					.where("status", "==", "Pending")
					.limit(1)
					.get();

				if (!existingInviteSnap.empty) {
					return res.status(409).json({ success: false, error: "Conflict: This email already has a pending invitation" });
				}
			}

			// 4. Check if user is banned or suspended
			if (inviteeUid) {
				const modDoc = await db.collection("userModeration").doc(inviteeUid).get();
				if (modDoc.exists) {
					const modStatus = modDoc.data()?.status;
					if (modStatus === "BANNED" || modStatus === "SUSPENDED") {
						return res.status(403).json({ success: false, error: "Forbidden: Cannot invite a banned or suspended user" });
					}
				}
			}

			// 5. Get inviter's details
			const inviterDoc = await db.collection("users").doc(uid).get();
			const inviterData = inviterDoc.data() || {};
			const inviterName = inviterData.displayName || inviterData.username || "Admin";

			const token = randomBytes(32).toString("hex");
			const inviteId = db.collection("organizationInvitations").doc().id;

			const newInvitation = {
				inviteId,
				organizationId: org.id,
				organizationName: org.displayName || org.name,
				organizationLogo: org.avatar || "",
				organizationType: org.organizationType || "",
				organizationVisibility: org.visibility || "",
				organizationDescription: org.description || "",
				organizationMemberCount: org.memberCount || 0,
				organizationSlug: org.slug || "",
				inviterName,
				inviterUid: uid,
				uid: inviteeUid,
				inviteeUid,
				inviteeName,
				inviteeUsername,
				email: inviteeEmail,
				token,
				roleId,
				status: "Pending",
				createdAt: Date.now(),
				timestamp: Date.now(),
				expiresAt: Date.now() + expiresDays * 24 * 60 * 60 * 1000,
				createdBy: uid,
				acceptedAt: null,
			};

			await db.collection("organizationInvitations").doc(inviteId).set(newInvitation);

			// Trigger invite email & system alerts
			await emitOrgEvent(
				org.id,
				uid,
				"member.invited",
				inviteeUid,
				"organizationInvitations",
				inviteId,
				{ email: inviteeEmail, roleId, inviteId },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, message: "Invitation generated and sent successfully", invitation: newInvitation });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/invitations error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
