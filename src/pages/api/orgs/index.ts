import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { logOrgAction } from "@/utils/orgPermissions";
import { slugify } from "@/utils/slugify";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	if (req.method === "GET") {
		// List and search organizations
		try {
			const { q, type, category, country } = req.query;
			const uid = req.user?.uid;

			let queryRef = db.collection("organizations").where("state", "==", "active");

			if (type) {
				queryRef = queryRef.where("type", "==", type);
			}
			if (category) {
				queryRef = queryRef.where("category", "==", category);
			}
			if (country) {
				queryRef = queryRef.where("country", "==", country);
			}

			const snapshot = await queryRef.get();
			const list: any[] = [];

			// Fetch user membership slug list to check permissions for private/secret orgs
			const userOrgs = new Set<string>();
			if (uid) {
				const memberSnap = await db
					.collection("organizationMembers")
					.where("uid", "==", uid)
					.get();
				memberSnap.forEach((doc) => {
					userOrgs.add(doc.data().orgSlug);
				});
			}

			snapshot.forEach((doc) => {
				const data = doc.data();
				const isMember = userOrgs.has(doc.id);

				// Hide secret organizations from non-members
				if (data.visibility === "secret" && !isMember) {
					return;
				}
				// Private organizations: hide details or skip if they shouldn't show in directory
				// Usually, private orgs are visible in search but content is hidden. Secret ones are completely hidden.
				
				if (q) {
					const searchStr = (q as string).toLowerCase();
					const nameMatch = data.name?.toLowerCase().includes(searchStr);
					const slugMatch = doc.id.toLowerCase().includes(searchStr);
					const descMatch = data.description?.toLowerCase().includes(searchStr);
					if (!nameMatch && !slugMatch && !descMatch) {
						return;
					}
				}

				list.push({
					slug: doc.id,
					name: data.name,
					type: data.type,
					visibility: data.visibility,
					description: data.description,
					avatarUrl: data.avatarUrl || "",
					bannerUrl: data.bannerUrl || "",
					memberCount: data.memberCount || 1,
					contestCount: data.contestCount || 0,
					problemCount: data.problemCount || 0,
					verified: !!data.verified,
					category: data.category || "",
					country: data.country || "",
					website: data.website || "",
					isMember,
				});
			});

			return res.status(200).json({ success: true, organizations: list });
		} catch (error: any) {
			console.error("GET orgs error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		// Create organization
		try {
			const uid = req.user?.uid;
			if (!uid) {
				return res.status(401).json({ success: false, error: "Unauthorized" });
			}

			const { name, type, visibility, description, website, location, country, category, contactEmail } = req.body;

			if (!name || !name.trim()) {
				return res.status(400).json({ success: false, error: "Organization Name is required." });
			}

			if (!type || !visibility) {
				return res.status(400).json({ success: false, error: "Type and visibility are required." });
			}

			const slug = slugify(name);
			if (!slug) {
				return res.status(400).json({ success: false, error: "Invalid organization name. Could not generate URL slug." });
			}

			const orgRef = db.collection("organizations").doc(slug);
			const orgDoc = await orgRef.get();

			if (orgDoc.exists) {
				return res.status(400).json({ success: false, error: "An organization with this name or slug already exists." });
			}

			// Fetch user details to populate owner membership
			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			const now = Date.now();
			const newOrg = {
				name: name.trim(),
				slug,
				type,
				visibility,
				state: "active",
				description: (description || "").trim(),
				website: (website || "").trim(),
				location: (location || "").trim(),
				country: (country || "").trim(),
				foundedDate: now,
				category: (category || "").trim(),
				memberCount: 1,
				contestCount: 0,
				problemCount: 0,
				socialLinks: {},
				avatar: "",
				avatarUrl: "",
				banner: "",
				bannerUrl: "",
				verified: false,
				contactEmail: (contactEmail || userData.email || "").trim(),
				recruitmentStatus: "open",
				createdAt: now,
				updatedAt: now,
				ownerUid: uid,
			};

			const memberRef = db.collection("organizationMembers").doc(`${slug}_${uid}`);
			const newMember = {
				orgSlug: slug,
				uid,
				displayName: userData.displayName || "Owner",
				username: userData.username || "",
				avatarUrl: userData.avatarUrl || "",
				email: userData.email || "",
				role: "owner",
				joinedAt: now,
				problemsSolved: (userData.solvedProblems || []).length,
				contestRating: userData.contestRating || 0,
				status: "active",
			};

			// Write in transaction to guarantee consistency
			await db.runTransaction(async (transaction) => {
				transaction.set(orgRef, newOrg);
				transaction.set(memberRef, newMember);
			});

			await logOrgAction(
				slug,
				uid,
				userData.displayName || "Owner",
				"ORG_CREATED",
				slug,
				{ name },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, organization: newOrg });
		} catch (error: any) {
			console.error("Create org error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
