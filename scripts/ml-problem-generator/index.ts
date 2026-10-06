import { MLProblemDefinition } from "./types";
import { regressionProblems } from "./categories/regression";
import { classificationProblems } from "./categories/classification";
import { clusteringProblems } from "./categories/clustering";
import { optimizationProblems } from "./categories/optimization";
import { dimensionalityProblems } from "./categories/dimensionality";
import { preprocessingProblems } from "./categories/preprocessing";
import { deepLearningProblems } from "./categories/deepLearning";
import { nlpProblems } from "./categories/nlp";
import { recommendationProblems } from "./categories/recommendation";
import { timeseriesProblems } from "./categories/timeseries";
import { ensembleProblems } from "./categories/ensemble";
import { rlProblems } from "./categories/rl";

export const all100MLProblems: MLProblemDefinition[] = [
	...regressionProblems,
	...classificationProblems,
	...clusteringProblems,
	...optimizationProblems,
	...dimensionalityProblems,
	...preprocessingProblems,
	...deepLearningProblems,
	...nlpProblems,
	...recommendationProblems,
	...timeseriesProblems,
	...ensembleProblems,
	...rlProblems,
];

export function validateAllMLProblems(): void {
	console.log(`[ML Generator] Validating ${all100MLProblems.length} Machine Learning problems...`);

	if (all100MLProblems.length !== 100) {
		throw new Error(`Expected exactly 100 ML problems, found ${all100MLProblems.length}`);
	}

	const seenIds = new Set<string>();
	let totalTestCases = 0;

	for (let i = 0; i < all100MLProblems.length; i++) {
		const prob = all100MLProblems[i];
		const num = i + 1;

		if (!prob.id || seenIds.has(prob.id)) {
			throw new Error(`Problem #${num} has duplicate or missing ID: ${prob.id}`);
		}
		seenIds.add(prob.id);

		if (!prob.title || !prob.story || !prob.task || !prob.inputFormat || !prob.outputFormat) {
			throw new Error(`Problem #${num} (${prob.id}) missing required fields`);
		}

		if (prob.executionProfile !== "machine_learning") {
			throw new Error(`Problem #${num} (${prob.id}) executionProfile must be 'machine_learning'`);
		}
		if (!prob.customTimeoutMs || prob.customTimeoutMs < 15000) {
			throw new Error(`Problem #${num} (${prob.id}) customTimeoutMs must be >= 15000ms`);
		}
		if (!prob.customMemoryLimitMb || prob.customMemoryLimitMb < 1024) {
			throw new Error(`Problem #${num} (${prob.id}) customMemoryLimitMb must be >= 1024MB`);
		}

		const tcs = prob.generateTestCases();
		if (tcs.length !== 100) {
			throw new Error(`Problem #${num} (${prob.id}) generated ${tcs.length} test cases, expected 100`);
		}
		totalTestCases += tcs.length;

		// Check for empty or invalid test cases
		for (const tc of tcs) {
			if (typeof tc.inputText !== "string" || tc.inputText.length === 0) {
				throw new Error(`Problem #${num} (${prob.id}) test case #${tc.id} has empty inputText`);
			}
			if (typeof tc.outputText !== "string" || tc.outputText.length === 0) {
				throw new Error(`Problem #${num} (${prob.id}) test case #${tc.id} has empty outputText`);
			}
		}

		// Estimate payload size for Firestore
		const payloadSize = JSON.stringify(tcs).length;
		if (payloadSize > 400000) {
			console.warn(`[WARN] Problem #${num} (${prob.id}) testcase payload is large: ${Math.round(payloadSize / 1024)} KB`);
		}
	}

	console.log(`[ML Generator] Validation PASSED: 100 problems, ${totalTestCases} test cases verified!`);
}

if (require.main === module) {
	validateAllMLProblems();
}
