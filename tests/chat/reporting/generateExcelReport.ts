import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { TestRunContext, ExecutedTestResult, DefectRecord, TestAttempt } from "./testContext";
import { CHAT_FEATURES, CHAT_TEST_CASES } from "../manifest";

/**
 * Sanitizes strings against CSV/Excel Formula Injection attacks.
 * If a cell string starts with =, +, -, or @, prepend a single quote.
 */
function sanitizeForExcel(value: any): any {
	if (typeof value !== "string") return value;
	if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
		return `'${value}`;
	}
	return value;
}

export async function generateExcelReport(ctx: TestRunContext): Promise<string> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "BeastCode QA Automation Engine";
	workbook.lastModifiedBy = "BeastCode QA Engineer";
	workbook.created = new Date();
	workbook.modified = new Date();

	const headerFill: ExcelJS.Fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF1E293B" }, // Dark slate
	};
	const headerFont: Partial<ExcelJS.Font> = {
		name: "Arial",
		size: 10,
		bold: true,
		color: { argb: "FFFFFFFF" },
	};
	const borderStyle: Partial<ExcelJS.Borders> = {
		top: { style: "thin", color: { argb: "FFE2E8F0" } },
		left: { style: "thin", color: { argb: "FFE2E8F0" } },
		bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
		right: { style: "thin", color: { argb: "FFE2E8F0" } },
	};

	const resultsList = ctx.getResultsList();
	const totalResultsCount = resultsList.length;

	// =========================================================================
	// SHEET 1: SUMMARY
	// =========================================================================
	const sheetSummary = workbook.addWorksheet("Summary", { views: [{ showGridLines: true }] });
	sheetSummary.columns = [
		{ width: 4 },
		{ width: 28 },
		{ width: 34 },
		{ width: 14 },
		{ width: 14 },
		{ width: 14 },
		{ width: 14 },
	];

	// Title Block
	sheetSummary.mergeCells("B2:G2");
	const titleCell = sheetSummary.getCell("B2");
	titleCell.value = "BeastCode Chat & Messaging System — Test Execution Report";
	titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF0F172A" } };

	sheetSummary.mergeCells("B3:G3");
	const subtitleCell = sheetSummary.getCell("B3");
	subtitleCell.value = `Automated QA Validation Suite — Comprehensive Multi-Layer Test Execution`;
	subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };

	// Run Metadata Section
	sheetSummary.getCell("B5").value = "EXECUTION METADATA";
	sheetSummary.getCell("B5").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };

	const metaRows = [
		["Test Run ID", ctx.metadata.runId],
		["Execution Timestamp", ctx.metadata.startTime],
		["Duration Total", `${((ctx.metadata.durationTotalMs || 0) / 1000).toFixed(1)}s`],
		["Server Environment", ctx.metadata.serverUrl],
		["OS Platform", `${ctx.metadata.os} (Node ${ctx.metadata.nodeVersion})`],
		["Browser Engine", ctx.metadata.browser],
		["Firebase Project", ctx.metadata.firebaseProjectId],
	];

	metaRows.forEach((row, idx) => {
		const rowNum = 6 + idx;
		sheetSummary.getCell(`B${rowNum}`).value = row[0];
		sheetSummary.getCell(`B${rowNum}`).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
		sheetSummary.getCell(`C${rowNum}`).value = sanitizeForExcel(row[1]);
		sheetSummary.getCell(`C${rowNum}`).font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };
	});

	// Execution Metrics Block (with live Excel Formulas)
	const metricStartRow = 14;
	sheetSummary.getCell(`B${metricStartRow}`).value = "TEST METRICS";
	sheetSummary.getCell(`B${metricStartRow}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };

	sheetSummary.getCell(`B${metricStartRow + 1}`).value = "Total Cases Defined";
	sheetSummary.getCell(`C${metricStartRow + 1}`).value = { formula: `COUNTA(Results!A2:A${totalResultsCount + 1})` };
	sheetSummary.getCell(`C${metricStartRow + 1}`).font = { name: "Arial", size: 10, bold: true };

	sheetSummary.getCell(`B${metricStartRow + 2}`).value = "Passed";
	sheetSummary.getCell(`C${metricStartRow + 2}`).value = { formula: `COUNTIF(Results!G2:G${totalResultsCount + 1}, "PASS")` };
	sheetSummary.getCell(`C${metricStartRow + 2}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF166534" } };

	sheetSummary.getCell(`B${metricStartRow + 3}`).value = "Failed";
	sheetSummary.getCell(`C${metricStartRow + 3}`).value = { formula: `COUNTIF(Results!G2:G${totalResultsCount + 1}, "FAIL")` };
	sheetSummary.getCell(`C${metricStartRow + 3}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF991B1B" } };

	sheetSummary.getCell(`B${metricStartRow + 4}`).value = "Blocked";
	sheetSummary.getCell(`C${metricStartRow + 4}`).value = { formula: `COUNTIF(Results!G2:G${totalResultsCount + 1}, "BLOCKED")` };
	sheetSummary.getCell(`C${metricStartRow + 4}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFB45309" } };

	sheetSummary.getCell(`B${metricStartRow + 5}`).value = "Skipped";
	sheetSummary.getCell(`C${metricStartRow + 5}`).value = { formula: `COUNTIF(Results!G2:G${totalResultsCount + 1}, "SKIPPED")` };
	sheetSummary.getCell(`C${metricStartRow + 5}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } };

	sheetSummary.getCell(`B${metricStartRow + 6}`).value = "Pass Rate";
	sheetSummary.getCell(`C${metricStartRow + 6}`).value = { formula: `C${metricStartRow + 2}/C${metricStartRow + 1}` };
	sheetSummary.getCell(`C${metricStartRow + 6}`).numFmt = "0.0%";
	sheetSummary.getCell(`C${metricStartRow + 6}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };

	// Feature Breakdown Table in Summary
	const featStartRow = 23;
	sheetSummary.getCell(`B${featStartRow}`).value = "FEATURE BREAKDOWN";
	sheetSummary.getCell(`B${featStartRow}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };

	const featHeaders = ["Feature ID", "Feature Name", "Total", "Passed", "Failed", "Status"];
	const featHeaderRow = sheetSummary.getRow(featStartRow + 1);
	featHeaders.forEach((h, i) => {
		const cell = featHeaderRow.getCell(2 + i);
		cell.value = h;
		cell.fill = headerFill;
		cell.font = headerFont;
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	CHAT_FEATURES.forEach((feat, i) => {
		const currRow = sheetSummary.getRow(featStartRow + 2 + i);
		const featTotal = resultsList.filter((r) => r.featureId === feat.id).length;
		const featPassed = resultsList.filter((r) => r.featureId === feat.id && r.status === "PASS").length;
		const featFailed = resultsList.filter((r) => r.featureId === feat.id && r.status === "FAIL").length;
		const statusText = featFailed > 0 ? "DEFECTS FOUND" : featPassed > 0 ? "VERIFIED" : "PENDING";

		currRow.getCell(2).value = feat.id;
		currRow.getCell(3).value = feat.name;
		currRow.getCell(4).value = featTotal;
		currRow.getCell(5).value = featPassed;
		currRow.getCell(6).value = featFailed;
		currRow.getCell(7).value = statusText;

		currRow.getCell(2).font = { name: "Arial", size: 9, bold: true };
		currRow.getCell(3).font = { name: "Arial", size: 9 };
		currRow.getCell(4).font = { name: "Arial", size: 9 };
		currRow.getCell(5).font = { name: "Arial", size: 9, color: { argb: "FF166534" } };
		currRow.getCell(6).font = { name: "Arial", size: 9, color: { argb: featFailed > 0 ? "FF991B1B" : "FF475569" } };
		currRow.getCell(7).font = { name: "Arial", size: 9, bold: true, color: { argb: featFailed > 0 ? "FF991B1B" : "FF166534" } };

		for (let c = 2; c <= 7; c++) {
			currRow.getCell(c).border = borderStyle;
		}
	});

	// =========================================================================
	// SHEET 2: RESULTS
	// =========================================================================
	const sheetResults = workbook.addWorksheet("Results", { views: [{ showGridLines: true }] });
	const resultCols = [
		{ header: "Test Case ID", key: "id", width: 16 },
		{ header: "Feature ID", key: "featureId", width: 14 },
		{ header: "Feature Name", key: "feature", width: 26 },
		{ header: "Priority", key: "priority", width: 10 },
		{ header: "Layer", key: "layer", width: 12 },
		{ header: "Scenario", key: "scenario", width: 36 },
		{ header: "Status", key: "status", width: 12 },
		{ header: "Duration (ms)", key: "durationMs", width: 14 },
		{ header: "Error Details", key: "errorMessage", width: 40 },
		{ header: "Observed Evidence / Notes", key: "evidence", width: 50 },
	];
	sheetResults.columns = resultCols;

	// Style Results Header
	const resHeaderRow = sheetResults.getRow(1);
	resHeaderRow.height = 24;
	resHeaderRow.eachCell((cell) => {
		cell.fill = headerFill;
		cell.font = headerFont;
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	resultsList.forEach((r, idx) => {
		const row = sheetResults.addRow({
			id: r.id,
			featureId: r.featureId,
			feature: r.feature,
			priority: r.priority,
			layer: r.layer,
			scenario: sanitizeForExcel(r.scenario),
			status: r.status,
			durationMs: r.durationMs,
			errorMessage: sanitizeForExcel(r.errorMessage || ""),
			evidence: sanitizeForExcel(r.evidence || ""),
		});

		row.font = { name: "Arial", size: 9 };
		row.alignment = { vertical: "top", wrapText: true };

		// Status Badge Styling
		const statusCell = row.getCell("status");
		statusCell.alignment = { horizontal: "center", vertical: "middle" };
		if (r.status === "PASS") {
			statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
			statusCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF155724" } };
		} else if (r.status === "FAIL") {
			statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
			statusCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF721C24" } };
		} else if (r.status === "BLOCKED") {
			statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
			statusCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF856404" } };
		} else if (r.status === "SKIPPED") {
			statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E3E5" } };
			statusCell.font = { name: "Arial", size: 9, color: { argb: "FF383D41" } };
		}

		row.eachCell((cell) => {
			cell.border = borderStyle;
		});
	});

	sheetResults.autoFilter = "A1:J1";

	// =========================================================================
	// SHEET 3: COVERAGE
	// =========================================================================
	const sheetCoverage = workbook.addWorksheet("Coverage", { views: [{ showGridLines: true }] });
	const covCols = [
		{ header: "Feature ID", key: "id", width: 14 },
		{ header: "Feature Name", key: "name", width: 28 },
		{ header: "Description", key: "description", width: 44 },
		{ header: "Total Cases", key: "total", width: 12 },
		{ header: "Executed", key: "executed", width: 12 },
		{ header: "Coverage %", key: "coveragePct", width: 14 },
		{ header: "Tested Areas", key: "testedAreas", width: 36 },
		{ header: "Defects / Gaps Identified", key: "gaps", width: 40 },
	];
	sheetCoverage.columns = covCols;

	const covHeaderRow = sheetCoverage.getRow(1);
	covHeaderRow.height = 24;
	covHeaderRow.eachCell((cell) => {
		cell.fill = headerFill;
		cell.font = headerFont;
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	CHAT_FEATURES.forEach((feat, idx) => {
		const rowNum = 2 + idx;
		const totalForFeat = resultsList.filter((r) => r.featureId === feat.id).length;
		const executedForFeat = resultsList.filter((r) => r.featureId === feat.id && r.status !== "SKIPPED").length;
		const defectsForFeat = ctx.defects.filter((d) => d.feature === feat.name);

		const gapText =
			defectsForFeat.length > 0
				? defectsForFeat.map((d) => `[${d.defectId}] ${d.title}`).join("; ")
				: "No active defects identified";

		const row = sheetCoverage.addRow({
			id: feat.id,
			name: feat.name,
			description: sanitizeForExcel(feat.description),
			total: totalForFeat,
			executed: executedForFeat,
			coveragePct: { formula: `E${rowNum}/D${rowNum}` },
			testedAreas: sanitizeForExcel(feat.sourceLocations.join(", ")),
			gaps: sanitizeForExcel(gapText),
		});

		row.font = { name: "Arial", size: 9 };
		row.alignment = { vertical: "top", wrapText: true };
		row.getCell("coveragePct").numFmt = "0.0%";
		row.getCell("coveragePct").font = { name: "Arial", size: 9, bold: true };

		row.eachCell((cell) => {
			cell.border = borderStyle;
		});
	});

	sheetCoverage.autoFilter = "A1:H1";

	// =========================================================================
	// SHEET 4: DEFECTS
	// =========================================================================
	const sheetDefects = workbook.addWorksheet("Defects", { views: [{ showGridLines: true }] });
	const defCols = [
		{ header: "Defect ID", key: "defectId", width: 14 },
		{ header: "Test Case ID", key: "testId", width: 16 },
		{ header: "Feature", key: "feature", width: 22 },
		{ header: "Defect Title", key: "title", width: 34 },
		{ header: "Severity", key: "severity", width: 12 },
		{ header: "Component / Source", key: "component", width: 32 },
		{ header: "Steps to Reproduce", key: "stepsToReproduce", width: 40 },
		{ header: "Expected Behavior", key: "expectedBehavior", width: 34 },
		{ header: "Actual Behavior", key: "actualBehavior", width: 34 },
		{ header: "Evidence / Payload Snippet", key: "evidenceSnippet", width: 44 },
	];
	sheetDefects.columns = defCols;

	const defHeaderRow = sheetDefects.getRow(1);
	defHeaderRow.height = 24;
	defHeaderRow.eachCell((cell) => {
		cell.fill = headerFill;
		cell.font = headerFont;
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	if (ctx.defects.length === 0) {
		const emptyRow = sheetDefects.addRow({
			defectId: "N/A",
			title: "No defects identified during this execution run",
			severity: "None",
		});
		emptyRow.font = { name: "Arial", size: 9, italic: true };
	} else {
		ctx.defects.forEach((def) => {
			const row = sheetDefects.addRow({
				defectId: def.defectId,
				testId: def.testId,
				feature: def.feature,
				title: sanitizeForExcel(def.title),
				severity: def.severity,
				component: sanitizeForExcel(def.component),
				stepsToReproduce: sanitizeForExcel(def.stepsToReproduce),
				expectedBehavior: sanitizeForExcel(def.expectedBehavior),
				actualBehavior: sanitizeForExcel(def.actualBehavior),
				evidenceSnippet: sanitizeForExcel(def.evidenceSnippet),
			});

			row.font = { name: "Arial", size: 9 };
			row.alignment = { vertical: "top", wrapText: true };

			// Severity styling
			const sevCell = row.getCell("severity");
			sevCell.alignment = { horizontal: "center", vertical: "middle" };
			if (def.severity === "Critical") {
				sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
				sevCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF721C24" } };
			} else if (def.severity === "High") {
				sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
				sevCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF856404" } };
			}

			row.eachCell((cell) => {
				cell.border = borderStyle;
			});
		});
	}

	sheetDefects.autoFilter = "A1:J1";

	// =========================================================================
	// SHEET 5: ATTEMPTS
	// =========================================================================
	const sheetAttempts = workbook.addWorksheet("Attempts", { views: [{ showGridLines: true }] });
	const attCols = [
		{ header: "Run ID", key: "runId", width: 22 },
		{ header: "Test Case ID", key: "testId", width: 16 },
		{ header: "Attempt #", key: "attemptNumber", width: 12 },
		{ header: "Status", key: "status", width: 12 },
		{ header: "Duration (ms)", key: "durationMs", width: 14 },
		{ header: "Timestamp", key: "timestamp", width: 26 },
		{ header: "Error Message", key: "errorMessage", width: 44 },
	];
	sheetAttempts.columns = attCols;

	const attHeaderRow = sheetAttempts.getRow(1);
	attHeaderRow.height = 24;
	attHeaderRow.eachCell((cell) => {
		cell.fill = headerFill;
		cell.font = headerFont;
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	ctx.allAttempts.forEach((att) => {
		const row = sheetAttempts.addRow({
			runId: att.runId,
			testId: att.testId,
			attemptNumber: att.attemptNumber,
			status: att.status,
			durationMs: att.durationMs,
			timestamp: att.timestamp,
			errorMessage: sanitizeForExcel(att.errorMessage || ""),
		});

		row.font = { name: "Arial", size: 9 };
		row.alignment = { vertical: "top" };

		const stCell = row.getCell("status");
		stCell.alignment = { horizontal: "center", vertical: "middle" };
		if (att.status === "PASS") {
			stCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
			stCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF155724" } };
		} else if (att.status === "FAIL") {
			stCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
			stCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF721C24" } };
		}

		row.eachCell((cell) => {
			cell.border = borderStyle;
		});
	});

	sheetAttempts.autoFilter = "A1:G1";

	// Save to reports/chat/BeastCode_Chat_Test_Report_<actual-run-timestamp>.xlsx
	const reportsDir = path.join(process.cwd(), "reports", "chat");
	if (!fs.existsSync(reportsDir)) {
		fs.mkdirSync(reportsDir, { recursive: true });
	}

	const dateStr = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
	const filePath = path.join(reportsDir, `BeastCode_Chat_Test_Report_${dateStr}.xlsx`);
	await workbook.xlsx.writeFile(filePath);

	return filePath;
}
