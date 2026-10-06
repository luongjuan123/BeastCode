import admin from "firebase-admin";
import { all200ModelTrainingProblems } from "./model-training-generator/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== BeastCode 200 Model Training Problems Ingestion ===");
	console.log(`Target Firestore Project: ${projectId}`);
	console.log(`Total Problems to Ingest: ${all200ModelTrainingProblems.length}`);

	if (all200ModelTrainingProblems.length !== 200) {
		throw new Error(`Expected exactly 200 problems, found ${all200ModelTrainingProblems.length}`);
	}

	const now = Date.now();
	let totalTestCasesStored = 0;

	// Ingest in batches of 5 to remain well within Firestore payload limits and handle network retries
	const BATCH_SIZE = 5;
	const totalBatches = Math.ceil(all200ModelTrainingProblems.length / BATCH_SIZE);

	for (let b = 0; b < totalBatches; b++) {
		const startIdx = b * BATCH_SIZE;
		const endIdx = Math.min(startIdx + BATCH_SIZE, all200ModelTrainingProblems.length);
		const batchSlice = all200ModelTrainingProblems.slice(startIdx, endIdx);

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

			totalTestCasesStored += testCases.length;

			const docPayload = {
				id: def.id,
				slug: def.id,
				title: def.title,
				difficulty: def.difficulty,
				category: def.category, // "machine-learning"
				tags: def.tags,
				description: def.description,
				problemStatement: def.story,
				inputFormat: def.inputFormat,
				outputFormat: def.outputFormat,
				constraints: def.constraints,
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
				`  + [${def.difficulty}] ${def.id} ("${def.title}") -> 100 TCs (${sampleCount} samples)`
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
	console.log(`SUCCESS: Ingested 200 Model Training Problems into Firestore!`);
	console.log(`Total Problems: ${all200ModelTrainingProblems.length}`);
	console.log(`Total Test Cases Stored: ${totalTestCasesStored}`);
	console.log("=======================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR in seeding script:", err);
	process.exit(1);
});
