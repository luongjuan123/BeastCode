import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminStorage } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { resolveOrgAndMembership } from "@/utils/orgEngine";
import { Conversation } from "@/types/chat";
import { validateAndParseChatMedia, persistChatAttachment } from "@/utils/chatMediaService";
import fs from "fs";
import path from "path";

export const config = {
	api: {
		bodyParser: {
			sizeLimit: "25mb",
		},
	},
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	// ─── GET: Stream / Download Attachment ─────────────────────────────────────
	if (req.method === "GET") {
		const { cid, path: fileNameQuery } = req.query;
		const conversationId = cid as string;
		const fileName = fileNameQuery as string;

		if (!conversationId || !fileName) {
			return res.status(400).json({ success: false, error: "Missing conversation ID or file name" });
		}

		// 1. Path traversal security check
		if (
			fileName.includes("..") ||
			fileName.includes("/") ||
			fileName.includes("\\") ||
			path.isAbsolute(fileName)
		) {
			return res.status(403).json({ success: false, error: "Invalid file path" });
		}
		const normalizedFile = path.basename(fileName);

		const db = getAdminFirestore();
		const convRef = db.collection("conversations").doc(conversationId);
		const convSnap = await convRef.get();

		if (!convSnap.exists) {
			return res.status(404).json({ success: false, error: "Conversation not found" });
		}

		const convData = convSnap.data() as Conversation;

		// 2. Authorization check
		let isAuthorized = false;
		if (convData.type === "direct") {
			isAuthorized = (convData.participantUids || []).includes(user.uid);
		} else if (convData.type === "organization_channel" && convData.organizationId) {
			const { member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
			if (member && member.status === "active") {
				isAuthorized = true;
			}
		} else if (user.isAdmin) {
			isAuthorized = true;
		}

		if (!isAuthorized) {
			return res.status(403).json({ success: false, error: "Access denied to attachment" });
		}

		const storageRelativePath = `chat/${conversationId}/${normalizedFile}`;

		// 3. Try GCS download first
		const adminStorage = getAdminStorage();
		const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "beastcode-media-348293518232";

		if (adminStorage) {
			try {
				const bucket = adminStorage.bucket(bucketName);
				const file = bucket.file(storageRelativePath);
				const [exists] = await file.exists();

				if (exists) {
					const [metadata] = await file.getMetadata();
					res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
					res.setHeader("Cache-Control", "private, max-age=86400, immutable");
					await new Promise<void>((resolve) => {
						const readStream = file.createReadStream();
						readStream.pipe(res);
						res.on("finish", () => resolve());
						readStream.on("error", (streamErr) => {
							console.warn("[GCS Stream Warning]:", streamErr.message);
							if (!res.headersSent) {
								res.status(500).json({ success: false, error: "Streaming error" });
							}
							resolve();
						});
					});
					return;
				}
			} catch (gcsErr: any) {
				console.warn("[GCS Read Warning]:", gcsErr.message);
			}
		}

		// 4. Local disk fallback
		const diskPath = path.join(process.cwd(), "uploads", "chat", conversationId, normalizedFile);
		if (fs.existsSync(diskPath)) {
			const ext = path.extname(normalizedFile).toLowerCase();
			const mimeMap: Record<string, string> = {
				".jpg": "image/jpeg",
				".jpeg": "image/jpeg",
				".png": "image/png",
				".gif": "image/gif",
				".webp": "image/webp",
				".pdf": "application/pdf",
				".webm": "audio/webm",
				".ogg": "audio/ogg",
				".mp3": "audio/mpeg",
				".txt": "text/plain",
			};
			const mimeType = mimeMap[ext] || "application/octet-stream";

			res.setHeader("Content-Type", mimeType);
			res.setHeader("Cache-Control", "private, max-age=86400, immutable");
			await new Promise<void>((resolve) => {
				const fileStream = fs.createReadStream(diskPath);
				fileStream.pipe(res);
				res.on("finish", () => resolve());
				fileStream.on("error", () => resolve());
			});
			return;
		}

		return res.status(404).json({ success: false, error: "Attachment file not found" });
	}

	// ─── POST: Upload Media Attachment ─────────────────────────────────────────
	if (req.method === "POST") {
		const { fileData, fileName, conversationId, duration } = req.body;

		if (!fileData || !conversationId) {
			return res.status(400).json({ success: false, error: "Missing file data or conversation ID" });
		}

		const db = getAdminFirestore();
		const convRef = db.collection("conversations").doc(conversationId);
		const convSnap = await convRef.get();

		if (!convSnap.exists) {
			return res.status(404).json({ success: false, error: "Conversation not found" });
		}

		const convData = convSnap.data() as Conversation;

		// Verify authorization to upload to this conversation
		let isAuthorized = false;
		if (convData.type === "direct") {
			isAuthorized = (convData.participantUids || []).includes(user.uid);
		} else if (convData.type === "organization_channel" && convData.organizationId) {
			const { member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
			if (member && member.status === "active") {
				isAuthorized = true;
			}
		} else if (user.isAdmin) {
			isAuthorized = true;
		}

		if (!isAuthorized) {
			return res.status(403).json({ success: false, error: "Access denied to conversation" });
		}

		let parsed;
		try {
			parsed = validateAndParseChatMedia(fileData, fileName);
		} catch (validationErr: any) {
			return res.status(400).json({ success: false, error: validationErr.message });
		}

		const attachment = await persistChatAttachment({
			parsed,
			fileName,
			conversationId,
			userUid: user.uid,
			duration,
		});

		return res.status(201).json({
			success: true,
			attachment,
		});
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
