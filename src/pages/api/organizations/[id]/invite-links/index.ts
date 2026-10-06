import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { randomBytes } from "crypto";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		const { allowed } = await checkOrgPermission(org.id, uid, "organization.inviteMember");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		// GET /api/organizations/:id/invite-links - List active links
		if (req.method === "GET") {
			const snapshot = await db
				.collection("organizationInviteLinks")
				.where("organizationId", "==", org.id)
				.where("status", "==", "active")
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				// Filter expired ones in memory
				if (data.expiresAt && data.expiresAt <= Date.now()) {
					// Update status to expired
					doc.ref.update({ status: "expired" });
				} else {
					list.push({ linkId: doc.id, ...data });
				}
			});

			return res.status(200).json({ success: true, inviteLinks: list });
		}

		// POST /api/organizations/:id/invite-links - Create link
		if (req.method === "POST") {
			const { roleId = "member", maxUses = -1, expiresDays = -1, password = "" } = req.body;

			const token = randomBytes(16).toString("hex"); // readable invite token
			const linkId = token;

			const expiresAt = expiresDays > 0 ? Date.now() + expiresDays * 24 * 60 * 60 * 1000 : null;

			const newLink = {
				linkId,
				organizationId: org.id,
				roleId,
				maxUses: parseInt(String(maxUses), 10),
				useCount: 0,
				expiresAt,
				password: password || null,
				status: "active",
				createdBy: uid,
				createdAt: Date.now(),
			};

			await db.collection("organizationInviteLinks").doc(linkId).set(newLink);

			await emitOrgEvent(
				org.id,
				uid,
				"invite_link.created",
				null,
				"organizationInviteLinks",
				linkId,
				{ roleId, maxUses, expiresAt },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, inviteLink: newLink });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (error: any) {
		console.error("GET/POST /api/organizations/:id/invite-links error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
