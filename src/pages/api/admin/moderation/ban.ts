import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { ModerationEmailService } from "@/utils/moderationEmailService";
import { randomUUID } from "crypto";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { targetUid, reason, duration, notes } = req.body;
	if (!targetUid || !reason || !duration) {
		return res.status(400).json({ success: false, error: "Missing required fields" });
	}

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const isPermanent = duration === "Permanent";
	const isSuperAdmin = adminUser.role === "super_admin";

	if (isPermanent && !isSuperAdmin) {
		return res.status(403).json({
			success: false,
			error: "Access Denied: Only Super Admins may issue permanent bans."
		});
	}

	try {
		const db = getAdminFirestore();
		const authAdmin = getAdminAuth();

		// Check if target user exists
		const userDoc = await db.collection("users").doc(targetUid).get();
		if (!userDoc.exists) {
			return res.status(404).json({ success: false, error: "Target user not found" });
		}
		const userData = userDoc.data() || {};
		const userEmail = userData.email;
		const userName = userData.displayName || userData.username || "User";

		// Calculate expiry
		let expiresAt: number | null = null;
		const now = Date.now();
		if (duration === "1 day") {
			expiresAt = now + 24 * 60 * 60 * 1000;
		} else if (duration === "7 days") {
			expiresAt = now + 7 * 24 * 60 * 60 * 1000;
		} else if (duration === "30 days") {
			expiresAt = now + 30 * 24 * 60 * 60 * 1000;
		}

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
			await openReport.ref.update({ status: "RESOLVED", resolution: `User suspended: ${reason}` });
		} else if (!caseId) {
			const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
			caseId = `CASE-${new Date().getFullYear()}-${randomSuffix}`;
		}

		// Update or set userModeration doc
		const oldState = modSnap.exists ? modSnap.data()?.status || "ACTIVE" : "ACTIVE";

		const newModData = {
			status: "BANNED",
			caseId,
			reason,
			duration,
			notes: notes || "",
			bannedAt: now,
			expiresAt,
			bannedBy: adminUser.uid,
			warnings: modSnap.exists ? modSnap.data()?.warnings || [] : [],
			banHistory: [
				...(modSnap.exists ? modSnap.data()?.banHistory || [] : []),
				{ action: "BAN", reason, duration, timestamp: now, adminUid: adminUser.uid, notes: notes || "" }
			]
		};

		await modRef.set(newModData, { merge: true });

		// Revoke active sessions / refresh tokens
		try {
			await authAdmin.revokeRefreshTokens(targetUid);
		} catch (tokenErr) {
			console.error(`Failed to revoke refresh tokens for ${targetUid}:`, tokenErr);
		}

		// Add audit log
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			targetUid,
			targetName: userName,
			action: isPermanent ? "BAN_PERM" : "BAN_TEMP",
			caseId,
			timestamp: now,
			reason,
			duration,
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState,
			newState: "BANNED",
			notes: notes || ""
		});

		// Send email notification
		if (userEmail) {
			try {
				await ModerationEmailService.sendSuspensionEmail(userEmail, isPermanent, duration, reason, expiresAt, caseId);
			} catch (emailErr) {
				console.warn("[Ban API] Failed to send suspension email:", emailErr);
			}
		}

		// Send in-app notification (for when they get unbanned or view status)
		try {
			await db.collection("notifications").add({
				toUid: targetUid,
				fromUid: "system",
				fromDisplayName: "🚨 Trust & Safety Team",
				fromAvatarUrl: "",
				type: "ACCOUNT_SUSPENDED",
				title: `Account Suspended: ${duration}`,
				body: `Your access has been suspended due to: ${reason}. Appeal Ref: ${caseId}`,
				category: "security",
				priority: "high",
				createdAt: now,
				read: false,
				ctaText: "File Appeal",
				ctaUrl: `/account-appeal?caseId=${caseId}`
			});
		} catch (notifErr) {
			console.warn("[Ban API] Failed to write notification:", notifErr);
		}

		return res.status(200).json({ success: true, message: "User suspended successfully" });
	} catch (error: any) {
		console.error("Ban API error:", error);
		return res.status(500).json({ success: false, error: "Suspension failed. Please check logs." });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
