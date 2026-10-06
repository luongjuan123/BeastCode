import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { ModerationEmailService } from "@/utils/moderationEmailService";
import { moderationConfig } from "@/utils/moderationConfig";
import { EmailService } from "@/utils/emailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const { status } = req.query;
			const snap = await db.collection("moderationAppeals").get();
			let appeals = snap.docs.map((doc: any) => ({
				id: doc.id,
				...doc.data()
			}));

			if (status) {
				appeals = appeals.filter((a: any) => a.status === status);
			}

			appeals.sort((a: any, b: any) => {
				const timeA = a.timestamp || 0;
				const timeB = b.timestamp || 0;
				return timeB - timeA;
			});

			return res.status(200).json({ success: true, appeals });
		} catch (error: any) {
			console.error("[Admin Appeals GET] Failed to fetch appeals:", error);
			return res.status(500).json({ success: false, error: "Failed to fetch appeals list." });
		}
	}

	if (req.method === "POST") {
		const { appealId, action, notes } = req.body;

		if (!appealId || !action) {
			return res.status(400).json({ success: false, error: "Missing required fields: appealId, action" });
		}

		try {
			const appealRef = db.collection("moderationAppeals").doc(appealId);
			const appealSnap = await appealRef.get();
			if (!appealSnap.exists) {
				return res.status(404).json({ success: false, error: "Appeal not found" });
			}

			const appealData = appealSnap.data() || {};
			const targetUid = appealData.targetUid;
			const refId = appealData.referenceId;

			// Get user details
			const userDocRef = db.collection("users").doc(targetUid);
			const userSnap = await userDocRef.get();
			if (!userSnap.exists) {
				return res.status(404).json({ success: false, error: "User associated with appeal not found." });
			}

			const userData = userSnap.data() || {};
			const userEmail = userData.email || "";
			const displayName = userData.displayName || userData.username || userEmail;

			const modRef = db.collection("userModeration").doc(targetUid);
			const modSnap = await modRef.get();
			const modData = modSnap.data() || {};

			const now = Date.now();

			if (action === "approve") {
				// Accept appeal -> Restore user state to ACTIVE
				const batch = db.batch();
				batch.update(appealRef, { status: "APPROVED", adminUid: adminUser.uid, adminNotes: notes || "" });
				batch.update(userDocRef, { status: "ACTIVE", deleteAfter: null, appealDeadline: null });
				batch.set(modRef, {
					status: "ACTIVE",
					expiresAt: null,
					deleteAfter: null,
					appealDeadline: null,
					deleteTimerPaused: false,
					banHistory: [
						...(modData.banHistory || []),
						{ action: "APPEAL_ACCEPT", reason: notes || "Appeal accepted by admin", timestamp: now, adminUid: adminUser.uid }
					]
				}, { merge: true });

				await batch.commit();

				// Write Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid,
					targetName: displayName,
					action: "APPEAL_ACCEPT",
					timestamp: now,
					reason: notes || "Appeal accepted",
					duration: "N/A",
					ip: req.socket.remoteAddress || "127.0.0.1",
					oldState: modData.status,
					newState: "ACTIVE",
					notes: `Appeal approved. Appeal ID: ${appealId}`
				});

				// Send email updates
				if (userEmail) {
					try {
						await ModerationEmailService.sendAppealResolvedEmail(userEmail, "APPROVED", notes || "Your appeal was approved by our moderation team.", refId);
						if (modData.status === "BANNED") {
							await ModerationEmailService.sendBanRemovedEmail(userEmail, refId);
						} else {
							await ModerationEmailService.sendDeletionCancelledEmail(userEmail, refId);
						}
					} catch (err) {
						console.warn("[Appeal Review] Failed sending emails:", err);
					}
				}

				return res.status(200).json({ success: true, message: "Appeal approved. Account access restored." });
			}

			if (action === "reject") {
				// Reject appeal -> Maintain original ban or resume scheduled deletion delay
				const batch = db.batch();
				batch.update(appealRef, { status: "REJECTED", adminUid: adminUser.uid, adminNotes: notes || "" });

				if (modData.status === "APPEALED" || modData.status === "PENDING_DELETION") {
					// Resume deletion timeline: recalculate deletion timers based on original delay starting now
					const newDeleteAfter = now + (moderationConfig.deletionDelayDays * 24 * 60 * 60 * 1000);
					batch.update(userDocRef, {
						status: "PENDING_DELETION",
						deleteAfter: newDeleteAfter,
						deleteTimerPaused: false
					});
					batch.update(modRef, {
						status: "PENDING_DELETION",
						deleteAfter: newDeleteAfter,
						deleteTimerPaused: false,
						banHistory: [
							...(modData.banHistory || []),
							{ action: "APPEAL_REJECT", reason: notes || "Appeal rejected. Deletion scheduled resumed.", timestamp: now, adminUid: adminUser.uid }
						]
					});
				} else {
					batch.update(modRef, {
						banHistory: [
							...(modData.banHistory || []),
							{ action: "APPEAL_REJECT", reason: notes || "Appeal rejected.", timestamp: now, adminUid: adminUser.uid }
						]
					});
				}

				await batch.commit();

				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid,
					targetName: displayName,
					action: "APPEAL_REJECT",
					timestamp: now,
					reason: notes || "Appeal rejected",
					duration: "N/A",
					ip: req.socket.remoteAddress || "127.0.0.1",
					oldState: modData.status,
					newState: modData.status === "APPEALED" ? "PENDING_DELETION" : modData.status,
					notes: `Appeal rejected. Appeal ID: ${appealId}`
				});

				// Send Email
				if (userEmail) {
					try {
						await ModerationEmailService.sendAppealResolvedEmail(userEmail, "REJECTED", notes || "Your appeal was rejected. The administrative action stands.", refId);
					} catch (err) {
						console.warn("[Appeal Review] Failed sending rejection email:", err);
					}
				}

				return res.status(200).json({ success: true, message: "Appeal rejected." });
			}

			if (action === "request_info") {
				await appealRef.update({ status: "UNDER_REVIEW", adminNotes: notes || "" });

				// Audit Log
				await db.collection("moderationLogs").add({
					adminUid: adminUser.uid,
					targetUid,
					targetName: displayName,
					action: "MODERATOR_MSG",
					reason: `Requested information: ${notes}`,
					duration: "N/A",
					timestamp: now,
					ip: req.socket.remoteAddress || "127.0.0.1",
					oldState: appealData.status,
					newState: "UNDER_REVIEW",
					notes: `Appeal ID: ${appealId}`
				});

				// Send User Email / Notification
				if (userEmail) {
					try {
						await EmailService.sendDirectEmail(
							userEmail,
							`[BeastCode] Information Requested for Appeal (Ref: ${refId})`,
							`
								<p>Dear Member,</p>
								<p>A moderator has requested additional information regarding your appeal (Ref: ${refId}).</p>
								<div class="alert-box">
									<strong>Moderator Request:</strong><br>
									${notes}
								</div>
								<p>Please reply directly or submit updated files via the appeal page.</p>
							`
						);
					} catch (err) {
						console.warn("[Appeal Review] Failed sending info request email:", err);
					}
				}

				return res.status(200).json({ success: true, message: "Information request sent." });
			}

			return res.status(400).json({ success: false, error: "Invalid action type." });
		} catch (error: any) {
			console.error("[Admin Appeals Review] Failed:", error);
			return res.status(500).json({ success: false, error: "Action processing failed." });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAdminGuard(handler));
