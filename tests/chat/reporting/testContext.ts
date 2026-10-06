import fs from "fs";
import path from "path";
import { CHAT_TEST_CASES, TestCaseManifest } from "../manifest";

export type TestStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "ERROR";

export interface TestAttempt {
	runId: string;
	testId: string;
	attemptNumber: number;
	status: TestStatus;
	durationMs: number;
	errorMessage?: string;
	timestamp: string;
}

export interface ExecutedTestResult {
	id: string;
	featureId: string;
	feature: string;
	priority: string;
	layer: "Unit" | "API" | "Rules" | "E2E";
	scenario: string;
	actors: string;
	status: TestStatus;
	durationMs: number;
	errorMessage?: string;
	evidence?: string;
	attempts: TestAttempt[];
}

export interface DefectRecord {
	defectId: string;
	testId: string;
	feature: string;
	title: string;
	severity: "Critical" | "High" | "Medium" | "Low";
	component: string;
	stepsToReproduce: string;
	expectedBehavior: string;
	actualBehavior: string;
	evidenceSnippet: string;
}

export interface RunMetadata {
	runId: string;
	startTime: string;
	endTime?: string;
	durationTotalMs?: number;
	serverUrl: string;
	os: string;
	nodeVersion: string;
	browser: string;
	firebaseProjectId: string;
}

export class TestRunContext {
	public metadata: RunMetadata;
	public results: Map<string, ExecutedTestResult> = new Map();
	public defects: DefectRecord[] = [];
	public allAttempts: TestAttempt[] = [];

	constructor(runId: string, serverUrl: string = "http://localhost:3005") {
		this.metadata = {
			runId,
			startTime: new Date().toISOString(),
			serverUrl,
			os: process.platform,
			nodeVersion: process.version,
			browser: "Google Chrome 150.0.7871.186 (Headless)",
			firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "beastcode-7555e",
		};

		// Initialize all test cases from manifest as SKIPPED
		for (const tc of CHAT_TEST_CASES) {
			this.results.set(tc.id, {
				id: tc.id,
				featureId: tc.featureId,
				feature: tc.feature,
				priority: tc.priority,
				layer: tc.layer,
				scenario: tc.scenario,
				actors: tc.actors,
				status: "SKIPPED",
				durationMs: 0,
				attempts: [],
			});
		}
	}

	public recordAttempt(
		testId: string,
		status: TestStatus,
		durationMs: number,
		errorMessage?: string,
		evidence?: string
	) {
		const existing = this.results.get(testId);
		const attemptNumber = (existing?.attempts.length || 0) + 1;
		const attempt: TestAttempt = {
			runId: this.metadata.runId,
			testId,
			attemptNumber,
			status,
			durationMs,
			errorMessage,
			timestamp: new Date().toISOString(),
		};

		this.allAttempts.push(attempt);

		if (existing) {
			existing.status = status;
			existing.durationMs = durationMs;
			existing.errorMessage = errorMessage;
			if (evidence) {
				existing.evidence = existing.evidence
					? `${existing.evidence}\n---\n${evidence}`
					: evidence;
			}
			existing.attempts.push(attempt);
		}
	}

	public addDefect(defect: DefectRecord) {
		this.defects.push(defect);
	}

	public finish() {
		this.metadata.endTime = new Date().toISOString();
		this.metadata.durationTotalMs =
			new Date(this.metadata.endTime).getTime() -
			new Date(this.metadata.startTime).getTime();
	}

	public getResultsList(): ExecutedTestResult[] {
		return Array.from(this.results.values());
	}

	public persist(filepath?: string): string {
		const targetPath =
			filepath ||
			path.join(process.cwd(), "reports", "chat", `results_${this.metadata.runId}.json`);
		const dir = path.dirname(targetPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		const data = {
			metadata: this.metadata,
			results: this.getResultsList(),
			defects: this.defects,
			attempts: this.allAttempts,
		};
		fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf8");
		return targetPath;
	}

	public static load(filepath: string): TestRunContext {
		const raw = fs.readFileSync(filepath, "utf8");
		const data = JSON.parse(raw);
		const ctx = new TestRunContext(data.metadata.runId, data.metadata.serverUrl);
		ctx.metadata = data.metadata;
		ctx.defects = data.defects || [];
		ctx.allAttempts = data.attempts || [];
		for (const r of data.results) {
			ctx.results.set(r.id, r);
		}
		return ctx;
	}
}
