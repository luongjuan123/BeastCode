import admin from "firebase-admin";
import { allLinearRegressionProblems } from "../linear-regression-generator/index";
import { all100MLProblems } from "../ml-problem-generator/index";
import { linearRegressionGDProblems } from "../model-training-generator/categories/linearRegressionGD";
import { regularizedRegressionProblems } from "../model-training-generator/categories/regularizedRegression";
import { logisticRegressionProblems } from "../model-training-generator/categories/logisticRegression";
import { allStoryProblems } from "../problem-generator/index";

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";

if (!admin.apps.length) {
	admin.initializeApp({
		projectId,
	});
}

const db = admin.firestore();

function normalizeWhitespace(text: string): string {
	return text.trim().replace(/\r\n/g, "\n").split("\n").map(l => l.trimEnd()).join("\n");
}

function compareWhitespace(actual: string, expected: string): boolean {
	return normalizeWhitespace(actual) === normalizeWhitespace(expected);
}

function compareFloatTolerant(actual: string, expected: string, epsilon = 1e-4): boolean {
	const aTokens = actual.trim().split(/\s+/);
	const eTokens = expected.trim().split(/\s+/);
	if (aTokens.length !== eTokens.length) return false;

	for (let i = 0; i < aTokens.length; i++) {
		const aNum = parseFloat(aTokens[i]);
		const eNum = parseFloat(eTokens[i]);
		if (isNaN(aNum) || isNaN(eNum)) {
			if (aTokens[i] !== eTokens[i]) return false;
		} else {
			if (Math.abs(aNum - eNum) > epsilon) return false;
		}
	}
	return true;
}

// Direct mathematical solvers for differential verification
function solveCombinations(n: number, k: number): string {
	const result: string[] = [];
	const cur: number[] = [];
	function backtrack(start: number) {
		if (cur.length === k) {
			result.push(cur.join(""));
			return;
		}
		const remain = k - cur.length;
		for (let i = start; i <= n - remain + 1; i++) {
			cur.push(i);
			backtrack(i + 1);
			cur.pop();
		}
	}
	backtrack(1);
	return result.join("\n");
}

function solveLoocvRidge(input: string): string {
	const lines = input.trim().split("\n");
	const [n, d, lambda] = lines[0].trim().split(/\s+/).map(Number);
	const X: number[][] = [];
	for (let i = 0; i < n; i++) {
		X.push(lines[1 + i].trim().split(/\s+/).map(Number));
	}
	const y = lines[1 + n].trim().split(/\s+/).map(Number);

	const XtX: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
	for (let i = 0; i < d; i++) {
		for (let j = 0; j < d; j++) {
			let sum = 0;
			for (let k = 0; k < n; k++) sum += X[k][i] * X[k][j];
			if (i === j) sum += lambda;
			XtX[i][j] = sum;
		}
	}

	const A: number[][] = XtX.map((row, i) => [
		...row,
		...Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)),
	]);
	for (let i = 0; i < d; i++) {
		let maxRow = i;
		for (let r = i + 1; r < d; r++) {
			if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) maxRow = r;
		}
		[A[i], A[maxRow]] = [A[maxRow], A[i]];
		const pivot = A[i][i];
		for (let c = 0; c < 2 * d; c++) A[i][c] /= pivot;
		for (let r = 0; r < d; r++) {
			if (r === i) continue;
			const factor = A[r][i];
			for (let c = 0; c < 2 * d; c++) A[r][c] -= factor * A[i][c];
		}
	}
	const inv: number[][] = A.map(row => row.slice(d));

	const Xty: number[] = new Array(d).fill(0);
	for (let i = 0; i < d; i++) {
		let sum = 0;
		for (let k = 0; k < n; k++) sum += X[k][i] * y[k];
		Xty[i] = sum;
	}
	const beta: number[] = new Array(d).fill(0);
	for (let i = 0; i < d; i++) {
		let sum = 0;
		for (let j = 0; j < d; j++) sum += inv[i][j] * Xty[j];
		beta[i] = sum;
	}

	let cvMse = 0;
	for (let i = 0; i < n; i++) {
		let y_hat_i = 0;
		for (let j = 0; j < d; j++) y_hat_i += X[i][j] * beta[j];
		const e_i = y[i] - y_hat_i;

		let h_ii = 0;
		for (let j = 0; j < d; j++) {
			for (let k = 0; k < d; k++) {
				h_ii += X[i][j] * inv[j][k] * X[i][k];
			}
		}
		const loocv_error = e_i / (1 - h_ii);
		cvMse += loocv_error * loocv_error;
	}
	cvMse /= n;
	return cvMse.toFixed(4);
}

function solveKarnakPalindrome(input: string): string {
	const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, "");
	let l = 0, r = cleaned.length - 1;
	while (l < r) {
		if (cleaned[l] !== cleaned[r]) return "NO";
		l++;
		r--;
	}
	return "YES";
}

async function main() {
	console.log("=================================================================");
	console.log("=== BEASTCODE AUTHORITATIVE DIFFERENTIAL REGRESSION AUDIT ===");
	console.log("=================================================================\n");

	// Step 1: Check entire Firestore database invariants across all 507 problems
	console.log("--> Check 1: Verifying Whole Problem Bank Invariants across 507 problems...");
	const snapshot = await db.collection("problems").get();
	let passCount = 0;
	let missingSampleCount = 0;
	let undefinedTextCount = 0;

	snapshot.forEach((doc) => {
		const d = doc.data();
		if (doc.id === "subscription-forecast" || doc.id === "the-kingdoms-secret-mission-order") {
			return; // Known fixtures
		}
		const tcs = d.examples || [];
		if (tcs.length === 100) passCount++;
		const samples = tcs.filter((t: any) => t.isSample);
		if (samples.length === 0) missingSampleCount++;
		const undefTcs = tcs.filter((t: any) => t.inputText === undefined || t.outputText === undefined);
		if (undefTcs.length > 0) undefinedTextCount++;
	});

	console.log(`   Total active problems with exactly 100 test cases: ${passCount}/505`);
	console.log(`   Problems missing sample test cases: ${missingSampleCount}`);
	console.log(`   Problems with undefined input or output text: ${undefinedTextCount}`);

	if (passCount !== 505 || missingSampleCount > 0 || undefinedTextCount > 0) {
		throw new Error("Invariant check failed!");
	}
	console.log("   [✓] Database invariants verified 100% PASS.\n");

	// Step 2: Positive Reference Verification on Repaired Problems
	console.log("--> Check 2: Verifying Repaired Problems vs Canonical Generators in Firestore...");

	// 2a. All 100 Linear Regression problems match generator
	console.log("   Checking 100 Linear Regression problems against generator...");
	for (const def of allLinearRegressionProblems) {
		const doc = await db.collection("problems").doc(def.id).get();
		if (!doc.exists) throw new Error(`Missing ${def.id}`);
		const fsTcs = doc.data()!.examples || [];
		const genTcs = def.generateTestCases();
		for (let i = 0; i < 100; i++) {
			if (!compareWhitespace(fsTcs[i].outputText, genTcs[i].outputText)) {
				throw new Error(`Mismatch in ${def.id} tc ${i + 1}`);
			}
		}
	}
	console.log("   [✓] All 100 Linear Regression problems in Firestore match generator outputs 100%.");

	// 2b. Repaired ML problems match generator
	console.log("   Checking repaired ML problems against generator...");
	for (const id of ["alexandria-term-frequency-tf-idf", "adaboost-sample-weight-update"]) {
		const def = all100MLProblems.find(p => p.id === id)!;
		const doc = await db.collection("problems").doc(id).get();
		const fsTcs = doc.data()!.examples || [];
		const genTcs = def.generateTestCases();
		for (let i = 0; i < 100; i++) {
			if (!compareWhitespace(fsTcs[i].outputText, genTcs[i].outputText)) {
				throw new Error(`Mismatch in ${id} tc ${i + 1}`);
			}
		}
	}
	console.log("   [✓] Repaired ML problems in Firestore match generator outputs 100%.");

	// 2c. Repaired Model Training problems match generator
	console.log("   Checking 60 repaired Model Training problems against generator...");
	const modelTrainingRepaired = [
		...linearRegressionGDProblems,
		...regularizedRegressionProblems,
		...logisticRegressionProblems,
	];
	for (const def of modelTrainingRepaired) {
		const doc = await db.collection("problems").doc(def.id).get();
		const fsTcs = doc.data()!.examples || [];
		const genTcs = def.generateTestCases();
		for (let i = 0; i < 100; i++) {
			if (!compareWhitespace(fsTcs[i].outputText, genTcs[i].outputText)) {
				throw new Error(`Mismatch in ${def.id} tc ${i + 1}`);
			}
		}
	}
	console.log("   [✓] All 60 repaired Model Training problems in Firestore match generator outputs 100%.");

	// 2d. Repaired Story problem: the-ancient-cipher-of-karnak
	const karnakDef = allStoryProblems.find(p => p.id === "the-ancient-cipher-of-karnak")!;
	const karnakDoc = await db.collection("problems").doc("the-ancient-cipher-of-karnak").get();
	const karnakFsTcs = karnakDoc.data()!.examples || [];
	const karnakGenTcs = karnakDef.generateTestCases();
	for (let i = 0; i < 100; i++) {
		if (!compareWhitespace(karnakFsTcs[i].outputText, karnakGenTcs[i].outputText)) {
			throw new Error(`Mismatch in the-ancient-cipher-of-karnak tc ${i + 1}`);
		}
	}
	console.log("   [✓] the-ancient-cipher-of-karnak in Firestore matches generator outputs 100%.");

	// 2e. Special problems: the-kings-elite-squad
	const squadDoc = await db.collection("problems").doc("the-kings-elite-squad").get();
	const squadTcs = squadDoc.data()!.examples || [];
	if (squadTcs.length !== 100) throw new Error("the-kings-elite-squad length !== 100");
	for (const tc of squadTcs) {
		const [n, k] = tc.inputText.trim().split(/\s+/).map(Number);
		const expected = solveCombinations(n, k);
		if (!compareWhitespace(tc.outputText, expected)) {
			throw new Error(`Mismatch in the-kings-elite-squad tc ${tc.id}`);
		}
	}
	console.log("   [✓] the-kings-elite-squad 100/100 test cases match exact combinations solver.");

	// 2f. Special problems: predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent
	const bombDoc = await db.collection("problems").doc("predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent").get();
	const bombTcs = bombDoc.data()!.examples || [];
	if (bombTcs.length !== 100) throw new Error("predict-fuel-prices length !== 100");
	const canonicalBomb = all100MLProblems.find(p => p.id === "predict-fuel-prices-bomboclat-logistics")!;
	const bombGenTcs = canonicalBomb.generateTestCases();
	for (let i = 0; i < 100; i++) {
		if (!compareWhitespace(bombTcs[i].outputText, bombGenTcs[i].outputText)) {
			throw new Error(`Mismatch in predict-fuel-prices tc ${i + 1}`);
		}
	}
	console.log("   [✓] predict-fuel-prices duplicate matches canonical 100 test cases 100%.");

	// Step 3: Exact analytical validation of specific repaired problems
	console.log("\n--> Check 3: Mathematical Solver Verification for Specific Repaired Problems...");

	// lr-loocv-ridge-analytical-shortcut
	const loocvDoc = await db.collection("problems").doc("lr-loocv-ridge-analytical-shortcut").get();
	for (const tc of (loocvDoc.data()!.examples || [])) {
		const actual = solveLoocvRidge(tc.inputText);
		if (!compareFloatTolerant(actual, tc.outputText, 1e-4)) {
			throw new Error(`LOOCV analytical failure tc ${tc.id}: actual ${actual} vs expected ${tc.outputText}`);
		}
	}
	console.log("   [✓] lr-loocv-ridge-analytical-shortcut: 100/100 test cases match exact Gauss-Jordan LOOCV solver.");

	// the-ancient-cipher-of-karnak
	for (const tc of karnakFsTcs) {
		const actual = solveKarnakPalindrome(tc.inputText);
		if (!compareWhitespace(actual, tc.outputText)) {
			throw new Error(`Palindrome failure tc ${tc.id}: actual ${actual} vs expected ${tc.outputText}`);
		}
	}
	console.log("   [✓] the-ancient-cipher-of-karnak: 100/100 test cases match exact Palindrome solver.");

	// Step 4: Negative Control Verification (Adversarial rejection of dummy / wrong code)
	console.log("\n--> Check 4: Negative Control Verification (Adversarial dummy code rejection)...");
	const adversarialSamples = [
		"the-kings-elite-squad",
		"the-ancient-cipher-of-karnak",
		"lr-loocv-ridge-analytical-shortcut",
		"predict-fuel-prices-for-bomboclat-logistics-using-batch-gradient-descent",
		"lr-sgd-sequential-single-epoch",
		"lr-minibatch-gd-fixed-batch-size",
		"train-linear-bgd-01",
		"train-logistic-bgd-41",
	];

	const dummyOutputs = [
		"YES",
		"0.0000",
		"-1",
		"123",
		"10.0000 2.0000 3.0000",
	];

	for (const id of adversarialSamples) {
		const doc = await db.collection("problems").doc(id).get();
		const tcs = doc.data()!.examples || [];

		for (const dummy of dummyOutputs) {
			let passedCount = 0;
			for (const tc of tcs) {
				if (compareWhitespace(dummy, tc.outputText) || compareFloatTolerant(dummy, tc.outputText, 1e-4)) {
					passedCount++;
				}
			}
			// Must never pass all 100 test cases
			if (passedCount === 100) {
				throw new Error(`Negative control failed: Dummy output "${dummy}" passed all 100 testcases for ${id}!`);
			}
		}
		console.log(`   [✓] ${id}: strictly rejected all dummy solutions (negative control PASS).`);
	}

	console.log("\n=================================================================");
	console.log("=== ALL DIFFERENTIAL REGRESSION AUDIT CHECKS PASSED 100%! ===");
	console.log("=================================================================\n");
}

main().catch((err) => {
	console.error("FATAL ERROR in regression audit:", err);
	process.exit(1);
});
