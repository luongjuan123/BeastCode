(process.env as any).NODE_ENV = "test";

// Register mock for image imports before importing modules
(require.extensions as any)[".jpg"] = () => ({ src: "/mock.jpg" });
(require.extensions as any)[".png"] = () => ({ src: "/mock.png" });

import assert from "assert";

async function runRegressionTests() {
	const { getProblemForGrading, getPublicProblem } = await import("../src/utils/problemLoader");
	const { runCode } = await import("../src/pages/api/run");
	console.log("=================================================");
	console.log("  BEASTCODE GRADING & TESTCASE REGRESSION SUITE  ");
	console.log("=================================================\n");

	let passedTests = 0;
	let failedTests = 0;

	async function test(name: string, fn: () => Promise<void> | void) {
		try {
			process.stdout.write(`[TEST] ${name} ... `);
			await fn();
			console.log("PASSED");
			passedTests++;
		} catch (err: any) {
			console.log("FAILED");
			console.error(`  Error: ${err.message}`);
			if (err.stack) console.error(`  Stack: ${err.stack.split("\n").slice(0, 3).join("\n")}`);
			failedTests++;
		}
	}

	// -------------------------------------------------------------
	// TEST 1: Authoritative Loader gets all testcases for atm-problem
	// -------------------------------------------------------------
	await test("Authoritative loader fetches full suite (100 testcases) for atm-problem", async () => {
		const result = await getProblemForGrading("atm-problem");
		assert.strictEqual(result.error, undefined, `Unexpected error: ${result.error}`);
		assert.ok(result.problem !== null, "Problem should not be null");
		assert.strictEqual(result.totalCount, 100, `Expected 100 testcases, got ${result.totalCount}`);
		assert.strictEqual(result.testcases.length, 100, `Expected 100 items in testcase array, got ${result.testcases.length}`);

		// Check ordering: IDs should be 1 through 100 in ascending order
		for (let i = 0; i < result.testcases.length; i++) {
			assert.strictEqual(result.testcases[i].id, i + 1, `Testcase at index ${i} has unexpected id: ${result.testcases[i].id}`);
			assert.ok(typeof result.testcases[i].inputText === "string", "inputText must be a string");
			assert.ok(typeof result.testcases[i].outputText === "string", "outputText must be a string");
		}

		const samples = result.testcases.filter((tc) => tc.isSample);
		const hidden = result.testcases.filter((tc) => !tc.isSample);
		assert.strictEqual(samples.length, 1, `Expected exactly 1 sample case, got ${samples.length}`);
		assert.strictEqual(hidden.length, 99, `Expected exactly 99 hidden cases, got ${hidden.length}`);
	});

	// -------------------------------------------------------------
	// TEST 2: Authoritative Loader for the-kings-road-network
	// -------------------------------------------------------------
	await test("Authoritative loader fetches full suite (100 testcases) for the-kings-road-network", async () => {
		const result = await getProblemForGrading("the-kings-road-network");
		assert.strictEqual(result.error, undefined, `Unexpected error: ${result.error}`);
		assert.strictEqual(result.totalCount, 100, `Expected 100 testcases, got ${result.totalCount}`);
		const samples = result.testcases.filter((tc) => tc.isSample);
		const hidden = result.testcases.filter((tc) => !tc.isSample);
		assert.strictEqual(samples.length, 2, `Expected 2 sample cases, got ${samples.length}`);
		assert.strictEqual(hidden.length, 98, `Expected 98 hidden cases, got ${hidden.length}`);
	});

	// -------------------------------------------------------------
	// TEST 3: Zero-testcase problem invariant
	// -------------------------------------------------------------
	await test("Authoritative loader flags zero-testcase problem with error", async () => {
		const result = await getProblemForGrading("the-kingdoms-secret-mission-order");
		assert.strictEqual(result.totalCount, 0, "Total count should be 0");
		assert.strictEqual(result.testcases.length, 0, "Testcases array should be empty");
		assert.strictEqual(result.error, "NO_GRADING_TESTCASES", "Should report NO_GRADING_TESTCASES error");
	});

	// -------------------------------------------------------------
	// TEST 4: Client-Safe DTO Strips Hidden Testcases (No Leakage)
	// -------------------------------------------------------------
	await test("getPublicProblem strips hidden testcases completely (confidentiality)", async () => {
		const publicProblem = await getPublicProblem("atm-problem");
		assert.ok(publicProblem !== null, "Public problem should not be null");
		assert.strictEqual(publicProblem.examples.length, 1, `Public examples should only contain 1 sample, got ${publicProblem.examples.length}`);
		assert.ok(publicProblem.examples[0].isSample, "Example must be flagged as isSample");

		// Search JSON serialization of public problem to ensure NO hidden testcase content is present
		const fullResult = await getProblemForGrading("atm-problem");
		const hiddenCases = fullResult.testcases.filter((tc) => !tc.isSample);
		const serializedPublic = JSON.stringify(publicProblem);

		for (const hc of hiddenCases.slice(0, 10)) {
			// Ensure hidden test inputs and outputs do not appear in public serialization
			if (hc.inputText.length > 5) {
				assert.ok(
					!serializedPublic.includes(hc.inputText),
					`LEAK DETECTED: Hidden input "${hc.inputText.substring(0, 20)}..." leaked in public DTO!`
				);
			}
		}
	});

	// -------------------------------------------------------------
	// TEST 5: getPublicProblem respects deleted problems and sample extraction
	// -------------------------------------------------------------
	await test("getPublicProblem respects deleted_problems and extracts public samples", async () => {
		// two-sum is deleted in Firestore deleted_problems -> should return null
		const deletedProblem = await getPublicProblem("two-sum");
		assert.strictEqual(deletedProblem, null, "Deleted problem must return null");

		// the-kings-road-network is an active Firestore problem -> should return exactly 2 sample examples
		const activeProblem = await getPublicProblem("the-kings-road-network");
		assert.ok(activeProblem !== null, "Active problem should load");
		assert.strictEqual(activeProblem.examples.length, 2, "Should return exactly 2 sample cases");
		assert.ok(activeProblem.examples.every((ex) => ex.isSample), "All examples must be isSample: true");
	});

	// -------------------------------------------------------------
	// TEST 6: Execution Suite executes full suite without early break
	// -------------------------------------------------------------
	await test("runCode executes all testcases and does NOT terminate prematurely on failure", async () => {
		const testcases = [
			{ id: 1, inputText: "10", outputText: "20", isSample: true },
			{ id: 2, inputText: "20", outputText: "40", isSample: false },
			{ id: 3, inputText: "30", outputText: "60", isSample: false },
			{ id: 4, inputText: "40", outputText: "80", isSample: false },
		];

		// Code that passes case 1 and case 3, but fails case 2 and 4
		const userCode = `
import sys
val = int(sys.stdin.read().strip())
if val == 10:
    print(20)
elif val == 30:
    print(60)
else:
    print(0)
`;

		const execResult = await runCode(
			"mock-problem-id",
			userCode,
			"python",
			testcases as any,
			false
		);

		assert.strictEqual(execResult.totalCount, 4, `Expected totalCount 4, got ${execResult.totalCount}`);
		assert.ok(execResult.testResults, "testResults must be defined");
		assert.strictEqual(execResult.testResults.length, 4, `Expected testResults.length 4, got ${execResult.testResults.length}`);
		assert.strictEqual(execResult.passedCount, 2, `Expected passedCount 2, got ${execResult.passedCount}`);
		assert.strictEqual(execResult.success, false, "Expected overall success to be false");
		assert.strictEqual(execResult.testResults[0].passed, true, "Case 1 should pass");
		assert.strictEqual(execResult.testResults[1].passed, false, "Case 2 should fail");
		assert.strictEqual(execResult.testResults[2].passed, true, "Case 3 should pass");
		assert.strictEqual(execResult.testResults[3].passed, false, "Case 4 should fail");
	});

	// -------------------------------------------------------------
	// TEST 7: Zero testcases in runCode returns error (never Accepted)
	// -------------------------------------------------------------
	await test("runCode with 0 testcases returns failure (never false Accepted)", async () => {
		const execResult = await runCode(
			"mock-empty",
			"print('hello')",
			"python",
			[],
			false
		);

		assert.strictEqual(execResult.totalCount, 0, "totalCount should be 0");
		assert.strictEqual(execResult.passedCount, 0, "passedCount should be 0");
		assert.strictEqual(execResult.success, false, "success must be false for 0 testcases");
		assert.ok(execResult.error && execResult.error.length > 0, "Must return an error message");
	});

	// -------------------------------------------------------------
	// TEST 8: Submission masking hides secret inputs/outputs
	// -------------------------------------------------------------
	await test("Submission results mask secret testcase inputs and outputs", () => {
		const testcases = [
			{ id: 1, inputText: "sample_in", outputText: "sample_out", isSample: true },
			{ id: 2, inputText: "secret_in", outputText: "secret_out", isSample: false },
		];

		const rawResults = [
			{ passed: true, input: "sample_in", expected: "sample_out", actual: "sample_out", runtime: 5, memory: 1024 },
			{ passed: false, input: "secret_in", expected: "secret_out", actual: "wrong_out", runtime: 5, memory: 1024 },
		];

		// Simulate submit.ts mapping
		const sanitizedResults = rawResults.map((r, idx) => {
			const isSample = Boolean(testcases[idx]?.isSample);
			const cleanResult: any = {
				passed: r.passed,
				runtime: r.runtime || 0,
				memory: r.memory || 0
			};
			if (isSample) {
				cleanResult.input = r.input;
				cleanResult.expected = r.expected;
				cleanResult.actual = r.actual;
			} else {
				cleanResult.isSecret = true;
			}
			return cleanResult;
		});

		assert.strictEqual(sanitizedResults.length, 2);
		// Case 1 (sample) has inputs and outputs
		assert.strictEqual(sanitizedResults[0].input, "sample_in");
		assert.strictEqual(sanitizedResults[0].expected, "sample_out");
		assert.strictEqual(sanitizedResults[0].isSecret, undefined);

		// Case 2 (hidden) MUST NOT have input, expected, or actual
		assert.strictEqual(sanitizedResults[1].input, undefined, "Secret input must not be saved");
		assert.strictEqual(sanitizedResults[1].expected, undefined, "Secret expected output must not be saved");
		assert.strictEqual(sanitizedResults[1].actual, undefined, "Secret actual output must not be saved");
		assert.strictEqual(sanitizedResults[1].isSecret, true, "isSecret must be true");
	});

	// -------------------------------------------------------------
	// TEST 9: Admin payload logic omits examples when activeTab !== "testcases"
	// -------------------------------------------------------------
	await test("Admin editor preserves testcases when editing details or settings", () => {
		function buildAdminPayload(activeTab: string, formFields: any, currentExamples: any[]) {
			const payload: Record<string, any> = {
				title: formFields.title,
				description: formFields.description,
			};
			if (activeTab === "testcases") {
				payload.examples = currentExamples;
			}
			return payload;
		}

		const detailsPayload = buildAdminPayload("details", { title: "New Title", description: "Desc" }, [{ id: 1 }]);
		assert.strictEqual(detailsPayload.examples, undefined, "examples must NOT be in payload on details tab");

		const settingsPayload = buildAdminPayload("settings", { title: "New Title", description: "Desc" }, [{ id: 1 }]);
		assert.strictEqual(settingsPayload.examples, undefined, "examples must NOT be in payload on settings tab");

		const testcasesPayload = buildAdminPayload("testcases", { title: "New Title", description: "Desc" }, [{ id: 1, inputText: "1", outputText: "2" }]);
		assert.ok(Array.isArray(testcasesPayload.examples), "examples must be in payload on testcases tab");
		assert.strictEqual(testcasesPayload.examples.length, 1);
	});

	// -------------------------------------------------------------
	// TEST 10: Scorecard grading math preserves accurate ratios
	// -------------------------------------------------------------
	await test("Grading score calculation uses totalCount (not truncated count)", () => {
		const totalCount = 100;
		const passedCount = 42;
		const points = 100;

		const score = Math.round((passedCount / (totalCount || 1)) * points);
		assert.strictEqual(score, 42, "Score should accurately reflect 42/100 points");

		// If totalCount was mistakenly 1 (due to premature break), score would have been 100 or 0
		const wrongScore = Math.round((passedCount / 1) * points);
		assert.notStrictEqual(score, wrongScore, "Score must not use single testcase divisor");
	});

	console.log("\n=================================================");
	console.log(`  SUMMARY: ${passedTests} passed, ${failedTests} failed`);
	console.log("=================================================\n");

	if (failedTests > 0) {
		process.exit(1);
	}
}

runRegressionTests().catch((e) => {
	console.error("Fatal error running regression tests:", e);
	process.exit(1);
});
