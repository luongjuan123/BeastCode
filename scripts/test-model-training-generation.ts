import { all200ModelTrainingProblems } from "./model-training-generator";

console.log(`Loaded ${all200ModelTrainingProblems.length} model training problems.`);

if (all200ModelTrainingProblems.length !== 200) {
	console.error(`ERROR: Expected exactly 200 problems, found ${all200ModelTrainingProblems.length}`);
	process.exit(1);
}

const idSet = new Set<string>();
let totalTestCases = 0;

for (let idx = 0; idx < all200ModelTrainingProblems.length; idx++) {
	const p = all200ModelTrainingProblems[idx];
	if (idSet.has(p.id)) {
		console.error(`ERROR: Duplicate problem ID found: ${p.id}`);
		process.exit(1);
	}
	idSet.add(p.id);

	const tcs = p.generateTestCases();
	if (tcs.length !== 100) {
		console.error(`ERROR: Problem ${p.id} generated ${tcs.length} test cases instead of 100.`);
		process.exit(1);
	}

	const samples = tcs.filter((t) => t.isSample);
	if (samples.length === 0) {
		console.error(`ERROR: Problem ${p.id} has no sample test cases.`);
		process.exit(1);
	}

	for (const tc of tcs) {
		if (!tc.inputText || !tc.outputText) {
			console.error(`ERROR: Problem ${p.id} test case ${tc.id} has empty input or output.`);
			process.exit(1);
		}
	}

	totalTestCases += tcs.length;

	if ((idx + 1) % 20 === 0) {
		console.log(`Validated ${(idx + 1)} / 200 problems (${totalTestCases} test cases generated)...`);
	}
}

console.log(`\nSUCCESS: All 200 problems validated!`);
console.log(`Total Problems: ${all200ModelTrainingProblems.length}`);
console.log(`Total Test Cases Generated: ${totalTestCases}`);
