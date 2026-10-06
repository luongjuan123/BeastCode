import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { EmailService } from "@/utils/emailService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();

	// GET /api/admin/organizations - List organizations with details
	if (req.method === "GET") {
		try {
			const {
				search = "",
				status = "",
				visibility = "",
				sortBy = "createdAt",
				sortOrder = "desc",
				page = "1",
				limit = "50"
			} = req.query;

			const orgsSnap = await db.collection("organizations").get();
			const orgList: any[] = [];

			// Fetch user details map to resolve owners
			const usersSnap = await db.collection("users").get();
			const userMap = new Map<string, any>();
			usersSnap.forEach((doc) => {
				userMap.set(doc.id, doc.data());
			});

			// Fetch warnings count map
			const warningsSnap = await db.collection("organizationWarnings").get();
			const warningCounts = new Map<string, number>();
			warningsSnap.forEach((doc) => {
				const orgId = doc.data().organizationId;
				if (orgId) {
					warningCounts.set(orgId, (warningCounts.get(orgId) || 0) + 1);
				}
			});

			// Fetch reports count map
			const reportsSnap = await db.collection("organizationReports").get();
			const reportCounts = new Map<string, number>();
			reportsSnap.forEach((doc) => {
				const orgId = doc.data().organizationId;
				if (orgId) {
					reportCounts.set(orgId, (reportCounts.get(orgId) || 0) + 1);
				}
			});

			// Fetch active contests map
			const contestsSnap = await db.collection("contests").get();
			const contestCounts = new Map<string, number>();
			contestsSnap.forEach((doc) => {
				const orgId = doc.data().organizationId;
				if (orgId) {
					contestCounts.set(orgId, (contestCounts.get(orgId) || 0) + 1);
				}
			});

			// Fetch private problems count map
			const privateProblemsSnap = await db.collection("organizationPrivateProblems").get();
			const problemCounts = new Map<string, number>();
			privateProblemsSnap.forEach((doc) => {
				const orgId = doc.data().organizationId;
				if (orgId) {
					problemCounts.set(orgId, (problemCounts.get(orgId) || 0) + 1);
				}
			});

			orgsSnap.forEach((doc) => {
				const data = doc.data();
				const orgId = doc.id;
				const ownerData = userMap.get(data.ownerUid) || {};

				// Calculate health score (default 100, drops by reports and warnings)
				const warnings = warningCounts.get(orgId) || 0;
				const reports = reportCounts.get(orgId) || 0;
				const reportsWeight = reports * 5;
				const warningsWeight = warnings * 15;
				const statusPenalties =
					data.status === "suspended" ? 50 : data.status === "restricted" ? 30 : 0;
				const healthScore = Math.max(0, 100 - reportsWeight - warningsWeight - statusPenalties);

				orgList.push({
					id: orgId,
					slug: data.slug || "",
					name: data.name || "",
					displayName: data.displayName || data.name || "Workspace",
					avatar: data.avatar || "",
					banner: data.banner || "",
					ownerUid: data.ownerUid || "",
					ownerUsername: ownerData.username || "Unknown",
					ownerEmail: ownerData.email || "",
					visibility: data.visibility || "public",
					status: data.status || "active",
					memberCount: data.memberCount || 0,
					contestCount: contestCounts.get(orgId) || data.contestCount || 0,
					problemCount: problemCounts.get(orgId) || data.problemCount || 0,
					warningsCount: warnings,
					reportsCount: reports,
					createdAt: data.createdAt || 0,
					lastActive: data.lastActive || data.updatedAt || data.createdAt || 0,
					healthScore,
					restrictedFeatures: data.restrictedFeatures || [],
				});
			});

			// Apply Search
			let filtered = orgList;
			if (search) {
				const q = (search as string).toLowerCase().trim();
				filtered = filtered.filter(
					(o) =>
						o.name.toLowerCase().includes(q) ||
						o.displayName.toLowerCase().includes(q) ||
						o.id.toLowerCase().includes(q) ||
						o.ownerUsername.toLowerCase().includes(q) ||
						o.ownerUid.toLowerCase().includes(q)
				);
			}

			// Apply Filters
			if (status) {
				filtered = filtered.filter((o) => o.status === status);
			}
			if (visibility) {
				filtered = filtered.filter((o) => o.visibility === visibility);
			}

			// Sorting
			const field = (sortBy as string) || "createdAt";
			const dir = (sortOrder as string) || "desc";

			filtered.sort((a, b) => {
				let valA = a[field];
				let valB = b[field];

				if (typeof valA === "string") {
					valA = valA.toLowerCase();
					valB = valB.toLowerCase();
				}

				if (valA < valB) return dir === "asc" ? -1 : 1;
				if (valA > valB) return dir === "asc" ? 1 : -1;
				return 0;
			});

			// Pagination
			const pageNum = parseInt(page as string, 10) || 1;
			const limitNum = parseInt(limit as string, 10) || 50;
			const startIndex = (pageNum - 1) * limitNum;
			const paginated = filtered.slice(startIndex, startIndex + limitNum);

			return res.status(200).json({
				success: true,
				organizations: paginated,
				totalCount: filtered.length,
				page: pageNum,
				totalPages: Math.ceil(filtered.length / limitNum),
			});
		} catch (error: any) {
			console.error("GET admin organizations list error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	// POST /api/admin/organizations - Bulk actions & global announcements
	if (req.method === "POST") {
		try {
			const { action, orgIds, payload } = req.body;

			if (!action || !orgIds || !Array.isArray(orgIds) || orgIds.length === 0) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing parameters" });
			}

			const batch = db.batch();
			const actorUid = req.user?.uid || "system";

			// Get actor details
			const actorDoc = await db.collection("users").doc(actorUid).get();
			const actorData = actorDoc.data() || {};
			const actorName = actorData.displayName || actorData.username || "Platform Admin";

			const resolvedOrgs: any[] = [];
			for (const id of orgIds) {
				const orgDoc = await db.collection("organizations").doc(id).get();
				if (orgDoc.exists) {
					resolvedOrgs.push({ id, ...orgDoc.data() });
				}
			}

			if (action === "warn") {
				const { reason, category, severity, description, expiresDays } = payload;
				for (const org of resolvedOrgs) {
					const warningId = db.collection("organizationWarnings").doc().id;
					const warningObj = {
						warningId,
						organizationId: org.id,
						reason,
						category,
						description,
						evidence: payload.evidence || "",
						moderatorUid: actorUid,
						moderatorUsername: actorName,
						timestamp: Date.now(),
						expiresAt: expiresDays > 0 ? Date.now() + expiresDays * 24 * 60 * 60 * 1000 : null,
						severity,
					};
					batch.set(db.collection("organizationWarnings").doc(warningId), warningObj);

					// Update organization status to warned
					batch.update(db.collection("organizations").doc(org.id), {
						status: "warned",
						updatedAt: Date.now(),
					});

					// Create notification for owner
					if (org.ownerUid) {
						const notifId = db.collection("notifications").doc().id;
						batch.set(db.collection("notifications").doc(notifId), {
							toUid: org.ownerUid,
							fromUid: actorUid,
							fromDisplayName: actorName,
							type: "ORGANIZATION_MODERATION",
							title: "⚠️ Organization Warning Issued",
							body: `Your organization "${org.displayName || org.name}" has received an official warning. Reason: ${reason}.`,
							category: "social",
							priority: "high",
							createdAt: Date.now(),
							read: false,
							ctaText: "Appeal Warning",
							ctaUrl: `/orgs/${org.slug}`,
							metadata: { orgId: org.id, action: "warned", warningId },
						});

						// Email owner
						const ownerDoc = await db.collection("users").doc(org.ownerUid).get();
						const ownerEmail = ownerDoc.data()?.email;
						if (ownerEmail) {
							await EmailService.sendDirectEmail(
								ownerEmail,
								`[Official Notice] Warning Issued for ${org.displayName || org.name}`,
								`<div style="font-family: sans-serif; color: #1f2937; padding: 20px; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 12px;">
									<h2 style="color: #ea580c; margin-top: 0;">Organization Warning Issued</h2>
									<p>Your organization <strong>${org.displayName || org.name}</strong> (@${org.slug}) has been issued an official warning by a platform administrator.</p>
									<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
									<p><strong>Reason:</strong> ${reason}</p>
									<p><strong>Category:</strong> ${category}</p>
									<p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
									<p><strong>Details:</strong> ${description}</p>
									<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
									<p style="font-size: 12px; color: #6b7280;">If you believe this warning was issued in error, you may submit an appeal via your organization dashboard.</p>
								</div>`
							);
						}
					}

					// Audit log
					const auditId = db.collection("organizationAuditLogs").doc().id;
					batch.set(db.collection("organizationAuditLogs").doc(auditId), {
						logId: auditId,
						organizationId: org.id,
						actorUid,
						targetUid: org.ownerUid || null,
						action: "organization.warned",
						resource: "organizations",
						resourceId: org.id,
						metadata: { reason, severity, category },
						timestamp: Date.now(),
					});
				}
			} else if (action === "suspend") {
				const { reason, durationDays } = payload;
				const expiresAt = durationDays > 0 ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null;

				for (const org of resolvedOrgs) {
					batch.update(db.collection("organizations").doc(org.id), {
						status: "suspended",
						suspendedAt: Date.now(),
						suspensionReason: reason,
						suspensionExpiresAt: expiresAt,
						updatedAt: Date.now(),
					});

					// Create notification for owner
					if (org.ownerUid) {
						const notifId = db.collection("notifications").doc().id;
						batch.set(db.collection("notifications").doc(notifId), {
							toUid: org.ownerUid,
							fromUid: actorUid,
							fromDisplayName: actorName,
							type: "ORGANIZATION_MODERATION",
							title: "🚫 Organization Suspended",
							body: `Your organization "${org.displayName || org.name}" has been suspended. Reason: ${reason}.`,
							category: "social",
							priority: "high",
							createdAt: Date.now(),
							read: false,
							ctaText: "Appeal Suspension",
							ctaUrl: `/orgs/${org.slug}`,
							metadata: { orgId: org.id, action: "suspended" },
						});

						// Email Owner
						const ownerDoc = await db.collection("users").doc(org.ownerUid).get();
						const ownerEmail = ownerDoc.data()?.email;
						if (ownerEmail) {
							await EmailService.sendDirectEmail(
								ownerEmail,
								`[CRITICAL NOTICE] Organization Suspended: ${org.displayName || org.name}`,
								`<div style="font-family: sans-serif; color: #1f2937; padding: 20px; max-width: 600px; border: 1px solid #f3f4f6; border-radius: 12px;">
									<h2 style="color: #dc2626; margin-top: 0;">Workspace Suspended</h2>
									<p>We regret to inform you that your organization <strong>${org.displayName || org.name}</strong> has been suspended from the BeastCode platform.</p>
									<p><strong>Reason:</strong> ${reason}</p>
									<p><strong>Duration:</strong> ${durationDays > 0 ? `${durationDays} Days (Expires ${new Date(expiresAt!).toLocaleDateString()})` : "Indefinite"}</p>
									<p style="font-size: 12px; color: #6b7280; margin-top: 20px;">All organization features, private problems, and contests are temporarily offline. You may submit an appeal using the support form.</p>
								</div>`
							);
						}
					}

					// Notify members
					const membersSnap = await db.collection("organizationMembers").where("organizationId", "==", org.id).get();
					membersSnap.forEach((mDoc) => {
						const mUid = mDoc.data().uid;
						if (mUid && mUid !== org.ownerUid) {
							const mNotifId = db.collection("notifications").doc().id;
							batch.set(db.collection("notifications").doc(mNotifId), {
								toUid: mUid,
								fromUid: actorUid,
								fromDisplayName: actorName,
								type: "ORGANIZATION_MODERATION",
								title: "Organization Suspended",
								body: `The organization "${org.displayName || org.name}" you are a member of has been suspended.`,
								category: "social",
								priority: "medium",
								createdAt: Date.now(),
								read: false,
								metadata: { orgId: org.id, action: "suspended" },
							});
						}
					});

					// Audit Log
					const auditId = db.collection("organizationAuditLogs").doc().id;
					batch.set(db.collection("organizationAuditLogs").doc(auditId), {
						logId: auditId,
						organizationId: org.id,
						actorUid,
						targetUid: org.ownerUid || null,
						action: "organization.suspended",
						resource: "organizations",
						resourceId: org.id,
						metadata: { reason, durationDays, expiresAt },
						timestamp: Date.now(),
					});
				}
			} else if (action === "ban") {
				const { reason } = payload;
				for (const org of resolvedOrgs) {
					batch.update(db.collection("organizations").doc(org.id), {
						status: "banned",
						bannedAt: Date.now(),
						banReason: reason,
						updatedAt: Date.now(),
					});

					// Owner notify
					if (org.ownerUid) {
						const notifId = db.collection("notifications").doc().id;
						batch.set(db.collection("notifications").doc(notifId), {
							toUid: org.ownerUid,
							fromUid: actorUid,
							fromDisplayName: actorName,
							type: "ORGANIZATION_MODERATION",
							title: "🚨 Organization Banned",
							body: `Your organization "${org.displayName || org.name}" has been permanently banned from the platform.`,
							category: "social",
							priority: "high",
							createdAt: Date.now(),
							read: false,
							metadata: { orgId: org.id, action: "banned" },
						});

						// Email owner
						const ownerDoc = await db.collection("users").doc(org.ownerUid).get();
						const ownerEmail = ownerDoc.data()?.email;
						if (ownerEmail) {
							await EmailService.sendDirectEmail(
								ownerEmail,
								`[CRITICAL BAN NOTICE] Organization Banned: ${org.displayName || org.name}`,
								`<div style="font-family: sans-serif; color: #1f2937; padding: 20px; max-width: 600px; border: 1px solid #f3f4f6; border-radius: 12px;">
									<h2 style="color: #dc2626; margin-top: 0;">Workspace Permanently Banned</h2>
									<p>This is a formal notification that your organization <strong>${org.displayName || org.name}</strong> has been banned from BeastCode due to policy violations.</p>
									<p><strong>Reason:</strong> ${reason}</p>
								</div>`
							);
						}
					}

					// Notify members
					const membersSnap = await db.collection("organizationMembers").where("organizationId", "==", org.id).get();
					membersSnap.forEach((mDoc) => {
						const mUid = mDoc.data().uid;
						if (mUid && mUid !== org.ownerUid) {
							const mNotifId = db.collection("notifications").doc().id;
							batch.set(db.collection("notifications").doc(mNotifId), {
								toUid: mUid,
								fromUid: actorUid,
								fromDisplayName: actorName,
								type: "ORGANIZATION_MODERATION",
								title: "Organization Banned",
								body: `The organization "${org.displayName || org.name}" has been permanently banned.`,
								category: "social",
								priority: "medium",
								createdAt: Date.now(),
								read: false,
								metadata: { orgId: org.id, action: "banned" },
							});
						}
					});

					// Audit
					const auditId = db.collection("organizationAuditLogs").doc().id;
					batch.set(db.collection("organizationAuditLogs").doc(auditId), {
						logId: auditId,
						organizationId: org.id,
						actorUid,
						targetUid: org.ownerUid || null,
						action: "organization.banned",
						resource: "organizations",
						resourceId: org.id,
						metadata: { reason },
						timestamp: Date.now(),
					});
				}
			} else if (action === "delete" || action === "archive" || action === "restore") {
				const statusMap = { delete: "deleted", archive: "archived", restore: "active" };
				const statusVal = statusMap[action as "delete" | "archive" | "restore"];

				for (const org of resolvedOrgs) {
					batch.update(db.collection("organizations").doc(org.id), {
						status: statusVal,
						updatedAt: Date.now(),
						deletedAt: action === "delete" ? Date.now() : null,
					});

					// Owner notify
					if (org.ownerUid) {
						const notifId = db.collection("notifications").doc().id;
						batch.set(db.collection("notifications").doc(notifId), {
							toUid: org.ownerUid,
							fromUid: actorUid,
							fromDisplayName: actorName,
							type: "ORGANIZATION_MODERATION",
							title: `Organization ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
							body: `Your organization "${org.displayName || org.name}" status has been set to: ${statusVal}.`,
							category: "social",
							priority: "high",
							createdAt: Date.now(),
							read: false,
							metadata: { orgId: org.id, action },
						});
					}

					// Audit
					const auditId = db.collection("organizationAuditLogs").doc().id;
					batch.set(db.collection("organizationAuditLogs").doc(auditId), {
						logId: auditId,
						organizationId: org.id,
						actorUid,
						targetUid: org.ownerUid || null,
						action: `organization.${action}d`,
						resource: "organizations",
						resourceId: org.id,
						metadata: {},
						timestamp: Date.now(),
					});
				}
			} else if (action === "announcement") {
				const { title, content } = payload;
				for (const org of resolvedOrgs) {
					// Add announcement inside the organization
					const annId = db.collection("organizationAnnouncements").doc().id;
					batch.set(db.collection("organizationAnnouncements").doc(annId), {
						id: annId,
						organizationId: org.id,
						title,
						content,
						markdown: content,
						visibility: "all",
						authorUid: actorUid,
						isPinned: true,
						published: true,
						publishedAt: Date.now(),
						createdAt: Date.now(),
					});

					// Update announcement count on organization
					batch.update(db.collection("organizations").doc(org.id), {
						announcementCount: (org.announcementCount || 0) + 1,
						updatedAt: Date.now(),
					});

					// Notify all members
					const membersSnap = await db.collection("organizationMembers").where("organizationId", "==", org.id).get();
					membersSnap.forEach((mDoc) => {
						const mUid = mDoc.data().uid;
						if (mUid) {
							const mNotifId = db.collection("notifications").doc().id;
							batch.set(db.collection("notifications").doc(mNotifId), {
								toUid: mUid,
								fromUid: actorUid,
								fromDisplayName: "Platform Administration",
								type: "ORGANIZATION_EVENT",
								title: `📢 Announcement: ${title}`,
								body: `New administrative announcement for ${org.displayName || org.name}.`,
								category: "social",
								priority: "high",
								createdAt: Date.now(),
								read: false,
								ctaText: "Read Announcement",
								ctaUrl: `/orgs/${org.slug}`,
								metadata: { orgId: org.id, announcementId: annId },
							});
						}
					});
				}
			}

			await batch.commit();
			return res.status(200).json({ success: true, message: `Bulk action "${action}" completed successfully.` });
		} catch (error: any) {
			console.error("POST admin organizations bulk action error:", error);
			return res.status(500).json({ success: false, error: "Internal Server Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAdminGuard(handler));
