import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { generateRunId, seedTestEnvironment, cleanupTestData, TestFixture } from "../tests/chat/fixtures/seedTestData";
import { TestRunContext } from "../tests/chat/reporting/testContext";
import { runUnitTests } from "../tests/chat/unit/chatUnit.test";
import { runApiTests } from "../tests/chat/api/chatApi.test";
import { runRulesTests } from "../tests/chat/rules/chatRules.test";
import { runE2ETests } from "../tests/chat/e2e/chatE2E.test";
import { generateExcelReport } from "../tests/chat/reporting/generateExcelReport";
import fs from "fs";
import path from "path";

async function main() {
	const args = process.argv.slice(2);
	const isReportOnly = args.includes("--report-only");

	if (isReportOnly) {
		console.log("============================================================");
		console.log("       BEASTCODE CHAT TEST REPORT GENERATOR (REGENERATE)    ");
		console.log("============================================================");

		const reportsDir = path.join(process.cwd(), "reports", "chat");
		const jsonFiles = fs
			.readdirSync(reportsDir)
			.filter((f) => f.startsWith("results_") && f.endsWith(".json"))
			.sort()
			.reverse();

		if (jsonFiles.length === 0) {
			console.error("No past test run JSON files found in reports/chat/");
			process.exit(1);
		}

		const latestJson = path.join(reportsDir, jsonFiles[0]);
		console.log(`Loading latest execution cache: ${latestJson}`);
		const ctx = TestRunContext.load(latestJson);
		const reportPath = await generateExcelReport(ctx);
		console.log(`\nExcel Report regenerated: ${reportPath}`);
		return;
	}

	console.log("============================================================");
	console.log("       BEASTCODE CHAT & MESSAGING AUTOMATED TEST SUITE      ");
	console.log("============================================================");

	const runId = generateRunId();
	const serverUrl = process.env.TEST_SERVER_URL || "http://localhost:3005";
	const ctx = new TestRunContext(runId, serverUrl);

	let fixture: TestFixture | null = null;
	let hasError = false;

	try {
		console.log(`\n[1/6] Provisioning Test Fixture (Run ID: ${runId})...`);
		fixture = await seedTestEnvironment(runId);
		console.log(`  ✓ Provisioned 6 actors, Org (${fixture.orgId}), and direct conversation (${fixture.directConvId})`);

		console.log("\n[2/6] Executing Unit & Validation Suite...");
		await runUnitTests(ctx);

		console.log("\n[3/6] Executing API & Contract Suite...");
		await runApiTests(ctx, fixture);

		console.log("\n[4/6] Executing Firestore Security Rules Suite...");
		await runRulesTests(ctx, fixture);

		console.log("\n[5/6] Executing Multi-User Browser E2E Suite...");
		await runE2ETests(ctx, fixture);
	} catch (err: any) {
		hasError = true;
		console.error("\n[CRITICAL ERROR] Test suite aborted unexpectedly:", err);
	} finally {
		ctx.finish();

		console.log("\n[6/6] Generating Test Artifacts & Workbook...");
		const jsonPath = ctx.persist();
		console.log(`  ✓ Persisted raw results to: ${jsonPath}`);

		let excelPath = "";
		try {
			excelPath = await generateExcelReport(ctx);
			console.log(`  ✓ Generated genuine Excel report: ${excelPath}`);
		} catch (excelErr: any) {
			console.error("  ✗ Failed to generate Excel report:", excelErr);
		}

		console.log("\n[Cleanup] Cleaning up isolated test fixtures...");
		if (fixture) {
			await cleanupTestData(fixture, runId);
			console.log("  ✓ Scoped test fixtures wiped from Firestore and Firebase Auth");
		}

		// Print Final Summary Table
		const results = ctx.getResultsList();
		const passed = results.filter((r) => r.status === "PASS").length;
		const failed = results.filter((r) => r.status === "FAIL").length;
		const blocked = results.filter((r) => r.status === "BLOCKED").length;
		const skipped = results.filter((r) => r.status === "SKIPPED").length;
		const total = results.length;
		const passRate = total > 0 ? ((passed / (total - skipped || 1)) * 100).toFixed(1) : "0.0";

		console.log("\n============================================================");
		console.log("                   TEST EXECUTION SUMMARY                   ");
		console.log("============================================================");
		console.log(` Run ID:        ${ctx.metadata.runId}`);
		console.log(` Duration:      ${((ctx.metadata.durationTotalMs || 0) / 1000).toFixed(2)}s`);
		console.log(` Total Cases:   ${total}`);
		console.log(` Passed:        ${passed}`);
		console.log(` Failed:        ${failed}`);
		console.log(` Blocked:       ${blocked}`);
		console.log(` Skipped:       ${skipped}`);
		console.log(` Pass Rate:     ${passRate}% (of executed)`);
		console.log(` Excel Report:  ${excelPath}`);
		console.log("============================================================");

		if (ctx.defects.length > 0) {
			console.log("\nDefects Discovered During Execution:");
			ctx.defects.forEach((d) => {
				console.log(`  [${d.defectId}] [${d.severity}] ${d.title}`);
				console.log(`     Component: ${d.component}`);
				console.log(`     Steps: ${d.stepsToReproduce.split("\n")[0]}...`);
			});
			console.log("============================================================\n");
		}

		// Exit with failure code if failures occurred or critical exception
		if (failed > 0 || hasError) {
			process.exit(1);
		} else {
			process.exit(0);
		}
	}
}

main().catch((err) => {
	console.error("Unhandled top-level error:", err);
	process.exit(1);
});
