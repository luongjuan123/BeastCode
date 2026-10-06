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
	const { id, announcementId } = req.query;

	const orgIdentifier = id as string;
	const annId = announcementId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (!orgIdentifier || !annId) {
		return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
	}

	// Resolve organization
	const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	const annRef = db.collection("organizationAnnouncements").doc(annId);
	const annSnap = await annRef.get();
	if (!annSnap.exists || annSnap.data()?.deletedAt !== null) {
		return res.status(404).json({ success: false, error: "Not Found: Announcement not found" });
	}

	const annData = annSnap.data() || {};
	if (annData.organizationId !== org.id) {
		return res.status(400).json({ success: false, error: "Validation Error: Announcement does not belong to this organization" });
	}

	// Security: check if manager
	const { allowed } = await checkOrgPermission(org.id, uid, "organization.publishAnnouncement");
	if (!allowed) {
		return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
	}

	// PATCH /api/organizations/:id/announcements/:announcementId - Edit
	if (req.method === "PATCH") {
		try {
			const { title, content, markdown, attachments, visibility, isPinned } = req.body;
			const updateData: any = {
				editedAt: Date.now(),
			};

			if (title !== undefined) updateData.title = title.trim();
			if (content !== undefined) updateData.content = content.trim();
			if (markdown !== undefined) updateData.markdown = markdown.trim();
			if (attachments !== undefined) updateData.attachments = attachments;
			if (visibility !== undefined) updateData.visibility = visibility;
			if (isPinned !== undefined) updateData.isPinned = isPinned;

			await annRef.update(updateData);

			await emitOrgEvent(
				org.id,
				uid,
				"announcement.edited",
				null,
				"organizationAnnouncements",
				annId,
				{ title: updateData.title || annData.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Announcement updated successfully" });
		} catch (error: any) {
			console.error("PATCH /api/organizations/:id/announcements/:announcementId error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// DELETE /api/organizations/:id/announcements/:announcementId - Soft delete
	if (req.method === "DELETE") {
		try {
			const orgRef = db.collection("organizations").doc(org.id);

			// Transactional soft delete: decrement announcementCount
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.announcementCount || 1;

				transaction.update(annRef, { deletedAt: Date.now() });
				transaction.update(orgRef, { announcementCount: Math.max(0, currentCount - 1) });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"announcement.deleted",
				null,
				"organizationAnnouncements",
				annId,
				{ title: annData.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Announcement soft-deleted successfully" });
		} catch (error: any) {
			console.error("DELETE /api/organizations/:id/announcements/:announcementId error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
