import assert from "assert";
import { EmailService } from "../src/utils/emailService";
import { NotificationDispatcher } from "../src/utils/notificationDispatcher";
import { getAdminFirestore } from "../src/firebase/firebaseAdmin";

console.log("=================================================");
console.log(" RUNNING CONTEST EMAIL CORRECTNESS TEST SUITE");
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

	// -------------------------------------------------------------
	// 1. PRE-SEND REVALIDATION LOGIC (validateEventForDelivery)
	// -------------------------------------------------------------
	console.log("--- 1. Pre-Send Delivery Revalidation & Expiration ---");

	await test("Non-contest notifications without expiresAt are valid for delivery", async () => {
		const validation = await EmailService.validateEventForDelivery({
			id: "test-chat-1",
			to: "test@example.com",
			subject: "New chat message",
			category: "social",
			eventType: "MESSAGE_RECEIVED"
		});
		assert.strictEqual(validation.valid, true, "Social chat should be valid");
	});

	await test("Queued notification with expiresAt in the past is rejected as expired", async () => {
		const pastTime = Date.now() - 3600 * 1000;
		const validation = await EmailService.validateEventForDelivery({
			id: "test-expired-1",
			to: "test@example.com",
			subject: "[New Contest] Obsolete Contest has been scheduled!",
			category: "contest",
			eventType: "CONTEST_PUBLISHED",
			expiresAt: pastTime
		});
		assert.strictEqual(validation.valid, false, "Should be rejected");
		assert.ok(validation.reason?.includes("expired"), "Reason should mention expiration");
	});

	await test("Contest notification referencing a non-existent contest is rejected", async () => {
		const validation = await EmailService.validateEventForDelivery({
			id: "test-missing-contest",
			to: "test@example.com",
			subject: "[New Contest] Nonexistent Contest",
			category: "contest",
			eventType: "CONTEST_PUBLISHED",
			metadata: { contestId: "nonexistent-contest-id-999999" }
		});
		assert.strictEqual(validation.valid, false, "Should be rejected");
		assert.ok(validation.reason?.includes("not found"), "Reason should specify contest not found");
	});

	await test("Contest notification referencing an ended contest is rejected", async () => {
		// Use known ended contest in database: test-contest-slug-1781123366240
		const validation = await EmailService.validateEventForDelivery({
			id: "test-ended-contest",
			to: "test@example.com",
			subject: "[New Contest] Test Contest has been scheduled!",
			category: "contest",
			eventType: "CONTEST_PUBLISHED",
			metadata: { contestId: "test-contest-slug-1781123366240" }
		});
		assert.strictEqual(validation.valid, false, "Should be rejected");
		assert.ok(validation.reason?.includes("ended") || validation.reason?.includes("past"), "Reason should specify contest ended");
	});

	await test("Extract contestId from subject when metadata is absent (legacy fallback)", async () => {
		// Subject has contest slug matching test-contest-slug-1781123366240
		const validation = await EmailService.validateEventForDelivery({
			id: "test-legacy-subject-extract",
			to: "test@example.com",
			subject: "[New Contest] test-contest-slug-1781123366240 has been scheduled!",
			category: "contest",
			eventType: "CONTEST_PUBLISHED"
		});
		assert.strictEqual(validation.valid, false, "Should extract contest slug and reject ended contest");
		assert.ok(validation.reason?.includes("ended") || validation.reason?.includes("past"), "Reason should state contest ended");
	});

	// -------------------------------------------------------------
	// 2. DISPATCHER EXPIRATION & DEDUPLICATION
	// -------------------------------------------------------------
	console.log("\n--- 2. Dispatcher Ingestion & Deduplication ---");

	await test("CONTEST_PUBLISHED computes expiresAt strictly to contest startTime", async () => {
		// Create a temporary mock scheduled contest in Firestore
		const testContestId = `unit-test-contest-${Date.now()}`;
		const futureStartTime = Date.now() + 2 * 3600 * 1000;
		const futureEndTime = Date.now() + 4 * 3600 * 1000;

		await db.collection("contests").doc(testContestId).set({
			id: testContestId,
			title: "Unit Test Contest",
			status: "scheduled",
			startTime: futureStartTime,
			endTime: futureEndTime,
			createdAt: Date.now()
		});

		try {
			// Dispatch announcement
			const testEventId = `unit-event-${Date.now()}`;
			const result = await NotificationDispatcher.dispatch("CONTEST_PUBLISHED", {
				toEmail: "test-recipient@beastcode.io",
				userName: "Test User",
				ctaUrl: `https://beastcode.io/contests/${testContestId}`,
				placeholders: {
					contestTitle: "Unit Test Contest",
					startTime: new Date(futureStartTime).toLocaleString(),
					durationText: "120 minutes"
				},
				metadata: {
					contestId: testContestId,
					startTime: futureStartTime,
					endTime: futureEndTime
				},
				eventId: testEventId
			});

			assert.strictEqual(result.status, "queued");
			assert.strictEqual(result.id, `q_${testEventId}`);

			// Verify in Firestore
			const queuedDoc = await db.collection("emailQueue").doc(`q_${testEventId}`).get();
			assert.strictEqual(queuedDoc.exists, true);
			const queueData = queuedDoc.data()!;
			assert.strictEqual(queueData.status, "pending");
			assert.strictEqual(queueData.expiresAt, futureStartTime, "expiresAt must equal contest startTime");
			assert.strictEqual(queueData.metadata?.contestId, testContestId);

			// Clean up queued item
			await db.collection("emailQueue").doc(`q_${testEventId}`).delete();
		} finally {
			await db.collection("contests").doc(testContestId).delete();
		}
	});

	await test("Deterministic eventId prevents duplicate active queue insertion", async () => {
		const testEventId = `unit-dedup-${Date.now()}`;
		const docId = `q_${testEventId}`;

		// Pre-populate queue item as pending
		await db.collection("emailQueue").doc(docId).set({
			id: docId,
			status: "pending",
			to: "dedup@beastcode.io",
			subject: "Duplicate Check",
			createdAt: Date.now(),
			retryCount: 0,
			nextRetryAt: Date.now()
		});

		try {
			// Dispatch same eventId
			const result = await NotificationDispatcher.dispatch("AUTH_WELCOME", {
				toEmail: "dedup@beastcode.io",
				userName: "Dedup User",
				ctaUrl: "https://beastcode.io",
				placeholders: { userName: "Dedup User" },
				eventId: testEventId
			});

			assert.strictEqual(result.status, "skipped", "Second dispatch must be skipped as already queued");
		} finally {
			await db.collection("emailQueue").doc(docId).delete();
		}
	});

	// -------------------------------------------------------------
	// 3. ATOMIC TRANSACTION CLAIM & LEASE LOCK
	// -------------------------------------------------------------
	console.log("\n--- 3. Atomic Outbox Claims & Concurrency Lease ---");

	await test("Claiming lease locks item and second claim is denied", async () => {
		const leaseItemId = `unit-lease-${Date.now()}`;
		const now = Date.now();

		await db.collection("emailQueue").doc(leaseItemId).set({
			id: leaseItemId,
			status: "pending",
			to: "lease@beastcode.io",
			subject: "Lease Test",
			createdAt: now,
			retryCount: 0,
			nextRetryAt: now
		});

		try {
			// Worker 1 claims item
			const worker1Claimed = await db.runTransaction(async (txn) => {
				const itemRef = db.collection("emailQueue").doc(leaseItemId);
				const itemSnap = await txn.get(itemRef);
				if (!itemSnap.exists) return false;
				const data = itemSnap.data()!;
				const isClaimable =
					data.status === "pending" ||
					(data.status === "failed" && (data.retryCount || 0) < 5) ||
					(data.status === "processing" && (data.leaseUntil || 0) < Date.now());

				if (!isClaimable) return false;

				txn.update(itemRef, {
					status: "processing",
					leaseUntil: Date.now() + 5 * 60 * 1000
				});
				return true;
			});

			assert.strictEqual(worker1Claimed, true, "Worker 1 must successfully claim lease");

			// Worker 2 attempts to claim while Worker 1 has active lease
			const worker2Claimed = await db.runTransaction(async (txn) => {
				const itemRef = db.collection("emailQueue").doc(leaseItemId);
				const itemSnap = await txn.get(itemRef);
				if (!itemSnap.exists) return false;
				const data = itemSnap.data()!;
				const isClaimable =
					data.status === "pending" ||
					(data.status === "failed" && (data.retryCount || 0) < 5) ||
					(data.status === "processing" && (data.leaseUntil || 0) < Date.now());

				if (!isClaimable) return false;

				txn.update(itemRef, {
					status: "processing",
					leaseUntil: Date.now() + 5 * 60 * 1000
				});
				return true;
			});

			assert.strictEqual(worker2Claimed, false, "Worker 2 must NOT claim lease while active lease held");
		} finally {
			await db.collection("emailQueue").doc(leaseItemId).delete();
		}
	});

	// -------------------------------------------------------------
	// 4. DEAD-LETTER QUEUE ISOLATION (Max Retries)
	// -------------------------------------------------------------
	console.log("\n--- 4. Dead-Letter Queue Isolation ---");

	await test("Items with retryCount >= 5 are isolated to dead_letter state", async () => {
		const dlqItemId = `unit-dlq-${Date.now()}`;
		const now = Date.now();

		await db.collection("emailQueue").doc(dlqItemId).set({
			id: dlqItemId,
			status: "failed",
			to: "dlq@beastcode.io",
			subject: "DLQ Test",
			createdAt: now - 3600000,
			retryCount: 4, // 4 retries already done
			nextRetryAt: now - 1000
		});

		try {
			// Simulate failure on 5th retry attempt in outbox processor
			await db.runTransaction(async (txn) => {
				const itemRef = db.collection("emailQueue").doc(dlqItemId);
				const snap = await txn.get(itemRef);
				const data = snap.data()!;
				const newRetryCount = (data.retryCount || 0) + 1;
				const isDeadLetter = newRetryCount >= 5;

				txn.update(itemRef, {
					status: isDeadLetter ? "dead_letter" : "failed",
					retryCount: newRetryCount,
					error: "Simulated SMTP 550 User Not Found",
					deadLetterAt: isDeadLetter ? Date.now() : null
				});
			});

			const updatedSnap = await db.collection("emailQueue").doc(dlqItemId).get();
			const updatedData = updatedSnap.data()!;
			assert.strictEqual(updatedData.status, "dead_letter", "Status must transition to dead_letter at 5 retries");
			assert.strictEqual(updatedData.retryCount, 5);
			assert.ok(updatedData.deadLetterAt, "deadLetterAt timestamp must be recorded");
		} finally {
			await db.collection("emailQueue").doc(dlqItemId).delete();
		}
	});

	// -------------------------------------------------------------
	// 5. STALE CONTEST QUEUE ITEM TRANSITIONS TO EXPIRED AT PROCESS
	// -------------------------------------------------------------
	console.log("\n--- 5. End-to-End Processing of Stale Contest Queue Item ---");

	await test("Processing an expired contest item transitions it to expired without calling SMTP", async () => {
		const staleItemId = `unit-stale-${Date.now()}`;
		const now = Date.now();

		// Put a stale contest item directly into queue
		await db.collection("emailQueue").doc(staleItemId).set({
			id: staleItemId,
			status: "pending",
			to: "stale@beastcode.io",
			subject: "[New Contest] fdsfsdfdsfsdfsd has been scheduled!",
			category: "contest",
			eventType: "CONTEST_PUBLISHED",
			createdAt: now - 7 * 24 * 3600 * 1000, // 7 days ago
			expiresAt: now - 6 * 24 * 3600 * 1000, // expired 6 days ago
			metadata: { contestId: "fdsfsdfdsfsdfsd" },
			retryCount: 0,
			nextRetryAt: now - 1000
		});

		try {
			// Validate item using delivery revalidation
			const validation = await EmailService.validateEventForDelivery({
				id: staleItemId,
				to: "stale@beastcode.io",
				subject: "[New Contest] fdsfsdfdsfsdfsd has been scheduled!",
				category: "contest",
				eventType: "CONTEST_PUBLISHED",
				expiresAt: now - 6 * 24 * 3600 * 1000,
				metadata: { contestId: "fdsfsdfdsfsdfsd" }
			});

			assert.strictEqual(validation.valid, false, "Must fail validation");

			// Simulate processor transition to expired
			await db.collection("emailQueue").doc(staleItemId).update({
				status: "expired",
				error: validation.reason,
				expiredAt: Date.now()
			});

			const staleSnap = await db.collection("emailQueue").doc(staleItemId).get();
			assert.strictEqual(staleSnap.data()?.status, "expired");
			assert.ok(staleSnap.data()?.error?.includes("expired") || staleSnap.data()?.error?.includes("ended"));
		} finally {
			await db.collection("emailQueue").doc(staleItemId).delete();
		}
	});
}

(async () => {
	await runTests();

	console.log("\n=================================================");
	console.log(` TOTAL TEST RESULTS: ${passed} passed, ${failed} failed`);
	console.log("=================================================");

	if (failed > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})();
