import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	checkRateLimit,
	OrganizationAnnouncement,
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

	// Security: If private or secret organization, non-members cannot read announcements
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	// GET /api/organizations/:id/announcements - List announcements
	if (req.method === "GET") {
		try {
			const { limit = "30", offset = "0" } = req.query;

			const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
			const parsedOffset = Math.max(0, parseInt(offset as string, 10));

			let queryRef = db
				.collection("organizationAnnouncements")
				.where("organizationId", "==", org.id)
				.where("deletedAt", "==", null);

			const snapshot = await queryRef.get();
			const list: OrganizationAnnouncement[] = [];
			snapshot.forEach((doc) => {
				list.push({ id: doc.id, ...doc.data() } as OrganizationAnnouncement);
			});

			// Filter visibility: admins see all, members see all/members, guests see public/all
			const userRole = callerMember ? callerMember.roleId : null;
			let filtered = list;
			if (userRole !== "owner" && userRole !== "admin" && userRole !== "moderator") {
				filtered = list.filter((a) => a.visibility === "all" || (callerMember && a.visibility === "members"));
			}

			// Sort: pinned first, then by date descending
			filtered.sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return b.publishedAt - a.publishedAt;
			});

			const paginated = filtered.slice(parsedOffset, parsedOffset + parsedLimit);

			// Resolve author profiles
			const authorIds = Array.from(new Set(paginated.map((a) => a.authorUid)));
			const authorProfiles: Record<string, any> = {};
			if (authorIds.length > 0) {
				const chunks = [];
				for (let i = 0; i < authorIds.length; i += 30) {
					chunks.push(authorIds.slice(i, i + 30));
				}
				const promises = chunks.map((chunk) =>
					db.collection("users").where("__name__", "in", chunk).get()
				);
				const snaps = await Promise.all(promises);
				snaps.forEach((snap) => {
					snap.forEach((doc) => {
						authorProfiles[doc.id] = doc.data();
					});
				});
			}

			const detailedList = paginated.map((a) => {
				const profile = authorProfiles[a.authorUid] || {};
				return {
					...a,
					authorName: profile.displayName || "Author",
					authorAvatar: profile.avatarUrl || "",
				};
			});

			return res.status(200).json({ success: true, total: filtered.length, announcements: detailedList });
		} catch (error: any) {
			console.error("GET /api/organizations/:id/announcements error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/announcements - Publish announcement
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.publishAnnouncement");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			// Cooldown rate-limit: 10 announcements per day
			const passedLimit = await checkRateLimit(uid, "org.announcement", 10, 86400);
			if (!passedLimit) {
				return res.status(429).json({ success: false, error: "Rate Limited: Maximum 10 announcements per day." });
			}

			const { title, content, markdown = "", attachments = [], visibility = "all", isPinned = false } = req.body;
			if (!title || !content) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing title or content" });
			}

			const annId = db.collection("organizationAnnouncements").doc().id;
			const now = Date.now();
			const newAnnouncement: OrganizationAnnouncement = {
				id: annId,
				organizationId: org.id,
				title: title.trim(),
				content: content.trim(),
				markdown: markdown.trim(),
				attachments,
				visibility,
				authorUid: uid,
				isPinned,
				published: true,
				publishedAt: now,
				editedAt: null,
				deletedAt: null,
			};

			const orgRef = db.collection("organizations").doc(org.id);
			const annRef = db.collection("organizationAnnouncements").doc(annId);

			// Transaction: Add announcement and increment count
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.announcementCount || 0;

				transaction.set(annRef, newAnnouncement);
				transaction.update(orgRef, { announcementCount: currentCount + 1 });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"announcement.published",
				null,
				"organizationAnnouncements",
				annId,
				{ title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, announcement: newAnnouncement });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/announcements error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
