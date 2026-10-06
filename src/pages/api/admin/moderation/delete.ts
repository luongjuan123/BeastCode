import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { moderationConfig } from "@/utils/moderationConfig";
import { ModerationEmailService } from "@/utils/moderationEmailService";
import { randomUUID } from "crypto";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { targetUid, reason, notes, forceImmediate = false } = req.body;
	if (!targetUid || !reason) {
		return res.status(400).json({ success: false, error: "Missing targetUid or reason" });
	}

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const isSuperAdmin = adminUser.role === "super_admin";

	if (adminUser.uid === targetUid) {
		return res.status(400).json({ success: false, error: "You cannot delete your own admin account." });
	}

	const db = getAdminFirestore();

	try {
		const userDocRef = db.collection("users").doc(targetUid);
		const userSnap = await userDocRef.get();
		if (!userSnap.exists) {
			return res.status(404).json({ success: false, error: "Target user not found" });
		}

		const userData = userSnap.data() || {};
		const email = userData.email || "";
		const displayName = userData.displayName || userData.username || email;

		const now = Date.now();

		// Resolve Case ID (inherit from userModeration, open report, or generate new one)
		const modRef = db.collection("userModeration").doc(targetUid);
		const modSnap = await modRef.get();
		let caseId = modSnap.exists ? modSnap.data()?.caseId || "" : "";

		const openReportsSnap = await db.collection("userReports")
			.where("targetUid", "==", targetUid)
			.get();
		
		const openReport = openReportsSnap.docs.find(doc => {
			const status = doc.data()?.status;
			return status === "OPEN" || status === "REVIEWING";
		});

		if (openReport) {
			const reportData = openReport.data();
			if (!caseId) {
				const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
				caseId = reportData.caseId || `CASE-${new Date().getFullYear()}-${randomSuffix}`;
			}
			// Resolve the report
			await openReport.ref.update({
				status: "RESOLVED",
				resolution: forceImmediate ? `User deleted immediately: ${reason}` : `User deletion scheduled: ${reason}`
			});
		} else if (!caseId) {
			const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
			caseId = `CASE-${new Date().getFullYear()}-${randomSuffix}`;
		}

		// ─── Force Immediate Deletion (Super Admin Only) ───
		if (forceImmediate) {
			if (!isSuperAdmin) {
				return res.status(403).json({
					success: false,
					error: "Access Denied: Only Super Admins may permanently delete accounts immediately."
				});
			}

			const authAdmin = getAdminAuth();

			// Delete from Auth
			try {
				await authAdmin.deleteUser(targetUid);
			} catch (authErr: any) {
				if (authErr.code !== "auth/user-not-found") {
					throw authErr;
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

			// Audit Log
			await db.collection("moderationLogs").add({
				adminUid: adminUser.uid,
				targetUid,
				targetName: displayName,
				action: "DELETE",
				caseId,
				timestamp: now,
				reason,
				duration: "N/A",
				ip: req.socket.remoteAddress || "127.0.0.1",
				oldState: userData.status || "ACTIVE",
				newState: "DELETED",
				notes: `Permanent Deletion forced by Super Admin. Email: ${email}. ` + (notes || "")
			});

			// Send Confirmation Email
			if (email) {
				try {
					await ModerationEmailService.sendAccountDeletedEmail(email, caseId);
				} catch (err) {
					console.warn("[Delete API] Failed to send deletion confirmation email:", err);
				}
			}

			return res.status(200).json({ success: true, message: "User account deleted permanently." });
		}

		// ─── Scheduled Deletion Workflow ───
		const deleteAfter = now + (moderationConfig.deletionDelayDays * 24 * 60 * 60 * 1000);
		const appealDeadline = now + (moderationConfig.appealDeadlineDays * 24 * 60 * 60 * 1000);

		// Update both users and userModeration records to PENDING_DELETION
		await userDocRef.update({
			status: "PENDING_DELETION",
			caseId,
			deleteAfter,
			appealDeadline
		});

		await modRef.set({
			status: "PENDING_DELETION",
			caseId,
			deletionReason: reason,
			deletionNotes: notes || "",
			deletionScheduledAt: now,
			deleteAfter,
			appealDeadline,
			deletionScheduledBy: adminUser.uid,
			banHistory: [
				...(modSnap.exists ? modSnap.data()?.banHistory || [] : []),
				{ action: "SCHEDULE_DELETE", reason, timestamp: now, adminUid: adminUser.uid, notes: notes || "" }
			]
		}, { merge: true });

		const deletionDateStr = new Date(deleteAfter).toLocaleDateString();
		const appealDeadlineStr = new Date(appealDeadline).toLocaleDateString();

		// Write Audit Log
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			targetUid,
			targetName: displayName,
			action: "SCHEDULE_DELETE",
			caseId,
			timestamp: now,
			reason,
			duration: `${moderationConfig.deletionDelayDays} days`,
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState: userData.status || "ACTIVE",
			newState: "PENDING_DELETION",
			notes: `Scheduled for deletion on ${deletionDateStr}. Email: ${email}. ` + (notes || "")
		});

		// Send deletion scheduled email
		if (email) {
			try {
				await ModerationEmailService.sendDeletionScheduledEmail(email, deletionDateStr, appealDeadlineStr, reason, caseId);
			} catch (err) {
				console.warn("[Delete API] Failed to send scheduled email:", err);
			}
		}

		// Send in-app user notification
		try {
			await db.collection("notifications").add({
				toUid: targetUid,
				fromUid: "system",
				fromDisplayName: "🚨 Trust & Safety Team",
				fromAvatarUrl: "",
				type: "DELETION_SCHEDULED",
				title: "Account Scheduled For Deletion",
				body: `Your account has been scheduled for permanent deletion on ${deletionDateStr} due to: ${reason}. Appeal Ref: ${caseId}`,
				category: "security",
				priority: "high",
				createdAt: now,
				read: false,
				ctaText: "Review / Appeal",
				ctaUrl: `/account-appeal?caseId=${caseId}`
			});
		} catch (notifErr) {
			console.warn("[Delete API] Failed to write notification:", notifErr);
		}

		return res.status(200).json({
			success: true,
			message: `Account successfully scheduled for deletion in ${moderationConfig.deletionDelayDays} days.`,
			deleteAfter,
			appealDeadline
		});
	} catch (error: any) {
		console.error("[Delete User API] Critical failure:", error);
		return res.status(500).json({
			success: false,
			error: "Failed to schedule account deletion. Please try again."
		});
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
