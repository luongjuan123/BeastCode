import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";
import { buildAbsoluteUrl } from "@/utils/siteConfig";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		const { orgId, action, payload } = req.body;

		if (!orgId || !action) {
			return res.status(400).json({ success: false, error: "Validation Error: Missing orgId or action" });
		}

		const orgRef = db.collection("organizations").doc(orgId);
		const orgSnap = await orgRef.get();
		if (!orgSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		const org = orgSnap.data() || {};
		const actorUid = req.user?.uid || "system";

		// Fetch actor details
		const actorDoc = await db.collection("users").doc(actorUid).get();
		const actorData = actorDoc.data() || {};
		const actorName = actorData.displayName || actorData.username || "Platform Admin";

		const batch = db.batch();
		const now = Date.now();

		if (action === "restrict_features") {
			const { restrictedFeatures } = payload; // Array of strings (e.g. recruitment, contests, etc.)
			batch.update(orgRef, {
				restrictedFeatures: restrictedFeatures || [],
				updatedAt: now,
			});

			// Notify owner
			if (org.ownerUid) {
				const notifId = db.collection("notifications").doc().id;
				batch.set(db.collection("notifications").doc(notifId), {
					toUid: org.ownerUid,
					fromUid: actorUid,
					fromDisplayName: actorName,
					type: "ORGANIZATION_MODERATION",
					title: "Features Restricted",
					body: `Features for "${org.displayName || org.name}" have been updated. Restricted: ${restrictedFeatures.join(", ") || "None"}`,
					category: "social",
					priority: "high",
					createdAt: now,
					read: false,
					ctaText: "View Dashboard",
					ctaUrl: `/orgs/${org.slug}`,
					metadata: { orgId, action: "restricted" }
				});
			}

			// Audit log
			const auditId = db.collection("organizationAuditLogs").doc().id;
			batch.set(db.collection("organizationAuditLogs").doc(auditId), {
				logId: auditId,
				organizationId: orgId,
				actorUid,
				targetUid: org.ownerUid || null,
				action: "organization.features_restricted",
				resource: "organizations",
				resourceId: orgId,
				metadata: { restrictedFeatures },
				timestamp: now,
			});

		} else if (action === "transfer_ownership") {
			const { newOwnerUid } = payload;
			if (!newOwnerUid) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing newOwnerUid" });
			}

			const targetUserDoc = await db.collection("users").doc(newOwnerUid).get();
			if (!targetUserDoc.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Target user not found" });
			}

			const oldOwnerUid = org.ownerUid;

			// Update organization document
			batch.update(orgRef, {
				ownerUid: newOwnerUid,
				updatedAt: now,
			});

			// Update membership roles for old owner and new owner
			const newOwnerMemberRef = db.collection("organizationMembers").doc(`${orgId}_${newOwnerUid}`);
			const oldOwnerMemberRef = db.collection("organizationMembers").doc(`${orgId}_${oldOwnerUid}`);

			batch.set(newOwnerMemberRef, {
				organizationId: orgId,
				uid: newOwnerUid,
				roleId: "owner",
				status: "active",
				joinedAt: now,
				lastActive: now,
			}, { merge: true });

			batch.set(oldOwnerMemberRef, {
				organizationId: orgId,
				uid: oldOwnerUid,
				roleId: "member", // demote old owner to standard member
				status: "active",
				joinedAt: now,
				lastActive: now,
			}, { merge: true });

			// Notify old owner
			if (oldOwnerUid) {
				const notifId = db.collection("notifications").doc().id;
				batch.set(db.collection("notifications").doc(notifId), {
					toUid: oldOwnerUid,
					fromUid: actorUid,
					fromDisplayName: actorName,
					type: "ORGANIZATION_EVENT",
					title: "Ownership Transferred",
					body: `Ownership of "${org.displayName || org.name}" has been transferred to @${targetUserDoc.data()?.username || "user"}.`,
					category: "social",
					priority: "high",
					createdAt: now,
					read: false,
					metadata: { orgId, action: "ownership_transferred" }
				});
			}

			// Notify new owner
			const notifId = db.collection("notifications").doc().id;
			batch.set(db.collection("notifications").doc(notifId), {
				toUid: newOwnerUid,
				fromUid: actorUid,
				fromDisplayName: actorName,
				type: "ORGANIZATION_EVENT",
				title: "You are now Owner!",
				body: `Ownership of "${org.displayName || org.name}" has been transferred to you.`,
				category: "social",
				priority: "high",
				createdAt: now,
				read: false,
				ctaText: "Open Workspace",
				ctaUrl: `/orgs/${org.slug}`,
				metadata: { orgId, action: "ownership_transferred" }
			});

			// Email new owner
			const newOwnerEmail = targetUserDoc.data()?.email;
			if (newOwnerEmail) {
				await EmailService.sendDirectEmail(
					newOwnerEmail,
					`Ownership Transferred: ${org.displayName || org.name}`,
					`<p>Hello,</p>
					<p>You have been assigned as the new owner of the workspace <strong>${org.displayName || org.name}</strong> on BeastCode.</p>
					<p>Log in to manage your organization: <a href="${buildAbsoluteUrl(`/orgs/${org.slug}`)}">Workspace Settings</a>.</p>`
				);
			}

			// Audit log
			const auditId = db.collection("organizationAuditLogs").doc().id;
			batch.set(db.collection("organizationAuditLogs").doc(auditId), {
				logId: auditId,
				organizationId: orgId,
				actorUid,
				targetUid: newOwnerUid,
				action: "organization.ownership_transferred",
				resource: "organizations",
				resourceId: orgId,
				metadata: { oldOwnerUid, newOwnerUid },
				timestamp: now,
			});

		} else if (action === "freeze" || action === "unfreeze") {
			const statusVal = action === "freeze" ? "frozen" : "active";
			batch.update(orgRef, {
				status: statusVal,
				updatedAt: now,
			});

			// Owner notify
			if (org.ownerUid) {
				const notifId = db.collection("notifications").doc().id;
				batch.set(db.collection("notifications").doc(notifId), {
					toUid: org.ownerUid,
					fromUid: actorUid,
					fromDisplayName: actorName,
					type: "ORGANIZATION_MODERATION",
					title: `Workspace ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
					body: `Your organization "${org.displayName || org.name}" has been ${action}d.`,
					category: "social",
					priority: "high",
					createdAt: now,
					read: false,
					metadata: { orgId, action }
				});
			}

			// Audit log
			const auditId = db.collection("organizationAuditLogs").doc().id;
			batch.set(db.collection("organizationAuditLogs").doc(auditId), {
				logId: auditId,
				organizationId: orgId,
				actorUid,
				targetUid: org.ownerUid || null,
				action: `organization.${action}d`,
				resource: "organizations",
				resourceId: orgId,
				metadata: {},
				timestamp: now,
			});

		} else if (action === "permanent_delete") {
			// Super admin protection check
			if (req.user?.role !== "super_admin") {
				return res.status(403).json({ success: false, error: "Forbidden: Only Super Admins can permanently delete organizations." });
			}

			// Permanently delete organization document and membership relations
			batch.delete(orgRef);

			// Delete members
			const membersSnap = await db.collection("organizationMembers").where("organizationId", "==", orgId).get();
			membersSnap.forEach((mDoc) => {
				batch.delete(mDoc.ref);
			});

			// Audit log
			const auditId = db.collection("organizationAuditLogs").doc().id;
			batch.set(db.collection("organizationAuditLogs").doc(auditId), {
				logId: auditId,
				organizationId: orgId,
				actorUid,
				targetUid: org.ownerUid || null,
				action: "organization.permanently_deleted",
				resource: "organizations",
				resourceId: orgId,
				metadata: { originalName: org.name },
				timestamp: now,
			});
		}

		await batch.commit();
		return res.status(200).json({ success: true, message: `Moderation action "${action}" completed successfully.` });
	} catch (error: any) {
		console.error("POST admin organizations moderation error:", error);
		return res.status(500).json({ success: false, error: "Internal Server Error" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
