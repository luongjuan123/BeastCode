import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminStorage } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";
import crypto from "crypto";
import fs from "fs";

// Maximum allowed image size: 5MB
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface ValidatedImage {
	buffer: Buffer;
	mime: string;
	extension: string;
}

/**
 * Validates base64 data and verifies magic bytes against allowed image formats.
 * Rejects SVGs, executables, HTML, text, and oversized payloads.
 */
function validateAndParseAvatar(base64Data: string): ValidatedImage {
	if (!base64Data || typeof base64Data !== "string") {
		throw new Error("Invalid base64 payload: missing or non-string");
	}

	const matches = base64Data.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
	if (!matches || matches.length !== 3) {
		throw new Error("Invalid base64 data URL format. Expected data:<mime>;base64,<data>");
	}

	const declaredMime = matches[1].toLowerCase();
	const buffer = Buffer.from(matches[2], "base64");

	if (buffer.length === 0) {
		throw new Error("Avatar file is empty (0 bytes)");
	}

	if (buffer.length > MAX_AVATAR_BYTES) {
		throw new Error("Avatar file exceeds maximum size limit of 5MB");
	}

	// ─── Magic Bytes Verification ─────────────────────────────────────────────
	let detectedMime: string | null = null;
	let extension: string = ".png";

	// JPEG: FF D8 FF
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		detectedMime = "image/jpeg";
		extension = ".jpg";
	}
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	else if (
		buffer.length >= 8 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47 &&
		buffer[4] === 0x0d &&
		buffer[5] === 0x0a &&
		buffer[6] === 0x1a &&
		buffer[7] === 0x0a
	) {
		detectedMime = "image/png";
		extension = ".png";
	}
	// WebP: 'RIFF' .... 'WEBP'
	else if (
		buffer.length >= 12 &&
		buffer.slice(0, 4).toString("ascii") === "RIFF" &&
		buffer.slice(8, 12).toString("ascii") === "WEBP"
	) {
		detectedMime = "image/webp";
		extension = ".webp";
	}

	if (!detectedMime) {
		throw new Error(
			"Unsupported image format. File content must be a valid JPEG, PNG, or WebP image. SVGs and other formats are not permitted for security."
		);
	}

	// Verify declared MIME doesn't completely contradict detected MIME
	const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
	if (!allowedMimes.includes(declaredMime)) {
		throw new Error(`Invalid image MIME type: ${declaredMime}`);
	}

	return {
		buffer,
		mime: detectedMime,
		extension,
	};
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!orgIdentifier) {
		return res.status(400).json({ success: false, error: "Missing organization ID" });
	}

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Organization not found" });
	}

	// Verify permission to manage settings/avatar
	const { allowed } = await checkOrgPermission(org.id, uid, "organization.manageSettings");
	if (!allowed) {
		return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
	}

	// ─── POST or PUT: Upload / Replace Avatar ──────────────────────────────────
	if (req.method === "POST" || req.method === "PUT") {
		const { avatarBase64 } = req.body;
		if (!avatarBase64) {
			return res.status(400).json({ success: false, error: "Missing avatarBase64 data in request body" });
		}

		let validated: ValidatedImage;
		try {
			validated = validateAndParseAvatar(avatarBase64);
		} catch (validationErr: any) {
			return res.status(400).json({ success: false, error: validationErr.message });
		}

		const bucket = getAdminStorage().bucket();
		const randomSuffix = crypto.randomBytes(8).toString("hex");
		const filename = `${Date.now()}_${randomSuffix}${validated.extension}`;
		const storagePath = `organizations/${org.id}/avatar/${filename}`;
		const file = bucket.file(storagePath);

		let uploadedToStorage = false;

		try {
			// 1. Upload to Google Cloud Storage with permanent cache metadata
			await file.save(validated.buffer, {
				contentType: validated.mime,
				metadata: {
					cacheControl: "public, max-age=31536000, immutable",
				},
			});

			uploadedToStorage = true;
			await file.makePublic();

			const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

			// 2. Safely and atomically update Firestore organization document
			const updateData = {
				avatar: publicUrl,
				avatarUrl: publicUrl,
				avatarStoragePath: storagePath,
				avatarUpdatedAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.collection("organizations").doc(org.id).update(updateData);

			// 3. Clean up obsolete old storage object AFTER successful database update
			const oldStoragePath = (org as any).avatarStoragePath;
			if (oldStoragePath && typeof oldStoragePath === "string" && oldStoragePath !== storagePath) {
				if (oldStoragePath.startsWith("organizations/")) {
					bucket.file(oldStoragePath).delete({ ignoreNotFound: true }).catch((err) => {
						console.warn(`[Org Avatar] Non-critical: Failed to delete old GCS object ${oldStoragePath}:`, err);
					});
				} else if (fs.existsSync(oldStoragePath)) {
					try {
						fs.unlinkSync(oldStoragePath);
					} catch (_) {}
				}
			}

			// 4. Log security audit event
			await emitOrgEvent(
				org.id,
				uid,
				"organization.avatar_updated",
				null,
				"organizations",
				org.id,
				{ avatarUrl: publicUrl, storagePath },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({
				success: true,
				message: "Organization avatar updated successfully",
				avatarUrl: publicUrl,
				storagePath,
			});
		} catch (error: any) {
			console.error("[Org Avatar] Avatar upload error:", error);

			// Rollback: if file was uploaded to GCS but Firestore failed, clean up newly created orphan object
			if (uploadedToStorage) {
				try {
					await file.delete({ ignoreNotFound: true });
				} catch (rollbackErr) {
					console.error("[Org Avatar] Failed to rollback orphaned storage object:", rollbackErr);
				}
			}

			return res.status(500).json({
				success: false,
				error: error.message || "Failed to upload organization avatar. Existing avatar remains unchanged.",
			});
		}
	}

	// ─── DELETE: Remove Avatar ────────────────────────────────────────────────
	if (req.method === "DELETE") {
		try {
			const oldStoragePath = (org as any).avatarStoragePath;

			// 1. Update Firestore first
			const updateData = {
				avatar: "",
				avatarUrl: "",
				avatarStoragePath: "",
				avatarUpdatedAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.collection("organizations").doc(org.id).update(updateData);

			// 2. Clean up storage object
			if (oldStoragePath && typeof oldStoragePath === "string") {
				if (oldStoragePath.startsWith("organizations/")) {
					const bucket = getAdminStorage().bucket();
					await bucket.file(oldStoragePath).delete({ ignoreNotFound: true }).catch((err) => {
						console.warn(`[Org Avatar] Non-critical: Failed to delete old GCS object on delete ${oldStoragePath}:`, err);
					});
				} else if (fs.existsSync(oldStoragePath)) {
					try {
						fs.unlinkSync(oldStoragePath);
					} catch (_) {}
				}
			}

			// 3. Log audit event
			await emitOrgEvent(
				org.id,
				uid,
				"organization.avatar_removed",
				null,
				"organizations",
				org.id,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({
				success: true,
				message: "Organization avatar removed successfully",
			});
		} catch (error: any) {
			console.error("[Org Avatar] Avatar delete error:", error);
			return res.status(500).json({
				success: false,
				error: error.message || "Failed to remove organization avatar",
			});
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
