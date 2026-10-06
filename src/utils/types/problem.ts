export type Example = {
	id: number;
	inputText: string;
	outputText: string;
	explanation?: string;
	img?: string;
	isSample?: boolean;
	isAdditional?: boolean;
};

// local problem data
export type Problem = {
	id: string;
	title: string;
	problemStatement: string;
	examples: Example[];
	constraints: string;
	starterCode: string;
	handlerFunction: ((fn: any) => boolean) | string;
	starterFunctionName: string;
	inputFormat?: string;
	outputFormat?: string;
	tags?: string[];
	description?: string;
	language?: string;
	difficulty?: string;
	points?: number;
	customChecker?: {
		type: string;
		epsilon?: number;
		scriptLanguage?: string;
		scriptCode?: string;
	};
	editorial?: {
		markdown?: string;
		videoUrl?: string;
	};
	executionProfile?: "fast" | "normal" | "long" | "machine_learning" | "custom";
	customTimeoutMs?: number;
	customMemoryLimitMb?: number;
	customMaxOutputSizeChars?: number;
	customCpuCount?: number;
	customDiskLimitMb?: number;
	customProcessLimit?: number;
};

export type DBProblem = {
	id: string;
	title: string;
	tags: string[];
	difficulty: string;
	likes: number;
	dislikes: number;
	videoId?: string;
	link?: string;
	attempts?: number;
	solved?: number;
};
