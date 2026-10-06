import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { ModerationEmailService } from "@/utils/moderationEmailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const db = getAdminFirestore();

	try {
		const userDocRef = db.collection("users").doc(user.uid);
		const userSnap = await userDocRef.get();
		if (!userSnap.exists) {
			return res.status(404).json({ success: false, error: "User not found" });
		}

		const userData = userSnap.data() || {};
		const currentStatus = userData.status;

		if (currentStatus !== "PENDING_DELETION") {
			return res.status(400).json({ success: false, error: "Your account is not scheduled for deletion." });
		}

		const email = userData.email || "";
		const displayName = userData.displayName || userData.username || email;
		const authAdmin = getAdminAuth();

		// 1. Delete user from Firebase Auth
		try {
			await authAdmin.deleteUser(user.uid);
		} catch (authErr: any) {
			if (authErr.code !== "auth/user-not-found") {
				throw authErr;
			}
		}

		// 2. Complete batch cleanup of all 19 Firestore collections keyed by UID and user-linked documents
		const batch = db.batch();

		const uidCollections = [
			"users",
			"profiles",
			"settings",
			"statistics",
			"solvedProblems",
			"contestHistory",
			"threads",
			"notifications",
			"notificationSettings",
			"security",
			"sessions",
			"organizationMembership",
			"achievements",
			"bookmarks",
			"preferences",
			"theme",
			"language",
			"privacy",
			"userModeration"
		];

		uidCollections.forEach((colName) => {
			batch.delete(db.collection(colName).doc(user.uid));
		});

		// Delete query-matched documents
		const pwHistory = await db.collection("passwordHistory").where("userId", "==", user.uid).get();
		pwHistory.docs.forEach((d) => batch.delete(d.ref));

		const subs = await db.collection("submissions").where("uid", "==", user.uid).get();
		subs.docs.forEach((d) => batch.delete(d.ref));

		const contestSubs = await db.collection("contest_submissions").where("uid", "==", user.uid).get();
		contestSubs.docs.forEach((d) => batch.delete(d.ref));

		await batch.commit();

		// 4. Add Audit Log
		const now = Date.now();
		await db.collection("moderationLogs").add({
			adminUid: "USER",
			targetUid: user.uid,
			targetName: displayName,
			action: "DELETE",
			timestamp: now,
			reason: "Self-service immediate account deletion acceptance.",
			duration: "N/A",
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState: "PENDING_DELETION",
			newState: "DELETED",
			notes: `Email was ${email}.`
		});

		// 5. Send confirmation email
		if (email) {
			try {
				await ModerationEmailService.sendAccountDeletedEmail(email, user.uid.substring(0, 8).toUpperCase());
			} catch (err) {
				console.warn("[Self-Delete API] Failed sending email:", err);
			}
		}

		return res.status(200).json({ success: true, message: "Account deleted permanently." });
	} catch (error: any) {
		console.error("[Self-Delete API] Failure:", error);
		return res.status(500).json({ success: false, error: "Failed to process self-deletion." });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
