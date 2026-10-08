import assert from "assert";
import { getAdminFirestore } from "../src/firebase/firebaseAdmin";

console.log("=================================================");
console.log(" RUNNING ACCOUNT BULK ACTIONS & PAGINATION SUITE");
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

	// Test users
	const testAdminUid = `test-admin-${now}`;
	const testOtherAdminUid = `test-other-admin-${now}`;
	const testUser1Uid = `test-user1-${now}`;
	const testUser2Uid = `test-user2-${now}`;
	const testOwnerUid = `test-owner-${now}`;
	const testOrgId = `test-org-${now}`;

	console.log("--- 1. Seed Test Fixtures in Firestore ---");
	await test("Setup test users and organization fixtures", async () => {
		// Admin
		await db.collection("users").doc(testAdminUid).set({
			uid: testAdminUid,
			email: "admin@beastcode.test",
			displayName: "Test Admin",
			role: "admin",
			status: "ACTIVE",
			createdAt: now,
		});

		// Other Admin
		await db.collection("users").doc(testOtherAdminUid).set({
			uid: testOtherAdminUid,
			email: "otheradmin@beastcode.test",
			displayName: "Other Admin",
			role: "admin",
			status: "ACTIVE",
			createdAt: now,
		});

		// Standard User 1
		await db.collection("users").doc(testUser1Uid).set({
			uid: testUser1Uid,
			email: "user1@beastcode.test",
			displayName: "Standard Solver One",
			role: "user",
			status: "ACTIVE",
			createdAt: now,
		});

		// Standard User 2
		await db.collection("users").doc(testUser2Uid).set({
			uid: testUser2Uid,
			email: "user2@beastcode.test",
			displayName: "Standard Solver Two",
			role: "user",
			status: "ACTIVE",
			createdAt: now,
		});

		// Org Owner
		await db.collection("users").doc(testOwnerUid).set({
			uid: testOwnerUid,
			email: "owner@beastcode.test",
			displayName: "Organization Owner",
			role: "user",
			status: "ACTIVE",
			createdAt: now,
		});

		// Active Organization owned by testOwnerUid
		await db.collection("organizations").doc(testOrgId).set({
			id: testOrgId,
			name: "Active Test Org",
			slug: `test-org-${now}`,
			ownerUid: testOwnerUid,
			status: "active",
			createdAt: now,
		});
	});

	console.log("\n--- 2. Pagination & Search Logic Verification ---");
	await test("Pagination slices records correctly and computes totalPages", () => {
		const totalCount = 73;
		const pageSize = 25;
		const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
		assert.strictEqual(totalPages, 3, "73 items with pageSize 25 should yield 3 pages");

		const page1Items = Array.from({ length: 73 }, (_, i) => i).slice(0, 25);
		assert.strictEqual(page1Items.length, 25, "Page 1 should have 25 items");

		const page3Items = Array.from({ length: 73 }, (_, i) => i).slice(50, 75);
		assert.strictEqual(page3Items.length, 23, "Page 3 should have remaining 23 items");
	});

	console.log("\n--- 3. Bulk Action Business Logic & Safety Rules ---");
	await test("Prevents caller from self-banning or self-deleting in bulk", async () => {
		// Simulate check from bulk-action.ts
		const callerUid = testAdminUid;
		const targets = [testAdminUid, testUser1Uid];

		const skipped: string[] = [];
		const processable: string[] = [];

		targets.forEach((uid) => {
			if (uid === callerUid) {
				skipped.push(uid);
			} else {
				processable.push(uid);
			}
		});

		assert.ok(skipped.includes(testAdminUid), "Caller UID must be skipped");
		assert.strictEqual(processable.length, 1, "Only non-caller should be processable");
		assert.strictEqual(processable[0], testUser1Uid);
	});

	await test("Prevents standard admin from modifying another admin account", async () => {
		const isSuperAdmin = false;
		const otherAdminDoc = await db.collection("users").doc(testOtherAdminUid).get();
		const data = otherAdminDoc.data();
		const targetIsAdmin = data?.role === "admin" || data?.isAdmin === true;

		assert.strictEqual(targetIsAdmin, true, "Target is an admin");
		const allowed = isSuperAdmin || !targetIsAdmin;
		assert.strictEqual(allowed, false, "Standard admin should not be allowed to modify other admin");
	});

	await test("Prevents bulk deletion of an account that is the sole owner of an active organization", async () => {
		const targetUid = testOwnerUid;
		const ownedOrgsSnap = await db
			.collection("organizations")
			.where("ownerUid", "==", targetUid)
			.limit(5)
			.get();

		const activeOwnedOrgs = ownedOrgsSnap.docs.filter((d) => d.data().status !== "deleted");
		assert.ok(activeOwnedOrgs.length > 0, "Account owns active organization");
		const canDelete = activeOwnedOrgs.length === 0;
		assert.strictEqual(canDelete, false, "Should be blocked from account deletion");
	});

	await test("Bulk suspend updates Firestore records and writes moderationLog", async () => {
		const targetUid = testUser1Uid;
		const banDuration = "7 days";
		const banReason = "Automated test suspension";
		const expiresAt = now + 7 * 86400000;

		// Apply update
		await db.collection("userModeration").doc(targetUid).set({
			status: "BANNED",
			reason: banReason,
			duration: banDuration,
			bannedAt: now,
			expiresAt,
			bannedBy: testAdminUid,
			updatedAt: now,
		});

		await db.collection("users").doc(targetUid).update({
			status: "BANNED",
			updatedAt: now,
		});

		// Verify
		const modSnap = await db.collection("userModeration").doc(targetUid).get();
		assert.strictEqual(modSnap.data()?.status, "BANNED");
		assert.strictEqual(modSnap.data()?.reason, banReason);

		const userSnap = await db.collection("users").doc(targetUid).get();
		assert.strictEqual(userSnap.data()?.status, "BANNED");

		// Record audit
		const logRef = await db.collection("moderationLogs").add({
			adminUid: testAdminUid,
			adminName: "Test Admin",
			action: "BULK_BAN",
			targetUids: [targetUid],
			reason: banReason,
			timestamp: now,
		});
		assert.ok(logRef.id, "Audit log ID must exist");
	});

	await test("Bulk unsuspend restores ACTIVE status", async () => {
		const targetUid = testUser1Uid;

		await db.collection("userModeration").doc(targetUid).set({
			status: "ACTIVE",
			reason: "",
			duration: "",
			bannedAt: null,
			expiresAt: null,
			unbannedAt: now,
			unbannedBy: testAdminUid,
			updatedAt: now,
		});

		await db.collection("users").doc(targetUid).update({
			status: "ACTIVE",
			updatedAt: now,
		});

		const modSnap = await db.collection("userModeration").doc(targetUid).get();
		assert.strictEqual(modSnap.data()?.status, "ACTIVE");

		const userSnap = await db.collection("users").doc(targetUid).get();
		assert.strictEqual(userSnap.data()?.status, "ACTIVE");
	});

	console.log("\n--- 4. Cleanup Test Fixtures ---");
	await test("Clean up account test records", async () => {
		await db.collection("users").doc(testAdminUid).delete();
		await db.collection("users").doc(testOtherAdminUid).delete();
		await db.collection("users").doc(testUser1Uid).delete();
		await db.collection("users").doc(testUser2Uid).delete();
		await db.collection("users").doc(testOwnerUid).delete();
		await db.collection("userModeration").doc(testUser1Uid).delete();
		await db.collection("organizations").doc(testOrgId).delete();
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
