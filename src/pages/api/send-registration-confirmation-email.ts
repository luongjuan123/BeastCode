import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";
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

	try {
		// 1. Authorize Request (Ensure user is logged in)
		let decodedToken: any = null;
		try {
			const authHeader = req.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return res.status(401).json({ success: false, message: "Unauthorized: Missing token" });
			}
			const token = authHeader.split("Bearer ")[1];
			decodedToken = await getAdminAuth().verifyIdToken(token);
		} catch (tokenErr: any) {
			console.warn("[Auth Warning] Authentication failed or skipped due to local credentials:", tokenErr.message);
			if (process.env.NODE_ENV === "development") {
				decodedToken = { email: "juan@test.com", uid: "mock_user" };
			} else {
				return res.status(401).json({ success: false, message: `Unauthorized: ${tokenErr.message}` });
			}
		}

		const uid = decodedToken.uid;
		const { contestId } = req.body;
		if (!contestId) {
			return res.status(400).json({ success: false, message: "Missing required contestId parameter" });
		}

		// 2. Fetch User and Contest details dynamically
		let eligibleUsers: any[] = [];
		try {
			eligibleUsers = await NotificationRecipientService.resolveRecipients("CONTEST_REG_CONFIRM", contestId, {
				targetUid: uid
			});
		} catch (resolveErr: any) {
			console.error("[Recipient Resolution Failure] Aborting:", resolveErr.message);
			return res.status(500).json({ success: false, message: `Recipient resolution failed: ${resolveErr.message}` });
		}

		if (eligibleUsers.length === 0) {
			return res.status(400).json({ success: false, message: "Recipient user is not eligible (unverified or blacklisted email)." });
		}

		const db = getAdminFirestore();
		const contestDoc = await db.collection("contests").doc(contestId).get();
		if (!contestDoc.exists) {
			return res.status(404).json({ success: false, message: `Contest "${contestId}" not found in database.` });
		}

		const contestData = contestDoc.data() || {};
		const cStatus = String(contestData.status || "draft").toLowerCase();
		if (cStatus === "cancelled" || cStatus === "archived") {
			return res.status(400).json({ success: false, message: `Cannot register: Contest is ${cStatus}.` });
		}

		const now = Date.now();
		if (cStatus === "ended" || (contestData.endTime && now >= contestData.endTime)) {
			return res.status(400).json({ success: false, message: "Cannot register: Contest has already ended." });
		}

		const resolvedUser = eligibleUsers[0];
		const contestTitle = contestData.title || "Contest";
		const startTime = contestData.startTime || (now + 24 * 60 * 60 * 1000);
		const duration = contestData.duration || 120;
		const endTime = contestData.endTime || (startTime + duration * 60000);

		const contestUrl = buildAbsoluteUrl(`/contests/${contestId}`);

		// 3. Dispatch confirmation notification
		const result = await NotificationDispatcher.dispatch("CONTEST_REG_CONFIRM", {
			toEmail: resolvedUser.email,
			toUid: resolvedUser.uid,
			userName: resolvedUser.displayName,
			ctaUrl: contestUrl,
			expiresAt: endTime,
			metadata: {
				contestId
			},
			placeholders: {
				contestTitle,
				startTime: new Date(startTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
				durationText: `${duration} Minutes`
			},
			eventId: `reg-confirm-${contestId}-${uid}`
		});

		return res.status(200).json({
			success: result.success,
			message: result.message
		});
	} catch (error: any) {
		console.error("Error sending registration confirmation:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(handler);
