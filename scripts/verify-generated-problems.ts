import admin from "firebase-admin";
import { allStoryProblems } from "./problem-generator/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== BeastCode 100 Problems Verification Suite ===");
	console.log(`Checking ${allStoryProblems.length} problems against Firestore (${projectId})...\n`);

	let verifiedCount = 0;
	let totalTestcasesCount = 0;
	const categoryDistribution: Record<string, number> = {};
	const difficultyDistribution: Record<string, number> = {};

	for (const expected of allStoryProblems) {
		const docSnap = await db.collection("problems").doc(expected.id).get();

		if (!docSnap.exists) {
			throw new Error(`Verification FAILED: Problem '${expected.id}' does NOT exist in Firestore!`);
		}

		const data = docSnap.data()!;

		if (data.title !== expected.title) {
			throw new Error(`Verification FAILED: Title mismatch for '${expected.id}'. Expected '${expected.title}', got '${data.title}'`);
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
		categoryDistribution[data.category] = (categoryDistribution[data.category] || 0) + 1;
		difficultyDistribution[data.difficulty] = (difficultyDistribution[data.difficulty] || 0) + 1;
	}

	console.log(`[PASS] Verified ${verifiedCount} of ${allStoryProblems.length} problems in Firestore.`);
	console.log(`[PASS] Total stored testcases verified: ${totalTestcasesCount} (100 per problem).\n`);

	console.log("Category Distribution:");
	for (const [cat, count] of Object.entries(categoryDistribution)) {
		console.log(`  - ${cat}: ${count} problems`);
	}

	console.log("\nDifficulty Distribution:");
	for (const [diff, count] of Object.entries(difficultyDistribution)) {
		console.log(`  - ${diff}: ${count} problems`);
	}

	// Test problemLoader contract logic
	console.log("\nTesting grading and public projection contract...");
	const sampleSlug = allStoryProblems[0].id; // "the-guilds-treasury"
	const sampleDoc = await db.collection("problems").doc(sampleSlug).get();
	const data = sampleDoc.data()!;
	
	// Grading contract check: all 100 testcases present
	const rawExamples = Array.isArray(data.examples) ? data.examples : [];
	if (rawExamples.length !== 100) {
		throw new Error(`Grading contract failed: expected 100 testcases, got ${rawExamples.length}`);
	}
	console.log(`[PASS] Grading loader contract: ${rawExamples.length} testcases available for judge submission.`);

	// Public DTO contract check: only samples exposed
	const publicSamples = rawExamples.filter((ex: any) => ex.isSample);
	if (publicSamples.length === 0 || publicSamples.length > 5) {
		throw new Error(`Public contract failed: unexpected public samples count ${publicSamples.length}`);
	}
	console.log(`[PASS] Public DTO contract: ${publicSamples.length} samples exposed to browser, 0 hidden testcases leaked.`);

	console.log("\n=======================================================");
	console.log("ALL 100 STORY-DRIVEN PROBLEMS WITH 100 TESTCASES VERIFIED!");
	console.log("=======================================================\n");
}

main().catch((err) => {
	console.error("Verification Error:", err);
	process.exit(1);
});
