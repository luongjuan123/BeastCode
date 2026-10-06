import type { NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";
import { COLORS } from "@/utils/emailComponents";
import { getEmailHtml } from "@/utils/emailTemplate";
import { analysePassword } from "@/utils/passwordPolicy";
import { verifyVerificationCode, sha256, getClientInfo } from "@/utils/securityHelpers";

function buildChangedEmail(ip: string, country: string, device: string, time: string): string {
	return getEmailHtml({
		headerTitle: "SECURITY NOTICE",
		accentColor: COLORS.danger,
		title: "Security Notice: Password Changed",
		leadText: "Hello,",
		description: "The password for your BeastCode account was recently updated. Here are the security details for this action. If you did not perform this change, please contact support immediately to secure your account.",
		details: [
			{ label: "Time", value: time },
			{ label: "IP Address", value: ip },
			{ label: "Location", value: country },
			{ label: "Device", value: device }
		]
	});
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { code, currentPassword, newPassword, confirmPassword, signOutOtherDevices = true, currentSessionId } = req.body;

	if (!code || !currentPassword || !newPassword || !confirmPassword) {
		return res.status(400).json({ success: false, error: "All fields are required." });
	}

	if (newPassword !== confirmPassword) {
		return res.status(400).json({ success: false, error: "New passwords do not match." });
	}

	try {
		const adminAuth = getAdminAuth();
		const db = getAdminFirestore();

		const userRecord = await adminAuth.getUser(user.uid);
		const userEmail = userRecord.email;
		if (!userEmail) {
			return res.status(400).json({ success: false, error: "User email not found." });
		}

		// 1. Verify code
		const verifyResult = await verifyVerificationCode(user.uid, "change-password", code);
		if (!verifyResult.success) {
			return res.status(400).json({ success: false, error: verifyResult.error || "Invalid verification code." });
		}

		// 2. Double-check password requirements & current password check (for high security)
		const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
		if (!apiKey) {
			return res.status(500).json({ success: false, error: "Server configuration error: Firebase API key is missing." });
		}

		const verifyPassRes = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: userEmail, password: currentPassword, returnSecureToken: false }),
			}
		);

		if (!verifyPassRes.ok) {
			return res.status(400).json({ success: false, error: "Authentication failed. Re-verification of current password failed." });
		}

		const analysis = analysePassword(newPassword, { email: userEmail, displayName: userRecord.displayName || "" });
		if (!analysis.isValid) {
			return res.status(400).json({ success: false, error: analysis.firstError || "Password does not meet requirements." });
		}

		// 3. Password history check
		const historySnap = await db.collection("passwordHistory")
			.where("userId", "==", user.uid)
			.get();

		const historyHashes = historySnap.docs
			.map((d) => d.data() as { hash: string; createdAt: number })
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, 5);

		const newHash = sha256(newPassword);
		const usedBefore = historyHashes.some((h) => h.hash === newHash);
		if (usedBefore) {
			return res.status(400).json({ success: false, error: "You've recently used this password. Please choose a different one." });
		}

		const now = Date.now();

		// 4. Perform Firebase Auth password update
		await adminAuth.updateUser(user.uid, { password: newPassword });

		// 5. Invalidate existing password reset tokens
		const resetTokensSnap = await db.collection("passwordResetTokens")
			.where("userId", "==", user.uid)
			.where("used", "==", false)
			.get();
		
		const resetTokensBatch = db.batch();
		resetTokensSnap.docs.forEach((doc) => {
			resetTokensBatch.update(doc.ref, { used: true, invalidatedAt: now });
		});
		await resetTokensBatch.commit();

		// 6. Revoke sessions & refresh tokens
		await adminAuth.revokeRefreshTokens(user.uid);

		// If signOutOtherDevices is true, revoke/delete other activeSessions
		if (signOutOtherDevices) {
			const sessionsSnap = await db.collection("activeSessions")
				.where("userId", "==", user.uid)
				.get();
			const sessionsBatch = db.batch();
			sessionsSnap.docs.forEach((doc) => {
				const data = doc.data();
				if (!currentSessionId || data.sessionId !== currentSessionId) {
					sessionsBatch.delete(doc.ref);
				}
			});
			await sessionsBatch.commit();
		}

		// 7. Log new password history
		await db.collection("passwordHistory").add({
			userId: user.uid,
			hash: newHash,
			createdAt: now,
		});

		// 8. Prune password history
		const allHistorySnap = await db.collection("passwordHistory").where("userId", "==", user.uid).get();
		if (allHistorySnap.size > 10) {
			const sorted = allHistorySnap.docs.sort((a, b) => (a.data().createdAt ?? 0) - (b.data().createdAt ?? 0));
			const toDelete = sorted.slice(0, allHistorySnap.size - 10);
			toDelete.forEach((d) => d.ref.delete().catch(() => {}));
		}

		// 8. Log security audit log
		const clientInfo = getClientInfo(req);
		await db.collection("securityLogs").add({
			action: "PASSWORD_CHANGED",
			timestamp: now,
			userId: user.uid,
			email: userEmail,
			...clientInfo
		});

		// 9. Send success notification email
		console.log(`[EMAIL DEBUG] Password changed confirmation email trigger start for user: ${userEmail}`);
		const deviceStr = `${clientInfo.browser} on ${clientInfo.os}`;
		const timeStr = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "medium" }) + " UTC";
		const emailHtml = buildChangedEmail(clientInfo.ip, clientInfo.country, deviceStr, timeStr);
		const deliveryResult = await EmailService.sendDirectEmailResult(userEmail, "Your BeastCode Password Was Changed", emailHtml);
		if (deliveryResult.success) {
			console.log(`[EMAIL DEBUG] Password changed confirmation email delivered to ${userEmail}. Message ID: ${deliveryResult.messageId}`);
		} else {
			console.error(`[EMAIL DEBUG] Password changed confirmation email FAILED for ${userEmail}: ${deliveryResult.error}`);
		}

		return res.status(200).json({ success: true, message: "Your password has been changed successfully." });
	} catch (error: any) {
		console.error("[Change Password Verify] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "An unexpected error occurred." });
	}
}

export default withAuthAndModeration(handler);
