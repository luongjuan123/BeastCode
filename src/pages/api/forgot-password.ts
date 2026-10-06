import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { buildAbsoluteUrl } from "@/utils/siteConfig";

type ResponseData = {
	success: boolean;
	message: string;
};

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ResponseData>
) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	const { email } = req.body as { email?: string };
	if (!email) {
		return res.status(400).json({ success: false, message: "Email is required." });
	}

	const emailLower = email.toLowerCase().trim();
	if (!/\S+@\S+\.\S+/.test(emailLower)) {
		return res.status(400).json({ success: false, message: "Please enter a valid email address." });
	}

	const db = getAdminFirestore();
	const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP") as string;
	const userAgent = (req.headers["user-agent"] || "Unknown UA") as string;

	try {
		// 1. Rate-limiting check (1 request per 60 seconds per email) with index-resilient fallback
		let lastRequestTime = 0;
		try {
			const limitSnap = await db.collection("passwordResetRequests")
				.where("email", "==", emailLower)
				.orderBy("requestedAt", "desc")
				.limit(1)
				.get();

			if (!limitSnap.empty) {
				lastRequestTime = limitSnap.docs[0].data().requestedAt || 0;
			}
		} catch (indexErr: any) {
			console.warn("[Password Reset Rate Limit] Falling back to index-resilient memory query:", indexErr.message);
			try {
				const fallbackSnap = await db.collection("passwordResetRequests")
					.where("email", "==", emailLower)
					.limit(20)
					.get();

				const sorted = fallbackSnap.docs
					.map(doc => doc.data())
					.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));

				if (sorted.length > 0) {
					lastRequestTime = sorted[0].requestedAt || 0;
				}
			} catch (fallbackErr: any) {
				console.error("[Password Reset Rate Limit Fallback Failed]:", fallbackErr);
			}
		}

		if (lastRequestTime > 0) {
			const elapsed = Date.now() - lastRequestTime;
			if (elapsed < 60 * 1000) {
				// Log abuse attempt internally
				await db.collection("securityLogs").add({
					type: "PASSWORD_RESET_ABUSE",
					email: emailLower,
					ip,
					userAgent,
					timestamp: Date.now(),
					details: "Rate limit exceeded for password reset request."
				});
				
				// Return generic success to prevent enumeration and side-channel timing analysis
				return res.status(200).json({
					success: true,
					message: "If an account exists for this email address, we've sent a password reset link."
				});
			}
		}

		// 2. Log request internally
		await db.collection("passwordResetRequests").add({
			email: emailLower,
			requestedAt: Date.now(),
			ip,
			userAgent
		});

		// 3. Retrieve user record
		let userRecord;
		let isLocalFallback = false;
		try {
			userRecord = await getAdminAuth().getUserByEmail(emailLower);
		} catch (authErr: any) {
			if (authErr.code === "auth/user-not-found") {
				// Security: Log non-existent request but return success to prevent enumeration
				console.log(`[Password Reset Request] Email not found: ${emailLower}. Skimming to protect user identity.`);
				return res.status(200).json({
					success: true,
					message: "If an account exists for this email address, we've sent a password reset link."
				});
			}
			
			const errMsg = authErr.message || "";
			if (authErr.code === "auth/internal-error" && (errMsg.includes("quota project") || errMsg.includes("identitytoolkit"))) {
				console.warn("[Password Reset API Warning] Local developer ADC credentials lack quota project. Falling back to mock user data.");
				isLocalFallback = true;
				userRecord = {
					uid: `mock-uid-${Buffer.from(emailLower).toString("hex").substring(0, 10)}`,
					displayName: emailLower.split("@")[0],
					email: emailLower
				};
			} else {
				throw authErr;
			}
		}

		// 4. Generate secure Firebase password reset link
		let resetLink = "";

		if (isLocalFallback) {
			resetLink = buildAbsoluteUrl(`/reset-password?oobCode=mock-reset-code-${Date.now()}`);
			console.log("[Password Reset Simulated Link generated using canonical host]");
		} else {
			try {
				const actionCodeSettings = {
					url: buildAbsoluteUrl("/reset-password"),
					handleCodeInApp: true
				};
				const firebaseLink = await getAdminAuth().generatePasswordResetLink(emailLower, actionCodeSettings);
				const urlParams = new URL(firebaseLink).searchParams;
				const oobCode = urlParams.get("oobCode") || "";
				resetLink = buildAbsoluteUrl(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`);
			} catch (resetErr: any) {
				const errMsg = resetErr.message || "";
				if (resetErr.code === "auth/internal-error" && (errMsg.includes("quota project") || errMsg.includes("identitytoolkit"))) {
					resetLink = buildAbsoluteUrl(`/reset-password?oobCode=mock-reset-code-${Date.now()}`);
					console.log("[Password Reset Simulated Link generated using canonical host]");
				} else {
					throw resetErr;
				}
			}
		}

		// 5. Dispatch notification via the centralized Notification Engine
		const dispatcherResult = await NotificationDispatcher.dispatch("AUTH_RESET", {
			toEmail: emailLower,
			toUid: userRecord.uid,
			userName: userRecord.displayName || "User",
			ctaUrl: resetLink,
			placeholders: {
				ip,
				device: userAgent.substring(0, 100)
			},
			eventId: `pw-reset-${userRecord.uid}-${Date.now()}`
		});

		if (!dispatcherResult.success) {
			console.error(`[Forgot Password Error] Notification engine dispatch failed: ${dispatcherResult.message}`);
			// Log failure internally, but do not leak details to client
			await db.collection("securityLogs").add({
				type: "PASSWORD_RESET_DISPATCH_FAILED",
				email: emailLower,
				uid: userRecord.uid,
				timestamp: Date.now(),
				details: dispatcherResult.message
			});
		}

		return res.status(200).json({
			success: true,
			message: "If an account exists for this email address, we've sent a password reset link."
		});

	} catch (error: any) {
		console.error("[Password Reset API Error]:", error);
		// Log general exception internally
		await db.collection("securityLogs").add({
			type: "PASSWORD_RESET_CRITICAL_FAILURE",
			email: emailLower,
			timestamp: Date.now(),
			details: error.message || "Unknown error"
		});

		// Return a friendly message with no raw details or stack traces
		return res.status(500).json({
			success: false,
			message: "Unable to send reset email. Please try again later."
		});
	}
}

export default withApiErrorHandler(handler);
