import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { resolveOrgAndMembership, checkOrgPermission } from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, q = "" } = req.query;
	const orgIdentifier = id as string;
	const queryStr = (q as string).toLowerCase().trim();

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Check permission to invite member
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		if (!queryStr) {
			return res.status(200).json({ success: true, users: [] });
		}

		// 1. Fetch all users from users collection
		// In a production environment with millions of users, this would query Elasticsearch or Algolia.
		// For this platform, we query the users collection.
		const usersSnap = await db.collection("users").get();
		const allUsers: any[] = [];
		usersSnap.forEach((doc) => {
			const data = doc.data();
			allUsers.push({
				uid: doc.id,
				username: data.username || "",
				displayName: data.displayName || "Anonymous",
				avatarUrl: data.avatarUrl || "",
				contestRating: data.contestRating || 1500,
				score: data.score || 0,
				email: data.email || "",
			});
		});

		// 2. Fetch existing members of this organization
		const membersSnap = await db
			.collection("organizationMembers")
			.where("organizationId", "==", org.id)
			.where("status", "==", "active")
			.get();
		
		const memberUids = new Set<string>();
		membersSnap.forEach((doc) => {
			memberUids.add(doc.data().uid);
		});

		// 3. Fetch pending invitations for this organization
		const pendingInvitesSnap = await db
			.collection("organizationInvitations")
			.where("organizationId", "==", org.id)
			.where("status", "==", "Pending")
			.get();
		
		const pendingInviteUids = new Set<string>();
		const pendingInviteEmails = new Set<string>();
		pendingInvitesSnap.forEach((doc) => {
			const data = doc.data();
			if (data.uid) pendingInviteUids.add(data.uid);
			if (data.email) pendingInviteEmails.add(data.email.toLowerCase());
		});

		// 4. Fetch moderation statuses (to filter banned users)
		const modSnap = await db.collection("userModeration").get();
		const bannedUids = new Set<string>();
		modSnap.forEach((doc) => {
			const data = doc.data();
			if (data.status === "BANNED" || data.status === "SUSPENDED") {
				bannedUids.add(doc.id);
			}
		});

		// 5. Match and filter users
		// - Match by exact or partial UID, exact or partial username, exact email
		// - Prevent inviting yourself (uid)
		// - Prevent inviting already members
		// - Prevent inviting already pending
		// - Prevent inviting banned/suspended users
		let filteredUsers = allUsers.filter((u) => {
			if (u.uid === uid) return false; // Self
			if (memberUids.has(u.uid)) return false; // Already member
			if (pendingInviteUids.has(u.uid)) return false; // Already invited by UID
			if (u.email && pendingInviteEmails.has(u.email.toLowerCase())) return false; // Already invited by Email
			if (bannedUids.has(u.uid)) return false; // Banned

			// Match criteria
			const uidMatch = u.uid.toLowerCase().includes(queryStr);
			const usernameMatch = u.username.toLowerCase().includes(queryStr);
			const nameMatch = u.displayName.toLowerCase().includes(queryStr);
			const emailMatch = u.email.toLowerCase() === queryStr;

			return uidMatch || usernameMatch || nameMatch || emailMatch;
		});

		// 6. Optionally resolve current organization for each user
		// To make the search dropdown rich, let's find the primary/active organization of the matched users
		// We'll search in organizationMembers for each matched user.
		const enrichedUsers = await Promise.all(
			filteredUsers.slice(0, 10).map(async (u) => {
				const activeMembershipSnap = await db
					.collection("organizationMembers")
					.where("uid", "==", u.uid)
					.where("status", "==", "active")
					.limit(1)
					.get();

				let currentOrgName = "No Organization";
				if (!activeMembershipSnap.empty) {
					const membershipData = activeMembershipSnap.docs[0].data();
					const orgDoc = await db.collection("organizations").doc(membershipData.organizationId).get();
					if (orgDoc.exists) {
						currentOrgName = orgDoc.data()?.displayName || orgDoc.data()?.name || "Workspace";
					}
				}

				return {
					uid: u.uid,
					username: u.username,
					displayName: u.displayName,
					avatarUrl: u.avatarUrl,
					contestRating: u.contestRating,
					currentOrg: currentOrgName,
				};
			})
		);

		return res.status(200).json({ success: true, users: enrichedUsers });
	} catch (error: any) {
		console.error("GET search-invite-users error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
