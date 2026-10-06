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

		const resolvedUser = eligibleUsers[0];
		let contestTitle = "Contest";
		let startTime = Date.now() + 24 * 60 * 60 * 1000;
		let duration = 120;

		try {
			const db = getAdminFirestore();
			const contestDoc = await db.collection("contests").doc(contestId).get();
			if (contestDoc.exists) {
				const contestData = contestDoc.data() || {};
				contestTitle = contestData.title || "Contest";
				startTime = contestData.startTime || startTime;
				duration = contestData.duration || duration;
			}
		} catch (adminErr: any) {
			console.warn("[Admin Credential Warn] Fallback to defaults for contest title:", adminErr.message);
			contestTitle = "BeastCode Tournament Grand Prix";
		}

		const contestUrl = buildAbsoluteUrl(`/contests/${contestId}`);

		// 3. Dispatch confirmation notification
		const result = await NotificationDispatcher.dispatch("CONTEST_REG_CONFIRM", {
			toEmail: resolvedUser.email,
			toUid: resolvedUser.uid,
			userName: resolvedUser.displayName,
			ctaUrl: contestUrl,
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
