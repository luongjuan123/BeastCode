import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { ModerationEmailService } from "@/utils/moderationEmailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { targetUid, reason } = req.body;
	if (!targetUid || !reason) {
		return res.status(400).json({ success: false, error: "Missing required fields: targetUid, reason" });
	}

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const db = getAdminFirestore();

		// Check if user exists
		const userDocRef = db.collection("users").doc(targetUid);
		const userSnap = await userDocRef.get();
		if (!userSnap.exists) {
			return res.status(404).json({ success: false, error: "Target user not found" });
		}

		const userData = userSnap.data() || {};
		const email = userData.email || "";
		const displayName = userData.displayName || userData.username || email;

		// Clear pending deletion fields in users collection
		const batch = db.batch();
		batch.update(userDocRef, {
			status: "ACTIVE",
			deleteAfter: null,
			appealDeadline: null
		});

		// Clear status in userModeration collection
		const modRef = db.collection("userModeration").doc(targetUid);
		const modSnap = await modRef.get();

		batch.set(modRef, {
			status: "ACTIVE",
			deletionReason: null,
			deletionNotes: null,
			deletionScheduledAt: null,
			deleteAfter: null,
			appealDeadline: null,
			banHistory: [
				...(modSnap.exists ? modSnap.data()?.banHistory || [] : []),
				{ action: "CANCEL_DELETE", reason, timestamp: Date.now(), adminUid: adminUser.uid }
			]
		}, { merge: true });

		await batch.commit();

		const modData = modSnap.exists ? modSnap.data() : null;
		const refId = modData?.caseId || targetUid.substring(0, 8).toUpperCase();

		// Add audit log
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			targetUid,
			targetName: displayName,
			action: "CANCEL_DELETE",
			caseId: refId,
			timestamp: Date.now(),
			reason,
			duration: "N/A",
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState: "PENDING_DELETION",
			newState: "ACTIVE",
			notes: `Scheduled deletion cancelled. Email: ${email}`
		});

		// Send email notification
		if (email) {
			try {
				await ModerationEmailService.sendDeletionCancelledEmail(email, refId);
			} catch (emailErr) {
				console.warn("[Cancel Delete API] Failed to send email:", emailErr);
			}
		}

		// Send in-app notification
		try {
			await db.collection("notifications").add({
				toUid: targetUid,
				fromUid: "system",
				fromDisplayName: "🚨 Trust & Safety Team",
				fromAvatarUrl: "",
				type: "DELETION_CANCELLED",
				title: "Account Deletion Cancelled",
				body: `The scheduled deletion of your account has been cancelled. Ref: ${refId}`,
				category: "security",
				priority: "high",
				createdAt: Date.now(),
				read: false,
				ctaText: "Go to Dashboard",
				ctaUrl: "/"
			});
		} catch (notifErr) {
			console.warn("[Cancel Delete API] Failed to write notification:", notifErr);
		}

		return res.status(200).json({ success: true, message: "Account deletion cancelled successfully." });
	} catch (error: any) {
		console.error("[Cancel Delete API] Failure:", error);
		return res.status(500).json({ success: false, error: "Failed to cancel scheduled deletion. Please try again." });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
