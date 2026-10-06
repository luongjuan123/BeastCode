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
		// 1. Get user profile to check email
		const userDoc = await db.collection("users").doc(uid).get();
		if (!userDoc.exists) {
			return res.status(404).json({ success: false, error: "User not found" });
		}
		const userData = userDoc.data() || {};
		const email = userData.email?.toLowerCase().trim() || "";

		// 2. Fetch invitations by uid
		const invitesByUidSnap = await db
			.collection("organizationInvitations")
			.where("uid", "==", uid)
			.where("status", "==", "Pending")
			.get();

		const list: any[] = [];
		invitesByUidSnap.forEach((doc) => {
			list.push(doc.data());
		});

		// 3. Fetch invitations by email (if email exists and has not already been pulled by uid)
		if (email) {
			const invitesByEmailSnap = await db
				.collection("organizationInvitations")
				.where("email", "==", email)
				.where("status", "==", "Pending")
				.get();

			invitesByEmailSnap.forEach((doc) => {
				const data = doc.data();
				if (!list.some((invite) => invite.inviteId === data.inviteId)) {
					list.push(data);
				}
			});
		}

		// Check for expired ones in memory and filter/update them if they have expired
		const now = Date.now();
		const finalInvites = await Promise.all(
			list.map(async (invite) => {
				if (invite.expiresAt <= now) {
					// Expire in background/db
					await db.collection("organizationInvitations").doc(invite.inviteId).update({ status: "Expired" });
					return null;
				}
				return invite;
			})
		);

		const activeInvites = finalInvites.filter((invite) => invite !== null);

		return res.status(200).json({ success: true, invitations: activeInvites });
	} catch (error: any) {
		console.error("GET /api/users/invitations error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
