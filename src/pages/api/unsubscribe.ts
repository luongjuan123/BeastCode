import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";

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

	const { email, type } = req.body;

	if (!email || !email.includes("@")) {
		return res.status(400).json({ success: false, message: "Invalid email address." });
	}

	const prefType = type || "all";
	const emailLower = email.toLowerCase().trim();

	try {
		const db = getAdminFirestore();
		const usersSnap = await db.collection("users")
			.where("email", "==", emailLower)
			.get();

		if (usersSnap.empty) {
			// Save in a standalone opt-out collection for non-registered emails or guest records
			await db.collection("globalOptOuts").doc(emailLower).set({
				email: emailLower,
				type: prefType,
				unsubscribedAt: Date.now(),
			});

			return res.status(200).json({
				success: true,
				message: `This email is not registered on BeastCode, but we have successfully added ${emailLower} to our global opt-out list.`,
			});
		}

		const batch = db.batch();
		usersSnap.docs.forEach((doc) => {
			const data = doc.data();
			const existingPrefs = data.notificationPreferences || {
				reminders: true,
				achievements: true,
				editorials: true,
				upsolve: true,
				social: true,
				university: true,
				announcements: true,
				marketing: true,
				digest: true,
			};

			let updatedPrefs = { ...existingPrefs };

			if (prefType === "all") {
				updatedPrefs = {
					reminders: false,
					achievements: false,
					editorials: false,
					upsolve: false,
					social: false,
					university: false,
					announcements: false,
					marketing: false,
					digest: false,
				};
			} else {
				updatedPrefs[prefType] = false;
			}

			batch.update(doc.ref, {
				notificationPreferences: updatedPrefs,
				updatedAt: Date.now(),
			});
		});

		await batch.commit();

		const displayMsg = prefType === "all"
			? "You have been successfully unsubscribed from all email notifications."
			: `You have successfully unsubscribed from "${prefType}" notifications.`;

		return res.status(200).json({
			success: true,
			message: displayMsg,
		});
	} catch (error: any) {
		console.error("Unsubscribe error:", error);
		return res.status(500).json({ success: false, message: error.message || "Failed to update unsubscribe settings." });
	}
}

export default withApiErrorHandler(handler);
