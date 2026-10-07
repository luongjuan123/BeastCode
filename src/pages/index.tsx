import ProblemsTable from "@/components/ProblemsTable/ProblemsTable";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import BeastCodePagination from "@/components/UI/BeastCodePagination";
import AppShell from "@/components/UI/AppShell";
import PageHeader from "@/components/UI/PageHeader";

import useHasMounted from "@/hooks/useHasMounted";
import { useState, useEffect } from "react";
import { FaSearch, FaCheck, FaCode } from "react-icons/fa";

export default function Home() {
	const [loadingProblems, setLoadingProblems] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("default");
	
	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);
	const [totalItems, setTotalItems] = useState(0);

	const hasMounted = useHasMounted();

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, sortBy]);

	if (!hasMounted) return null;

	const sortOptions = [
		{ value: "default", label: "Default Order" },
		{ value: "a-z", label: "A to Z" },
		{ value: "z-a", label: "Z to A" },
		{ value: "easiest", label: "Easiest First" },
		{ value: "hardest", label: "Hardest First" },
		{ value: "likes", label: "Most Liked" },
		{ value: "dislikes", label: "Most Disliked" },
	];

	const totalPages = Math.ceil(totalItems / pageSize);

	return (
		<AppShell>
			{/* ── DOCUMENTATION PAGE HEADER ── */}
			<PageHeader
				breadcrumbs={[
					{ label: "BeastCode", href: "/" },
					{ label: "Problems" },
				]}
				title="Problems"
				description="Algorithmic problem index, code kata, and competitive programming challenges."
				actions={
					<div className="flex items-center gap-2 text-xs font-mono text-text-muted">
						<span className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-border-default">
							<strong className="text-text-primary">{totalItems}</strong> problems
						</span>
					</div>
				}
			/>

			{/* ── FILTER & TOPICS BAR ── */}
			<div className="space-y-3.5 mb-6">
				{/* Topic Filter Chips */}
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
					{[
						{ label: "All Topics", value: "" },
						{ label: "Arrays", value: "array" },
						{ label: "Two Pointers", value: "two-pointers" },
						{ label: "Dynamic Programming", value: "dynamic-programming" },
						{ label: "Graphs", value: "graph" },
						{ label: "Trees", value: "tree" },
						{ label: "Strings", value: "string" },
						{ label: "Binary Search", value: "binary-search" },
						{ label: "Math", value: "math" },
						{ label: "Sorting", value: "sorting" },
					].map((chip) => {
						const active = searchQuery.toLowerCase().trim() === chip.value.toLowerCase().trim();
						return (
							<button
								key={chip.label}
								onClick={() => setSearchQuery(chip.value)}
								className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-100 select-none ${
									active
										? "bg-accent/10 border border-accent/30 text-accent font-semibold"
										: "bg-[var(--bg-surface)] border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong"
								}`}
							>
								{chip.label}
							</button>
						);
					})}
				</div>

				{/* Search & Sort Controls */}
				<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
					{/* Search Field */}
					<div className="relative flex-1 max-w-md">
						<FaSearch
							className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
							size={11}
						/>
						<input
							type="text"
							placeholder="Search by title, tag, or topic..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border-default bg-[var(--bg-surface)] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
						/>
					</div>

					{/* Sort Dropdown */}
					<div className="flex items-center gap-2">
						<span className="text-xs text-text-muted uppercase font-mono tracking-wider">Sort</span>
						<div className="w-44">
							<BeastCodeSelect
								size="sm"
								options={sortOptions}
								value={sortBy}
								onChange={setSortBy}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* ── TECHNICAL DATA TABLE ── */}
			<div className="rounded-lg border border-border-default bg-[var(--bg-surface)] overflow-hidden mb-4">
				{/* Loading skeleton */}
				{loadingProblems && (
					<div className="p-3 space-y-2">
						{[...Array(8)].map((_, i) => (
							<div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
								<div className="w-4 h-4 rounded-full bg-[var(--bg-elevated)]" />
								<div className="flex-1 h-3.5 rounded bg-[var(--bg-elevated)]" />
								<div className="w-16 h-3 rounded bg-[var(--bg-elevated)]" />
								<div className="w-20 h-3 rounded bg-[var(--bg-elevated)] hidden sm:block" />
							</div>
						))}
					</div>
				)}

				<table className="w-full text-left text-xs">
					{!loadingProblems && (
						<thead>
							<tr className="border-b border-border-default bg-[#0c0e0d] text-text-muted uppercase font-mono text-[10px] tracking-wider select-none">
								<th className="pl-4 pr-2 py-2.5 w-8">
									<FaCheck size={9} />
								</th>
								<th className="px-4 py-2.5 font-medium">Title</th>
								<th className="px-4 py-2.5 font-medium">Difficulty</th>
								<th className="px-4 py-2.5 font-medium hidden sm:table-cell">Tags</th>
								<th className="px-4 py-2.5 font-medium hidden md:table-cell">Acceptance</th>
								<th className="px-4 py-2.5 font-medium hidden md:table-cell">Solution</th>
							</tr>
						</thead>
					)}
					<ProblemsTable
						setLoadingProblems={setLoadingProblems}
						searchQuery={searchQuery}
						sortBy={sortBy}
						currentPage={currentPage}
						pageSize={pageSize}
						setTotalItems={setTotalItems}
					/>
				</table>

				{/* Bottom Pagination */}
				{!loadingProblems && totalPages > 0 && (
					<BeastCodePagination
						currentPage={currentPage}
						totalPages={totalPages}
						onPageChange={setCurrentPage}
						pageSize={pageSize}
						onPageSizeChange={setPageSize}
						pageSizeOptions={[10, 25, 50]}
						totalItems={totalItems}
					/>
				)}
			</div>
		</AppShell>
	);
}
