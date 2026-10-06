import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	// GET /api/admin/organizations/appeals - List appeals
	if (req.method === "GET") {
		try {
			const appealsSnap = await db.collection("organizationAppeals").get();
			const list: any[] = [];

			// Fetch user details map to resolve owners
			const usersSnap = await db.collection("users").get();
			const userMap = new Map<string, any>();
			usersSnap.forEach((doc) => {
				userMap.set(doc.id, doc.data());
			});

			// Fetch org details map
			const orgsSnap = await db.collection("organizations").get();
			const orgMap = new Map<string, any>();
			orgsSnap.forEach((doc) => {
				orgMap.set(doc.id, doc.data());
			});

			appealsSnap.forEach((doc) => {
				const data = doc.data();
				const owner = userMap.get(data.ownerUid) || {};
				const org = orgMap.get(data.organizationId) || {};

				list.push({
					id: doc.id,
					organizationId: data.organizationId || "",
					organizationName: org.displayName || org.name || "Workspace",
					organizationSlug: org.slug || "",
					ownerUid: data.ownerUid || "",
					ownerUsername: owner.username || "Owner",
					reason: data.reason || "",
					evidence: data.evidence || "",
					attachments: data.attachments || [],
					contactEmail: data.contactEmail || "",
					status: data.status || "Pending",
					createdAt: data.createdAt || 0,
					resolvedBy: data.resolvedBy || null,
					resolvedAt: data.resolvedAt || null,
					moderatorNotes: data.moderatorNotes || "",
				});
			});

			// Sort by createdAt desc
			list.sort((a, b) => b.createdAt - a.createdAt);

			return res.status(200).json({ success: true, appeals: list });
		} catch (error: any) {
			console.error("GET admin organization appeals error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	// POST /api/admin/organizations/appeals - Process appeal (Approve, Reject, Close)
	if (req.method === "POST") {
		try {
			const { appealId, status, moderatorNotes } = req.body;

			if (!appealId || !status) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
			}

			const appealRef = db.collection("organizationAppeals").doc(appealId);
			const appealSnap = await appealRef.get();
			if (!appealSnap.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Appeal not found" });
			}

			const appealData = appealSnap.data() || {};
			const orgId = appealData.organizationId;
			const actorUid = req.user?.uid || "admin";

			// Get actor details
			const actorDoc = await db.collection("users").doc(actorUid).get();
			const actorData = actorDoc.data() || {};
			const actorName = actorData.displayName || actorData.username || "Platform Admin";

			const batch = db.batch();

			batch.update(appealRef, {
				status,
				resolvedBy: actorUid,
				resolvedAt: Date.now(),
				moderatorNotes: moderatorNotes || "",
			});

			// If appeal is approved, restore organization status to active
			if (status === "Approved" && orgId) {
				batch.update(db.collection("organizations").doc(orgId), {
					status: "active",
					updatedAt: Date.now(),
				});

				// Audit log for restoration
				const auditId = db.collection("organizationAuditLogs").doc().id;
				batch.set(db.collection("organizationAuditLogs").doc(auditId), {
					logId: auditId,
					organizationId: orgId,
					actorUid,
					targetUid: appealData.ownerUid || null,
					action: "organization.restored_via_appeal",
					resource: "organizations",
					resourceId: orgId,
					metadata: { appealId },
					timestamp: Date.now(),
				});

				// Owner notification
				if (appealData.ownerUid) {
					const notifId = db.collection("notifications").doc().id;
					batch.set(db.collection("notifications").doc(notifId), {
						toUid: appealData.ownerUid,
						fromUid: actorUid,
						fromDisplayName: actorName,
						type: "ORGANIZATION_MODERATION",
						title: "🎉 Appeal Approved & Restored",
						body: `Your appeal for organization workspace has been approved. The organization status is now active.`,
						category: "social",
						priority: "high",
						createdAt: Date.now(),
						read: false,
						metadata: { orgId, action: "restored" }
					});

					// Email owner
					const ownerDoc = await db.collection("users").doc(appealData.ownerUid).get();
					const ownerEmail = ownerDoc.data()?.email;
					if (ownerEmail) {
						await EmailService.sendDirectEmail(
							ownerEmail,
							`[Update] Organization Appeal Approved!`,
							`<p>Hello,</p>
							<p>We are pleased to inform you that your appeal has been approved. Your organization workspace is now fully restored and active.</p>
							<p><strong>Moderator Notes:</strong> ${moderatorNotes || "No notes provided."}</p>`
						);
					}
				}
			} else if (status === "Rejected" && orgId) {
				// Owner notification for rejection
				if (appealData.ownerUid) {
					const notifId = db.collection("notifications").doc().id;
					batch.set(db.collection("notifications").doc(notifId), {
						toUid: appealData.ownerUid,
						fromUid: actorUid,
						fromDisplayName: actorName,
						type: "ORGANIZATION_MODERATION",
						title: "❌ Appeal Rejected",
						body: `Your appeal for organization workspace has been rejected.`,
						category: "social",
						priority: "high",
						createdAt: Date.now(),
						read: false,
						metadata: { orgId, action: "appeal_rejected" }
					});

					// Email owner
					const ownerDoc = await db.collection("users").doc(appealData.ownerUid).get();
					const ownerEmail = ownerDoc.data()?.email;
					if (ownerEmail) {
						await EmailService.sendDirectEmail(
							ownerEmail,
							`[Update] Organization Appeal Rejected`,
							`<p>Hello,</p>
							<p>We regret to inform you that your appeal has been rejected. The restriction or ban remains in place.</p>
							<p><strong>Moderator Notes:</strong> ${moderatorNotes || "No notes provided."}</p>`
						);
					}
				}
			}

			await batch.commit();
			return res.status(200).json({ success: true, message: `Appeal marked as ${status} successfully.` });
		} catch (error: any) {
			console.error("POST resolve organization appeal error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAdminGuard(handler));
