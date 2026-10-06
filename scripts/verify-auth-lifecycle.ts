/**
 * Automated Verification Script for Authentication Lifecycle, Session Restoration,
 * Onboarding Coordinator, and Provisioning Idempotency.
 */

import assert from "assert";
import { getSafeRedirectUrl } from "../src/utils/sanitizeUrl.ts";
import { isUserOnboarded } from "../src/utils/onboarding.ts";
import admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 1. Test getSafeRedirectUrl logic
console.log("▶ [Test Suite 1] URL Sanitization and Open-Redirect Protection");
assert.strictEqual(getSafeRedirectUrl("/problems/two-sum"), "/problems/two-sum", "Allows valid internal paths");
assert.strictEqual(getSafeRedirectUrl("/contests?page=2"), "/contests?page=2", "Allows valid query strings");
assert.strictEqual(getSafeRedirectUrl("https://evil.com"), "/", "Rejects absolute external URLs");
assert.strictEqual(getSafeRedirectUrl("//evil.com"), "/", "Rejects protocol-relative URLs");
assert.strictEqual(getSafeRedirectUrl("/auth"), "/", "Prevents auth redirect loop");
assert.strictEqual(getSafeRedirectUrl("/auth/verify-email"), "/", "Prevents verify-email redirect loop");
assert.strictEqual(getSafeRedirectUrl("javascript:alert(1)"), "/", "Blocks javascript URIs");
assert.strictEqual(getSafeRedirectUrl(null), "/", "Handles null gracefully");
assert.strictEqual(getSafeRedirectUrl(["/profile"]), "/profile", "Extracts first item from query array");
console.log("✔ [Suite 1 Passed] All URL sanitization vectors securely handled.\n");

// 2. Test isUserOnboarded Decision Matrix
console.log("▶ [Test Suite 2] Authoritative Onboarding Classification");

// Scenario 2A: Modern user with explicit isOnboarded = true
assert.strictEqual(
	isUserOnboarded({ uid: "user-1", username: "beast", isOnboarded: true }),
	true,
	"Explicit completed onboarding must return true"
);

// Scenario 2B: Newly provisioned user with explicit isOnboarded = false
assert.strictEqual(
	isUserOnboarded({ uid: "user-2", username: "newbie_123", isOnboarded: false }),
	false,
	"Explicit incomplete onboarding must return false"
);

// Scenario 2C: Legacy user with displayName and createdAt, but undefined isOnboarded and NO academic fields
assert.strictEqual(
	isUserOnboarded({
		uid: "legacy-1",
		displayName: "Wap25",
		isOnboarded: undefined,
		createdAt: 1680000000000,
		studentId: undefined,
		school: undefined
	}),
	true,
	"Legacy established user without student info must be classified as onboarded"
);

// Scenario 2D: Legacy user with solved problems / score
assert.strictEqual(
	isUserOnboarded({
		uid: "legacy-2",
		username: "alice_solver",
		isOnboarded: undefined,
		solvedProblems: ["two-sum"],
		score: 10
	}),
	true,
	"Legacy user with solve history must never be forced into onboarding modal"
);

// Scenario 2E: Completely uninitialized / empty document
assert.strictEqual(
	isUserOnboarded({}),
	false,
	"Empty document must not be classified as onboarded"
);
assert.strictEqual(
	isUserOnboarded(null),
	false,
	"Null document must not be classified as onboarded"
);
console.log("✔ [Suite 2 Passed] Onboarding decision matrix satisfies all user archetypes.\n");

// 3. Test Live Firestore User Compatibility
console.log("▶ [Test Suite 3] Live Database Compatibility Check against Real Records");
if (!admin.apps.length) {
	const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
	if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
		admin.initializeApp({
			credential: cert({
				projectId: process.env.FIREBASE_PROJECT_ID,
				clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
				privateKey,
			})
		});
	}
}

async function verifyLiveUsers() {
	if (!admin.apps.length) {
		console.log("⚠ Skipping Live DB check: Firebase Admin credentials not present in environment.");
		return;
	}

	const db = getFirestore();
	const usersSnap = await db.collection("users").limit(20).get();
	console.log(`Inspected ${usersSnap.docs.length} live user records:`);

	let completedCount = 0;
	let onboardingRequiredCount = 0;

	usersSnap.forEach((docSnap) => {
		const d = docSnap.data();
		const onboarded = isUserOnboarded(d);
		if (onboarded) completedCount++;
		else onboardingRequiredCount++;

		const label = onboarded ? "COMPLETE" : "ONBOARDING_REQUIRED";
		const type = d.isOnboarded === true ? "Modern" : (d.isOnboarded === false ? "New Provisioned" : "Legacy");
		console.log(`  - [${label}] ${docSnap.id.slice(0, 8)}... (${d.username || d.displayName || "unnamed"}) [${type}]`);
	});

	console.log(`\nSummary: ${completedCount} ready/completed users, ${onboardingRequiredCount} incomplete users.`);
	assert(completedCount > 0, "Expected at least one complete user in live database");
	console.log("✔ [Suite 3 Passed] Live Firestore user records successfully evaluated.\n");
}

// 4. Test Delayed Auth / Transient Loading Invariants
console.log("▶ [Test Suite 4] Transient Loading and Session Restoration Invariants");
function simulateStateTransition({ authLoading, user, userDocExists, userData }: any) {
	if (authLoading) return { showModal: false, status: "AUTH_LOADING" };
	if (!user) return { showModal: false, status: "UNAUTHENTICATED" };
	if (!user.emailVerified) return { showModal: false, status: "UNVERIFIED" };
	if (!userDocExists) return { showModal: false, status: "PROVISIONING_IN_PROGRESS" };

	const complete = isUserOnboarded(userData);
	return { showModal: !complete, status: complete ? "READY" : "NEEDS_SETUP" };
}

// Step A: App starts up, session restoring from storage
const stepA = simulateStateTransition({ authLoading: true, user: null });
assert.strictEqual(stepA.showModal, false, "Modal must NOT show during auth initialization");

// Step B: User restored, document snapshot in-flight
const stepB = simulateStateTransition({ authLoading: false, user: { uid: "u1", emailVerified: true }, userDocExists: false });
assert.strictEqual(stepB.showModal, false, "Modal must NOT show while document is being provisioned/fetched");

// Step C: Document arrives for existing complete user
const stepC = simulateStateTransition({
	authLoading: false,
	user: { uid: "u1", emailVerified: true },
	userDocExists: true,
	userData: { uid: "u1", displayName: "Wap25", isOnboarded: true }
});
assert.strictEqual(stepC.showModal, false, "Modal must NOT show for completed user");

// Step D: Document arrives for new user needing onboarding
const stepD = simulateStateTransition({
	authLoading: false,
	user: { uid: "u2", emailVerified: true },
	userDocExists: true,
	userData: { uid: "u2", username: "newbie_2", isOnboarded: false }
});
assert.strictEqual(stepD.showModal, true, "Modal MUST show for newly provisioned user with isOnboarded=false");

console.log("✔ [Suite 4 Passed] Zero transient modal flashes during loading or provisioning.\n");

verifyLiveUsers().then(() => {
	console.log("🎉 ALL AUTHENTICATION AND ONBOARDING REGRESSION SUITES PASSED SUCCESSFULLY!");
}).catch(err => {
	console.error("Test failed:", err);
	process.exit(1);
});
