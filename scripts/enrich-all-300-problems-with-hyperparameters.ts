import admin from "firebase-admin";
import { all300ProblemSpecs, getEnrichedProblemFields } from "./specs/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("===================================================================");
	console.log(" BeastCode 300 Problems Hyperparameters & Solver Enrichment Script ");
	console.log(` Target Firestore Project: ${projectId}`);
	console.log(` Total Specifications Defined: ${Object.keys(all300ProblemSpecs).length}`);
	console.log("===================================================================\n");

	const problemIds = Object.keys(all300ProblemSpecs);
	const BATCH_SIZE = 20;
	let updatedCount = 0;
	let skippedCount = 0;
	let missingInDbCount = 0;

	for (let i = 0; i < problemIds.length; i += BATCH_SIZE) {
		const chunk = problemIds.slice(i, i + BATCH_SIZE);
		console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${i + 1} to ${Math.min(i + BATCH_SIZE, problemIds.length)})...`);

		const batch = db.batch();
		let batchOps = 0;

		for (const id of chunk) {
			const docRef = db.collection("problems").doc(id);
			const snap = await docRef.get();

			if (!snap.exists) {
				console.warn(`[WARNING] Problem document '${id}' not found in Firestore!`);
				missingInDbCount++;
				continue;
			}

			const data = snap.data() || {};
			const currentStatement = data.problemStatement || "";
			const currentConstraints = data.constraints || "";

			const enriched = getEnrichedProblemFields(id, currentStatement, currentConstraints);
			if (!enriched) {
				skippedCount++;
				continue;
			}

			if (
				enriched.enrichedStatement !== currentStatement ||
				enriched.enrichedConstraints !== currentConstraints
			) {
				batch.update(docRef, {
					problemStatement: enriched.enrichedStatement,
					constraints: enriched.enrichedConstraints,
					updatedAt: Date.now(),
				});
				batchOps++;
				updatedCount++;
			} else {
				skippedCount++;
			}
		}

		if (batchOps > 0) {
			await batch.commit();
			console.log(`  -> Committed ${batchOps} problem updates.`);
		}
	}

	console.log("\n===================================================================");
	console.log(" Enrichment Complete!");
	console.log(` Updated Problems: ${updatedCount}`);
	console.log(` Already Enriched / Skipped: ${skippedCount}`);
	console.log(` Missing in DB: ${missingInDbCount}`);
	console.log("===================================================================\n");

	// Verification Phase
	console.log("Verifying Firestore database state...");
	const allDocsSnap = await db.collection("problems").get();
	let withBoxCount = 0;
	let withoutBoxCount = 0;

	allDocsSnap.forEach((doc) => {
		const d = doc.data();
		const s = d.problemStatement || "";
		if (
			s.includes("hyperparameter-box") ||
			s.includes("Required Hyperparameters & Solver Configuration") ||
			s.includes("Algorithm Specifications & Parameter Rules")
		) {
			withBoxCount++;
		} else {
			withoutBoxCount++;
		}
	});

	console.log(`Verification: Total problems in DB: ${allDocsSnap.size}`);
	console.log(`Verification: Problems with configuration card: ${withBoxCount}`);
	console.log(`Verification: Problems without configuration card (original base problems): ${withoutBoxCount}`);
}

main().catch((err) => {
	console.error("Fatal error during enrichment:", err);
	process.exit(1);
});
