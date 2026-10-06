import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";

type TerminateResponseData = {
	success: boolean;
	status?: string;
	message: string;
	error?: string;
};

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<TerminateResponseData>
) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		// 1. Authorize via Firebase Bearer Token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ success: false, message: "Unauthorized: Missing authentication token" });
		}
		const token = authHeader.split("Bearer ")[1].trim();
		let decodedToken: any = null;
		try {
			decodedToken = await getAdminAuth().verifyIdToken(token, true);
		} catch (tokenErr: any) {
			return res.status(401).json({ success: false, message: `Unauthorized: ${tokenErr.message}` });
		}

		const uid = decodedToken.uid;
		const { contestId, reason } = req.body;

		if (!contestId || typeof contestId !== "string") {
			return res.status(400).json({ success: false, message: "Missing or invalid contestId parameter" });
		}

		const terminationReason = typeof reason === "string" && reason.trim()
			? reason.trim()
			: "Disqualified due to proctoring and integrity violations";

		const db = getAdminFirestore();

		// 2. Fetch and verify participant record
		const participantRef = db.collection("contest_participants").doc(`${contestId}_${uid}`);
		const participantSnap = await participantRef.get();

		if (!participantSnap.exists) {
			return res.status(404).json({ success: false, message: "Participant record not found for this contest" });
		}

		const participantData = participantSnap.data() || {};
		const username = participantData.username || decodedToken.email?.split("@")[0] || "participant";

		// 3. Update participant record to terminated
		await participantRef.update({
			status: "terminated",
			terminatedAt: Date.now(),
			terminationReason,
			updatedAt: Date.now()
		});

		// 4. Record integrity event in contest_integrity_events
		try {
			await db.collection("contest_integrity_events").add({
				contestId,
				uid,
				username,
				type: "session_terminated",
				timestamp: Date.now(),
				details: terminationReason,
				enforcedBy: "system_proctor"
			});
		} catch (eventErr) {
			console.error("[Contest Terminate] Failed to record integrity event:", eventErr);
		}

		// 5. Asynchronously trigger termination informational email
		if (!participantData.isVirtual) {
			try {
				const eligibleRecipients = await NotificationRecipientService.resolveRecipients(
					"SECURE_TERMINATION",
					contestId,
					{ targetUid: uid }
				);

				if (eligibleRecipients.length > 0) {
					let contestTitle = "Contest Arena";
					try {
						const contestDoc = await db.collection("contests").doc(contestId).get();
						if (contestDoc.exists) {
							contestTitle = contestDoc.data()?.title || contestTitle;
						}
					} catch (cErr) {
						console.error("[Contest Terminate] Failed to read contest title:", cErr);
					}

					for (const recipient of eligibleRecipients) {
						await NotificationDispatcher.dispatch("SECURE_TERMINATION", {
							toEmail: recipient.email,
							toUid: recipient.uid,
							userName: recipient.displayName,
							customContent: terminationReason,
							placeholders: {
								contestTitle
							},
							eventId: `security-alert-${contestId}-${uid}`
						});
					}
				}
			} catch (emailErr) {
				console.error("[Contest Terminate] Failed to dispatch termination email notification:", emailErr);
			}
		}

		return res.status(200).json({
			success: true,
			status: "terminated",
			message: "Participant session has been permanently terminated."
		});
	} catch (err: any) {
		console.error("[Contest Terminate API Error]:", err);
		return res.status(500).json({
			success: false,
			message: "Internal server error terminating contest participant",
			error: err.message
		});
	}
}

export default withApiErrorHandler(handler);
