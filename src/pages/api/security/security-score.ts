import type { NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const adminAuth = getAdminAuth();
		const db = getAdminFirestore();

		const userRecord = await adminAuth.getUser(user.uid);
		const userDoc = await db.collection("users").doc(user.uid).get();
		const userData = userDoc.exists ? userDoc.data() || {} : {};

		let score = 50; // Base score
		const breakdown = [];

		// 1. Email Verification (+20 points)
		if (userRecord.emailVerified) {
			score += 20;
			breakdown.push({ check: "Email Verified", met: true, value: 20 });
		} else {
			breakdown.push({ check: "Email Verified", met: false, value: 0 });
		}

		// 2. Two-Factor Authentication (+20 points)
		const mfaEnabled = (userRecord.multiFactor && userRecord.multiFactor.enrolledFactors && userRecord.multiFactor.enrolledFactors.length > 0) || userData.twoFactorEnabled === true;
		if (mfaEnabled) {
			score += 20;
			breakdown.push({ check: "Two-Factor Authentication", met: true, value: 20 });
		} else {
			breakdown.push({ check: "Two-Factor Authentication", met: false, value: 0 });
		}

		// 3. Password strength / recent change (+10 points)
		// We can check if they have passwordHistory records. If they do, they have updated password.
		const historySnap = await db.collection("passwordHistory")
			.where("userId", "==", user.uid)
			.get();

		if (!historySnap.empty) {
			score += 10;
			breakdown.push({ check: "Updated Secure Password", met: true, value: 10 });
		} else {
			breakdown.push({ check: "Updated Secure Password", met: false, value: 0 });
		}

		// 4. Connected OAuth account (+10 points)
		const hasOAuth = userRecord.providerData && userRecord.providerData.some(p => p.providerId === "google.com" || p.providerId === "github.com");
		if (hasOAuth) {
			score += 10;
			breakdown.push({ check: "Connected Social Account", met: true, value: 10 });
		} else {
			breakdown.push({ check: "Connected Social Account", met: false, value: 0 });
		}

		// Cap score at 100
		score = Math.min(100, score);

		let level = "Weak";
		if (score >= 90) level = "Excellent";
		else if (score >= 75) level = "Strong";
		else if (score >= 60) level = "Good";
		else if (score >= 40) level = "Fair";

		return res.status(200).json({
			success: true,
			score,
			level,
			breakdown,
			mfaEnabled,
			emailVerified: userRecord.emailVerified
		});
	} catch (error: any) {
		console.error("[Get Security Score] Error:", error);
		return res.status(500).json({ success: false, error: error.message || "Failed to calculate security score." });
	}
}

export default withAuthAndModeration(handler);
