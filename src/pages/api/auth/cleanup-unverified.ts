import { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	const { email } = req.body;
	if (!email || typeof email !== "string") {
		return res.status(400).json({ success: false, message: "Missing or invalid email" });
	}

	const authAdmin = getAdminAuth();
	const db = getAdminFirestore();

	try {
		// 1. Look up the user in Firebase Auth
		let authUser;
		try {
			authUser = await authAdmin.getUserByEmail(email.trim());
		} catch (err: any) {
			if (err.code === "auth/user-not-found" || err.errorInfo?.code === "auth/user-not-found") {
				return res.status(200).json({ success: true, cleaned: false, message: "No such Auth user exists." });
			}
			throw err;
		}

		const uid = authUser.uid;

		// 2. Check if the user document exists in Firestore
		const userDoc = await db.collection("users").doc(uid).get();

		// 3. If unverified AND has no Firestore profile, clean up the Auth user
		if (!authUser.emailVerified && !userDoc.exists) {
			await authAdmin.deleteUser(uid);
			console.log(`[cleanup-unverified] Deleted unverified, unprovisioned Auth user: ${email} (UID: ${uid})`);
			return res.status(200).json({
				success: true,
				cleaned: true,
				message: "Unverified and unprovisioned Auth user cleaned up successfully."
			});
		}

		return res.status(200).json({
			success: true,
			cleaned: false,
			message: "User is verified or already has a database profile."
		});
	} catch (error: any) {
		console.error("[cleanup-unverified API] error:", error);
		return res.status(500).json({ success: false, message: "Failed to perform verification cleanup." });
	}
}

export default withApiErrorHandler(handler);
