import admin from "firebase-admin";
import { all100MLProblems } from "./ml-problem-generator/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== BeastCode 100 Machine Learning Problems Verification Suite ===");
	console.log(`Checking ${all100MLProblems.length} ML problems against Firestore (${projectId})...\n`);

	let verifiedCount = 0;
	let totalTestcasesCount = 0;
	const difficultyDistribution: Record<string, number> = {};
	const profileDistribution: Record<string, number> = {};

	for (const expected of all100MLProblems) {
		const docSnap = await db.collection("problems").doc(expected.id).get();

		if (!docSnap.exists) {
			throw new Error(`Verification FAILED: ML Problem '${expected.id}' does NOT exist in Firestore!`);
		}

		const data = docSnap.data()!;

		if (data.title !== expected.title) {
			throw new Error(`Verification FAILED: Title mismatch for '${expected.id}'. Expected '${expected.title}', got '${data.title}'`);
		}

		if (data.category !== "machine-learning") {
			throw new Error(`Verification FAILED: Category for '${expected.id}' is '${data.category}', expected 'machine-learning'`);
		}

		if (data.executionProfile !== "machine_learning") {
			throw new Error(`Verification FAILED: executionProfile for '${expected.id}' is '${data.executionProfile}', expected 'machine_learning'`);
		}

		if (!data.customTimeoutMs || data.customTimeoutMs < 15000) {
			throw new Error(`Verification FAILED: customTimeoutMs for '${expected.id}' is ${data.customTimeoutMs}, expected >= 15000`);
		}

		if (!data.customMemoryLimitMb || data.customMemoryLimitMb < 1024) {
			throw new Error(`Verification FAILED: customMemoryLimitMb for '${expected.id}' is ${data.customMemoryLimitMb}, expected >= 1024`);
		}

		if (!Array.isArray(data.examples) || data.examples.length !== 100) {
			throw new Error(
				`Verification FAILED: Problem '${expected.id}' has ${data.examples ? data.examples.length : 0} testcases instead of 100!`
			);
		}

		const samples = data.examples.filter((tc: any) => tc.isSample);
		if (samples.length === 0) {
			throw new Error(`Verification FAILED: Problem '${expected.id}' has 0 sample testcases!`);
		}

		if (!data.problemStatement || data.problemStatement.length < 50) {
			throw new Error(`Verification FAILED: Problem '${expected.id}' has missing or truncated problemStatement!`);
		}

		verifiedCount++;
		totalTestcasesCount += data.examples.length;
		difficultyDistribution[data.difficulty] = (difficultyDistribution[data.difficulty] || 0) + 1;
		profileDistribution[data.executionProfile] = (profileDistribution[data.executionProfile] || 0) + 1;
	}

	console.log(`[PASS] Verified ${verifiedCount} of ${all100MLProblems.length} Machine Learning problems in Firestore.`);
	console.log(`[PASS] Total stored testcases verified: ${totalTestcasesCount} (exactly 100 per problem).\n`);

	console.log("Difficulty Distribution:");
	for (const [diff, count] of Object.entries(difficultyDistribution)) {
		console.log(`  - ${diff}: ${count}`);
	}

	console.log("\nExecution Profile Distribution:");
	for (const [prof, count] of Object.entries(profileDistribution)) {
		console.log(`  - ${prof}: ${count}`);
	}

	console.log("\n=======================================================");
	console.log("ALL 100 MACHINE LEARNING PROBLEMS VERIFIED SUCCESSFULLY IN FIRESTORE!");
	console.log("=======================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR in verification script:", err);
	process.exit(1);
});
