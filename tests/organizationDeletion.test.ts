import assert from "assert";
import { getAdminFirestore } from "../src/firebase/firebaseAdmin";
import { deleteOrganizationPermanently } from "../src/utils/organizationDeletionService";

console.log("=================================================");
console.log(" RUNNING PERMANENT ORGANIZATION DELETION SUITE");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
	try {
		await fn();
		console.log(`  ✓ PASS: ${name}`);
		passed++;
	} catch (err: any) {
		console.error(`  ✗ FAIL: ${name}`);
		console.error(`    ${err.message}`);
		failed++;
	}
}

async function runTests() {
	const db = getAdminFirestore();
	const now = Date.now();

	const testOrgId = `org-del-test-${now}`;
	const testOrgSlug = `del-test-slug-${now}`;
	const testOrgName = `Test Delete Organization ${now}`;

	const testOwnerUid = `owner-uid-${now}`;
	const testSharedMemberUid = `shared-member-uid-${now}`;
	const testUnauthorizedUid = `unauthorized-uid-${now}`;

	const testContestId = `contest-del-${now}`;
	const testProblemId = `problem-del-${now}`;
	const testChannelId = `channel-del-${now}`;
	const testAnnouncementId = `ann-del-${now}`;
	const testEmailTaskId = `email-del-${now}`;

	console.log("--- 1. Seed Comprehensive Organization Ecosystem ---");
	await test("Seed organization, members, problems, contests, chat, and email tasks", async () => {
		// Global user profiles (Must be preserved after org deletion!)
		await db.collection("users").doc(testOwnerUid).set({
			uid: testOwnerUid,
			email: "owner@test.org",
			displayName: "Org Owner User",
			createdAt: now,
		});

		await db.collection("users").doc(testSharedMemberUid).set({
			uid: testSharedMemberUid,
			email: "shared@test.org",
			displayName: "Multi-Org Solver",
			score: 250,
			solvedCount: 15,
			createdAt: now,
		});

		// Root Organization Document
		await db.collection("organizations").doc(testOrgId).set({
			id: testOrgId,
			name: testOrgName,
			slug: testOrgSlug,
			ownerUid: testOwnerUid,
			status: "active",
			visibility: "public",
			memberCount: 2,
			createdAt: now,
		});

		// Org Memberships
		await db.collection("organizationMembers").doc(`${testOrgId}_${testOwnerUid}`).set({
			organizationId: testOrgId,
			uid: testOwnerUid,
			roleId: "owner",
			status: "active",
			joinedAt: now,
		});

		await db.collection("organizationMembers").doc(`${testOrgId}_${testSharedMemberUid}`).set({
			organizationId: testOrgId,
			uid: testSharedMemberUid,
			roleId: "member",
			status: "active",
			joinedAt: now,
		});

		// Org Announcement
		await db.collection("organizationAnnouncements").doc(testAnnouncementId).set({
			id: testAnnouncementId,
			organizationId: testOrgId,
			title: "Welcome to Test Org",
			content: "Test announcement body",
			createdAt: now,
		});

		// Org Problem
		await db.collection("problems").doc(testProblemId).set({
			id: testProblemId,
			title: "Private Org Algorithm",
			organizationId: testOrgId,
			difficulty: "Medium",
			createdAt: now,
		});

		// Org Contest & Discussion
		await db.collection("contests").doc(testContestId).set({
			id: testContestId,
			title: "Org Championship 2026",
			organizationId: testOrgId,
			status: "scheduled",
			createdAt: now,
		});

		await db.collection(`contests/${testContestId}/discussions`).doc("disc-1").set({
			content: "Discussion about problems",
			uid: testSharedMemberUid,
			createdAt: now,
		});

		// Org Chat Channel & Message
		await db.collection("conversations").doc(testChannelId).set({
			id: testChannelId,
			organizationId: testOrgId,
			type: "organization_channel",
			title: "general",
			createdAt: now,
		});

		await db.collection(`conversations/${testChannelId}/messages`).doc("msg-1").set({
			senderId: testSharedMemberUid,
			content: "Hello team!",
			timestamp: now,
		});

		// Org Email Queue Task
		await db.collection("emailQueue").doc(testEmailTaskId).set({
			id: testEmailTaskId,
			organizationId: testOrgId,
			to: "member@test.org",
			subject: "Org Newsletter",
			status: "pending",
			createdAt: now,
		});
	});

	console.log("\n--- 2. Security & Authorization Validations ---");
	await test("Rejects deletion request from non-owner unauthorized user", async () => {
		try {
			await deleteOrganizationPermanently(testOrgId, testUnauthorizedUid, testOrgName);
			assert.fail("Should have thrown forbidden error");
		} catch (err: any) {
			assert.ok(err.message.includes("Forbidden"), `Expected Forbidden error, got: ${err.message}`);
		}
	});

	await test("Rejects deletion request when confirmation name does not match", async () => {
		try {
			await deleteOrganizationPermanently(testOrgId, testOwnerUid, "Wrong Organization Name");
			assert.fail("Should have thrown name mismatch error");
		} catch (err: any) {
			assert.ok(err.message.includes("Confirmation mismatch"), `Expected mismatch error, got: ${err.message}`);
		}
	});

	console.log("\n--- 3. Execute Deep Cascading Organization Deletion ---");
	await test("Successfully executes cascading purge across all collections", async () => {
		const result = await deleteOrganizationPermanently(testOrgId, testOwnerUid, testOrgName);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.orgId, testOrgId);
		assert.ok(result.stats.membersDeleted >= 2, "Must delete members");
		assert.ok(result.stats.problemsDeleted >= 1, "Must delete problems");
		assert.ok(result.stats.contestsDeleted >= 1, "Must delete contests");
		assert.ok(result.stats.chatConversationsDeleted >= 1, "Must delete chat channel");
		assert.ok(result.stats.chatMessagesDeleted >= 1, "Must delete chat messages");
		assert.ok(result.stats.announcementsDeleted >= 1, "Must delete announcements");
		assert.ok(result.stats.emailQueueTasksPurged >= 1, "Must delete queued email tasks");
	});

	console.log("\n--- 4. Verify Post-Deletion State & User Preservation ---");
	await test("Root organization document is completely erased", async () => {
		const doc = await db.collection("organizations").doc(testOrgId).get();
		assert.strictEqual(doc.exists, false, "Organization doc must not exist");
	});

	await test("Organization subcollections and dependent records are erased", async () => {
		const members = await db.collection("organizationMembers").where("organizationId", "==", testOrgId).get();
		assert.strictEqual(members.size, 0, "No members should remain");

		const problems = await db.collection("problems").where("organizationId", "==", testOrgId).get();
		assert.strictEqual(problems.size, 0, "No org problems should remain");

		const contests = await db.collection("contests").where("organizationId", "==", testOrgId).get();
		assert.strictEqual(contests.size, 0, "No org contests should remain");

		const channels = await db.collection("conversations").where("organizationId", "==", testOrgId).get();
		assert.strictEqual(channels.size, 0, "No chat channels should remain");

		const emails = await db.collection("emailQueue").where("organizationId", "==", testOrgId).get();
		assert.strictEqual(emails.size, 0, "No queued emails should remain");
	});

	await test("CRITICAL: Global user accounts are PRESERVED and untouched", async () => {
		const ownerUser = await db.collection("users").doc(testOwnerUid).get();
		assert.strictEqual(ownerUser.exists, true, "Owner global user account must be preserved");

		const sharedUser = await db.collection("users").doc(testSharedMemberUid).get();
		assert.strictEqual(sharedUser.exists, true, "Shared member global user account must be preserved");
		assert.strictEqual(sharedUser.data()?.score, 250, "Shared member XP score must remain untouched");
	});

	await test("Minimal audit log is written to organizationDeletionAudit", async () => {
		const auditDoc = await db.collection("organizationDeletionAudit").doc(testOrgId).get();
		assert.strictEqual(auditDoc.exists, true, "Audit record must exist");
		const data = auditDoc.data();
		assert.strictEqual(data?.orgId, testOrgId);
		assert.strictEqual(data?.deletedByUid, testOwnerUid);
		assert.ok(data?.stats.totalRecordsPurged > 0, "Total records purged must be positive");
	});

	console.log("\n--- 5. Cleanup Test Users & Audit Doc ---");
	await test("Clean up test fixture user accounts and audit doc", async () => {
		await db.collection("users").doc(testOwnerUid).delete();
		await db.collection("users").doc(testSharedMemberUid).delete();
		await db.collection("organizationDeletionAudit").doc(testOrgId).delete();
	});

	console.log("\n=================================================");
	console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
	console.log("=================================================");

	if (failed > 0) {
		process.exit(1);
	}
}

runTests().catch((err) => {
	console.error("Test execution fatal error:", err);
	process.exit(1);
});
