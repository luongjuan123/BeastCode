import admin from "firebase-admin";
import { allLinearRegressionProblems } from "./linear-regression-generator/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

async function main() {
	console.log("=== Verifying 100 Linear Regression Problems in Firestore ===");
	console.log(`Target Firestore Project: ${projectId}`);

	let foundCount = 0;
	let totalTestCasesInDb = 0;
	const missingSlugs: string[] = [];
	const malformedProblems: string[] = [];

	for (const p of allLinearRegressionProblems) {
		const docSnap = await db.collection("problems").doc(p.id).get();
		if (!docSnap.exists) {
			missingSlugs.push(p.id);
			continue;
		}

		foundCount++;
		const data = docSnap.data();
		const examples = data?.examples || [];
		totalTestCasesInDb += examples.length;

		if (examples.length !== 100) {
			malformedProblems.push(`${p.id}: has ${examples.length} testcases instead of 100`);
		}

		if (data?.executionProfile !== "machine_learning") {
			malformedProblems.push(`${p.id}: invalid executionProfile "${data?.executionProfile}"`);
		}

		if (!data?.problemStatement || data.problemStatement.length < 50) {
			malformedProblems.push(`${p.id}: missing or truncated problemStatement`);
		}
	}

	console.log(`\nVerification Summary:`);
	console.log(`- Problems Verified Found: ${foundCount} / ${allLinearRegressionProblems.length}`);
	console.log(`- Total Test Cases in DB: ${totalTestCasesInDb}`);
	console.log(`- Missing Problems: ${missingSlugs.length}`);
	console.log(`- Malformed Problems: ${malformedProblems.length}`);

	if (missingSlugs.length > 0) {
		console.error("Missing slugs:", missingSlugs);
	}
	if (malformedProblems.length > 0) {
		console.error("Malformed problems:", malformedProblems);
	}

	if (foundCount === 100 && totalTestCasesInDb === 10000 && missingSlugs.length === 0 && malformedProblems.length === 0) {
		console.log("\n[SUCCESS] ALL 100 Linear Regression problems and all 10,000 test cases are intact in Firestore!");
	} else {
		throw new Error("Verification failed! Some problems are missing or malformed.");
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in verification script:", err);
	process.exit(1);
});
