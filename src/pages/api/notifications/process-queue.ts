import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { EmailService } from "@/utils/emailService";
import { getAdminAuth } from "@/firebase/firebaseAdmin";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST" && req.method !== "GET") {
		return res.status(405).json({ success: false, message: "Method Not Allowed" });
	}

	// 1. Check CRON Secret authentication
	const cronSecret = process.env.CRON_SECRET;
	const reqSecret = req.headers["x-cron-secret"] || req.query.secret;
	const isCronAuthorized = !!cronSecret && typeof reqSecret === "string" && reqSecret === cronSecret;

	// 2. If not cron secret, check Platform Admin Bearer token
	let isPlatformAdminAuthorized = false;
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		try {
			const token = authHeader.substring(7).trim();
			const adminAuth = getAdminAuth();
			const decodedToken = await adminAuth.verifyIdToken(token, true);
			const { isPlatformAdmin } = await verifyPlatformAdmin(decodedToken.uid, decodedToken);
			if (isPlatformAdmin) {
				isPlatformAdminAuthorized = true;
			}
		} catch {
			// Token verification failure handled by rejection below
		}
	}

	if (!isCronAuthorized && !isPlatformAdminAuthorized) {
		return res.status(401).json({ success: false, message: "Unauthorized: Valid cron secret or administrative credentials required." });
	}

	try {
		const result = await EmailService.processQueue();
		return res.status(200).json({
			success: true,
			processedCount: result.processedCount,
			totalDurationMs: result.durationMs,
			details: result.details
		});
	} catch (error: any) {
		console.error("[Email Queue Processor Crash]:", error);
		return res.status(500).json({ success: false, message: error.message || "Queue processing error" });
	}
}

export default withApiErrorHandler(handler);
