import admin from "firebase-admin";
import { allStoryProblems, validateProblemDefinitions } from "./problem-generator/index";
import { formatProblemStatement } from "./problem-generator/utils";
import { getEnrichedProblemFields } from "./specs/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== BeastCode 100 Story Problems Generator & Ingestion ===");
	console.log(`Target Firestore Project: ${projectId}`);

	// 1. Validation of definitions
	validateProblemDefinitions(allStoryProblems);
	console.log(`Total Problems to Process: ${allStoryProblems.length}`);

	const now = Date.now();
	let totalTestCasesGenerated = 0;

	// Process and prepare documents in batches of 5
	const BATCH_SIZE = 5;
	const totalBatches = Math.ceil(allStoryProblems.length / BATCH_SIZE);

	for (let b = 0; b < totalBatches; b++) {
		const startIdx = b * BATCH_SIZE;
		const endIdx = Math.min(startIdx + BATCH_SIZE, allStoryProblems.length);
		const batchSlice = allStoryProblems.slice(startIdx, endIdx);

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
				category: def.category,
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
					type: def.customCheckerType || "exact",
					epsilon: 0.000001,
					scriptLanguage: "python",
					scriptCode: "",
				},
				editorial: "",
				executionProfile: "normal",
				customTimeoutMs: 5000,
				customMemoryLimitMb: 256,
				customCpuCount: 1,
				customProcessLimit: 10,
				customDiskLimitMb: 50,
				customMaxOutputSizeChars: 65536,
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
				`  + [${def.difficulty}] ${def.id} ("${def.title}") -> 100 TCs (${sampleCount} samples)`
			);
		}

		console.log(`  Writing batch ${b + 1} to Firestore...`);
		let committed = false;
		let attempts = 0;
		while (!committed && attempts < 3) {
			try {
				attempts++;
				await firestoreBatch.commit();
				committed = true;
				console.log(`  Batch ${b + 1} committed successfully.`);
			} catch (commitErr) {
				console.warn(`  Warning: Batch ${b + 1} attempt ${attempts} failed:`, commitErr);
				if (attempts >= 3) throw commitErr;
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}
	}

	console.log("\n=======================================================");
	console.log(`SUCCESS: Ingested 100 Story Problems into Firestore!`);
	console.log(`Total Test Cases Generated and Stored: ${totalTestCasesGenerated}`);
	console.log("=======================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR in seeding script:", err);
	process.exit(1);
});
