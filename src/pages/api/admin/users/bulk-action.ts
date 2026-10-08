import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { randomUUID } from "crypto";

interface BulkActionRequest {
	action: "ban" | "unban" | "change_role" | "force_logout" | "delete";
	uids: string[];
	payload?: {
		reason?: string;
		duration?: "1 day" | "7 days" | "30 days" | "Permanent";
		newRole?: "admin" | "user";
		notes?: string;
		forceImmediate?: boolean;
	};
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const adminUser = req.user;
	if (!adminUser || !adminUser.uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	const { action, uids, payload = {} } = req.body as BulkActionRequest;

	if (!action || !Array.isArray(uids) || uids.length === 0) {
		return res.status(400).json({
			success: false,
			error: "Validation Error: action and a non-empty uids array are required",
		});
	}

	if (uids.length > 200) {
		return res.status(400).json({
			success: false,
			error: "Validation Error: Maximum 200 accounts can be processed per bulk request",
		});
	}

	const isSuperAdmin = adminUser.role === "super_admin";
	const reason = payload.reason?.trim() || "Bulk administrative action";
	const duration = payload.duration || "7 days";
	const notes = payload.notes?.trim() || "";

	if (action === "ban" && duration === "Permanent" && !isSuperAdmin) {
		return res.status(403).json({
			success: false,
			error: "Access Denied: Only Super Admins may issue permanent bans in bulk",
		});
	}

	if (action === "change_role" && payload.newRole === "admin" && !isSuperAdmin) {
		return res.status(403).json({
			success: false,
			error: "Access Denied: Only Super Admins can grant administrator privileges",
		});
	}

	const db = getAdminFirestore();
	const auth = getAdminAuth();
	const now = Date.now();

	const succeeded: string[] = [];
	const failed: Array<{ uid: string; reason: string }> = [];
	const skipped: Array<{ uid: string; reason: string }> = [];

	// Fetch actor admin display name
	let adminName = "Platform Admin";
	try {
		const adminDoc = await db.collection("users").doc(adminUser.uid).get();
		if (adminDoc.exists) {
			const adData = adminDoc.data();
			adminName = adData?.displayName || adData?.username || adData?.email || "Platform Admin";
		}
	} catch (e) {
		// Non-fatal fallback
	}

	// Calculate ban expiry if banning
	let banExpiresAt: number | null = null;
	if (action === "ban" && duration !== "Permanent") {
		if (duration === "1 day") banExpiresAt = now + 24 * 60 * 60 * 1000;
		else if (duration === "7 days") banExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
		else if (duration === "30 days") banExpiresAt = now + 30 * 24 * 60 * 60 * 1000;
	}

	for (const targetUid of uids) {
		if (typeof targetUid !== "string" || !targetUid.trim()) {
			continue;
		}

		const cleanUid = targetUid.trim();

		// 1. Guard against self-destructive actions
		if (cleanUid === adminUser.uid) {
			skipped.push({
				uid: cleanUid,
				reason: "You cannot perform destructive or role actions on your own account in bulk",
			});
			continue;
		}

		try {
			// Fetch target user data
			const userDoc = await db.collection("users").doc(cleanUid).get();
			const userData = userDoc.exists ? userDoc.data() : null;

			// Check if target is an admin
			const targetIsAdmin =
				userData?.role === "admin" ||
				userData?.isAdmin === true ||
				userData?.role === "super_admin";

			// 2. Standard admins cannot modify other admins
			if (targetIsAdmin && !isSuperAdmin) {
				skipped.push({
					uid: cleanUid,
					reason: "Standard admins cannot modify or delete other administrator accounts",
				});
				continue;
			}

			// 3. For account deletion, protect sole organization owners
			if (action === "delete") {
				const ownedOrgsSnap = await db
					.collection("organizations")
					.where("ownerUid", "==", cleanUid)
					.limit(5)
					.get();

				const activeOwnedOrgs = ownedOrgsSnap.docs.filter((d) => d.data().status !== "deleted");
				if (activeOwnedOrgs.length > 0) {
					skipped.push({
						uid: cleanUid,
						reason: `Account is the owner of active organization "${activeOwnedOrgs[0].data().name || activeOwnedOrgs[0].id}". Transfer ownership or delete the organization first.`,
					});
					continue;
				}
			}

			// Execute Action
			if (action === "ban") {
				// Firebase Auth disable
				try {
					await auth.updateUser(cleanUid, { disabled: true });
					await auth.revokeRefreshTokens(cleanUid);
				} catch (authErr: any) {
					// User may only exist in Firestore or error ignored if user deleted in Auth
				}

				const caseId = `CASE-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`;

				await db.collection("userModeration").doc(cleanUid).set(
					{
						status: "BANNED",
						reason,
						duration,
						notes,
						bannedAt: now,
						expiresAt: banExpiresAt,
						bannedBy: adminUser.uid,
						caseId,
						updatedAt: now,
					},
					{ merge: true }
				);

				if (userDoc.exists) {
					await db.collection("users").doc(cleanUid).update({
						status: "BANNED",
						updatedAt: now,
					});
				}

				succeeded.push(cleanUid);

			} else if (action === "unban") {
				try {
					await auth.updateUser(cleanUid, { disabled: false });
				} catch (authErr: any) {
					// Non-fatal
				}

				await db.collection("userModeration").doc(cleanUid).set(
					{
						status: "ACTIVE",
						reason: "",
						duration: "",
						notes,
						bannedAt: null,
						expiresAt: null,
						unbannedAt: now,
						unbannedBy: adminUser.uid,
						updatedAt: now,
					},
					{ merge: true }
				);

				if (userDoc.exists) {
					await db.collection("users").doc(cleanUid).update({
						status: "ACTIVE",
						updatedAt: now,
					});
				}

				succeeded.push(cleanUid);

			} else if (action === "change_role") {
				const newRole = payload.newRole;
				if (newRole !== "admin" && newRole !== "user") {
					failed.push({ uid: cleanUid, reason: "Invalid role specified" });
					continue;
				}

				const isAdminClaim = newRole === "admin";
				try {
					await auth.setCustomUserClaims(cleanUid, { admin: isAdminClaim });
					await auth.revokeRefreshTokens(cleanUid);
				} catch (e: any) {
					// Non-fatal
				}

				if (userDoc.exists) {
					await db.collection("users").doc(cleanUid).update({
						role: newRole,
						isAdmin: isAdminClaim,
						updatedAt: now,
					});
				}

				if (isAdminClaim) {
					await db.collection("platformAdmins").doc(cleanUid).set({
						active: true,
						email: userData?.email || "",
						role: "admin",
						createdAt: now,
						promotedBy: adminUser.uid,
					});
				} else {
					await db.collection("platformAdmins").doc(cleanUid).delete().catch(() => {});
				}

				succeeded.push(cleanUid);

			} else if (action === "force_logout") {
				try {
					await auth.revokeRefreshTokens(cleanUid);
				} catch (authErr) {
					// Non-fatal
				}

				// Terminate active sessions in Firestore
				await db.collection("sessions").doc(cleanUid).delete().catch(() => {});
				succeeded.push(cleanUid);

			} else if (action === "delete") {
				const forceImmediate = isSuperAdmin && payload.forceImmediate === true;

				if (forceImmediate) {
					// Super Admin permanent purge
					try {
						await auth.deleteUser(cleanUid);
					} catch (authErr: any) {
						if (authErr.code !== "auth/user-not-found") {
							console.warn(`[Bulk Delete Auth]: ${authErr.message}`);
						}
					}

					const batch = db.batch();
					const uidCollections = [
						"users",
						"profiles",
						"settings",
						"statistics",
						"solvedProblems",
						"contestHistory",
						"threads",
						"notifications",
						"notificationSettings",
						"security",
						"sessions",
						"organizationMembership",
						"achievements",
						"bookmarks",
						"preferences",
						"theme",
						"language",
						"privacy",
						"userModeration",
					];

					uidCollections.forEach((colName) => {
						batch.delete(db.collection(colName).doc(cleanUid));
					});

					// Strip user from organization memberships
					const orgMemberships = await db
						.collection("organizationMembers")
						.where("uid", "==", cleanUid)
						.get();
					orgMemberships.docs.forEach((d) => batch.delete(d.ref));

					await batch.commit();
				} else {
					// 14-day deletion hold staging
					const deleteAfter = now + 14 * 24 * 60 * 60 * 1000;
					const caseId = `CASE-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`;

					await db.collection("userModeration").doc(cleanUid).set(
						{
							status: "PENDING_DELETION",
							reason,
							notes,
							deleteAfter,
							appealDeadline: now + 7 * 24 * 60 * 60 * 1000,
							scheduledBy: adminUser.uid,
							caseId,
							updatedAt: now,
						},
						{ merge: true }
					);

					if (userDoc.exists) {
						await db.collection("users").doc(cleanUid).update({
							status: "PENDING_DELETION",
							deleteAfter,
							updatedAt: now,
						});
					}

					try {
						await auth.updateUser(cleanUid, { disabled: true });
						await auth.revokeRefreshTokens(cleanUid);
					} catch (e) {}
				}

				succeeded.push(cleanUid);
			}
		} catch (itemError: any) {
			console.error(`Bulk action error on UID ${cleanUid}:`, itemError);
			failed.push({ uid: cleanUid, reason: itemError.message || "Execution error" });
		}
	}

	// 4. Audit Log
	try {
		await db.collection("moderationLogs").add({
			adminUid: adminUser.uid,
			adminName,
			action: `BULK_${action.toUpperCase()}`,
			targetUids: succeeded,
			totalRequested: uids.length,
			succeededCount: succeeded.length,
			failedCount: failed.length,
			skippedCount: skipped.length,
			reason,
			notes,
			timestamp: now,
		});
	} catch (auditErr) {
		console.error("Failed to write moderation audit log:", auditErr);
	}

	return res.status(200).json({
		success: true,
		action,
		processedCount: succeeded.length,
		succeeded,
		failed,
		skipped,
	});
}

export default withApiErrorHandler(withAdminGuard(handler));
