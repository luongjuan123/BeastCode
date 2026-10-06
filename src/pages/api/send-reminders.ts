import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { NotificationRecipientService } from "@/utils/notificationRecipientService";
import { buildAbsoluteUrl } from "@/utils/siteConfig";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";

type ResponseData = {
	success: boolean;
	message: string;
	processedContests?: string[];
};

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ResponseData>
) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	try {
		// 1. Authorize: via valid CRON_SECRET or Platform Admin Bearer token
		let isAuthorized = false;
		const cronSecret = process.env.CRON_SECRET;
		const reqSecret = req.query.secret || req.headers["x-cron-secret"];
		if (cronSecret && reqSecret === cronSecret) {
			isAuthorized = true;
		} else {
			const authHeader = req.headers.authorization;
			if (authHeader && authHeader.startsWith("Bearer ")) {
				const token = authHeader.split("Bearer ")[1];
				try {
					const decoded = await getAdminAuth().verifyIdToken(token, true);
					const adminCheck = await verifyPlatformAdmin(decoded.uid, decoded);
					if (adminCheck.isPlatformAdmin) {
						isAuthorized = true;
					}
				} catch {
					// unauthorized
				}
			}
		}

		if (!isAuthorized) {
			return res.status(401).json({ success: false, message: "Unauthorized: Invalid or missing authorization" });
		}

		const now = Date.now();
		const db = getAdminFirestore();
		const contestsSnap = await db.collection("contests")
			.where("startTime", ">", now)
			.get();

		const pendingContests = contestsSnap.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as any[];

		const targetContests = pendingContests.filter(c => {
			const timeDiff = c.startTime - now;
			// Starts in the next 15 minutes
			const isStartingSoon = timeDiff <= 15 * 60 * 1000 && timeDiff > 0;
			return isStartingSoon && !c.reminderSent;
		});

		if (targetContests.length === 0) {
			return res.status(200).json({
				success: true,
				message: "No contests starting in the next 15 minutes that require reminders.",
				processedContests: []
			});
		}

		const processedContests: string[] = [];

		// 3. Process reminders for each target contest
		for (const contest of targetContests) {
			let targetedRecipients: any[] = [];
			try {
				targetedRecipients = await NotificationRecipientService.resolveRecipients("CONTEST_SOON", contest.id, {
					university: contest.university,
					visibility: contest.visibility
				});
			} catch (resolveErr: any) {
				console.error(`[Recipient Resolution Failure] Skipping contest ${contest.title}:`, resolveErr.message);
				continue;
			}

			if (targetedRecipients.length === 0) {
				const db = getAdminFirestore();
				await db.collection("contests").doc(contest.id).update({ reminderSent: true });
				processedContests.push(contest.title);
				continue;
			}

			const contestUrl = buildAbsoluteUrl(`/contests/${contest.id}`);

			// Send to each targeted recipient using central NotificationDispatcher
			for (const u of targetedRecipients) {
				try {
					await NotificationDispatcher.dispatch("CONTEST_SOON", {
						toEmail: u.email,
						toUid: u.uid,
						userName: u.displayName,
						ctaUrl: contestUrl,
						placeholders: {
							contestTitle: contest.title,
							startTime: new Date(contest.startTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
							timeLeft: "15 Minutes"
						},
						eventId: `contest-reminder-15m-${contest.id}-${u.uid}`
					});
				} catch (sendErr: any) {
					console.error(`Failed to dispatch reminder to ${u.email}:`, sendErr.message);
				}
			}

			const db = getAdminFirestore();
			await db.collection("contests").doc(contest.id).update({ reminderSent: true });
			processedContests.push(contest.title);
		}

		return res.status(200).json({
			success: true,
			message: `Sent reminders for ${processedContests.length} contest(s).`,
			processedContests
		});
	} catch (error: any) {
		console.error("Error processing reminders:", error);
		return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(handler);
