import { LRProblemDefinition } from "./types";
import { simpleAndMultipleProblems } from "./categories/simpleAndMultiple";
import { normalEquationProblems } from "./categories/normalEquation";
import { batchGradientDescentProblems } from "./categories/batchGradientDescent";
import { stochasticAndMiniBatchProblems } from "./categories/stochasticAndMiniBatch";
import { regularizedRegressionProblems } from "./categories/regularizedRegression";
import { robustAndQuantileProblems } from "./categories/robustAndQuantile";
import { metricsAndDiagnosticsProblems } from "./categories/metricsAndDiagnostics";

export const allLinearRegressionProblems: LRProblemDefinition[] = [
	...simpleAndMultipleProblems,
	...normalEquationProblems,
	...batchGradientDescentProblems,
	...stochasticAndMiniBatchProblems,
	...regularizedRegressionProblems,
	...robustAndQuantileProblems,
	...metricsAndDiagnosticsProblems,
];

export function validateAllLRProblems(): {
	totalProblems: number;
	totalTestCases: number;
	categories: Record<string, number>;
	difficulties: Record<string, number>;
} {
	console.log(`[Validation] Checking ${allLinearRegressionProblems.length} Linear Regression problems...`);

	if (allLinearRegressionProblems.length !== 100) {
		throw new Error(`Expected exactly 100 problems, found ${allLinearRegressionProblems.length}`);
	}

	const seenSlugs = new Set<string>();
	const categories: Record<string, number> = {};
	const difficulties: Record<string, number> = {};
	let totalTestCases = 0;

	for (let idx = 0; idx < allLinearRegressionProblems.length; idx++) {
		const p = allLinearRegressionProblems[idx];
		const num = idx + 1;

		if (!p.id || typeof p.id !== "string") {
			throw new Error(`Problem #${num} missing valid id`);
		}
		if (seenSlugs.has(p.id)) {
			throw new Error(`Duplicate problem id "${p.id}" found at #${num}`);
		}
		seenSlugs.add(p.id);

		if (!p.title || !p.story || !p.task || !p.inputFormat || !p.outputFormat || !p.constraints) {
			throw new Error(`Problem #${num} (${p.id}) has missing content fields`);
		}

		if (p.executionProfile !== "machine_learning") {
			throw new Error(`Problem #${num} (${p.id}) must have executionProfile "machine_learning", found "${p.executionProfile}"`);
		}

		if (!p.customTimeoutMs || p.customTimeoutMs < 15000) {
			throw new Error(`Problem #${num} (${p.id}) customTimeoutMs must be >= 15000, found ${p.customTimeoutMs}`);
		}

		if (!p.customMemoryLimitMb || p.customMemoryLimitMb < 1024) {
			throw new Error(`Problem #${num} (${p.id}) customMemoryLimitMb must be >= 1024, found ${p.customMemoryLimitMb}`);
		}

		categories[p.category] = (categories[p.category] || 0) + 1;
		difficulties[p.difficulty] = (difficulties[p.difficulty] || 0) + 1;

		// Generate test cases and validate
		const tcs = p.generateTestCases();
		if (!Array.isArray(tcs) || tcs.length !== 100) {
			throw new Error(`Problem #${num} (${p.id}) generated ${tcs?.length} test cases, expected exactly 100`);
		}

		for (let tcIdx = 0; tcIdx < tcs.length; tcIdx++) {
			const tc = tcs[tcIdx];
			if (tc.id !== tcIdx + 1) {
				throw new Error(`Problem #${num} (${p.id}) testcase index mismatch: expected ${tcIdx + 1}, got ${tc.id}`);
			}
			if (tcIdx === 0 && !tc.isSample) {
				throw new Error(`Problem #${num} (${p.id}) testcase #1 must have isSample=true`);
			}
			if (typeof tc.inputText !== "string" || tc.inputText.trim().length === 0) {
				throw new Error(`Problem #${num} (${p.id}) testcase #${tc.id} has empty inputText`);
			}
			if (typeof tc.outputText !== "string" || tc.outputText.trim().length === 0) {
				throw new Error(`Problem #${num} (${p.id}) testcase #${tc.id} has empty outputText`);
			}
			if (tc.outputText.includes("NaN") || tc.outputText.includes("Infinity")) {
				throw new Error(`Problem #${num} (${p.id}) testcase #${tc.id} outputText contains NaN or Infinity: "${tc.outputText}"`);
			}
		}

		totalTestCases += tcs.length;
	}

	console.log(`[Validation PASSED]`);
	console.log(`  Total Problems: ${allLinearRegressionProblems.length}`);
	console.log(`  Total Test Cases: ${totalTestCases}`);
	console.log(`  Categories:`, categories);
	console.log(`  Difficulties:`, difficulties);

	return {
		totalProblems: allLinearRegressionProblems.length,
		totalTestCases,
		categories,
		difficulties,
	};
}

if (require.main === module) {
	validateAllLRProblems();
}
