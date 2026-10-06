import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import fs from "fs";
import path from "path";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { path: filePathQuery } = req.query;

	if (!filePathQuery || typeof filePathQuery !== "string") {
		return res.status(400).json({ success: false, error: "Missing path parameter" });
	}

	// 1. Prevent directory traversal attacks
	const normalizedPath = path.normalize(filePathQuery).replace(/^(\.\.(\/|\\|$))+/, '');
	if (normalizedPath.includes("..") || path.isAbsolute(normalizedPath)) {
		return res.status(403).json({ success: false, error: "Access denied. Invalid path." });
	}

	const parts = normalizedPath.split("/");
	if (parts.length < 2) {
		return res.status(400).json({ success: false, error: "Invalid path format" });
	}

	const category = parts[0]; // "appeals", "evidence", or "avatars"
	const filename = parts.slice(1).join("/");

	if (category !== "appeals" && category !== "evidence" && category !== "avatars") {
		return res.status(403).json({ success: false, error: "Access denied. Invalid category." });
	}

	const db = getAdminFirestore();

	// 2. Perform Access Control Checks
	let authorized = false;

	if (category === "avatars") {
		authorized = true;
	} else {
		const user = req.user;
		if (!user) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		if (user.role === "admin" || user.isAdmin) {
			authorized = true;
		} else {
			if (category === "appeals") {
				// Find the appeal record and check if the user is the owner (targetUid)
				const appealsSnap = await db.collection("moderationAppeals")
					.where("targetUid", "==", user.uid)
					.get();

				for (const doc of appealsSnap.docs) {
					const data = doc.data();
					const hasMatch = data.evidenceUrls?.some((url: string) => 
						url.includes(filename) || url.includes(normalizedPath)
					);
					if (hasMatch) {
						authorized = true;
						break;
					}
				}
			} else if (category === "evidence") {
				// Find the report record and check if the user is the reporter (reporterUid)
				const reportsSnap = await db.collection("userReports")
					.where("reporterUid", "==", user.uid)
					.get();

				for (const doc of reportsSnap.docs) {
					const data = doc.data();
					const hasMatch = data.evidenceUrls?.some((url: string) => 
						url.includes(filename) || url.includes(normalizedPath)
					);
					if (hasMatch) {
						authorized = true;
						break;
					}
				}
			}
		}
	}

	if (!authorized) {
		return res.status(403).json({ success: false, error: "Access denied. You do not have permission to view this attachment." });
	}

	// 3. Locate the file on disk
	const fullPath = path.join(process.cwd(), "uploads", category, filename);
	
	// Check if file exists
	if (!fs.existsSync(fullPath)) {
		return res.status(404).json({ success: false, error: "Attachment not found." });
	}

	// Get file size and mime type
	const stat = fs.statSync(fullPath);
	const ext = path.extname(fullPath).toLowerCase();
	
	function getMimeType(extension: string): string {
		switch (extension) {
			case ".png": return "image/png";
			case ".jpg":
			case ".jpeg": return "image/jpeg";
			case ".gif": return "image/gif";
			case ".webp": return "image/webp";
			case ".avif": return "image/avif";
			case ".svg": return "image/svg+xml";
			case ".pdf": return "application/pdf";
			case ".mp4": return "video/mp4";
			case ".webm": return "video/webm";
			case ".ogg": return "video/ogg";
			case ".mp3": return "audio/mpeg";
			case ".wav": return "audio/wav";
			case ".m4a": return "audio/x-m4a";
			case ".aac": return "audio/aac";
			case ".txt": return "text/plain";
			case ".log": return "text/plain";
			case ".json": return "application/json";
			case ".xml": return "application/xml";
			case ".csv": return "text/csv";
			case ".yaml":
			case ".yml": return "text/yaml";
			case ".md": return "text/markdown";
			case ".js": return "application/javascript";
			case ".ts": return "application/typescript";
			case ".cpp":
			case ".h": return "text/x-c";
			case ".py": return "text/x-python";
			case ".java": return "text/x-java-source";
			case ".go": return "text/x-go";
			case ".rs": return "text/rust";
			default: return "application/octet-stream";
		}
	}

	const mimeType = getMimeType(ext);

	// 4. Set secure headers
	res.setHeader("Content-Type", mimeType);
	res.setHeader("Content-Length", stat.size);
	
	// Serve inline for viewing, attachment for binary downloads
	const inlineTypes = [
		"image/", "video/", "audio/", "text/", "application/pdf", "application/json"
	];
	const isInline = inlineTypes.some(type => mimeType.startsWith(type));
	
	if (isInline) {
		res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
	} else {
		res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
	}

	// 5. Stream the file
	const stream = fs.createReadStream(fullPath);
	stream.pipe(res);
}

export default withAuthAndModeration(handler);
