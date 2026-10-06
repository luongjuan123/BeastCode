import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	checkRateLimit,
	OrganizationFile,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	// Resolve organization
	const { org, member: callerMember } = await resolveOrgAndMembership(orgIdentifier, uid || null);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// Security: Check visibility access
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	// GET /api/organizations/:id/files - List files
	if (req.method === "GET") {
		try {
			const { limit = "30", offset = "0" } = req.query;

			const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
			const parsedOffset = Math.max(0, parseInt(offset as string, 10));

			const snapshot = await db
				.collection("organizationFiles")
				.where("organizationId", "==", org.id)
				.get();

			const list: OrganizationFile[] = [];
			snapshot.forEach((doc) => {
				list.push({ id: doc.id, ...doc.data() } as OrganizationFile);
			});

			const userRole = callerMember ? callerMember.roleId : null;
			let filtered = list;

			// Hide admin visibility files from standard members/guests
			if (userRole !== "owner" && userRole !== "admin" && userRole !== "moderator") {
				filtered = list.filter((f) => f.visibility === "public" || (callerMember && f.visibility === "members"));
			}

			filtered.sort((a, b) => b.createdAt - a.createdAt);
			const paginated = filtered.slice(parsedOffset, parsedOffset + parsedLimit);

			// Resolve uploader profiles
			const uploaderIds = Array.from(new Set(paginated.map((f) => f.uploaderUid)));
			const uploaderProfiles: Record<string, any> = {};
			if (uploaderIds.length > 0) {
				const chunks = [];
				for (let i = 0; i < uploaderIds.length; i += 30) {
					chunks.push(uploaderIds.slice(i, i + 30));
				}
				const promises = chunks.map((chunk) =>
					db.collection("users").where("__name__", "in", chunk).get()
				);
				const snaps = await Promise.all(promises);
				snaps.forEach((snap) => {
					snap.forEach((doc) => {
						uploaderProfiles[doc.id] = doc.data();
					});
				});
			}

			const detailedList = paginated.map((f) => {
				const profile = uploaderProfiles[f.uploaderUid] || {};
				return {
					...f,
					uploaderName: profile.displayName || "Member",
					uploaderAvatar: profile.avatarUrl || "",
				};
			});

			return res.status(200).json({ success: true, total: filtered.length, files: detailedList });
		} catch (error: any) {
			console.error("GET /api/organizations/:id/files error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/files - Upload/Register File Metadata
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.uploadFile");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			// Cooldown rate-limit: Max 20 file uploads per day
			const passedLimit = await checkRateLimit(uid, "org.upload_file", 20, 86400);
			if (!passedLimit) {
				return res.status(429).json({ success: false, error: "Rate Limited: Maximum 20 file uploads per day." });
			}

			const { filename, mimeType, storagePath, size, visibility = "members" } = req.body;
			if (!filename || !mimeType || !storagePath || size === undefined) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing filename, mimeType, storagePath, or size" });
			}

			const fileId = db.collection("organizationFiles").doc().id;
			const newFile: OrganizationFile = {
				id: fileId,
				organizationId: org.id,
				uploaderUid: uid,
				filename: filename.trim(),
				mimeType: mimeType.trim(),
				storagePath: storagePath.trim(),
				size: parseInt(size, 10) || 0,
				visibility,
				downloadCount: 0,
				createdAt: Date.now(),
			};

			const orgRef = db.collection("organizations").doc(org.id);
			const fileRef = db.collection("organizationFiles").doc(fileId);

			// Transaction: Add file metadata and increment fileCount
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.fileCount || 0;

				transaction.set(fileRef, newFile);
				transaction.update(orgRef, { fileCount: currentCount + 1 });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"file.uploaded",
				null,
				"organizationFiles",
				fileId,
				{ filename },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, file: newFile });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/files error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
