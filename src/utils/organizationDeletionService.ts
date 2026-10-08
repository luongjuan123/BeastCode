import { getAdminFirestore, getAdminStorage } from "@/firebase/firebaseAdmin";
import { getRedisClient } from "@/utils/redis";
import { resolveOrgAndMembership } from "@/utils/orgEngine";

export interface DeletionStats {
	membersDeleted: number;
	problemsDeleted: number;
	contestsDeleted: number;
	chatConversationsDeleted: number;
	chatMessagesDeleted: number;
	announcementsDeleted: number;
	filesDeleted: number;
	assessmentsDeleted: number;
	assignmentsDeleted: number;
	roadmapsDeleted: number;
	teamsDeleted: number;
	jobsDeleted: number;
	applicationsDeleted: number;
	invitationsDeleted: number;
	joinRequestsDeleted: number;
	auditLogsDeleted: number;
	storageFilesDeleted: number;
	redisKeysPurged: number;
	emailQueueTasksPurged: number;
	totalRecordsPurged: number;
}

export interface DeletionResult {
	success: boolean;
	orgId: string;
	orgSlug: string;
	orgName: string;
	deletedAt: number;
	stats: DeletionStats;
	message: string;
}

/**
 * Helper to delete documents returned by a Query in chunked batches (<= 450 ops per batch)
 */
async function batchDeleteQuery(
	db: FirebaseFirestore.Firestore,
	query: FirebaseFirestore.Query
): Promise<number> {
	let totalDeleted = 0;
	const batchSize = 400;

	while (true) {
		const snapshot = await query.limit(batchSize).get();
		if (snapshot.empty) break;

		const batch = db.batch();
		snapshot.docs.forEach((doc) => {
			batch.delete(doc.ref);
		});

		await batch.commit();
		totalDeleted += snapshot.size;

		if (snapshot.size < batchSize) break;
	}

	return totalDeleted;
}

/**
 * Permanently and cascadedly deletes an organization and all its dependent data.
 * Strictly preserves shared global users and their Firebase Auth accounts.
 */
export async function deleteOrganizationPermanently(
	orgIdentifier: string,
	callerUid: string,
	confirmationName?: string,
	isSuperAdmin: boolean = false
): Promise<DeletionResult> {
	const db = getAdminFirestore();

	// 1. Resolve Organization & Validate Authorization
	const { org, member } = await resolveOrgAndMembership(orgIdentifier, callerUid);
	if (!org) {
		throw new Error("Organization not found");
	}

	const isOwner = org.ownerUid === callerUid || member?.roleId === "owner";
	if (!isOwner && !isSuperAdmin) {
		throw new Error("Forbidden: Only the organization owner or a platform Super Admin can permanently delete this organization.");
	}

	// 2. Exact Name or Slug Matching Verification (if confirmationName supplied)
	if (confirmationName !== undefined) {
		const cleanConfirmation = confirmationName.trim().toLowerCase();
		const matchesName = org.name.trim().toLowerCase() === cleanConfirmation;
		const matchesSlug = org.slug.trim().toLowerCase() === cleanConfirmation;
		const matchesDisplayName = (org.displayName || "").trim().toLowerCase() === cleanConfirmation;

		if (!matchesName && !matchesSlug && !matchesDisplayName) {
			throw new Error(`Confirmation mismatch: Please type the exact organization name "${org.name}" or slug "${org.slug}" to confirm deletion.`);
		}
	}

	const orgId = org.id;
	const orgSlug = org.slug;
	const orgName = org.name;
	const now = Date.now();

	const stats: DeletionStats = {
		membersDeleted: 0,
		problemsDeleted: 0,
		contestsDeleted: 0,
		chatConversationsDeleted: 0,
		chatMessagesDeleted: 0,
		announcementsDeleted: 0,
		filesDeleted: 0,
		assessmentsDeleted: 0,
		assignmentsDeleted: 0,
		roadmapsDeleted: 0,
		teamsDeleted: 0,
		jobsDeleted: 0,
		applicationsDeleted: 0,
		invitationsDeleted: 0,
		joinRequestsDeleted: 0,
		auditLogsDeleted: 0,
		storageFilesDeleted: 0,
		redisKeysPurged: 0,
		emailQueueTasksPurged: 0,
		totalRecordsPurged: 0,
	};

	// 3. Purge Dependent Organization Subcollections / Documents
	// Members
	stats.membersDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationMembers").where("organizationId", "==", orgId)
	);

	// Announcements
	stats.announcementsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationAnnouncements").where("organizationId", "==", orgId)
	);

	// Applications & Jobs
	stats.applicationsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationApplications").where("organizationId", "==", orgId)
	);
	stats.jobsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationJobs").where("organizationId", "==", orgId)
	);

	// Assessments & Attempts
	const assessmentsSnap = await db
		.collection("organizationAssessments")
		.where("organizationId", "==", orgId)
		.get();

	for (const assDoc of assessmentsSnap.docs) {
		stats.assessmentsDeleted += await batchDeleteQuery(
			db,
			db.collection("organizationAssessmentAttempts").where("assessmentId", "==", assDoc.id)
		);
	}
	stats.assessmentsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationAssessments").where("organizationId", "==", orgId)
	);

	// Assignments
	stats.assignmentsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationAssignments").where("organizationId", "==", orgId)
	);

	// Audit Logs
	stats.auditLogsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationAuditLogs").where("organizationId", "==", orgId)
	);

	// Certificates
	await batchDeleteQuery(
		db,
		db.collection("organizationCertificates").where("organizationId", "==", orgId)
	);

	// Company Details (doc ID == orgId)
	await db.collection("organizationCompanyDetails").doc(orgId).delete().catch(() => {});

	// Courses, Materials & Gradebook
	const coursesSnap = await db
		.collection("organizationCourses")
		.where("organizationId", "==", orgId)
		.get();
	for (const cDoc of coursesSnap.docs) {
		await batchDeleteQuery(
			db,
			db.collection("organizationCourseMaterials").where("courseId", "==", cDoc.id)
		);
		await batchDeleteQuery(
			db,
			db.collection("organizationGradebook").where("courseId", "==", cDoc.id)
		);
	}
	await batchDeleteQuery(
		db,
		db.collection("organizationCourses").where("organizationId", "==", orgId)
	);

	// Files & Attachments
	stats.filesDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationFiles").where("organizationId", "==", orgId)
	);

	// Interviews
	await batchDeleteQuery(
		db,
		db.collection("organizationInterviews").where("organizationId", "==", orgId)
	);

	// Invitations & Links
	stats.invitationsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationInvitations").where("organizationId", "==", orgId)
	);
	stats.invitationsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationInviteLinks").where("organizationId", "==", orgId)
	);

	// Join Requests
	stats.joinRequestsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationJoinRequests").where("organizationId", "==", orgId)
	);

	// Private Problems
	await batchDeleteQuery(
		db,
		db.collection("organizationPrivateProblems").where("organizationId", "==", orgId)
	);

	// Roadmaps
	stats.roadmapsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationRoadmaps").where("organizationId", "==", orgId)
	);

	// Teams
	stats.teamsDeleted += await batchDeleteQuery(
		db,
		db.collection("organizationTeams").where("organizationId", "==", orgId)
	);

	// Appeals
	await batchDeleteQuery(
		db,
		db.collection("organizationAppeals").where("organizationId", "==", orgId)
	);

	// Org-owned platform Problems
	stats.problemsDeleted += await batchDeleteQuery(
		db,
		db.collection("problems").where("organizationId", "==", orgId)
	);

	// 4. Org Contests & Dependent Contest Sub-entities
	const contestIds: string[] = [];
	const contestsSnap1 = await db.collection("contests").where("organizationId", "==", orgId).get();
	const contestsSnap2 = await db.collection("contests").where("orgId", "==", orgId).get();

	contestsSnap1.docs.forEach((d) => contestIds.push(d.id));
	contestsSnap2.docs.forEach((d) => {
		if (!contestIds.includes(d.id)) contestIds.push(d.id);
	});

	for (const cid of contestIds) {
		// Contest problems
		await batchDeleteQuery(
			db,
			db.collection("contest_problems").where("contestId", "==", cid)
		);
		// Contest participants
		await batchDeleteQuery(
			db,
			db.collection("contest_participants").where("contestId", "==", cid)
		);
		// Contest submissions
		await batchDeleteQuery(
			db,
			db.collection("contest_submissions").where("contestId", "==", cid)
		);
		// Leaderboard
		await db.collection("contest_leaderboard").doc(cid).delete().catch(() => {});
		// Announcements
		await batchDeleteQuery(
			db,
			db.collection("contest_announcements").where("contestId", "==", cid)
		);
		// Clarifications
		await batchDeleteQuery(
			db,
			db.collection("contest_clarifications").where("contestId", "==", cid)
		);
		// Editorial & statistics
		await db.collection("contest_editorial").doc(cid).delete().catch(() => {});
		await db.collection("contest_statistics").doc(cid).delete().catch(() => {});
		// Discussions subcollection
		await batchDeleteQuery(db, db.collection(`contests/${cid}/discussions`));

		// Root contest doc
		await db.collection("contests").doc(cid).delete().catch(() => {});
		stats.contestsDeleted++;
	}

	// 5. Chat Channels & Messages
	const chatChannelsSnap = await db
		.collection("conversations")
		.where("organizationId", "==", orgId)
		.get();

	for (const cDoc of chatChannelsSnap.docs) {
		const msgsDeleted = await batchDeleteQuery(
			db,
			db.collection(`conversations/${cDoc.id}/messages`)
		);
		stats.chatMessagesDeleted += msgsDeleted;
		await cDoc.ref.delete();
		stats.chatConversationsDeleted++;
	}

	// 6. Purge Pending Email Outbox Tasks for this Org
	stats.emailQueueTasksPurged += await batchDeleteQuery(
		db,
		db.collection("emailQueue").where("organizationId", "==", orgId)
	);
	stats.emailQueueTasksPurged += await batchDeleteQuery(
		db,
		db.collection("emailQueue").where("metadata.orgId", "==", orgId)
	);

	// 7. Google Cloud Storage Cleanup (Purge organizations/{orgId}/*)
	try {
		const storage = getAdminStorage();
		if (storage) {
			const bucket = storage.bucket();
			const [files] = await bucket.getFiles({ prefix: `organizations/${orgId}/` });
			if (files && files.length > 0) {
				await Promise.allSettled(files.map((file) => file.delete({ ignoreNotFound: true })));
				stats.storageFilesDeleted = files.length;
			}
		}
	} catch (storageErr) {
		console.warn(`[Org Deletion Storage Warning]: Could not clean bucket folder for ${orgId}:`, storageErr);
	}

	// 8. Org-Scoped Redis Cache Purge (Safe SCAN & DEL, NO FLUSHALL)
	try {
		const redis = getRedisClient();
		if (redis) {
			const keysToDelete = new Set<string>();

			// Scan org-scoped keys
			const orgKeyPatterns = [`org:${orgId}:*`, `org:${orgSlug}:*`];
			for (const cid of contestIds) {
				orgKeyPatterns.push(`standings:${cid}*`);
				orgKeyPatterns.push(`contest:${cid}:*`);
			}

			for (const pattern of orgKeyPatterns) {
				let cursor = "0";
				do {
					const [nextCursor, matchedKeys] = await redis.scan(
						cursor,
						"MATCH",
						pattern,
						"COUNT",
						100
					);
					cursor = nextCursor;
					matchedKeys.forEach((k) => keysToDelete.add(k));
				} while (cursor !== "0");
			}

			if (keysToDelete.size > 0) {
				const keysArr = Array.from(keysToDelete);
				// Delete in chunks of 50
				for (let i = 0; i < keysArr.length; i += 50) {
					await redis.del(...keysArr.slice(i, i + 50));
				}
				stats.redisKeysPurged = keysToDelete.size;
			}
		}
	} catch (redisErr) {
		console.warn(`[Org Deletion Redis Warning]: Redis cleanup failed for ${orgId}:`, redisErr);
	}

	// 9. Root Organization Document Deletion
	await db.collection("organizations").doc(orgId).delete();

	// Calculate total records purged
	stats.totalRecordsPurged =
		stats.membersDeleted +
		stats.problemsDeleted +
		stats.contestsDeleted +
		stats.chatConversationsDeleted +
		stats.chatMessagesDeleted +
		stats.announcementsDeleted +
		stats.filesDeleted +
		stats.assessmentsDeleted +
		stats.assignmentsDeleted +
		stats.roadmapsDeleted +
		stats.teamsDeleted +
		stats.jobsDeleted +
		stats.applicationsDeleted +
		stats.invitationsDeleted +
		stats.joinRequestsDeleted +
		stats.auditLogsDeleted +
		stats.storageFilesDeleted +
		stats.emailQueueTasksPurged +
		1; // Including root org document

	// 10. Audit Record (organizationDeletionAudit)
	const auditRecord = {
		orgId,
		orgSlug,
		orgName,
		deletedByUid: callerUid,
		deletedAt: now,
		stats,
	};

	try {
		await db.collection("organizationDeletionAudit").doc(orgId).set(auditRecord);
	} catch (auditErr) {
		console.error("Failed to write organizationDeletionAudit log:", auditErr);
	}

	return {
		success: true,
		orgId,
		orgSlug,
		orgName,
		deletedAt: now,
		stats,
		message: `Organization "${orgName}" and all associated data permanently deleted.`,
	};
}
