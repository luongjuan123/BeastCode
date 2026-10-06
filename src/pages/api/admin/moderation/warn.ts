import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
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

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { targetUid, reason, description, severity, visibleToUser = true, internalOnly = false } = req.body;

	if (!targetUid || !reason || !description || !severity) {
		return res.status(400).json({ success: false, error: "Missing required fields: targetUid, reason, description, severity" });
	}

	const db = getAdminFirestore();

	try {
		// Verify user exists
		const userDoc = await db.collection("users").doc(targetUid).get();
		if (!userDoc.exists) {
			return res.status(404).json({ success: false, error: "Target user not found" });
		}
		const userData = userDoc.data() || {};
		const userEmail = userData.email;
		const userName = userData.displayName || userData.username || "User";

		const now = Date.now();
		const expiresAt = now + (moderationConfig.warningExpirationDays * 24 * 60 * 60 * 1000);
		const warningId = `warn-${Math.random().toString(36).substring(7)}`;

		// Resolve Case ID (inherit from userModeration, open report, or generate new one)
		let caseId = "";
		const modRef = db.collection("userModeration").doc(targetUid);
		const modSnap = await modRef.get();
		const modData = modSnap.exists ? modSnap.data() : null;
		if (modData?.caseId) {
			caseId = modData.caseId;
		}

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
			await openReport.ref.update({ status: "RESOLVED", resolution: `Warning issued: ${reason}` });
		} else if (!caseId) {
			const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
			caseId = `CASE-${new Date().getFullYear()}-${randomSuffix}`;
		}

		// Ensure caseId is saved on userModeration doc for future actions
		await modRef.set({ caseId }, { merge: true });

		// Save Warning Document
		const warnDoc = await db.collection("moderationWarnings").add({
			warningId,
			caseId,
			targetUid,
			reason,
			description,
			severity,
			adminUid: adminUser.uid,
			adminName: adminUser.email || "Admin",
			timestamp: now,
			expiresAt,
			visibleToUser,
			internalOnly,
			acknowledged: false
		});


		// Count active warnings for this user (filtering in-memory to avoid composite index requirement)
		const warningsSnap = await db.collection("moderationWarnings")
			.where("targetUid", "==", targetUid)
			.get();

		const activeWarnings = warningsSnap.docs
			.map(d => d.data())
			.filter(w => typeof w.expiresAt === "number" && w.expiresAt > now);
		const severeCount = activeWarnings.filter(w => w.severity === "SEVERE").length;
		const totalCount = activeWarnings.length;

		let recommendedAction = "";
		if (severeCount >= moderationConfig.warningThresholdForSuspension || totalCount >= 5) {
			recommendedAction = `System Alert: Target user now has ${totalCount} active warnings (${severeCount} severe). Recommendation: Suspend Account.`;
		}

		// Write to Audit Logs
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			targetUid,
			targetName: userName,
			action: "WARN",
			caseId,
			reason: `${reason} (${severity})`,
			oldState: "ACTIVE",
			newState: "ACTIVE (WARNED)",
			timestamp: now,
			ip: req.socket.remoteAddress || "127.0.0.1",
			notes: `${description}. ${recommendedAction}`
		});

		// Send Email to User (unless internalOnly)
		if (visibleToUser && !internalOnly && userEmail) {
			try {
				await ModerationEmailService.sendWarningEmail(userEmail, reason, description, expiresAt, caseId);
			} catch (emailErr) {
				console.warn("[Warning API] Failed to deliver warning email:", emailErr);
			}
		}

		// Send In-App Notification to User (unless internalOnly)
		if (visibleToUser && !internalOnly) {
			try {
				await db.collection("notifications").add({
					toUid: targetUid,
					fromUid: "system",
					fromDisplayName: "🚨 Trust & Safety Team",
					fromAvatarUrl: "",
					type: "ACCOUNT_WARNING",
					title: `Warning Issued: ${reason}`,
					body: `An official warning has been issued due to: ${description}. It expires on ${new Date(expiresAt).toLocaleDateString()}. Case Ref: ${caseId}`,
					category: "security",
					priority: "high",
					createdAt: now,
					read: false,
					ctaText: "Review Rules",
					ctaUrl: "/settings"
				});
			} catch (notifErr) {
				console.warn("[Warning API] Failed to write user notification:", notifErr);
			}
		}

		return res.status(200).json({
			success: true,
			message: "Warning issued successfully.",
			totalCount,
			severeCount,
			recommendedAction
		});
	} catch (error: any) {
		console.error("[Warning API] Failed to issue warning:", error);
		return res.status(500).json({ success: false, error: "Failed to issue warning. Please try again." });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
