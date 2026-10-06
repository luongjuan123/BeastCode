import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { moderationConfig } from "@/utils/moderationConfig";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Helper to save uploaded file
function saveUploadedFile(base64Data: string, originalName: string): string {
	const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
	if (!matches || matches.length !== 3) {
		throw new Error("Invalid base64 data format");
	}

	const fileBuffer = Buffer.from(matches[2], "base64");
	
	// Enforce file size check
	if (fileBuffer.byteLength > moderationConfig.maxUploadSizeBytes) {
		throw new Error(`File size exceeds the limit of ${moderationConfig.maxUploadSizeBytes / (1024 * 1024)}MB`);
	}

	const uploadDir = path.join(process.cwd(), "uploads", "evidence");
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}

	const extension = path.extname(originalName);
	const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`;
	const filePath = path.join(uploadDir, uniqueName);

	fs.writeFileSync(filePath, fileBuffer);
	return `/api/attachments?path=evidence/${uniqueName}`;
}

async function createAdminNotification(title: string, body: string, ctaUrl: string, metadata: any = {}) {
	const db = getAdminFirestore();
	
	// Query platform admins
	const adminsSnap = await db.collection("platformAdmins").where("active", "==", true).get();
	
	const adminUids = new Set<string>();
	adminsSnap.docs.forEach(d => adminUids.add(d.id));
	
	if (adminUids.size === 0) return;
	
	const batch = db.batch();
	adminUids.forEach(uid => {
		const notifRef = db.collection("notifications").doc();
		batch.set(notifRef, {
			toUid: uid,
			fromUid: "system",
			fromDisplayName: "🚨 Trust & Safety Team",
			fromAvatarUrl: "",
			type: "MODERATION_ALERT",
			title,
			body,
			category: "admin",
			priority: "high",
			createdAt: Date.now(),
			read: false,
			ctaText: "Review Case",
			ctaUrl,
			metadata
		});
	});
	
	await batch.commit();
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const reporter = req.user;
	if (!reporter) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { targetUid, reason, description, files } = req.body;

	if (!targetUid || !reason || !description) {
		return res.status(400).json({ success: false, error: "Missing required fields: targetUid, reason, description" });
	}

	if (reporter.uid === targetUid) {
		return res.status(400).json({ success: false, error: "You cannot report yourself." });
	}

	if (description.length < 30) {
		return res.status(400).json({ success: false, error: "Description must be at least 30 characters." });
	}

	if (description.length > 3000) {
		return res.status(400).json({ success: false, error: "Description must not exceed 3000 characters." });
	}

	const db = getAdminFirestore();

	try {
		// Verify target user exists
		const targetDoc = await db.collection("users").doc(targetUid).get();
		if (!targetDoc.exists) {
			return res.status(404).json({ success: false, error: "Reported user not found" });
		}
		const targetData = targetDoc.data() || {};
		const targetName = targetData.displayName || targetData.username || targetData.email || "Unknown User";

		// Fetch reporter profile to get their display name
		const reporterSnap = await db.collection("users").doc(reporter.uid).get();
		const reporterData = reporterSnap.data() || {};
		const reporterName = reporterData.displayName || reporter.email || "Anonymous";

		const now = Date.now();

		// Cooldown check: Duplicate reports from same user against same target within cooldown period
		const cooldownLimit = now - (moderationConfig.reportCooldownSeconds * 1000);
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		// Fetch all reports by this reporter to filter in memory and avoid composite index requirements
		const reporterReportsSnap = await db.collection("userReports")
			.where("reporterUid", "==", reporter.uid)
			.get();

		const reporterReports = reporterReportsSnap.docs.map(doc => doc.data());

		const hasRecentReport = reporterReports.some(r => 
			r.targetUid === targetUid && 
			typeof r.timestamp === "number" && 
			r.timestamp >= cooldownLimit
		);

		if (hasRecentReport) {
			return res.status(429).json({
				success: false,
				error: `You already reported this user recently. Please wait before submitting another report.`
			});
		}

		// Daily report limit check (rate limit)
		const dailyReportsCount = reporterReports.filter(r => 
			typeof r.timestamp === "number" && 
			r.timestamp >= startOfDay.getTime()
		).length;

		if (dailyReportsCount >= moderationConfig.maxReportsPerDayPerUser) {
			return res.status(429).json({
				success: false,
				error: `Daily report limit of ${moderationConfig.maxReportsPerDayPerUser} reached.`
			});
		}

		// Process base64 file uploads if any
		const evidenceUrls: string[] = [];
		if (files && Array.isArray(files)) {
			for (const file of files) {
				if (file.base64 && file.name) {
					try {
						const url = saveUploadedFile(file.base64, file.name);
						evidenceUrls.push(url);
					} catch (uploadErr: any) {
						return res.status(400).json({ success: false, error: uploadErr.message });
					}
				}
			}
		}

		const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
		const caseId = `CASE-${new Date().getFullYear()}-${randomSuffix}`;

		// Save the report
		const reportRef = await db.collection("userReports").add({
			caseId,
			reporterUid: reporter.uid,
			reporterName: reporterName,
			targetUid,
			targetName,
			reason,
			description,
			evidenceUrls,
			status: "OPEN",
			assignedModerator: null,
			priority: "MEDIUM",
			timestamp: now,
			notes: "",
			resolution: "",
			appealStatus: "NONE"
		});

		// Trigger In-App Admin Notification
		const notifTitle = `🚨 New User Report (${caseId})`;
		const notifBody = `Target: ${targetName}\nReporter: ${reporterName}\nReason: ${reason}`;
		await createAdminNotification(notifTitle, notifBody, `/admin/moderation?tab=reports&reportId=${reportRef.id}`, {
			reportId: reportRef.id,
			caseId,
			targetUid
		});

		return res.status(200).json({ success: true, message: "Report submitted successfully." });
	} catch (error: any) {
		console.error("[Report User API] Critical failure:", error);
		return res.status(500).json({ success: false, error: "Failed to submit report. Please try again." });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
