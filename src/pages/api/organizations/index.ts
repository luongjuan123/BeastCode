import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkRateLimit,
	initializeOrgRoles,
	emitOrgEvent,
	Organization,
	OrganizationMember,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;

	// GET /api/organizations - List organizations with pagination, search & filter
	if (req.method === "GET") {
		try {
			const { q = "", type = "", country = "", limit = "10", offset = "0" } = req.query;

			const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
			const parsedOffset = Math.max(0, parseInt(offset as string, 10));

			let queryRef: any = db.collection("organizations").where("status", "==", "active");

			if (type) {
				queryRef = queryRef.where("organizationType", "==", type);
			}
			if (country) {
				queryRef = queryRef.where("country", "==", country);
			}

			const snapshot = await queryRef.get();
			let list: Organization[] = [];

			snapshot.forEach((doc: any) => {
				list.push({ id: doc.id, ...doc.data() } as Organization);
			});

			// Hide secret organizations unless authenticated user is a member
			const filteredList: Organization[] = [];
			for (const org of list) {
				if (org.visibility === "secret") {
					if (uid) {
						const memberDoc = await db.collection("organizationMembers").doc(`${org.id}_${uid}`).get();
						if (memberDoc.exists && memberDoc.data()?.status === "active") {
							filteredList.push(org);
						}
					}
				} else {
					filteredList.push(org);
				}
			}

			// Apply in-memory search match (for display name/slug) since Firestore lacks full text search
			let matched = filteredList;
			const searchStr = (q as string).toLowerCase().trim();
			if (searchStr) {
				matched = filteredList.filter(
					(org) =>
						org.name.toLowerCase().includes(searchStr) ||
						org.displayName.toLowerCase().includes(searchStr) ||
						org.shortName.toLowerCase().includes(searchStr) ||
						org.slug.toLowerCase().includes(searchStr)
				);
			}

			// Pagination slicing
			const paginated = matched.slice(parsedOffset, parsedOffset + parsedLimit);

			return res.status(200).json({
				success: true,
				total: matched.length,
				organizations: paginated,
			});
		} catch (error: any) {
			console.error("GET /api/organizations error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations - Create a new organization
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		// 1. Cooldown rate limit check: Max 2 organization creations per day per user
		const passedLimit = await checkRateLimit(uid, "org.create", 2, 86400);
		if (!passedLimit) {
			return res.status(429).json({ success: false, error: "Rate Limited. Maximum 2 organization creations per day." });
		}

		const {
			slug,
			name,
			displayName,
			shortName = "",
			description = "",
			avatar = "",
			banner = "",
			organizationType = "coding_club",
			visibility = "public",
			website = "",
			country = "",
			city = "",
			location = "",
			email = "",
			contactPhone = "",
			socialLinks = {},
		} = req.body;

		// Validation
		if (!slug || !name || !displayName) {
			return res.status(400).json({ success: false, error: "Validation Error: Missing slug, name, or displayName" });
		}

		const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, "").trim();
		if (cleanSlug.length < 3) {
			return res.status(400).json({ success: false, error: "Validation Error: Slug must be at least 3 characters" });
		}

		try {
			// Check unique slug conflict
			const slugDoc = await db.collection("organizations").doc(cleanSlug).get();
			if (slugDoc.exists) {
				return res.status(409).json({ success: false, error: "Conflict: Organization slug already taken" });
			}

			const now = Date.now();
			const newOrg: Organization = {
				id: cleanSlug,
				slug: cleanSlug,
				name: name.trim(),
				displayName: displayName.trim(),
				shortName: shortName.trim(),
				description: description.trim(),
				avatar: (avatar || "").trim(),
				avatarUrl: (avatar || "").trim(),
				banner: (banner || "").trim(),
				bannerUrl: (banner || "").trim(),
				organizationType,
				visibility,
				verified: false,
				website: website.trim(),
				country: country.trim(),
				city: city.trim(),
				location: location.trim(),
				email: email.trim(),
				contactPhone: contactPhone.trim(),
				socialLinks,
				memberCount: 1,
				contestCount: 0,
				problemCount: 0,
				announcementCount: 0,
				fileCount: 0,
				createdBy: uid,
				ownerUid: uid,
				status: "active",
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			};

			const memberDocId = `${cleanSlug}_${uid}`;
			const newOwnerMember: OrganizationMember = {
				organizationId: cleanSlug,
				uid,
				roleId: "owner",
				nickname: displayName,
				title: "Owner / Founder",
				department: "Administration",
				status: "active",
				joinedAt: now,
				joinedBy: uid,
				lastActive: now,
				permissionsVersion: 1,
				isHidden: false,
				isFavorite: false,
			};

			// Transactional setup of Org + Owner
			await db.runTransaction(async (transaction) => {
				transaction.set(db.collection("organizations").doc(cleanSlug), newOrg);
				transaction.set(db.collection("organizationMembers").doc(memberDocId), newOwnerMember);
			});

			// Initialize system role definitions for this specific organization
			await initializeOrgRoles(cleanSlug);

			// Emit event & security audit log
			await emitOrgEvent(
				cleanSlug,
				uid,
				"organization.created",
				null,
				"organizations",
				cleanSlug,
				{ name, visibility },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, organization: newOrg });
		} catch (error: any) {
			console.error("POST /api/organizations error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
