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

export interface ProblemDefinition {
	id: string; // slug
	title: string;
	difficulty: Difficulty;
	category: string;
	tags: string[];
	description: string; // short summary <= 140 chars
	story: string; // rich narrative background
	task: string; // explicit algorithmic objective
	inputFormat: string;
	outputFormat: string;
	constraints: string;
	points: number;
	customCheckerType?: "exact" | "whitespace";
	// Generator producing exactly 100 test cases with reference solutions
	generateTestCases: () => GeneratedTestCase[];
}
