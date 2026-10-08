import { getAdminFirestore } from "../src/firebase/firebaseAdmin";

/**
 * Reconcile Stale Email Queue and Contests
 * Usage:
 *   npx tsx scripts/reconcile-stale-email-queue.ts --dry-run
 *   npx tsx scripts/reconcile-stale-email-queue.ts --commit
 */
async function main() {
	const isCommit = process.argv.includes("--commit");
	console.log(`[Reconciler] Running in ${isCommit ? "COMMIT" : "DRY-RUN"} mode...`);

	const db = getAdminFirestore();
	const now = Date.now();

	// 1. Audit and Reconcile Contests with past endTime
	console.log("\n=== Checking Contests for Past End Times ===");
	const contestsSnap = await db.collection("contests").get();
	const staleContests: { id: string; title: string; currentStatus: string; endTime: number }[] = [];

	contestsSnap.forEach((doc) => {
		const data = doc.data();
		const endTime = data.endTime;
		const status = String(data.status || "").toLowerCase();
		if (endTime && endTime < now && status !== "ended" && status !== "archived") {
			staleContests.push({
				id: doc.id,
				title: data.title || "Untitled",
				currentStatus: status,
				endTime
			});
		}
	});

	console.log(`Found ${staleContests.length} contest(s) past endTime that are not ended:`);
	for (const sc of staleContests) {
		console.log(` - Contest ${sc.id} ("${sc.title}"): status="${sc.currentStatus}", endTime=${new Date(sc.endTime).toISOString()}`);
		if (isCommit) {
			await db.collection("contests").doc(sc.id).update({
				status: "ended",
				reconciledAt: now,
				reconcileReason: "AUTO_RECONCILE_PAST_END_TIME"
			});
			console.log(`   --> Updated to status="ended"`);
		}
	}

	// 2. Audit and Reconcile Email Queue
	console.log("\n=== Checking emailQueue for Stale / Corrupted Jobs ===");
	const queueSnap = await db.collection("emailQueue").get();
	console.log(`Total queue documents scanned: ${queueSnap.size}`);

	const updates: {
		id: string;
		targetStatus: "expired" | "dead_letter";
		reason: string;
		currentStatus: string;
		subject: string;
		createdAt: number;
	}[] = [];

	queueSnap.forEach((doc) => {
		const data = doc.data();
		const status = data.status;
		if (status === "sent" || status === "expired" || status === "dead_letter" || status === "cancelled") {
			return; // already terminal
		}

		const subject = data.subject || "";
		const createdAt = data.createdAt || 0;
		const isContestEmail =
			subject.toLowerCase().includes("contest") ||
			data.category === "contest" ||
			data.metadata?.contestId ||
			String(data.template || "").includes("contest");

		// Case A: Ancient contest email (> 24 hours old or contest ended)
		if (isContestEmail) {
			const ageHours = (now - createdAt) / (1000 * 60 * 60);
			if (ageHours > 24 || status === "failed" || status === "processing") {
				updates.push({
					id: doc.id,
					targetStatus: "expired",
					reason: `Historical contest email from ${new Date(createdAt).toISOString()} (${Math.round(ageHours)}h old). Marked expired to prevent stale contest broadcast.`,
					currentStatus: status,
					subject,
					createdAt
				});
				return;
			}
		}

		// Case B: Stuck in processing for more than 2 hours
		if (status === "processing") {
			const ageHours = (now - createdAt) / (1000 * 60 * 60);
			if (ageHours > 2) {
				updates.push({
					id: doc.id,
					targetStatus: "dead_letter",
					reason: `Job stuck in processing state since ${new Date(createdAt).toISOString()} (${Math.round(ageHours)}h old). Moved to dead_letter.`,
					currentStatus: status,
					subject,
					createdAt
				});
				return;
			}
		}

		// Case C: Ancient failed jobs (> 48 hours old)
		if (status === "failed") {
			const ageHours = (now - createdAt) / (1000 * 60 * 60);
			if (ageHours > 48) {
				updates.push({
					id: doc.id,
					targetStatus: "dead_letter",
					reason: `Permanent failure abandoned since ${new Date(createdAt).toISOString()} (${Math.round(ageHours)}h old). Moved to dead_letter.`,
					currentStatus: status,
					subject,
					createdAt
				});
				return;
			}
		}
	});

	console.log(`Identified ${updates.length} queue item(s) to reconcile:`);
	for (const u of updates) {
		console.log(` - Doc [${u.id}] (Status: ${u.currentStatus} -> ${u.targetStatus})`);
		console.log(`   Subject: "${u.subject}" | Created: ${new Date(u.createdAt).toISOString()}`);
		console.log(`   Reason: ${u.reason}`);

		if (isCommit) {
			await db.collection("emailQueue").doc(u.id).update({
				status: u.targetStatus,
				error: u.reason,
				reconciledAt: now,
				reconcileReason: "OUTBOX_RECONCILIATION_RUN"
			});
			console.log(`   --> Updated doc [${u.id}] successfully.`);
		}
	}

	if (!isCommit) {
		console.log("\n[DRY RUN COMPLETE] No records were modified. Run with --commit to execute updates.");
	} else {
		console.log("\n[COMMIT COMPLETE] All identified records have been safely transitioned to terminal states.");
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Reconciliation failed:", err);
		process.exit(1);
	});
