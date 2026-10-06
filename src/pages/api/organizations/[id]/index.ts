import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	Organization,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!orgIdentifier) {
		return res.status(400).json({ success: false, error: "Validation Error: Missing organization ID/slug" });
	}

	// Resolve the organization first
	let resolved;
	try {
		resolved = await resolveOrgAndMembership(orgIdentifier, uid || null);
	} catch (e: any) {
		return res.status(403).json({ success: false, error: "Forbidden: Organization is suspended" });
	}

	const { org, member, role } = resolved;
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// Security: If visibility is secret and user is not an active member, check if they have a pending invitation
	if (org.visibility === "secret" && !member) {
		let hasPendingInvite = false;
		if (uid) {
			const inviteSnap = await db.collection("organizationInvitations")
				.where("organizationId", "==", org.id)
				.where("uid", "==", uid)
				.where("status", "==", "Pending")
				.limit(1)
				.get();
			if (!inviteSnap.empty) {
				hasPendingInvite = true;
			} else {
				const userDoc = await db.collection("users").doc(uid).get();
				const email = userDoc.data()?.email;
				if (email) {
					const inviteEmailSnap = await db.collection("organizationInvitations")
						.where("organizationId", "==", org.id)
						.where("email", "==", email)
						.where("status", "==", "Pending")
						.limit(1)
						.get();
					if (!inviteEmailSnap.empty) {
						hasPendingInvite = true;
					}
				}
			}
		}
		if (!hasPendingInvite) {
			return res.status(404).json({ success: false, error: "Not Found" });
		}
	}

	// GET /api/organizations/:id
	if (req.method === "GET") {
		try {
			// Check if they have a pending invitation to bypass hiding private metadata on invitation page
			let hasPendingInvite = false;
			if (uid && org.visibility === "private" && !member) {
				const inviteSnap = await db.collection("organizationInvitations")
					.where("organizationId", "==", org.id)
					.where("uid", "==", uid)
					.where("status", "==", "Pending")
					.limit(1)
					.get();
				if (!inviteSnap.empty) {
					hasPendingInvite = true;
				} else {
					const userDoc = await db.collection("users").doc(uid).get();
					const email = userDoc.data()?.email;
					if (email) {
						const inviteEmailSnap = await db.collection("organizationInvitations")
							.where("organizationId", "==", org.id)
							.where("email", "==", email)
							.where("status", "==", "Pending")
							.limit(1)
							.get();
						if (!inviteEmailSnap.empty) {
							hasPendingInvite = true;
						}
					}
				}
			}

			// If private organization, and no membership and no pending invite, hide sensitive metadata from guests/non-members
			if (org.visibility === "private" && !member && !hasPendingInvite) {
				const guestProfile = {
					id: org.id,
					slug: org.slug,
					name: org.name,
					displayName: org.displayName,
					shortName: org.shortName,
					description: org.description,
					avatar: org.avatar || (org as any).avatarUrl || "",
					avatarUrl: (org as any).avatarUrl || org.avatar || "",
					banner: org.banner,
					organizationType: org.organizationType,
					visibility: org.visibility,
					country: org.country,
					city: org.city,
					website: org.website,
					memberCount: org.memberCount,
					status: org.status,
				};
				return res.status(200).json({ success: true, organization: guestProfile, userRole: null });
			}

			return res.status(200).json({
				success: true,
				organization: org,
				userRole: member ? member.roleId : null,
			});
		} catch (error: any) {
			console.error("GET /api/organizations/:id error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// PATCH /api/organizations/:id - Update Organization Profile Settings
	if (req.method === "PATCH") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.manageSettings");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			const {
				displayName,
				shortName,
				description,
				avatar,
				avatarUrl,
				banner,
				bannerUrl,
				visibility,
				website,
				country,
				city,
				location,
				email,
				contactPhone,
				socialLinks,
			} = req.body;

			const updateData: Partial<Organization> = {
				updatedAt: Date.now(),
			};

			if (displayName !== undefined) updateData.displayName = displayName.trim();
			if (shortName !== undefined) updateData.shortName = shortName.trim();
			if (description !== undefined) updateData.description = description.trim();
			if (avatar !== undefined || avatarUrl !== undefined) {
				const canonical = ((avatarUrl !== undefined ? avatarUrl : avatar) || "").trim();
				updateData.avatar = canonical;
				(updateData as any).avatarUrl = canonical;
			}
			if (banner !== undefined || bannerUrl !== undefined) {
				const canonicalBanner = ((bannerUrl !== undefined ? bannerUrl : banner) || "").trim();
				updateData.banner = canonicalBanner;
				(updateData as any).bannerUrl = canonicalBanner;
			}
			if (visibility !== undefined) updateData.visibility = visibility;
			if (website !== undefined) updateData.website = website.trim();
			if (country !== undefined) updateData.country = country.trim();
			if (city !== undefined) updateData.city = city.trim();
			if (location !== undefined) updateData.location = location.trim();
			if (email !== undefined) updateData.email = email.trim();
			if (contactPhone !== undefined) updateData.contactPhone = contactPhone.trim();
			if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

			await db.collection("organizations").doc(org.id).update(updateData);

			// Log action
			await emitOrgEvent(
				org.id,
				uid,
				"organization.settings_updated",
				null,
				"organizations",
				org.id,
				updateData,
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Organization updated successfully" });
		} catch (error: any) {
			console.error("PATCH /api/organizations/:id error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// DELETE /api/organizations/:id - Soft delete organization
	if (req.method === "DELETE") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.deleteOrganization");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			await db.collection("organizations").doc(org.id).update({
				status: "deleted",
				deletedAt: Date.now(),
			});

			await emitOrgEvent(
				org.id,
				uid,
				"organization.deleted",
				null,
				"organizations",
				org.id,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Organization soft-deleted successfully" });
		} catch (error: any) {
			console.error("DELETE /api/organizations/:id error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
