import admin from "firebase-admin";
import { allLinearRegressionProblems, validateAllLRProblems } from "../linear-regression-generator/index";
import { formatProblemStatement as formatLRStatement } from "../linear-regression-generator/utils";
import { all100MLProblems, validateAllMLProblems } from "../ml-problem-generator/index";
import { formatProblemStatement as formatMLStatement } from "../ml-problem-generator/utils";
import { linearRegressionGDProblems } from "../model-training-generator/categories/linearRegressionGD";
import { regularizedRegressionProblems } from "../model-training-generator/categories/regularizedRegression";
import { logisticRegressionProblems } from "../model-training-generator/categories/logisticRegression";
import { allStoryProblems } from "../problem-generator/index";
import { formatProblemStatement as formatStoryStatement } from "../problem-generator/utils";
import { getEnrichedProblemFields } from "../specs/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

// Combination generator for the-kings-elite-squad
function generateCombinationsTestCases() {
	function solveCombinations(n: number, k: number): string {
		const result: string[] = [];
		const current: number[] = [];
		function backtrack(start: number) {
			if (current.length === k) {
				result.push(current.join(""));
				return;
			}
			const remain = k - current.length;
			for (let i = start; i <= n - remain + 1; i++) {
				current.push(i);
				backtrack(i + 1);
				current.pop();
			}
		}
		backtrack(1);
		return result.join("\n");
	}

	const pairs: [number, number][] = [];

	// Pair 1: Sample 1: 5 3
	pairs.push([5, 3]);
	// Pair 2: Sample 2: 4 2
	pairs.push([4, 2]);

	// Pairs for n from 1 to 13
	for (let n = 1; n <= 13; n++) {
		for (let k = 1; k <= n; k++) {
			if ((n === 5 && k === 3) || (n === 4 && k === 2)) continue;
			pairs.push([n, k]);
		}
	}

	// Extra pairs up to n=14/15 with small combination sizes to guarantee <= 1716 lines per tc
	const extraPairs: [number, number][] = [
		[14, 1],
		[14, 2],
		[14, 3],
		[14, 11],
		[14, 12],
		[14, 13],
		[14, 14],
		[15, 1],
		[15, 2],
		[15, 14],
		[15, 15],
	];

	for (const p of extraPairs) {
		if (pairs.length < 100) {
			pairs.push(p);
		}
	}

	const finalPairs = pairs.slice(0, 100);

	return finalPairs.map(([n, k], idx) => {
		const isSample = idx < 2;
		const input = `${n} ${k}`;
		const output = solveCombinations(n, k);
		return {
			id: idx + 1,
			inputText: input,
			outputText: output,
			explanation: isSample ? `All combinations of ${k} knights out of ${n}.` : "",
			img: "",
			isSample,
			isAdditional: false,
			strength: 1,
		};
	});
}

async function updateProblemSafely(
	problemId: string,
	updateData: Record<string, any>
) {
	const docRef = db.collection("problems").doc(problemId);
	const existingDoc = await docRef.get();
	const existingData = existingDoc.exists ? existingDoc.data()! : {};

	const payload = {
		...existingData,
		...updateData,
		updatedAt: Date.now(),
	};

	await docRef.set(payload, { merge: true });
}

async function main() {
	console.log("=================================================================");
	console.log("=== BEASTCODE PROBLEM BANK: FIRESTORE SYNCHRONIZATION & REPAIR ===");
	console.log(`=== Target Project: ${projectId} ===`);
	console.log("=================================================================\n");

	const skipLR = process.env.SKIP_LR === "1";
	if (skipLR) {
		console.log("--> Step 1: Skipping 100 Linear Regression Problems (already synced in previous run).");
	} else {
		// 1. Sync all 100 Linear Regression Problems
		console.log("--> Step 1: Syncing 100 Linear Regression Problems...");
		validateAllLRProblems();
		for (const def of allLinearRegressionProblems) {
			const testCases = def.generateTestCases();
			if (testCases.length !== 100) throw new Error(`${def.id} testcases !== 100`);
			const baseStatement = formatLRStatement(def.title, def.story, def.task);
			const enriched = getEnrichedProblemFields(def.id, baseStatement, def.constraints);

			await updateProblemSafely(def.id, {
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
				points: def.points,
				customChecker: {
					type: def.customCheckerType || "whitespace",
					epsilon: 0.0001,
					scriptLanguage: "python",
					scriptCode: "",
				},
				executionProfile: "machine_learning",
				customTimeoutMs: def.customTimeoutMs || 30000,
				customMemoryLimitMb: def.customMemoryLimitMb || 2048,
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
			});
		}
		console.log("   [✓] 100 Linear Regression problems synced successfully.");
	}

	// 2. Sync repaired ML Problems
	console.log("\n--> Step 2: Syncing Repaired ML Problems (alexandria-term-frequency-tf-idf, adaboost-sample-weight-update)...");
	validateAllMLProblems();
	const targetMLIds = ["alexandria-term-frequency-tf-idf", "adaboost-sample-weight-update"];
	for (const def of all100MLProblems) {
		if (!targetMLIds.includes(def.id)) continue;
		const testCases = def.generateTestCases();
		const baseStatement = formatMLStatement(def.title, def.story, def.task);
		const enriched = getEnrichedProblemFields(def.id, baseStatement, def.constraints);

		await updateProblemSafely(def.id, {
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
			points: def.points,
			customChecker: {
				type: def.customCheckerType || "whitespace",
				epsilon: 0.0001,
				scriptLanguage: "python",
				scriptCode: "",
			},
			executionProfile: "machine_learning",
			customTimeoutMs: def.customTimeoutMs || 30000,
			customMemoryLimitMb: def.customMemoryLimitMb || 2048,
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
		});
		console.log(`   [✓] ML Problem synced: ${def.id}`);
	}

	// 3. Sync repaired Model Training Problems (60 problems affected by convergence check ordering)
	console.log("\n--> Step 3: Syncing Repaired Model Training Problems (linearRegressionGD, regularizedRegression, logisticRegression)...");
	const affectedProblems = [
		...linearRegressionGDProblems,
		...regularizedRegressionProblems,
		...logisticRegressionProblems,
	];
	let syncedModelTrainingCount = 0;
	for (const def of affectedProblems) {
		const testCases = def.generateTestCases();
		await updateProblemSafely(def.id, {
			id: def.id,
			slug: def.id,
			title: def.title,
			difficulty: def.difficulty,
			category: def.category,
			tags: def.tags,
			description: def.description,
			problemStatement: def.story,
			inputFormat: def.inputFormat,
			outputFormat: def.outputFormat,
			constraints: def.constraints,
			points: def.points,
			customChecker: {
				type: def.customCheckerType || "whitespace",
				epsilon: 0.0001,
				scriptLanguage: "python",
				scriptCode: "",
			},
			executionProfile: "machine_learning",
			customTimeoutMs: def.customTimeoutMs || 30000,
			customMemoryLimitMb: def.customMemoryLimitMb || 2048,
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
		});
		syncedModelTrainingCount++;
	}
	console.log(`   [✓] ${syncedModelTrainingCount} Model Training problems synced.`);

	// 4. Sync repaired Story Problem (the-ancient-cipher-of-karnak)
	console.log("\n--> Step 4: Syncing Repaired Story Problem (the-ancient-cipher-of-karnak)...");
	const karnakDef = allStoryProblems.find((p) => p.id === "the-ancient-cipher-of-karnak");
	if (karnakDef) {
		const testCases = karnakDef.generateTestCases();
		const baseStatement = formatStoryStatement(karnakDef.title, karnakDef.story, karnakDef.task);
		const enriched = getEnrichedProblemFields(karnakDef.id, baseStatement, karnakDef.constraints);

		await updateProblemSafely(karnakDef.id, {
			id: karnakDef.id,
			slug: karnakDef.id,
			title: karnakDef.title,
			difficulty: karnakDef.difficulty,
			category: karnakDef.category,
			tags: karnakDef.tags,
			description: karnakDef.description,
			problemStatement: enriched ? enriched.enrichedStatement : baseStatement,
			inputFormat: karnakDef.inputFormat,
			outputFormat: karnakDef.outputFormat,
			constraints: enriched ? enriched.enrichedConstraints : karnakDef.constraints,
			points: karnakDef.points,
			customChecker: {
				type: karnakDef.customCheckerType || "whitespace",
				epsilon: 0.0001,
				scriptLanguage: "python",
				scriptCode: "",
			},
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
		});
		console.log("   [✓] the-ancient-cipher-of-karnak synced successfully.");
	}

	// 5. Sync Special Problems: the-kings-elite-squad & predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent
	console.log("\n--> Step 5: Syncing Special Problems...");

	// the-kings-elite-squad
	const squadTestCases = generateCombinationsTestCases();
	await updateProblemSafely("the-kings-elite-squad", {
		description: "Generate all distinct elite squads of k knights chosen from n knights in lexicographical order.",
		constraints: "<h2>Constraints</h2>\n\n<p>\n1 &le; k &le; n &le; 13\n</p>",
		customChecker: {
			type: "whitespace",
			epsilon: 0.000001,
			scriptLanguage: "python",
			scriptCode: "",
		},
		examples: squadTestCases,
	});
	console.log("   [✓] the-kings-elite-squad updated with 100 testcases, cleaned description, and updated constraints.");

	// predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent
	const canonicalBomboclat = all100MLProblems.find((p) => p.id === "predict-fuel-prices-bomboclat-logistics");
	if (canonicalBomboclat) {
		const testCases = canonicalBomboclat.generateTestCases();
		const baseStatement = formatMLStatement(canonicalBomboclat.title, canonicalBomboclat.story, canonicalBomboclat.task);
		const enriched = getEnrichedProblemFields(canonicalBomboclat.id, baseStatement, canonicalBomboclat.constraints);

		await updateProblemSafely("predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent", {
			description: canonicalBomboclat.description,
			problemStatement: enriched ? enriched.enrichedStatement : baseStatement,
			inputFormat: canonicalBomboclat.inputFormat,
			outputFormat: canonicalBomboclat.outputFormat,
			constraints: enriched ? enriched.enrichedConstraints : canonicalBomboclat.constraints,
			points: canonicalBomboclat.points,
			customChecker: {
				type: canonicalBomboclat.customCheckerType || "whitespace",
				epsilon: 0.0001,
				scriptLanguage: "python",
				scriptCode: "",
			},
			executionProfile: "machine_learning",
			customTimeoutMs: canonicalBomboclat.customTimeoutMs || 30000,
			customMemoryLimitMb: canonicalBomboclat.customMemoryLimitMb || 2048,
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
		});
		console.log("   [✓] predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent synced to 100 canonical testcases.");
	}

	console.log("\n=================================================================");
	console.log("=== FIRESTORE SYNCHRONIZATION COMPLETE! ===");
	console.log("=================================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR during sync:", err);
	process.exit(1);
});
