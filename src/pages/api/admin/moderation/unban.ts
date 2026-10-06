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

	const { targetUid, reason, notes } = req.body;
	if (!targetUid || !reason) {
		return res.status(400).json({ success: false, error: "Missing required fields" });
	}

	const adminUser = req.user;
	if (!adminUser) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const db = getAdminFirestore();

		// Check if target user exists
		const userDoc = await db.collection("users").doc(targetUid).get();
		if (!userDoc.exists) {
			return res.status(404).json({ success: false, error: "Target user not found" });
		}
		const userData = userDoc.data() || {};
		const userEmail = userData.email;
		const userName = userData.displayName || userData.username || "User";

		// Update or set userModeration doc
		const modRef = db.collection("userModeration").doc(targetUid);
		const modSnap = await modRef.get();
		const oldState = modSnap.exists ? modSnap.data()?.status || "BANNED" : "BANNED";

		const now = Date.now();
		const newModData = {
			status: "ACTIVE",
			expiresAt: null,
			notes: notes || "",
			banHistory: [
				...(modSnap.exists ? modSnap.data()?.banHistory || [] : []),
				{ action: "UNBAN", reason, timestamp: now, adminUid: adminUser.uid, notes: notes || "" }
			]
		};

		await modRef.set(newModData, { merge: true });

		const modData = modSnap.exists ? modSnap.data() : null;
		const refId = modData?.caseId || targetUid.substring(0, 8).toUpperCase();

		// Add audit log
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			targetUid,
			targetName: userName,
			action: "UNBAN",
			caseId: refId,
			timestamp: now,
			reason,
			duration: "N/A",
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState,
			newState: "ACTIVE",
			notes: notes || ""
		});

		// Send email notification
		if (userEmail) {
			try {
				await ModerationEmailService.sendBanRemovedEmail(userEmail, refId);
			} catch (emailErr) {
				console.warn("[Unban API] Failed to send unban email:", emailErr);
			}
		}

		// Send in-app notification
		try {
			await db.collection("notifications").add({
				toUid: targetUid,
				fromUid: "system",
				fromDisplayName: "🚨 Trust & Safety Team",
				fromAvatarUrl: "",
				type: "ACCOUNT_REINSTATED",
				title: "Account Reinstated",
				body: "Your suspension has been lifted and full access is restored. Reference ID: " + refId,
				category: "security",
				priority: "high",
				createdAt: now,
				read: false,
				ctaText: "Go to Dashboard",
				ctaUrl: "/"
			});
		} catch (notifErr) {
			console.warn("[Unban API] Failed to write notification:", notifErr);
		}

		return res.status(200).json({ success: true, message: "User unsuspended successfully" });
	} catch (error: any) {
		console.error("Unban API error:", error);
		return res.status(500).json({ success: false, error: "Failed to lift suspension. Please try again." });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
