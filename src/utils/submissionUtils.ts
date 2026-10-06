import {
	FaCheckCircle,
	FaTimesCircle,
	FaExclamationTriangle,
	FaClock,
	FaMicrochip,
	FaFileAlt,
	FaBan,
	FaHourglassHalf,
	FaSync,
	FaSpinner,
	FaTerminal,
	FaPlayCircle
} from "react-icons/fa";

export interface StateVisualMetadata {
	name: string;
	label: string;
	color: string;
	bgColor: string;
	borderColor: string;
	glowShadow: string;
	Icon: any;
	description: string;
	advice: string;
	badgeStyle: React.CSSProperties;
}

export function getSubmissionStateMetadata(verdict: string, status?: string): StateVisualMetadata {
	const v = (verdict || "").toLowerCase();
	const s = (status || "").toLowerCase();

	// 1. Check active background states first
	if (s === "submitting") {
		return {
			name: "submitting",
			label: "Submitting",
			color: "var(--brand-orange)",
			bgColor: "color-mix(in srgb, var(--brand-orange) 8%, transparent)",
			borderColor: "color-mix(in srgb, var(--brand-orange) 20%, transparent)",
			glowShadow: "var(--shadow-glow-warning)",
			Icon: FaSpinner,
			description: "Transferring solution packet to server clusters...",
			advice: "Please do not close this window or navigate away.",
			badgeStyle: { color: "var(--brand-orange)", backgroundColor: "rgba(245, 158, 11, 0.08)" }
		};
	}

	if (s === "queued") {
		return {
			name: "queued",
			label: "Queued",
			color: "#3b82f6",
			bgColor: "rgba(59, 130, 246, 0.08)",
			borderColor: "rgba(59, 130, 246, 0.2)",
			glowShadow: "0 0 12px rgba(59, 130, 246, 0.25)",
			Icon: FaHourglassHalf,
			description: "Waiting in BeastCode distributed scheduler queue...",
			advice: "The execution engine will process your code shortly.",
			badgeStyle: { color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.08)" }
		};
	}

	if (s === "compiling") {
		return {
			name: "compiling",
			label: "Compiling",
			color: "#f59e0b",
			bgColor: "rgba(245, 158, 11, 0.08)",
			borderColor: "rgba(245, 158, 11, 0.2)",
			glowShadow: "0 0 12px rgba(245, 158, 11, 0.25)",
			Icon: FaTerminal,
			description: "Compiling source files to machine binaries / bytecode...",
			advice: "Optimizing compilation flags and checking syntax.",
			badgeStyle: { color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.08)" }
		};
	}

	if (s === "running") {
		return {
			name: "running",
			label: "Running",
			color: "#a78bfa",
			bgColor: "rgba(167, 139, 250, 0.08)",
			borderColor: "rgba(167, 139, 250, 0.2)",
			glowShadow: "0 0 12px rgba(167, 139, 250, 0.25)",
			Icon: FaPlayCircle,
			description: "Executing testcases against sandboxed container nodes...",
			advice: "Measuring CPU cycles, virtual memory, and peak allocations.",
			badgeStyle: { color: "#a78bfa", backgroundColor: "rgba(167, 139, 250, 0.08)" }
		};
	}

	if (s === "evaluating") {
		return {
			name: "evaluating",
			label: "Evaluating",
			color: "#06b6d4",
			bgColor: "rgba(6, 182, 212, 0.08)",
			borderColor: "rgba(6, 182, 212, 0.2)",
			glowShadow: "0 0 12px rgba(6, 182, 212, 0.25)",
			Icon: FaSync,
			description: "Invoking Special Judge checkers and validating diffs...",
			advice: "Almost there! Comparing actual outputs against target results.",
			badgeStyle: { color: "#06b6d4", backgroundColor: "rgba(6, 182, 212, 0.08)" }
		};
	}

	// 2. Map Verdicts to States
	if (v.includes("accepted") || v === "passed") {
		return {
			name: "accepted",
			label: "Accepted",
			color: "var(--color-success)",
			bgColor: "var(--color-success-bg)",
			borderColor: "var(--color-success-border)",
			glowShadow: "var(--shadow-glow-success)",
			Icon: FaCheckCircle,
			description: "All test cases passed successfully! Code is correct.",
			advice: "Great job! Compare runtime and memory statistics below.",
			badgeStyle: { color: "var(--color-success)", backgroundColor: "var(--color-success-bg)", outline: "1px solid var(--color-success-border)" }
		};
	}

	if (v.includes("wrong answer")) {
		return {
			name: "wrong_answer",
			label: "Wrong Answer",
			color: "var(--color-error)",
			bgColor: "var(--color-error-bg)",
			borderColor: "var(--color-error-border)",
			glowShadow: "var(--shadow-glow-error)",
			Icon: FaTimesCircle,
			description: "Output does not match the expected test case solution.",
			advice: "Verify edge cases, dry run with sample test cases, or inspect sample input/output mismatches.",
			badgeStyle: { color: "var(--color-error)", backgroundColor: "var(--color-error-bg)", outline: "1px solid var(--color-error-border)" }
		};
	}

	if (v.includes("compilation error")) {
		return {
			name: "compilation_error",
			label: "Compilation Error",
			color: "var(--color-warning)",
			bgColor: "rgba(245, 158, 11, 0.08)",
			borderColor: "rgba(245, 158, 11, 0.25)",
			glowShadow: "var(--shadow-glow-warning)",
			Icon: FaExclamationTriangle,
			description: "Code compilation failed. Compiler threw syntax or linker errors.",
			advice: "Click on details below to view the compiler trace, fix imports, or resolve missing declarations.",
			badgeStyle: { color: "var(--color-warning)", backgroundColor: "rgba(245, 158, 11, 0.08)", outline: "1px solid rgba(245, 158, 11, 0.25)" }
		};
	}

	if (v.includes("time limit exceeded")) {
		return {
			name: "time_limit_exceeded",
			label: "Time Limit Exceeded",
			color: "#f59e0b",
			bgColor: "rgba(245, 158, 11, 0.08)",
			borderColor: "rgba(245, 158, 11, 0.25)",
			glowShadow: "var(--shadow-glow-warning)",
			Icon: FaClock,
			description: "Code took longer to execute than the allowed problem timeout threshold.",
			advice: "Optimize algorithms from O(N²) to O(N log N), avoid infinite recursion loops, or simplify deep nested iterations.",
			badgeStyle: { color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.08)", outline: "1px solid rgba(245, 158, 11, 0.25)" }
		};
	}

	if (v.includes("memory limit exceeded")) {
		return {
			name: "memory_limit_exceeded",
			label: "Memory Limit Exceeded",
			color: "#8b5cf6",
			bgColor: "rgba(139, 92, 246, 0.08)",
			borderColor: "rgba(139, 92, 246, 0.25)",
			glowShadow: "0 0 12px rgba(139, 92, 246, 0.3)",
			Icon: FaMicrochip,
			description: "Memory footprint allocated by program exceeded sandbox limits.",
			advice: "Avoid creating enormous array buffers, resolve potential memory leaks, or switch to space-efficient data structures.",
			badgeStyle: { color: "#8b5cf6", backgroundColor: "rgba(139, 92, 246, 0.08)", outline: "1px solid rgba(139, 92, 246, 0.25)" }
		};
	}

	if (v.includes("output limit exceeded")) {
		return {
			name: "output_limit_exceeded",
			label: "Output Limit Exceeded",
			color: "#06b6d4",
			bgColor: "rgba(6, 182, 212, 0.08)",
			borderColor: "rgba(6, 182, 212, 0.25)",
			glowShadow: "0 0 12px rgba(6, 182, 212, 0.3)",
			Icon: FaFileAlt,
			description: "Output buffer filled beyond maximum character bytes limit.",
			advice: "Remove debug printing calls like console.log or print inside code loops.",
			badgeStyle: { color: "#06b6d4", backgroundColor: "rgba(6, 182, 212, 0.08)", outline: "1px solid rgba(6, 182, 212, 0.25)" }
		};
	}

	if (v.includes("runtime error") || v.includes("runtime_error")) {
		return {
			name: "runtime_error",
			label: "Runtime Error",
			color: "#ec4899",
			bgColor: "rgba(236, 72, 153, 0.08)",
			borderColor: "rgba(236, 72, 153, 0.25)",
			glowShadow: "0 0 12px rgba(236, 72, 153, 0.3)",
			Icon: FaExclamationTriangle,
			description: "Process crashed during execution. Threw exception or segment fault.",
			advice: "Check for Null Pointer Dereferences, Index Out of Bounds errors, or undefined attributes access.",
			badgeStyle: { color: "#ec4899", backgroundColor: "rgba(236, 72, 153, 0.08)", outline: "1px solid rgba(236, 72, 153, 0.25)" }
		};
	}

	if (v.includes("canceled") || v === "cancelled") {
		return {
			name: "canceled",
			label: "Canceled",
			color: "#9ca3af",
			bgColor: "rgba(156, 163, 175, 0.08)",
			borderColor: "rgba(156, 163, 175, 0.25)",
			glowShadow: "none",
			Icon: FaBan,
			description: "Execution canceled manually by user or abort hook.",
			advice: "Resubmit your code if you wish to run it again.",
			badgeStyle: { color: "#9ca3af", backgroundColor: "rgba(156, 163, 175, 0.08)", outline: "1px solid rgba(156, 163, 175, 0.25)" }
		};
	}

	if (v.includes("internal error") || v.includes("internal_error")) {
		return {
			name: "internal_error",
			label: "Internal Error",
			color: "#6b7280",
			bgColor: "rgba(107, 114, 128, 0.08)",
			borderColor: "rgba(107, 114, 128, 0.25)",
			glowShadow: "none",
			Icon: FaExclamationTriangle,
			description: "BeastCode cluster node experienced backend timeout or virtualization error.",
			advice: "This is not your fault. Try resubmitting code in a few moments.",
			badgeStyle: { color: "#6b7280", backgroundColor: "rgba(107, 114, 128, 0.08)", outline: "1px solid rgba(107, 114, 128, 0.25)" }
		};
	}

	// Default Idle State
	return {
		name: "idle",
		label: "Idle",
		color: "var(--text-secondary)",
		bgColor: "var(--bg-dark-fill-3)",
		borderColor: "var(--border-subtle)",
		glowShadow: "none",
		Icon: FaPlayCircle,
		description: "Ready to run or submit solution.",
		advice: "Choose language, write your code, and click Run or Submit.",
		badgeStyle: { color: "var(--text-secondary)", backgroundColor: "var(--bg-dark-fill-3)" }
	};
}
