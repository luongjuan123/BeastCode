import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const db = getAdminFirestore();
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		// 1. Fetch user memberships
		const membershipsSnap = await db
			.collection("organizationMembers")
			.where("uid", "==", uid)
			.get();

		const memberships: any[] = [];
		membershipsSnap.forEach((doc) => {
			memberships.push(doc.data());
		});

		// 2. Fetch user details to get email
		const userDoc = await db.collection("users").doc(uid).get();
		const userData = userDoc.data() || {};
		const email = userData.email?.toLowerCase().trim() || "";

		// 3. Fetch user invitations
		const invitesByUidSnap = await db
			.collection("organizationInvitations")
			.where("uid", "==", uid)
			.where("status", "==", "Pending")
			.get();

		const pendingInvites: any[] = [];
		invitesByUidSnap.forEach((doc) => {
			pendingInvites.push(doc.data());
		});

		if (email) {
			const invitesByEmailSnap = await db
				.collection("organizationInvitations")
				.where("email", "==", email)
				.where("status", "==", "Pending")
				.get();

			invitesByEmailSnap.forEach((doc) => {
				const data = doc.data();
				if (!pendingInvites.some((inv) => inv.inviteId === data.inviteId)) {
					pendingInvites.push(data);
				}
			});
		}

		// 4. Fetch user pending join requests
		const requestsSnap = await db
			.collection("organizationJoinRequests")
			.where("uid", "==", uid)
			.where("status", "==", "Pending")
			.get();

		const pendingRequests: any[] = [];
		requestsSnap.forEach((doc) => {
			pendingRequests.push(doc.data());
		});

		// 5. Gather all organization IDs involved
		const orgIds = new Set<string>();
		memberships.forEach((m) => orgIds.add(m.organizationId));
		pendingInvites.forEach((i) => orgIds.add(i.organizationId));
		pendingRequests.forEach((r) => orgIds.add(r.organizationId));

		// 6. Batch fetch organization details
		const orgsMap: Record<string, any> = {};
		if (orgIds.size > 0) {
			const orgIdsArr = Array.from(orgIds);
			const chunks = [];
			for (let i = 0; i < orgIdsArr.length; i += 30) {
				chunks.push(orgIdsArr.slice(i, i + 30));
			}

			const orgsPromises = chunks.map((chunk) =>
				db.collection("organizations").where("__name__", "in", chunk).get()
			);
			const snaps = await Promise.all(orgsPromises);
			snaps.forEach((snap) => {
				snap.forEach((doc) => {
					orgsMap[doc.id] = { id: doc.id, ...doc.data() };
				});
			});
		}

		// 7. Group organizations into categories
		const owned: any[] = [];
		const administered: any[] = [];
		const member: any[] = [];
		const favorites: any[] = [];
		const archived: any[] = [];

		memberships.forEach((m) => {
			const org = orgsMap[m.organizationId];
			if (!org) return;

			const orgItem = {
				...org,
				membershipRole: m.roleId,
				joinedAt: m.joinedAt,
				isFavorite: m.isFavorite || false,
				isHidden: m.isHidden || false,
			};

			if (org.status === "suspended" || org.status === "deleted" || m.isHidden) {
				archived.push(orgItem);
			} else {
				if (m.isFavorite) {
					favorites.push(orgItem);
				}

				if (org.ownerUid === uid || m.roleId === "owner") {
					owned.push(orgItem);
				} else if (m.roleId === "admin" || m.roleId === "co-owner" || m.roleId === "coach") {
					administered.push(orgItem);
				} else {
					member.push(orgItem);
				}
			}
		});

		// Map invitations to include org details
		const invitationsMapped = pendingInvites.map((inv) => {
			const org = orgsMap[inv.organizationId] || {};
			return {
				...inv,
				orgName: org.displayName || org.name || inv.organizationName,
				orgLogo: org.avatar || org.avatarUrl || inv.organizationLogo,
				slug: org.slug || "",
				description: org.description || "",
				memberCount: org.memberCount || 0,
			};
		});

		// Map join requests to include org details
		const requestsMapped = pendingRequests.map((reqItem) => {
			const org = orgsMap[reqItem.organizationId] || {};
			return {
				...reqItem,
				orgName: org.displayName || org.name || "Workspace",
				orgLogo: org.avatar || org.avatarUrl || "",
				slug: org.slug || "",
			};
		});

		return res.status(200).json({
			success: true,
			owned,
			administered,
			member,
			favorites,
			archived,
			invited: invitationsMapped,
			pendingRequests: requestsMapped,
		});
	} catch (error: any) {
		console.error("GET /api/users/memberships error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
