import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";
import { ThreadTag } from "@/utils/types/tag";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const includeHidden = req.query.includeHidden === "true";
			const snapshot = await db.collection("threadTags").orderBy("order", "asc").get();
			const tags: ThreadTag[] = [];
			snapshot.forEach((docSnap) => {
				const data = docSnap.data();
				if (includeHidden || (!data.isHidden && data.isEnabled)) {
					tags.push({ id: docSnap.id, ...data } as ThreadTag);
				}
			});
			return res.status(200).json({ success: true, tags });
		} catch (error: any) {
			console.error("GET thread-tags error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to fetch thread tags" });
		}
	}

	// For mutations, check platform admin role
	let token = "";
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		token = authHeader.substring(7).trim();
	} else if (req.body && req.body.idToken) {
		token = typeof req.body.idToken === "string" ? req.body.idToken.trim() : "";
	}

	if (!token) {
		return res.status(401).json({ success: false, error: "Unauthorized: Missing authentication token" });
	}

	try {
		const adminAuth = getAdminAuth();
		const decoded = await adminAuth.verifyIdToken(token, true);
		const { isPlatformAdmin } = await verifyPlatformAdmin(decoded.uid, decoded);

		if (!isPlatformAdmin) {
			return res.status(403).json({ success: false, error: "Forbidden: Administrative access required" });
		}
	} catch (error: any) {
		console.error("Admin verification error:", error?.message || error);
		return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired session token" });
	}

	if (req.method === "POST") {
		const { tag } = req.body as { tag?: Omit<ThreadTag, "createdAt" | "updatedAt"> };
		if (!tag || !tag.id || !tag.name) {
			return res.status(400).json({ success: false, error: "Missing tag details" });
		}

		try {
			const tagRef = db.collection("threadTags").doc(tag.id);
			const existing = await tagRef.get();
			if (existing.exists) {
				return res.status(400).json({ success: false, error: `Tag with ID '${tag.id}' already exists` });
			}

			const newTag: ThreadTag = {
				id: tag.id,
				name: tag.name,
				description: tag.description || "",
				isHidden: tag.isHidden ?? false,
				isEnabled: tag.isEnabled ?? true,
				order: tag.order ?? 0,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				color: tag.color || "#3B82F6",
				icon: tag.icon || "fa-comments",
				popularityCount: 0
			};

			await tagRef.set(newTag);
			return res.status(200).json({ success: true, tag: newTag });
		} catch (error: any) {
			console.error("POST thread-tags error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to create thread tag" });
		}
	}

	if (req.method === "PUT") {
		const { tag, tags } = req.body as { tag?: Partial<ThreadTag>; tags?: ThreadTag[] };

		if (tags && Array.isArray(tags)) {
			// Bulk update / Reordering
			try {
				const batch = db.batch();
				tags.forEach((t) => {
					const ref = db.collection("threadTags").doc(t.id);
					batch.update(ref, {
						order: t.order,
						updatedAt: Date.now()
					});
				});
				await batch.commit();
				return res.status(200).json({ success: true, message: "Thread tags reordered successfully" });
			} catch (error: any) {
				console.error("PUT thread-tags bulk error:", error);
				return res.status(500).json({ success: false, error: error.message || "Failed to reorder thread tags" });
			}
		}

		if (!tag || !tag.id) {
			return res.status(400).json({ success: false, error: "Missing tag ID to update" });
		}

		try {
			const tagRef = db.collection("threadTags").doc(tag.id);
			const existing = await tagRef.get();
			if (!existing.exists) {
				return res.status(404).json({ success: false, error: "Tag not found" });
			}

			const updateData: Partial<ThreadTag> = {
				...tag,
				updatedAt: Date.now()
			};
			delete updateData.id; // do not overwrite ID
			delete (updateData as any).createdAt;

			await tagRef.update(updateData);
			return res.status(200).json({ success: true, tag: { ...existing.data(), ...updateData, id: tag.id } });
		} catch (error: any) {
			console.error("PUT thread-tags error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to update thread tag" });
		}
	}

	if (req.method === "DELETE") {
		const { id } = req.body as { id?: string };
		if (!id) {
			return res.status(400).json({ success: false, error: "Missing tag ID to delete" });
		}

		try {
			await db.collection("threadTags").doc(id).delete();
			return res.status(200).json({ success: true, message: "Tag deleted successfully" });
		} catch (error: any) {
			console.error("DELETE thread-tags error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to delete thread tag" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(handler);
