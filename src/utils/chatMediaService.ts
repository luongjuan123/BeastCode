import { getAdminStorage } from "@/firebase/firebaseAdmin";
import { ChatAttachment } from "@/types/chat";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB limit

export interface ParsedFile {
	buffer: Buffer;
	mime: string;
	extension: string;
	category: "images" | "documents" | "audio" | "code";
}

export function validateAndParseChatMedia(base64Data: string, originalFilename?: string): ParsedFile {
	if (!base64Data || typeof base64Data !== "string") {
		throw new Error("Missing or invalid base64 file data");
	}

	const matches = base64Data.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
	if (!matches || matches.length !== 3) {
		throw new Error("Invalid base64 format. Expected data:<mime>;base64,<data>");
	}

	const buffer = Buffer.from(matches[2], "base64");
	if (buffer.length === 0) {
		throw new Error("File is empty (0 bytes)");
	}
	if (buffer.length > MAX_FILE_BYTES) {
		throw new Error("File exceeds 15MB limit");
	}

	let mime: string | null = null;
	let extension = ".bin";
	let category: "images" | "documents" | "audio" | "code" = "documents";

	// Check Magic Bytes
	// JPEG: FF D8 FF
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		mime = "image/jpeg";
		extension = ".jpg";
		category = "images";
	}
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	else if (
		buffer.length >= 8 &&
		buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
		buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
	) {
		mime = "image/png";
		extension = ".png";
		category = "images";
	}
	// GIF: GIF87a or GIF89a
	else if (
		buffer.length >= 6 &&
		buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
		buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
	) {
		mime = "image/gif";
		extension = ".gif";
		category = "images";
	}
	// WebP: RIFF....WEBP
	else if (
		buffer.length >= 12 &&
		buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
		buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
	) {
		mime = "image/webp";
		extension = ".webp";
		category = "images";
	}
	// PDF: %PDF-
	else if (
		buffer.length >= 4 &&
		buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
	) {
		mime = "application/pdf";
		extension = ".pdf";
		category = "documents";
	}
	// Audio: WebM / Ogg / MP3
	else if (
		buffer.length >= 4 &&
		buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
	) {
		mime = "audio/webm";
		extension = ".webm";
		category = "audio";
	} else if (
		buffer.length >= 4 &&
		buffer[0] === 0x4f && buffer[1] === 0x47 && buffer[2] === 0x67 && buffer[3] === 0x53
	) {
		mime = "audio/ogg";
		extension = ".ogg";
		category = "audio";
	} else if (
		(buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
		(buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
	) {
		mime = "audio/mpeg";
		extension = ".mp3";
		category = "audio";
	} else {
		// Fallback for plain text or source code files
		const isAscii = buffer.slice(0, 1024).every((b) => b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e));
		if (isAscii) {
			mime = "text/plain";
			extension = originalFilename ? path.extname(originalFilename) || ".txt" : ".txt";
			category = "code";
		}
	}

	if (!mime) {
		throw new Error("Unsupported file type. Only standard images, PDFs, audio notes, and text files are allowed.");
	}

	return { buffer, mime, extension, category };
}

export async function persistChatAttachment({
	parsed,
	fileName,
	conversationId,
	userUid,
	duration,
}: {
	parsed: ParsedFile;
	fileName?: string;
	conversationId: string;
	userUid: string;
	duration?: number;
}): Promise<ChatAttachment> {
	const fileId = crypto.randomUUID();
	const sanitizedOriginalName = (fileName || `attachment_${fileId.substring(0, 8)}${parsed.extension}`)
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.substring(0, 100);

	const storageFileName = `${fileId}${parsed.extension}`;
	const storageRelativePath = `chat/${conversationId}/${storageFileName}`;
	let permanentUrl = "";

	// Try GCS first
	const adminStorage = getAdminStorage();
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "beastcode-media-348293518232";
	let savedToGcs = false;

	if (adminStorage) {
		try {
			const bucket = adminStorage.bucket(bucketName);
			const file = bucket.file(storageRelativePath);
			await file.save(parsed.buffer, {
				metadata: {
					contentType: parsed.mime,
					metadata: {
						uploadedBy: userUid,
						conversationId,
						originalName: sanitizedOriginalName,
					},
				},
				resumable: false,
			});
			savedToGcs = true;
		} catch (gcsErr: any) {
			console.warn("[GCS Chat Upload Warning]:", gcsErr.message);
		}
	}

	// Local disk fallback
	if (!savedToGcs) {
		const diskDir = path.join(process.cwd(), "uploads", "chat", conversationId);
		fs.mkdirSync(diskDir, { recursive: true });
		const fullPath = path.join(diskDir, storageFileName);
		fs.writeFileSync(fullPath, parsed.buffer);
	}

	// Media download proxy URL ensures strict IDOR access control
	permanentUrl = `/api/chat/attachment?cid=${encodeURIComponent(conversationId)}&path=${encodeURIComponent(storageFileName)}`;

	return {
		id: fileId,
		name: sanitizedOriginalName,
		size: parsed.buffer.length,
		mimeType: parsed.mime,
		url: permanentUrl,
		storagePath: storageRelativePath,
		category: parsed.category,
		...(duration && typeof duration === "number" ? { duration: Math.round(duration) } : {}),
	};
}
