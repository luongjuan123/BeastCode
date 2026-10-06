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
	console.log("=== BeastCode Firestore Verification: 200 Model Training Problems ===");
	console.log(`Target Firestore Project: ${projectId}`);

	// 1. Overall problem count
	const allDocsSnap = await db.collection("problems").get();
	console.log(`Total Problems in Firestore 'problems' collection: ${allDocsSnap.size}`);

	// 2. Audit each of the 200 model training problems
	let verifiedCount = 0;
	let totalTestCasesCount = 0;
	const missingProblems: string[] = [];
	const malformedProblems: string[] = [];

	for (const expected of all200ModelTrainingProblems) {
		const docRef = db.collection("problems").doc(expected.id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			missingProblems.push(expected.id);
			continue;
		}

		const data = docSnap.data();
		if (!data) {
			malformedProblems.push(`${expected.id} (no data)`);
			continue;
		}

		const examples = data.examples || [];
		if (examples.length !== 100) {
			malformedProblems.push(`${expected.id} (has ${examples.length} examples, expected 100)`);
			continue;
		}

		const samples = examples.filter((ex: any) => ex.isSample);
		if (samples.length < 1) {
			malformedProblems.push(`${expected.id} (has 0 samples)`);
			continue;
		}

		if (!data.problemStatement || !data.problemStatement.includes("Required Hyperparameters & Solver Configuration")) {
			malformedProblems.push(`${expected.id} (missing hyperparameter box in problemStatement)`);
			continue;
		}

		if (data.executionProfile !== "machine_learning") {
			malformedProblems.push(`${expected.id} (executionProfile !== machine_learning)`);
			continue;
		}

		verifiedCount++;
		totalTestCasesCount += examples.length;
	}

	console.log(`\nVerification Results:`);
	console.log(`Verified Problems: ${verifiedCount} / 200`);
	console.log(`Total Test Cases in Verified Problems: ${totalTestCasesCount}`);

	if (missingProblems.length > 0) {
		console.error(`Missing Problems (${missingProblems.length}):`, missingProblems);
	}
	if (malformedProblems.length > 0) {
		console.error(`Malformed Problems (${malformedProblems.length}):`, malformedProblems);
	}

	if (missingProblems.length === 0 && malformedProblems.length === 0 && verifiedCount === 200) {
		console.log("\nALL 200 MODEL TRAINING PROBLEMS VERIFIED IN FIRESTORE SUCCESSFULLY!");
	} else {
		throw new Error("Verification failed.");
	}
}

main().catch((err) => {
	console.error("Verification script failed:", err);
	process.exit(1);
});
