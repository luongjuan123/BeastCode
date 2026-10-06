import admin from "firebase-admin";
import { all100MLProblems, validateAllMLProblems } from "./ml-problem-generator/index";
import { formatProblemStatement } from "./ml-problem-generator/utils";
import { getEnrichedProblemFields } from "./specs/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== BeastCode 100 Machine Learning Problems Ingestion ===");
	console.log(`Target Firestore Project: ${projectId}`);

	// 1. Validate all 100 problems
	validateAllMLProblems();
	console.log(`Total ML Problems to Ingest: ${all100MLProblems.length}`);

	const now = Date.now();
	let totalTestCasesGenerated = 0;

	// Ingest in batches of 5 to stay well below network / Firestore batch size thresholds
	const BATCH_SIZE = 5;
	const totalBatches = Math.ceil(all100MLProblems.length / BATCH_SIZE);

	for (let b = 0; b < totalBatches; b++) {
		const startIdx = b * BATCH_SIZE;
		const endIdx = Math.min(startIdx + BATCH_SIZE, all100MLProblems.length);
		const batchSlice = all100MLProblems.slice(startIdx, endIdx);

		const firestoreBatch = db.batch();

		console.log(`\nProcessing Batch ${b + 1}/${totalBatches} (Problems ${startIdx + 1} to ${endIdx})...`);

		for (const def of batchSlice) {
			const testCases = def.generateTestCases();

			if (testCases.length !== 100) {
				throw new Error(
					`Problem '${def.id}' has ${testCases.length} testcases. Exactly 100 are required.`
				);
			}

			const sampleCount = testCases.filter((tc) => tc.isSample).length;
			if (sampleCount < 1) {
				throw new Error(`Problem '${def.id}' must have at least 1 sample testcase.`);
			}

			totalTestCasesGenerated += testCases.length;

			const baseStatement = formatProblemStatement(def.title, def.story, def.task);
			const enriched = getEnrichedProblemFields(def.id, baseStatement, def.constraints);

			const docPayload = {
				id: def.id,
				slug: def.id,
				title: def.title,
				difficulty: def.difficulty,
				category: def.category, // "machine-learning"
				tags: def.tags,
				description: def.description,
				problemStatement: enriched ? enriched.enrichedStatement : baseStatement,
				inputFormat: def.inputFormat,
				outputFormat: def.outputFormat,
				constraints: enriched ? enriched.enrichedConstraints : def.constraints,
				starterCode: "",
				starterFunctionName: "",
				handlerFunction: "",
				language: "all",
				videoId: "",
				link: "",
				moderators: [],
				likes: 0,
				dislikes: 0,
				solved: 0,
				attempts: 0,
				points: def.points,
				customChecker: {
					type: def.customCheckerType || "whitespace",
					epsilon: 0.0001,
					scriptLanguage: "python",
					scriptCode: "",
				},
				editorial: "",
				// Machine Learning specific execution profile & generous limits
				executionProfile: "machine_learning",
				customTimeoutMs: def.customTimeoutMs || 30000,
				customMemoryLimitMb: def.customMemoryLimitMb || 2048,
				customCpuCount: 2,
				customProcessLimit: 100,
				customDiskLimitMb: 1024,
				customMaxOutputSizeChars: 1048576,
				examples: testCases.map((tc) => ({
					id: tc.id,
					inputText: tc.inputText,
					outputText: tc.outputText,
					explanation: tc.explanation || "",
					img: "",
					isSample: tc.isSample,
					isAdditional: tc.isAdditional || false,
					strength: tc.strength || 1,
				})),
				createdAt: now,
				updatedAt: now,
			};

			const docRef = db.collection("problems").doc(def.id);
			firestoreBatch.set(docRef, docPayload, { merge: true });
			console.log(
				`  + [${def.difficulty}] ${def.id} ("${def.title}") -> 100 TCs (${sampleCount} samples, ${docPayload.customTimeoutMs}ms timeout)`
			);
		}

		console.log(`  Writing batch ${b + 1} to Firestore...`);
		let committed = false;
		let attempts = 0;
		while (!committed && attempts < 5) {
			try {
				attempts++;
				await firestoreBatch.commit();
				committed = true;
				console.log(`  Batch ${b + 1} committed successfully.`);
			} catch (commitErr) {
				console.warn(`  Warning: Batch ${b + 1} attempt ${attempts} failed:`, commitErr);
				if (attempts >= 5) throw commitErr;
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}
	}

	console.log("\n=======================================================");
	console.log(`SUCCESS: Ingested 100 Machine Learning Problems into Firestore!`);
	console.log(`Total Test Cases Generated and Stored: ${totalTestCasesGenerated}`);
	console.log("=======================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR in seeding script:", err);
	process.exit(1);
});
