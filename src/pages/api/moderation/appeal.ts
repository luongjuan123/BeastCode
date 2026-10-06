import { NextApiResponse, NextApiRequest } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { ModerationEmailService } from "@/utils/moderationEmailService";
import { moderationConfig } from "@/utils/moderationConfig";
import fs from "fs";
import path from "path";

// Helper to save uploaded file
function saveUploadedFile(base64Data: string, originalName: string): string {
	const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
	if (!matches || matches.length !== 3) {
		throw new Error("Invalid base64 data format");
	}

	const fileBuffer = Buffer.from(matches[2], "base64");
	const uploadDir = path.join(process.cwd(), "uploads", "appeals");
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}

	const extension = path.extname(originalName);
	const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`;
	const filePath = path.join(uploadDir, uniqueName);

	fs.writeFileSync(filePath, fileBuffer);
	return `/api/attachments?path=appeals/${uniqueName}`;
}

async function notifyAdmins(title: string, body: string, ctaUrl: string) {
	const db = getAdminFirestore();
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
			type: "MODERATION_APPEAL",
			title,
			body,
			category: "admin",
			priority: "high",
			createdAt: Date.now(),
			read: false,
			ctaText: "Review Appeal",
			ctaUrl
		});
	});
	await batch.commit();
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { referenceId, appealMessage, files, acceptTerms } = req.body;

	if (!referenceId || !appealMessage || acceptTerms !== true) {
		return res.status(400).json({ success: false, error: "Missing referenceId, appealMessage, or terms acceptance." });
	}

	if (appealMessage.length < 100) {
		return res.status(400).json({ success: false, error: "Appeal message must be at least 100 characters." });
	}

	if (appealMessage.length > 5000) {
		return res.status(400).json({ success: false, error: "Appeal message must not exceed 5000 characters." });
	}

	const db = getAdminFirestore();
	let refId = referenceId.trim().toUpperCase();

	try {
		// 1. Authenticate if token exists
		let targetUid: string = "";
		let targetEmail: string = "Anonymous";
		let currentStatus: string = "";
		let modData: any = null;

		let idToken = "";
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			idToken = authHeader.substring(7);
		}

		let loggedInUid: string | null = null;
		if (idToken) {
			try {
				const decoded = await getAdminAuth().verifyIdToken(idToken);
				loggedInUid = decoded.uid;
			} catch (e) {
				console.warn("[Appeal API] Failed to verify provided auth token:", e);
			}
		}

		if (loggedInUid) {
			targetUid = loggedInUid;
			
			const modSnap = await db.collection("userModeration").doc(targetUid).get();
			if (!modSnap.exists) {
				return res.status(400).json({ success: false, error: "No active moderation action found to appeal." });
			}
			modData = modSnap.data() || {};
			
			// Resolve refId from database to completely ignore client-supplied input for logged-in users
			refId = modData.caseId || targetUid.substring(0, 8).toUpperCase();

			const userDoc = await db.collection("users").doc(targetUid).get();
			if (userDoc.exists) {
				targetEmail = userDoc.data()?.email || "Anonymous";
			}
			currentStatus = modData.status;
		} else {
			// 2. Passwordless submission via Reference ID lookup
			// Query userModeration by caseId first
			const modSnap = await db.collection("userModeration").where("caseId", "==", refId).limit(1).get();
			let foundDoc: any = null;
			if (!modSnap.empty) {
				foundDoc = modSnap.docs[0];
				targetUid = foundDoc.id;
				modData = foundDoc.data() || {};
				currentStatus = modData.status;
			} else {
				// Try finding by caseId in users
				const usersSnap = await db.collection("users").where("caseId", "==", refId).limit(1).get();
				if (!usersSnap.empty) {
					const foundUserDoc = usersSnap.docs[0];
					targetUid = foundUserDoc.id;
					const userData = foundUserDoc.data() || {};
					modData = { status: userData.status || "ACTIVE", caseId: userData.caseId || refId };
					currentStatus = modData.status;
				} else {
					// Try finding by caseId in moderationWarnings
					const warningsSnap = await db.collection("moderationWarnings").where("caseId", "==", refId).limit(1).get();
					if (!warningsSnap.empty) {
						targetUid = warningsSnap.docs[0].data().targetUid;
						modData = { status: "ACTIVE", caseId: refId };
						currentStatus = "ACTIVE";
					} else {
						// Backward-compatible fallback: match user uid prefix
						const modCol = await db.collection("userModeration").get();
						for (const doc of modCol.docs) {
							if (doc.id.substring(0, 8).toUpperCase() === refId) {
								foundDoc = doc;
								break;
							}
						}
						
						if (!foundDoc) {
							const usersCol = await db.collection("users").get();
							for (const doc of usersCol.docs) {
								if (doc.id.substring(0, 8).toUpperCase() === refId) {
									targetUid = doc.id;
									const modSnap2 = await db.collection("userModeration").doc(targetUid).get();
									modData = modSnap2.exists ? modSnap2.data() : { status: doc.data()?.status || "ACTIVE" };
									currentStatus = modData.status;
									foundDoc = true;
									break;
								}
							}
						} else {
							targetUid = foundDoc.id;
							modData = foundDoc.data() || {};
							currentStatus = modData.status;
						}

						if (!foundDoc && !targetUid) {
							return res.status(404).json({ success: false, error: "No matching case found for this Reference ID." });
						}
					}
				}
			}

			if (targetEmail === "Anonymous" && targetUid) {
				const userDoc = await db.collection("users").doc(targetUid).get();
				if (userDoc.exists) {
					targetEmail = userDoc.data()?.email || "Anonymous";
				}
			}
		}

		if (currentStatus === "APPEALED") {
			return res.status(400).json({ success: false, error: "An appeal is already under review for this case." });
		}

		if (currentStatus !== "BANNED" && currentStatus !== "PENDING_DELETION") {
			return res.status(400).json({ success: false, error: "Your account status is currently not appealable." });
		}

		// Save uploaded files
		const evidenceUrls: string[] = [];
		if (files && Array.isArray(files)) {
			for (const file of files) {
				if (file.base64 && file.name) {
					try {
						const url = saveUploadedFile(file.base64, file.name);
						evidenceUrls.push(url);
					} catch (e: any) {
						return res.status(400).json({ success: false, error: `Upload error: ${e.message}` });
					}
				}
			}
		}

		const now = Date.now();
		const modRef = db.collection("userModeration").doc(targetUid);

		// Add Appeal Record
		const appealDocRef = await db.collection("moderationAppeals").add({
			targetUid,
			targetName: targetEmail,
			referenceId: refId,
			appealMessage,
			evidenceUrls,
			status: "PENDING",
			timestamp: now,
			adminUid: null,
			adminNotes: ""
		});

		const batch = db.batch();

		// If status was PENDING_DELETION, transition to APPEALED and pause the deletion delay timer
		if (currentStatus === "PENDING_DELETION") {
			const userRef = db.collection("users").doc(targetUid);
			batch.update(userRef, {
				status: "APPEALED",
				deleteTimerPaused: true
			});
			batch.update(modRef, {
				status: "APPEALED",
				deleteTimerPaused: true,
				banHistory: [
					...(modData.banHistory || []),
					{ action: "APPEAL_SUBMIT", reason: "Appeal submitted by user", timestamp: now }
				]
			});
		} else {
			batch.update(modRef, {
				banHistory: [
					...(modData.banHistory || []),
					{ action: "APPEAL_SUBMIT", reason: "Appeal submitted by user", timestamp: now }
				]
			});
		}

		await batch.commit();

		// Write Audit Log
		await db.collection("moderationLogs").add({
			adminUid: "USER",
			targetUid,
			targetName: targetEmail,
			action: "APPEAL_SUBMIT",
			timestamp: now,
			reason: `Appeal submitted for Ref ID ${refId}`,
			duration: "N/A",
			ip: req.socket.remoteAddress || "127.0.0.1",
			oldState: currentStatus,
			newState: currentStatus === "PENDING_DELETION" ? "APPEALED" : currentStatus,
			notes: `Reference ID: ${refId}. Appeal ID: ${appealDocRef.id}`
		});

		// Send Confirmation Email
		if (targetEmail && targetEmail !== "Anonymous") {
			try {
				await ModerationEmailService.sendAppealReceivedEmail(targetEmail, refId);
			} catch (emailErr) {
				console.warn("[Appeal API] Failed to send appeal confirmation email:", emailErr);
			}
		}

		// Notify Admins
		await notifyAdmins(
			`📥 New Moderation Appeal`,
			`User: ${targetEmail}\nRef ID: ${refId}\nAppeal Message: ${appealMessage.substring(0, 100)}...`,
			`/admin/moderation?tab=appeals&appealId=${appealDocRef.id}`
		);

		return res.status(200).json({ success: true, message: "Appeal submitted successfully." });
	} catch (error: any) {
		console.error("[Appeal API] Failure submitting appeal:", error);
		return res.status(500).json({ success: false, error: "Failed to submit appeal. Please try again." });
	}
}

export default withApiErrorHandler(handler);
