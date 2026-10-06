import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission, getMemberRoleAndStatus, logOrgAction } from "@/utils/orgPermissions";

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
			const { allowed, role, org } = await verifyUserPermission(orgSlug, uid, "VIEW_ORG");
			if (!allowed || !org) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to view this organization." });
			}

			return res.status(200).json({
				success: true,
				organization: {
					...org,
					slug: orgSlug,
				},
				userRole: role,
			});
		} catch (error: any) {
			console.error("GET org details error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "PUT") {
		try {
			const { allowed, role, org } = await verifyUserPermission(orgSlug, uid, "MANAGE_SETTINGS");
			if (!allowed || !org) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to modify this organization." });
			}

			const {
				name,
				type,
				visibility,
				description,
				website,
				location,
				country,
				category,
				socialLinks,
				avatar,
				avatarUrl,
				banner,
				bannerUrl,
				contactEmail,
				recruitmentStatus,
				state,
			} = req.body;

			const updateData: any = {
				updatedAt: Date.now(),
			};

			if (name !== undefined) updateData.name = name.trim();
			if (type !== undefined) updateData.type = type;
			if (visibility !== undefined) updateData.visibility = visibility;
			if (description !== undefined) updateData.description = description.trim();
			if (website !== undefined) updateData.website = website.trim();
			if (location !== undefined) updateData.location = location.trim();
			if (country !== undefined) updateData.country = country.trim();
			if (category !== undefined) updateData.category = category.trim();
			if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
			if (avatar !== undefined || avatarUrl !== undefined) {
				const canonical = ((avatarUrl !== undefined ? avatarUrl : avatar) || "").trim();
				updateData.avatar = canonical;
				updateData.avatarUrl = canonical;
			}
			if (banner !== undefined || bannerUrl !== undefined) {
				const canonicalBanner = ((bannerUrl !== undefined ? bannerUrl : banner) || "").trim();
				updateData.banner = canonicalBanner;
				updateData.bannerUrl = canonicalBanner;
			}
			if (contactEmail !== undefined) updateData.contactEmail = contactEmail.trim();
			if (recruitmentStatus !== undefined) updateData.recruitmentStatus = recruitmentStatus;
			
			// Allow Owner or Admin to change state (e.g. archive)
			if (state !== undefined) {
				if (state === "deleted" && role !== "owner") {
					return res.status(403).json({ success: false, error: "Only the owner can delete the organization." });
				}
				updateData.state = state;
			}

			await db.collection("organizations").doc(orgSlug).update(updateData);

			// Fetch user details for audit logs
			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"ORG_SETTINGS_UPDATED",
				orgSlug,
				{ updatedFields: Object.keys(updateData) },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Organization updated successfully." });
		} catch (error: any) {
			console.error("PUT org details error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		try {
			const { allowed, role } = await verifyUserPermission(orgSlug, uid, "DELETE_ORG");
			if (!allowed || role !== "owner") {
				return res.status(403).json({ success: false, error: "Access Denied. Only the organization owner can perform deletion." });
			}

			// Soft delete organization
			await db.collection("organizations").doc(orgSlug).update({
				state: "deleted",
				updatedAt: Date.now(),
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Owner",
				"ORG_DELETED",
				orgSlug,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Organization scheduled for deletion." });
		} catch (error: any) {
			console.error("DELETE org error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
