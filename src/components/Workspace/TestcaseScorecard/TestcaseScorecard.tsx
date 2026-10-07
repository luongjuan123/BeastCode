import React, { useState, useMemo, useEffect } from "react";
import { FiCheck, FiX, FiClock, FiCpu, FiNavigation, FiChevronsRight } from "react-icons/fi";

export interface TestCaseResult {
	passed: boolean;
	input?: string;
	expected?: string;
	actual?: string;
	error?: string;
	runtime?: number;
	memory?: number;
}

interface TestcaseScorecardProps {
	testResults: TestCaseResult[];
	activeIndex: number;
	setActiveIndex: (index: number) => void;
	runtime?: number;
	memory?: number;
	score?: number;
}

// 1. TestcaseSummary Sub-Component
export const TestcaseSummary: React.FC<{
	total: number;
	passed: number;
	failed: number;
	score?: number;
	runtime?: number;
	memory?: number;
}> = ({ total, passed, failed, score, runtime, memory }) => {
	const displayScore = score !== undefined ? score : (total > 0 ? (passed / total) * 100 : 0);
	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-bg-surface border border-border-subtle p-3.5 rounded-md select-none mb-4">
			<div className="flex flex-col gap-0.5">
				<span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Passed</span>
				<span className="text-base font-mono font-bold text-accent flex items-center gap-1.5">
					<FiCheck size={14} />
					{passed}
				</span>
			</div>
			
			<div className="flex flex-col gap-0.5">
				<span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Failed</span>
				<span className="text-base font-mono font-bold text-bc-error flex items-center gap-1.5">
					<FiX size={14} />
					{failed}
				</span>
			</div>

			<div className="flex flex-col gap-0.5">
				<span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Accuracy</span>
				<span className="text-base font-mono font-bold text-text-primary">
					{displayScore.toFixed(1)}%
				</span>
			</div>

			{runtime !== undefined && (
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Runtime</span>
					<span className="text-base font-mono font-bold text-text-primary flex items-center gap-1">
						<FiClock size={12} className="text-text-muted" />
						{runtime} <span className="text-[10px] font-normal text-text-muted">ms</span>
					</span>
				</div>
			)}

			{memory !== undefined && (
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Memory</span>
					<span className="text-base font-mono font-bold text-text-primary flex items-center gap-1">
						<FiCpu size={12} className="text-text-muted" />
						{(memory / 1024).toFixed(2)} <span className="text-[10px] font-normal text-text-muted">MB</span>
					</span>
				</div>
			)}
		</div>
	);
};

// 2. TestcaseCell Sub-Component
export const TestcaseCell: React.FC<{
	index: number;
	passed: boolean;
	status: string;
	runtime?: number;
	memory?: number;
	isActive: boolean;
	onClick: () => void;
}> = ({ index, passed, status, runtime, memory, isActive, onClick }) => {
	const [hovered, setHovered] = useState(false);

	let statusClasses = "";
	if (status === "Accepted") {
		statusClasses = "bg-accent/10 border-accent/25 text-accent hover:bg-accent/20";
	} else if (status === "Time Limit Exceeded" || status === "Memory Limit Exceeded") {
		statusClasses = "bg-bc-warning/10 border-bc-warning/25 text-bc-warning hover:bg-bc-warning/20";
	} else {
		statusClasses = "bg-bc-error/10 border-bc-error/25 text-bc-error hover:bg-bc-error/20";
	}

	const selectedClasses = isActive
		? "ring-1 ring-accent border-accent z-10"
		: "";

	return (
		<div 
			className="relative shrink-0"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<button
				type="button"
				onClick={onClick}
				className={`w-7 h-7 flex items-center justify-center rounded border text-[10px] font-mono font-medium transition-colors ${statusClasses} ${selectedClasses}`}
			>
				{index}
			</button>

			{hovered && (
				<div 
					className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-2.5 rounded-md border border-border-default bg-bg-surface-elevated z-50 text-left pointer-events-none animate-fade-in"
				>
					<p className="text-[10px] font-mono text-accent uppercase tracking-wider mb-1">
						Case #{index}
					</p>
					<div className="space-y-0.5 text-[10px] font-mono text-text-primary">
						<p><span className="text-text-muted">Status:</span> <span className={passed ? "text-accent" : "text-bc-error"}>{status}</span></p>
						<p><span className="text-text-muted">Runtime:</span> {runtime !== undefined ? `${runtime} ms` : "—"}</p>
						<p><span className="text-text-muted">Memory:</span> {memory !== undefined ? `${(memory / 1024).toFixed(2)} MB` : "—"}</p>
					</div>
				</div>
			)}
		</div>
	);
};

// 3. Main TestcaseScorecard Component
const TestcaseScorecard: React.FC<TestcaseScorecardProps> = ({
	testResults,
	activeIndex,
	setActiveIndex,
	runtime,
	memory,
	score
}) => {
	const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
	const [currentPage, setCurrentPage] = useState(0);
	const [jumpInput, setJumpInput] = useState("");

	// Dynamic calculation of stats
	const totalCount = testResults.length;
	const passedCount = useMemo(() => testResults.filter((r) => r.passed).length, [testResults]);
	const failedCount = totalCount - passedCount;

	const calculatedRuntime = useMemo(() => {
		if (runtime !== undefined) return runtime;
		const values = testResults.map((r) => r.runtime).filter((v) => v !== undefined) as number[];
		if (values.length === 0) return undefined;
		return Math.max(...values);
	}, [testResults, runtime]);

	const calculatedMemory = useMemo(() => {
		if (memory !== undefined) return memory;
		const values = testResults.map((r) => r.memory).filter((v) => v !== undefined) as number[];
		if (values.length === 0) return undefined;
		return Math.max(...values);
	}, [testResults, memory]);

	// Filtered cases keeping reference to their original 0-based index
	const filteredCases = useMemo(() => {
		const mapped = testResults.map((tc, idx) => ({ ...tc, originalIndex: idx }));
		if (filter === "passed") {
			return mapped.filter((tc) => tc.passed);
		}
		if (filter === "failed") {
			return mapped.filter((tc) => !tc.passed);
		}
		return mapped;
	}, [testResults, filter]);

	// Pagination setup (100 testcases per page segment)
	const itemsPerPage = 100;
	const totalPages = Math.ceil(filteredCases.length / itemsPerPage);

	// Safe guard current page
	useEffect(() => {
		if (currentPage >= totalPages && totalPages > 0) {
			setCurrentPage(0);
		}
	}, [filteredCases, totalPages, currentPage]);

	const paginatedCases = useMemo(() => {
		const start = currentPage * itemsPerPage;
		return filteredCases.slice(start, start + itemsPerPage);
	}, [filteredCases, currentPage]);

	// Jump navigation executor
	const handleJump = (e: React.FormEvent) => {
		e.preventDefault();
		const num = parseInt(jumpInput, 10);
		if (isNaN(num) || num < 1 || num > totalCount) {
			return;
		}

		const targetIdx = num - 1;
		const targetCase = testResults[targetIdx];

		// If it doesn't match the active filter, reset filter back to all
		if (filter === "passed" && !targetCase.passed) {
			setFilter("all");
		} else if (filter === "failed" && targetCase.passed) {
			setFilter("all");
		}

		setActiveIndex(targetIdx);
		setCurrentPage(Math.floor(targetIdx / itemsPerPage));
		setJumpInput("");
	};

	return (
		<div className="flex flex-col gap-5 w-full animate-fade-in select-none">
			
			{/* Summary Bar */}
			<TestcaseSummary
				total={totalCount}
				passed={passedCount}
				failed={failedCount}
				score={score}
				runtime={calculatedRuntime}
				memory={calculatedMemory}
			/>

			{/* Controls and Jump Panel */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4 select-none">
				
				{/* Filtering tabs */}
				<div className="flex gap-1 bg-[var(--bg-dark-fill-3)] p-1 rounded-xl border border-[var(--border-subtle)]">
					{(["all", "passed", "failed"] as const).map((type) => (
						<button
							key={type}
							type="button"
							onClick={() => setFilter(type)}
							className={`px-2.5 py-1 text-xs font-mono rounded transition-colors capitalize ${
								filter === type
									? "bg-bg-surface text-accent font-semibold"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							{type === "all" ? "All Cases" : type}
						</button>
					))}
				</div>

				{/* Navigation details & Jump input */}
				<div className="flex items-center gap-3">
					<form onSubmit={handleJump} className="flex items-center gap-1.5 bg-bg-surface border border-border-subtle px-2 py-0.5 rounded-md">
						<span className="text-[10px] font-mono text-text-muted uppercase shrink-0">Case</span>
						<input
							type="text"
							value={jumpInput}
							onChange={(e) => setJumpInput(e.target.value)}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							placeholder={`1-${totalCount}`}
							className="bg-transparent font-mono text-xs text-text-primary outline-none border-none p-0 focus:ring-0 w-10 text-center"
						/>
						<button type="submit" className="text-text-secondary hover:text-accent transition p-0.5">
							<FiNavigation size={11} className="rotate-45" />
						</button>
					</form>
				</div>
			</div>

			{/* Segmented page switcher for large testcase collections */}
			{totalPages > 1 && (
				<div className="flex flex-wrap gap-1 bg-bg-surface border border-border-subtle p-1 rounded-md">
					{Array.from({ length: totalPages }).map((_, idx) => {
						const start = idx * itemsPerPage + 1;
						const end = Math.min((idx + 1) * itemsPerPage, filteredCases.length);
						return (
							<button
								key={idx}
								type="button"
								onClick={() => setCurrentPage(idx)}
								className={`px-2.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
									currentPage === idx
										? "bg-accent text-bg-base font-semibold"
										: "text-text-secondary hover:bg-bg-surface-hover"
								}`}
							>
								{start}-{end}
							</button>
						);
					})}
				</div>
			)}

			{/* Actual Testcase Grid */}
			<div className="flex flex-wrap gap-2 justify-start">
				{paginatedCases.map((tc) => {
					const getCaseStatus = (c: any) => {
						if (c.passed) return "Accepted";
						if (c.error) {
							if (c.error.includes("Time Limit Exceeded")) return "Time Limit Exceeded";
							if (c.error.includes("Memory Limit Exceeded")) return "Memory Limit Exceeded";
							if (c.error.includes("Runtime Error")) return "Runtime Error";
							return c.error;
						}
						return "Wrong Answer";
					};
					const status = getCaseStatus(tc);
					return (
						<TestcaseCell
							key={tc.originalIndex}
							index={tc.originalIndex + 1}
							passed={tc.passed}
							status={status}
							runtime={tc.runtime}
							memory={tc.memory}
							isActive={activeIndex === tc.originalIndex}
							onClick={() => setActiveIndex(tc.originalIndex)}
						/>
					);
				})}
			</div>

			{/* Safe fallback for zero matching items */}
			{filteredCases.length === 0 && (
				<div className="text-center py-8 text-xs text-[var(--text-muted)] italic">
					No test cases match this selection filter.
				</div>
			)}
		</div>
	);
};

export default TestcaseScorecard;
