import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission, logOrgAction } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "GET") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "VIEW_ORG");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			const snapshot = await db
				.collection("organizationAnnouncements")
				.where("orgSlug", "==", orgSlug)
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				list.push({
					id: doc.id,
					title: data.title,
					content: data.content,
					authorUid: data.authorUid,
					authorName: data.authorName,
					authorAvatar: data.authorAvatar || "",
					createdAt: data.createdAt,
					pinned: !!data.pinned,
				});
			});

			// Sort pinned first, then by createdAt DESC
			list.sort((a, b) => {
				if (a.pinned && !b.pinned) return -1;
				if (!a.pinned && b.pinned) return 1;
				return b.createdAt - a.createdAt;
			});

			return res.status(200).json({ success: true, announcements: list });
		} catch (error: any) {
			console.error("GET announcements error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_ANNOUNCEMENTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to post announcements." });
			}

			const { title, content, pinned = false } = req.body;
			if (!title || !title.trim() || !content || !content.trim()) {
				return res.status(400).json({ success: false, error: "Title and Content are required." });
			}

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			const newAnnouncement = {
				orgSlug,
				title: title.trim(),
				content: content.trim(),
				authorUid: uid,
				authorName: userData.displayName || "Admin",
				authorAvatar: userData.avatarUrl || "",
				createdAt: Date.now(),
				pinned: !!pinned,
			};

			const docRef = await db.collection("organizationAnnouncements").add(newAnnouncement);

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"ANNOUNCEMENT_CREATED",
				docRef.id,
				{ title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, announcement: { id: docRef.id, ...newAnnouncement } });
		} catch (error: any) {
			console.error("Create announcement error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_ANNOUNCEMENTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to delete announcements." });
			}

			const { id } = req.body;
			if (!id) {
				return res.status(400).json({ success: false, error: "Announcement ID is required." });
			}

			const annRef = db.collection("organizationAnnouncements").doc(id);
			const annDoc = await annRef.get();
			if (!annDoc.exists) {
				return res.status(404).json({ success: false, error: "Announcement not found." });
			}

			if (annDoc.data()?.orgSlug !== orgSlug) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			await annRef.delete();

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"ANNOUNCEMENT_DELETED",
				id,
				{ title: annDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Announcement deleted successfully." });
		} catch (error: any) {
			console.error("Delete announcement error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
