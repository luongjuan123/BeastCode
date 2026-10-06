export interface ExecutionProfileSettings {
	timeoutMs: number;
	memoryLimitMb: number;
	maxOutputSizeChars: number;
	// Future limits
	cpuCount: number;
	diskLimitMb: number;
	processLimit: number;
}

export type ExecutionProfileType = "fast" | "normal" | "long" | "machine_learning" | "custom";

export const EXECUTION_PROFILES: Record<Exclude<ExecutionProfileType, "custom">, ExecutionProfileSettings> = {
	fast: {
		timeoutMs: 1000,
		memoryLimitMb: 64,
		maxOutputSizeChars: 16384, // 16 KB
		cpuCount: 1,
		diskLimitMb: 10,
		processLimit: 5,
	},
	normal: {
		timeoutMs: 5000,
		memoryLimitMb: 256,
		maxOutputSizeChars: 65536, // 64 KB
		cpuCount: 1,
		diskLimitMb: 50,
		processLimit: 15,
	},
	long: {
		timeoutMs: 15000,
		memoryLimitMb: 512,
		maxOutputSizeChars: 262144, // 256 KB
		cpuCount: 1,
		diskLimitMb: 100,
		processLimit: 30,
	},
	machine_learning: {
		timeoutMs: 60000,
		memoryLimitMb: 2048, // 2 GB
		maxOutputSizeChars: 1048576, // 1 MB
		cpuCount: 2,
		diskLimitMb: 1024,
		processLimit: 100,
	},
};

export const getEffectiveLimits = (
	profile: ExecutionProfileType | undefined,
	customSettings?: Partial<ExecutionProfileSettings>
): ExecutionProfileSettings => {
	const selectedProfile = profile || "normal";
	if (selectedProfile === "custom") {
		return {
			timeoutMs: Number(customSettings?.timeoutMs) || EXECUTION_PROFILES.normal.timeoutMs,
			memoryLimitMb: Number(customSettings?.memoryLimitMb) || EXECUTION_PROFILES.normal.memoryLimitMb,
			maxOutputSizeChars: Number(customSettings?.maxOutputSizeChars) || EXECUTION_PROFILES.normal.maxOutputSizeChars,
			cpuCount: Number(customSettings?.cpuCount) || EXECUTION_PROFILES.normal.cpuCount,
			diskLimitMb: Number(customSettings?.diskLimitMb) || EXECUTION_PROFILES.normal.diskLimitMb,
			processLimit: Number(customSettings?.processLimit) || EXECUTION_PROFILES.normal.processLimit,
		};
	}
	return EXECUTION_PROFILES[selectedProfile];
};

export const getProfileLabel = (profile: ExecutionProfileType): string => {
	switch (profile) {
		case "fast":
			return "Fast";
		case "normal":
			return "Normal";
		case "long":
			return "Long";
		case "machine_learning":
			return "Machine Learning";
		case "custom":
			return "Custom";
		default:
			return "Normal";
	}
};
