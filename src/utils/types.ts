export interface ProblemStandingResult {
	solved: boolean;
	score: number;
	penalty: number;
	incorrectAttempts: number;
	solvedTime?: number; // timestamp
}

export interface ContestParticipantStanding {
	uid: string;
	username: string;
	totalScore: number;
	totalPenalty: number;
	problemResults: Record<string, ProblemStandingResult>; // Key is problemId
}

export interface ContestStandingsCache {
	contestId: string;
	standings: ContestParticipantStanding[];
	lastUpdated: number;
}

export interface SandboxExecutionOptions {
	command: string;
	args: string[];
	stdinData: string;
	limits: {
		timeoutMs: number;
		memoryLimitMb: number;
		maxOutputSizeChars: number;
	};
	language?: string;
}

export interface SandboxExecutionResult {
	stdout: string;
	stderr: string;
	code: number | null;
	timedOut: boolean;
	memoryLimitExceeded: boolean;
	outputLimitExceeded: boolean;
}

export interface SandboxLoggingPayload {
	runId: string;
	command: string;
	language: string;
	memoryMaxBytes: number;
	pidsMax: number;
	cpuMax: string;
	timestamp: number;
}

export interface ProvisionResponse {
	success: boolean;
	message: string;
	alreadyProvisioned?: boolean;
}

export interface UserProfileDocument {
	uid: string;
	username: string;
	displayName: string;
	email: string;
	experienceLevel: string;
	solvedProblems: string[];
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	mlCount: number;
	xp: number;
	role: string;
	likedProblems: string[];
	dislikedProblems: string[];
	starredProblems: string[];
	showStudentInfo: boolean;
	isOnboarded: boolean;
	createdAt: number;
	updatedAt: number;
	studentId?: string;
	school?: string;
	faculty?: string;
	class?: string;
	avatarUrl?: string;
}
