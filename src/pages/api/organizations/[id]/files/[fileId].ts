import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, fileId } = req.query;

	const orgIdentifier = id as string;
	const docFileId = fileId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (!orgIdentifier || !docFileId) {
		return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
	}

	// Resolve organization
	const { org, member: callerMember } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	const fileRef = db.collection("organizationFiles").doc(docFileId);
	const fileSnap = await fileRef.get();
	if (!fileSnap.exists) {
		return res.status(404).json({ success: false, error: "Not Found: File registry not found" });
	}

	const fileData = fileSnap.data() || {};
	if (fileData.organizationId !== org.id) {
		return res.status(400).json({ success: false, error: "Validation Error: File does not belong to this organization" });
	}

	// Security: Uploader or admin/moderator/role with uploadFile permissions
	const { allowed } = await checkOrgPermission(org.id, uid, "organization.uploadFile");
	const isUploader = fileData.uploaderUid === uid;

	if (!allowed && !isUploader) {
		return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
	}

	// PATCH /api/organizations/:id/files/:fileId - Rename / Update visibility
	if (req.method === "PATCH") {
		try {
			const { filename, visibility } = req.body;
			const updateData: any = {};

			if (filename !== undefined) updateData.filename = filename.trim();
			if (visibility !== undefined) updateData.visibility = visibility;

			if (Object.keys(updateData).length === 0) {
				return res.status(400).json({ success: false, error: "Validation Error: Nothing to update" });
			}

			await fileRef.update(updateData);

			await emitOrgEvent(
				org.id,
				uid,
				"file.updated",
				null,
				"organizationFiles",
				docFileId,
				updateData,
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "File updated successfully" });
		} catch (error: any) {
			console.error("PATCH /api/organizations/:id/files/:fileId error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// DELETE /api/organizations/:id/files/:fileId - Delete file registry
	if (req.method === "DELETE") {
		try {
			const orgRef = db.collection("organizations").doc(org.id);

			// Transaction: Delete file and decrement count
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.fileCount || 1;

				transaction.delete(fileRef);
				transaction.update(orgRef, { fileCount: Math.max(0, currentCount - 1) });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"file.deleted",
				null,
				"organizationFiles",
				docFileId,
				{ filename: fileData.filename },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "File deleted successfully" });
		} catch (error: any) {
			console.error("DELETE /api/organizations/:id/files/:fileId error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
