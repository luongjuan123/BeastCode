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
				.collection("organizationFiles")
				.where("orgSlug", "==", orgSlug)
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				list.push({
					id: doc.id,
					name: data.name,
					url: data.url,
					size: data.size || 0,
					uploadedBy: data.uploadedBy,
					uploadedByName: data.uploadedByName || "User",
					uploadedAt: data.uploadedAt,
				});
			});

			list.sort((a, b) => b.uploadedAt - a.uploadedAt);

			return res.status(200).json({ success: true, files: list });
		} catch (error: any) {
			console.error("GET org files error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "UPLOAD_FILES");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to upload files." });
			}

			const { name, url, size = 0 } = req.body;
			if (!name || !url) {
				return res.status(400).json({ success: false, error: "File Name and URL are required." });
			}

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			const newFile = {
				orgSlug,
				name: name.trim(),
				url: url.trim(),
				size: parseInt(size, 10) || 0,
				uploadedBy: uid,
				uploadedByName: userData.displayName || "Member",
				uploadedAt: Date.now(),
			};

			const docRef = await db.collection("organizationFiles").add(newFile);

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Member",
				"FILE_UPLOADED",
				docRef.id,
				{ fileName: name },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, file: { id: docRef.id, ...newFile } });
		} catch (error: any) {
			console.error("Upload org file error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "UPLOAD_FILES");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to delete files." });
			}

			const { id } = req.body;
			if (!id) {
				return res.status(400).json({ success: false, error: "File ID is required." });
			}

			const fileRef = db.collection("organizationFiles").doc(id);
			const fileDoc = await fileRef.get();
			if (!fileDoc.exists) {
				return res.status(404).json({ success: false, error: "File not found." });
			}

			if (fileDoc.data()?.orgSlug !== orgSlug) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			await fileRef.delete();

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Member",
				"FILE_DELETED",
				id,
				{ fileName: fileDoc.data()?.name },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "File deleted successfully." });
		} catch (error: any) {
			console.error("Delete org file error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
