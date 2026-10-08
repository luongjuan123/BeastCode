import assert from "assert";
import {
	isEligibleRankingUser,
	formatRankingUser,
	isTestAccount,
	DEFAULT_USER_STATS,
} from "../../src/utils/rankingEligibility";
import { EXPERIENCE_CONFIG } from "../../src/utils/experienceConfig";

console.log("=================================================");
console.log(" RUNNING RANKINGS CORRECTNESS TEST SUITE");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
	try {
		fn();
		console.log(`  ✓ PASS: ${name}`);
		passed++;
	} catch (err: any) {
		console.error(`  ✗ FAIL: ${name}`);
		console.error(`    ${err.message}`);
		failed++;
	}
}

// -----------------------------------------------------------------
// 1. SCORING ARITHMETIC VERIFICATION
// -----------------------------------------------------------------
console.log("--- 1. Scoring Arithmetic & Weights ---");

test("Score weights match official specification (Easy=1, Medium=3, Hard=7)", () => {
	assert.strictEqual(EXPERIENCE_CONFIG.weights.easy, 1, "Easy problem must award 1 pt");
	assert.strictEqual(EXPERIENCE_CONFIG.weights.medium, 3, "Medium problem must award 3 pts");
	assert.strictEqual(EXPERIENCE_CONFIG.weights.hard, 7, "Hard problem must award 7 pts");
});

test("Nihao123 score computation is exact: 95E, 354M, 63H -> 1598 pts", () => {
	const easy = 95;
	const medium = 354;
	const hard = 63;
	const computedScore =
		easy * EXPERIENCE_CONFIG.weights.easy +
		medium * EXPERIENCE_CONFIG.weights.medium +
		hard * EXPERIENCE_CONFIG.weights.hard;
	assert.strictEqual(computedScore, 1598, "Score must strictly equal 1598 pts");
});

test("Nguyễn Lê Minh score computation: 1E, 3M, 0H -> 10 pts", () => {
	const easy = 1;
	const medium = 3;
	const hard = 0;
	const computedScore =
		easy * EXPERIENCE_CONFIG.weights.easy +
		medium * EXPERIENCE_CONFIG.weights.medium +
		hard * EXPERIENCE_CONFIG.weights.hard;
	assert.strictEqual(computedScore, 10, "Score must equal 10 pts");
});

test("Zero-problem member score computation: 0E, 0M, 0H -> 0 pts", () => {
	const easy = 0;
	const medium = 0;
	const hard = 0;
	const computedScore =
		easy * EXPERIENCE_CONFIG.weights.easy +
		medium * EXPERIENCE_CONFIG.weights.medium +
		hard * EXPERIENCE_CONFIG.weights.hard;
	assert.strictEqual(computedScore, 0, "Score must equal 0 pts");
});

// -----------------------------------------------------------------
// 2. ELIGIBILITY FILTERING RULES
// -----------------------------------------------------------------
console.log("\n--- 2. Eligibility Filtering Rules ---");

test("Real member with 0 score and 0 solves is ELIGIBLE", () => {
	const user = {
		uid: "real_member_0_solve",
		displayName: "Alice",
		email: "alice@example.com",
		score: 0,
		easyCount: 0,
		mediumCount: 0,
		hardCount: 0,
		status: "ACTIVE",
		isTest: false,
	};
	assert.strictEqual(isEligibleRankingUser(user), true, "Active 0-score user must be eligible");
});

test("Real member with undefined score is ELIGIBLE (defaults to 0)", () => {
	const user = {
		uid: "real_member_legacy",
		displayName: "Bob",
		email: "bob@example.com",
		status: "ACTIVE",
	};
	assert.strictEqual(isEligibleRankingUser(user), true, "Active user without score field must be eligible");
});

test("Automated test fixture with isTest = true is INELIGIBLE", () => {
	const user = {
		uid: "fixture_1",
		displayName: "Test Bot",
		email: "bot@example.com",
		isTest: true,
		score: 100,
	};
	assert.strictEqual(isEligibleRankingUser(user), false, "isTest: true must be ineligible");
});

test("Automated test fixture matching QA patterns is INELIGIBLE", () => {
	const fixtureNames = [
		"QA_AUTOMATED_USER_123",
		"qa_staff_test",
		"qa_user_42",
		"auto_tester",
		"e2e_fixture_user",
	];
	for (const name of fixtureNames) {
		assert.strictEqual(
			isTestAccount({ uid: "u_" + name, displayName: name }),
			true,
			`Display name '${name}' must be flagged as test account`
		);
		assert.strictEqual(
			isEligibleRankingUser({ uid: "u_" + name, displayName: name }),
			false,
			`Fixture '${name}' must not be eligible for rankings`
		);
	}
});

test("Banned and suspended users are INELIGIBLE", () => {
	const bannedUser = {
		uid: "banned_user",
		displayName: "Cheater",
		status: "BANNED",
		score: 9999,
	};
	assert.strictEqual(isEligibleRankingUser(bannedUser), false, "Banned user must be ineligible");

	const suspendedUser = {
		uid: "suspended_user",
		displayName: "Suspended",
		status: "SUSPENDED",
		score: 500,
	};
	assert.strictEqual(isEligibleRankingUser(suspendedUser), false, "Suspended user must be ineligible");

	const deletedUser = {
		uid: "deleted_user",
		displayName: "Ghost",
		status: "PENDING_DELETION",
		score: 200,
	};
	assert.strictEqual(isEligibleRankingUser(deletedUser), false, "Pending deletion user must be ineligible");
});

// -----------------------------------------------------------------
// 3. USER DATA FORMATTING AND DEFAULTS
// -----------------------------------------------------------------
console.log("\n--- 3. User Data Formatting and Defaults ---");

test("formatRankingUser safely provides default values for missing fields", () => {
	const rawDoc = {
		uid: "newbie_uid",
		displayName: "New Developer",
	};
	const formatted = formatRankingUser(rawDoc);

	assert.strictEqual(formatted.uid, "newbie_uid");
	assert.strictEqual(formatted.displayName, "New Developer");
	assert.strictEqual(formatted.score, DEFAULT_USER_STATS.score);
	assert.strictEqual(formatted.xp, DEFAULT_USER_STATS.xp);
	assert.strictEqual(formatted.easyCount, 0);
	assert.strictEqual(formatted.mediumCount, 0);
	assert.strictEqual(formatted.hardCount, 0);
	assert.strictEqual(formatted.rating, DEFAULT_USER_STATS.rating);
	assert.strictEqual(formatted.contestRating, DEFAULT_USER_STATS.contestRating);
	assert.strictEqual(formatted.country, "");
	assert.strictEqual(formatted.school, "");
});

// -----------------------------------------------------------------
// 4. PAGINATION CALCULATIONS & RANGE DISPLAY
// -----------------------------------------------------------------
console.log("\n--- 4. Pagination Calculations & Range Display ---");

function computePaginationRange(totalItems: number, currentPage: number, pageSize: number, itemsOnPage: number) {
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const startItem = totalItems === 0 || itemsOnPage === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const endItem = totalItems === 0 || itemsOnPage === 0 ? 0 : (currentPage - 1) * pageSize + itemsOnPage;
	const text = `Showing ${startItem} to ${endItem} of ${totalItems.toLocaleString()} members`;
	return { totalPages, startItem, endItem, text };
}

test("Pagination: 237 members, page size 100", () => {
	const pageSize = 100;
	const totalItems = 237;

	// Page 1
	const p1 = computePaginationRange(totalItems, 1, pageSize, 100);
	assert.strictEqual(p1.totalPages, 3);
	assert.strictEqual(p1.startItem, 1);
	assert.strictEqual(p1.endItem, 100);
	assert.strictEqual(p1.text, "Showing 1 to 100 of 237 members");

	// Page 2
	const p2 = computePaginationRange(totalItems, 2, pageSize, 100);
	assert.strictEqual(p2.startItem, 101);
	assert.strictEqual(p2.endItem, 200);
	assert.strictEqual(p2.text, "Showing 101 to 200 of 237 members");

	// Page 3
	const p3 = computePaginationRange(totalItems, 3, pageSize, 37);
	assert.strictEqual(p3.startItem, 201);
	assert.strictEqual(p3.endItem, 237);
	assert.strictEqual(p3.text, "Showing 201 to 237 of 237 members");
});

test("Pagination: 13 members (current live dataset), page size 50", () => {
	const pageSize = 50;
	const totalItems = 13;

	const p1 = computePaginationRange(totalItems, 1, pageSize, 13);
	assert.strictEqual(p1.totalPages, 1);
	assert.strictEqual(p1.startItem, 1);
	assert.strictEqual(p1.endItem, 13);
	assert.strictEqual(p1.text, "Showing 1 to 13 of 13 members");
});

test("Pagination: 0 members (empty state / no search matches)", () => {
	const pageSize = 50;
	const totalItems = 0;

	const p1 = computePaginationRange(totalItems, 1, pageSize, 0);
	assert.strictEqual(p1.totalPages, 1);
	assert.strictEqual(p1.startItem, 0);
	assert.strictEqual(p1.endItem, 0);
	assert.strictEqual(p1.text, "Showing 0 to 0 of 0 members");
});

test("Pagination: 1 member edge case", () => {
	const pageSize = 50;
	const totalItems = 1;

	const p1 = computePaginationRange(totalItems, 1, pageSize, 1);
	assert.strictEqual(p1.totalPages, 1);
	assert.strictEqual(p1.startItem, 1);
	assert.strictEqual(p1.endItem, 1);
	assert.strictEqual(p1.text, "Showing 1 to 1 of 1 members");
});

test("Pagination: exact multiple of page size (100 members, pageSize 50)", () => {
	const pageSize = 50;
	const totalItems = 100;

	const p1 = computePaginationRange(totalItems, 1, pageSize, 50);
	assert.strictEqual(p1.totalPages, 2);
	assert.strictEqual(p1.startItem, 1);
	assert.strictEqual(p1.endItem, 50);

	const p2 = computePaginationRange(totalItems, 2, pageSize, 50);
	assert.strictEqual(p2.startItem, 51);
	assert.strictEqual(p2.endItem, 100);
	assert.strictEqual(p2.text, "Showing 51 to 100 of 100 members");
});

// -----------------------------------------------------------------
// 5. LIVE FIRESTORE INTEGRATION VERIFICATION (WHEN CONFIGURED)
// -----------------------------------------------------------------
async function runLiveIntegrationTests() {
	console.log("\n--- 5. Live Database Integration Verification ---");
	try {
		const fs = await import("fs");
		if (!fs.existsSync(".env.local")) {
			console.log("  ℹ Skipping live tests (.env.local not found)");
			return;
		}

		const admin = (await import("firebase-admin")).default;
		const envContent = fs.readFileSync(".env.local", "utf8");
		envContent.split("\n").forEach((line) => {
			const parts = line.split("=");
			if (parts.length >= 2) {
				const key = parts[0].trim();
				let val = parts.slice(1).join("=").trim();
				if (val.startsWith('"') && val.endsWith('"')) {
					val = val.substring(1, val.length - 1);
				}
				process.env[key] = val;
			}
		});

		const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
		if (!admin.apps.length) {
			admin.initializeApp({
				projectId: process.env.FIREBASE_PROJECT_ID || "beastcode-7555e",
				credential: admin.credential.cert({
					projectId: process.env.FIREBASE_PROJECT_ID || "beastcode-7555e",
					clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
					privateKey: privateKey,
				}),
			});
		}

		const db = admin.firestore();

		// Check 1: Exactly 45 total user documents in Firestore
		const totalDocsSnap = await db.collection("users").count().get();
		const totalDocsCount = totalDocsSnap.data().count;
		test(`Database contains 45 total user documents (total: ${totalDocsCount})`, () => {
			assert.strictEqual(totalDocsCount, 45, "Firestore users collection must contain 45 total docs");
		});

		// Check 2: Exactly 13 eligible members with isTest == false
		const eligibleDocsSnap = await db.collection("users").where("isTest", "==", false).count().get();
		const eligibleDocsCount = eligibleDocsSnap.data().count;
		test(`Database contains exactly 13 eligible members (eligible: ${eligibleDocsCount})`, () => {
			assert.strictEqual(eligibleDocsCount, 13, "Eligible ranking members must be exactly 13");
		});

		// Check 3: Exactly 32 test fixtures excluded with isTest == true
		const testDocsSnap = await db.collection("users").where("isTest", "==", true).count().get();
		const testDocsCount = testDocsSnap.data().count;
		test(`Database isolates 32 automated test fixtures (test fixtures: ${testDocsCount})`, () => {
			assert.strictEqual(testDocsCount, 32, "Test fixtures must be exactly 32");
			assert.strictEqual(eligibleDocsCount + testDocsCount, totalDocsCount, "13 + 32 must equal 45");
		});

		// Check 4: Nihao123 authoritative stats in database
		const nihaoSnap = await db.collection("users").doc("3hjg3gM59OZsDOhL5u2NDkEhP812").get();
		test("Nihao123 authoritative data in Firestore has 95E, 354M, 63H -> 1598 pts", () => {
			assert.ok(nihaoSnap.exists, "Nihao123 document must exist");
			const d = nihaoSnap.data()!;
			assert.strictEqual(d.easyCount, 95, "Nihao123 easyCount must be 95");
			assert.strictEqual(d.mediumCount, 354, "Nihao123 mediumCount must be 354");
			assert.strictEqual(d.hardCount, 63, "Nihao123 hardCount must be 63");
			assert.strictEqual(d.score, 1598, "Nihao123 score must be 1598");
			assert.strictEqual(d.isTest, false, "Nihao123 isTest must be false");
		});

		// Check 5: Leaderboard API handler returns exactly 13 members
		const handler = (await import("../../src/pages/api/leaderboard")).default;
		let mockResData: any = null;
		const mockRes: any = {
			statusCode: 200,
			status(code: number) { this.statusCode = code; return this; },
			json(data: any) { mockResData = data; return this; },
		};
		await handler({ method: "GET", query: {}, body: {} } as any, mockRes);

		test("Leaderboard API returns totalItems: 13, users: 13, page 1 of 1", () => {
			assert.strictEqual(mockResData?.totalItems, 13, "totalItems must be 13");
			assert.strictEqual(mockResData?.totalPages, 1, "totalPages must be 1");
			assert.strictEqual(mockResData?.users?.length, 13, "Returned users length must be 13");
			assert.strictEqual(mockResData?.users[0]?.displayName, "Nihao123", "Rank 1 must be Nihao123");
			assert.strictEqual(mockResData?.users[0]?.score, 1598, "Rank 1 score must be 1598");
		});
	} catch (err: any) {
		console.error("  ✗ Live integration tests encountered an unexpected error:", err.message);
		failed++;
	}
}

// -----------------------------------------------------------------
// RUNNER & SUMMARY
// -----------------------------------------------------------------
(async () => {
	await runLiveIntegrationTests();

	console.log("\n=================================================");
	console.log(` TOTAL TEST RESULTS: ${passed} passed, ${failed} failed`);
	console.log("=================================================");

	if (failed > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})();
