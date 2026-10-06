import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { ModerationEmailService } from "@/utils/moderationEmailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST" && req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const db = getAdminFirestore();
	const authAdmin = getAdminAuth();
	const now = Date.now();

	try {
		// Find users scheduled for deletion that have expired and are not paused (e.g. appealed)
		const allPendingUsersSnap = await db.collection("users")
			.where("status", "==", "PENDING_DELETION")
			.get();

		const expiredDocs = allPendingUsersSnap.docs.filter(doc => {
			const data = doc.data() || {};
			return typeof data.deleteAfter === "number" && data.deleteAfter <= now;
		});

		const processedUids: string[] = [];

		for (const doc of expiredDocs) {
			const targetUid = doc.id;
			const userData = doc.data() || {};
			const email = userData.email || "";
			const displayName = userData.displayName || userData.username || email;

			// Double check userModeration is not paused
			const modRef = db.collection("userModeration").doc(targetUid);
			const modSnap = await modRef.get();
			let caseId = targetUid.substring(0, 8).toUpperCase();
			if (modSnap.exists) {
				const modData = modSnap.data() || {};
				if (modData.deleteTimerPaused === true || modData.status === "APPEALED") {
					// Skip since deletion is paused for appeal review
					continue;
				}
				if (modData.caseId) {
					caseId = modData.caseId;
				}
			}

			// Delete from Firebase Auth
			try {
				await authAdmin.deleteUser(targetUid);
			} catch (authErr: any) {
				if (authErr.code !== "auth/user-not-found") {
					console.error(`[Auto-Delete] Auth deletion failed for ${targetUid}:`, authErr);
				}
			}

			// Delete Firestore docs and clean up all 19 Firestore collections keyed by UID and user-linked documents
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
				batch.delete(db.collection(colName).doc(targetUid));
			});

			// Delete query-matched documents
			const pwHistory = await db.collection("passwordHistory").where("userId", "==", targetUid).get();
			pwHistory.docs.forEach((d) => batch.delete(d.ref));

			const subs = await db.collection("submissions").where("uid", "==", targetUid).get();
			subs.docs.forEach((d) => batch.delete(d.ref));

			const contestSubs = await db.collection("contest_submissions").where("uid", "==", targetUid).get();
			contestSubs.docs.forEach((d) => batch.delete(d.ref));

			await batch.commit();

			// Add Audit Log
			await db.collection("moderationLogs").add({
				adminUid: "SYSTEM",
				targetUid,
				targetName: displayName,
				action: "DELETE",
				caseId,
				timestamp: now,
				reason: "Automated cleanup: Scheduled deletion delay expired without appeal.",
				duration: "N/A",
				ip: "127.0.0.1",
				oldState: "PENDING_DELETION",
				newState: "DELETED",
				notes: `Email was ${email}.`
			});

			// Send Confirmation Email
			if (email) {
				try {
					await ModerationEmailService.sendAccountDeletedEmail(email, caseId);
				} catch (err) {
					console.warn("[Auto-Delete] Failed sending confirmation email:", err);
				}
			}

			processedUids.push(targetUid);
		}

		return res.status(200).json({
			success: true,
			processedCount: processedUids.length,
			deletedUids: processedUids
		});
	} catch (error: any) {
		console.error("[Auto Deletion Sweep Failure]:", error);
		return res.status(500).json({ success: false, error: "Auto-deletion sweep failed." });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
