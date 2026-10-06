export type Difficulty = "Easy" | "Medium" | "Hard";

export interface GeneratedTestCase {
	id: number;
	inputText: string;
	outputText: string;
	explanation?: string;
	isSample: boolean;
	isAdditional: boolean;
	strength: number;
}

export interface LRProblemDefinition {
	id: string; // unique slug
	title: string;
	difficulty: Difficulty;
	category: string;
	tags: string[];
	description: string;
	story: string;
	task: string;
	inputFormat: string;
	outputFormat: string;
	constraints: string;
	points: number;
	customCheckerType?: "exact" | "whitespace";
	customTimeoutMs?: number; // e.g. 15000 ms
	customMemoryLimitMb?: number; // e.g. 1024 MB
	executionProfile?: "machine_learning" | "normal" | "long";
	// Generator producing exactly 100 test cases with reference ML solutions
	generateTestCases: () => GeneratedTestCase[];
}
