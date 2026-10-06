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

export interface ModelTrainingProblemDefinition {
	id: string; // unique slug e.g. "train-linear-bgd-01"
	title: string;
	difficulty: Difficulty;
	category: string; // "machine-learning"
	tags: string[];
	description: string;
	story: string;
	task: string;
	inputFormat: string;
	outputFormat: string;
	constraints: string;
	points: number;
	customCheckerType?: "exact" | "whitespace";
	customTimeoutMs?: number;
	customMemoryLimitMb?: number;
	executionProfile?: "machine_learning" | "normal" | "long";
	// Generates exactly 100 test cases with reference model training solver
	generateTestCases: () => GeneratedTestCase[];
}
