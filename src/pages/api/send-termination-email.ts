import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";

type ResponseData = {
	success: boolean;
	message: string;
	status?: string;
};

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ResponseData>
) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		// 1. Authorize Request
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ success: false, message: "Unauthorized: Missing token" });
		}
		const token = authHeader.split("Bearer ")[1];
		let decodedToken: any = null;
		try {
			decodedToken = await getAdminAuth().verifyIdToken(token, true);
		} catch (tokenErr: any) {
			return res.status(401).json({ success: false, message: `Unauthorized: ${tokenErr.message}` });
		}

		const uid = decodedToken.uid;
		const { contestId, reason } = req.body;

		if (!contestId || !reason) {
			return res.status(400).json({ success: false, message: "Missing required parameters" });
		}

		// 2. Fetch User and Contest details dynamically
		let eligibleUsers: any[] = [];
		try {
			eligibleUsers = await NotificationRecipientService.resolveRecipients("SECURE_TERMINATION", contestId, {
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

		try {
			const db = getAdminFirestore();
			const contestDoc = await db.collection("contests").doc(contestId).get();
			if (contestDoc.exists) {
				const contestData = contestDoc.data() || {};
				contestTitle = contestData.title || "Contest";
			}
		} catch (adminErr: any) {
			console.warn("[Admin Credential Warn] Fallback to defaults:", adminErr.message);
			contestTitle = "BeastCode Tournament Grand Prix";
		}

		// 3. Dispatch via centralized dispatcher
		const result = await NotificationDispatcher.dispatch("SECURE_TERMINATION", {
			toEmail: resolvedUser.email,
			toUid: resolvedUser.uid,
			userName: resolvedUser.displayName,
			customContent: reason,
			placeholders: {
				contestTitle
			},
			eventId: `security-alert-${contestId}-${uid}`
		});

		return res.status(200).json({
			success: result.success,
			message: result.message,
			status: result.status
		});
	} catch (error: any) {
		console.error("Error sending termination notification:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(handler);
