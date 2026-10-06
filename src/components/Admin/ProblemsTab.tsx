import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
	FiSearch,
	FiChevronDown,
	FiTrash2,
	FiPlus,
	FiEdit3,
	FiBookOpen,
	FiX,
	FiChevronLeft,
	FiChevronRight,
	FiDownload
} from "react-icons/fi";
import { ConfirmationModal } from "./AdminShared";
import BeastCodeSelect from "../UI/BeastCodeSelect";

interface ProblemListItem {
	id: string;
	title: string;
	tags: string[];
	difficulty: string;
	isStatic: boolean;
}

interface ProblemsTabProps {
	problems: ProblemListItem[];
	loading: boolean;
	allTags: string[];
	onDeleteProblem: (id: string) => Promise<void>;
	onBulkDelete: (ids: string[]) => Promise<void>;
	onBulkChangeDifficulty: (ids: string[], difficulty: string) => Promise<void>;
	onBulkChangeTags: (ids: string[], tags: string[]) => Promise<void>;
	onApplyBulkEdit: (ids: string[], policy: any) => Promise<void>;
	onBulkExport: (ids: string[]) => Promise<void>;
}

export const ProblemsTab: React.FC<ProblemsTabProps> = ({
	problems,
	loading,
	allTags,
	onDeleteProblem,
	onBulkDelete,
	onBulkChangeDifficulty,
	onBulkChangeTags,
	onApplyBulkEdit,
	onBulkExport
}) => {
	// Search and Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [difficultyFilter, setDifficultyFilter] = useState("All");
	const [typeFilter, setTypeFilter] = useState("All");
	const [tagFilter, setTagFilter] = useState("All");
	const [sortBy, setSortBy] = useState("title-asc");

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Selection & Modals
	const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
	const [problemToDelete, setProblemToDelete] = useState<string | null>(null);
	const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
	const [showBulkTagsModal, setShowBulkTagsModal] = useState(false);
	const [showBulkModal, setShowBulkModal] = useState(false);

	// Bulk Inputs
	const [bulkTagsInput, setBulkTagsInput] = useState("");
	const [bulkProfile, setBulkProfile] = useState("normal");
	const [bulkTimeoutMs, setBulkTimeoutMs] = useState(5000);
	const [bulkMemoryLimitMb, setBulkMemoryLimitMb] = useState(256);
	const [bulkMaxOutputSizeChars, setBulkMaxOutputSizeChars] = useState(65536);
	const [bulkCpuCount, setCpuCount] = useState(1);
	const [bulkDiskLimitMb, setDiskLimitMb] = useState(50);
	const [bulkProcessLimit, setProcessLimit] = useState(15);
	const [bulkSubmitting, setBulkSubmitting] = useState(false);

	const difficultyOptions = useMemo(() => [
		{ value: "All", label: "Difficulty: All" },
		{ value: "Easy", label: "Easy" },
		{ value: "Medium", label: "Medium" },
		{ value: "Hard", label: "Hard" }
	], []);

	const typeOptions = useMemo(() => [
		{ value: "All", label: "Type: All" },
		{ value: "Static", label: "Static / Core" },
		{ value: "Database", label: "Database Only" }
	], []);

	const tagOptions = useMemo(() => [
		{ value: "All", label: "Tag: All" },
		...allTags.map((tag) => ({ value: tag, label: tag }))
	], [allTags]);

	const sortOptions = useMemo(() => [
		{ value: "title-asc", label: "Sort: A - Z" },
		{ value: "title-desc", label: "Sort: Z - A" },
		{ value: "difficulty-asc", label: "Difficulty: Easy - Hard" },
		{ value: "difficulty-desc", label: "Difficulty: Hard - Easy" }
	], []);

	// Filter reset on query updates
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, difficultyFilter, typeFilter, tagFilter, sortBy]);

	// Filter & Sort Logic
	const filteredProblems = useMemo(() => {
		let result = [...problems];

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(query) ||
					p.id.toLowerCase().includes(query)
			);
		}

		if (difficultyFilter !== "All") {
			result = result.filter((p) => p.difficulty === difficultyFilter);
		}

		if (typeFilter !== "All") {
			const isStaticOnly = typeFilter === "Static";
			result = result.filter((p) => p.isStatic === isStaticOnly);
		}

		if (tagFilter !== "All") {
			result = result.filter((p) => p.tags.includes(tagFilter));
		}

		result.sort((a, b) => {
			if (sortBy === "title-asc") {
				return a.title.localeCompare(b.title);
			}
			if (sortBy === "title-desc") {
				return b.title.localeCompare(a.title);
			}
			if (sortBy === "difficulty-asc") {
				const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
				return (rank[a.difficulty] || 0) - (rank[b.difficulty] || 0);
			}
			if (sortBy === "difficulty-desc") {
				const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
				return (rank[b.difficulty] || 0) - (rank[a.difficulty] || 0);
			}
			return 0;
		});

		return result;
	}, [problems, searchQuery, difficultyFilter, typeFilter, tagFilter, sortBy]);

	const paginatedProblems = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredProblems.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredProblems, currentPage]);

	const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);

	// Action wrappers
	const handleConfirmDelete = async () => {
		if (!problemToDelete) return;
		await onDeleteProblem(problemToDelete);
		setProblemToDelete(null);
	};

	const handleBulkDelete = async () => {
		setBulkSubmitting(true);
		try {
			await onBulkDelete(selectedProblemIds);
			setSelectedProblemIds([]);
			setShowBulkDeleteConfirm(false);
		} finally {
			setBulkSubmitting(false);
		}
	};

	const handleBulkChangeDifficulty = async (difficulty: string) => {
		setBulkSubmitting(true);
		try {
			await onBulkChangeDifficulty(selectedProblemIds, difficulty);
			setSelectedProblemIds([]);
		} finally {
			setBulkSubmitting(false);
		}
	};

	const handleBulkChangeTags = async () => {
		setBulkSubmitting(true);
		const tags = bulkTagsInput
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
		try {
			await onBulkChangeTags(selectedProblemIds, tags);
			setSelectedProblemIds([]);
			setBulkTagsInput("");
			setShowBulkTagsModal(false);
		} finally {
			setBulkSubmitting(false);
		}
	};

	const handleApplyBulkEdit = async () => {
		setBulkSubmitting(true);
		const policy = {
			executionProfile: bulkProfile,
			customTimeoutMs: Number(bulkTimeoutMs) || 5000,
			customMemoryLimitMb: Number(bulkMemoryLimitMb) || 256,
			customMaxOutputSizeChars: Number(bulkMaxOutputSizeChars) || 65536,
			customCpuCount: Number(bulkCpuCount) || 1,
			customDiskLimitMb: Number(bulkDiskLimitMb) || 50,
			customProcessLimit: Number(bulkProcessLimit) || 15
		};
		try {
			await onApplyBulkEdit(selectedProblemIds, policy);
			setSelectedProblemIds([]);
			setShowBulkModal(false);
		} finally {
			setBulkSubmitting(false);
		}
	};

	const handleBulkExport = async () => {
		await onBulkExport(selectedProblemIds);
		setSelectedProblemIds([]);
	};

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Top Panel Header */}
			<div className="flex justify-between items-center select-none">
				<div>
					<h2 className="text-base font-bold text-[var(--text-primary)]">Manage Challenges</h2>
					<p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
						Create, import, edit, and apply sandbox constraints to coding challenges.
					</p>
				</div>
				<Link
					href="/admin/problems/new"
					className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-450 text-black font-semibold text-xs rounded-md transition shadow-sm"
				>
					<FiPlus size={13} />
					<span>Add New Problem</span>
				</Link>
			</div>

			{/* Problems Table Card container */}
			<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm overflow-hidden flex flex-col">
				
				{/* Filters toolbar section */}
				<div className="p-4 bg-[var(--bg-dark-fill-3)] border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-3 select-none">
					
					{/* Search everywhere box */}
					<div className="relative flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md px-3 py-1.5 flex-1 min-w-[200px]">
						<FiSearch className="text-[var(--text-muted)] mr-2 shrink-0" size={12} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search problems by name or ID..."
							className="bg-transparent text-xs text-[var(--text-primary)] outline-none w-full placeholder:text-[var(--text-muted)] border-0 p-0 focus:ring-0"
						/>
						{searchQuery && (
							<button onClick={() => setSearchQuery("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
								<FiX size={12} />
							</button>
						)}
					</div>

					{/* Filters selects */}
					<div className="flex flex-wrap gap-2.5 items-center">
						<BeastCodeSelect
							size="sm"
							options={difficultyOptions}
							value={difficultyFilter}
							onChange={setDifficultyFilter}
							className="w-36"
						/>

						<BeastCodeSelect
							size="sm"
							options={typeOptions}
							value={typeFilter}
							onChange={setTypeFilter}
							className="w-36"
						/>

						<BeastCodeSelect
							size="sm"
							options={tagOptions}
							value={tagFilter}
							onChange={setTagFilter}
							className="w-36"
							searchable={true}
						/>

						<BeastCodeSelect
							size="sm"
							options={sortOptions}
							value={sortBy}
							onChange={setSortBy}
							className="w-48"
						/>
					</div>
				</div>

				{/* Bulk operations toolbar banner */}
				{selectedProblemIds.length > 0 && (
					<div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs font-semibold text-emerald-450 select-none animate-slide-in">
						<div className="flex items-center gap-2">
							<span>{selectedProblemIds.length} selected</span>
							<button
								onClick={() => setSelectedProblemIds([])}
								className="p-1 hover:bg-white/10 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
								title="Clear Selection"
							>
								<FiX size={12} />
							</button>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								onClick={() => setShowBulkModal(true)}
								className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 rounded-md border border-[var(--border-subtle)] hover:border-emerald-500/30 transition text-[10px]"
							>
								Execution Policy
							</button>

							<div className="relative group/diff inline-block">
								<button className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 rounded-md border border-[var(--border-subtle)] hover:border-emerald-500/30 transition text-[10px] flex items-center gap-1">
									<span>Difficulty</span>
									<FiChevronDown size={8} />
								</button>
								<div className="absolute bottom-full right-0 mb-1 hidden group-hover/diff:flex flex-col bg-dark-layer-2 border border-gray-800 rounded-md py-1 shadow-xl z-20 min-w-[80px]">
									{["Easy", "Medium", "Hard"].map((d) => (
										<button
											key={d}
											onClick={() => handleBulkChangeDifficulty(d)}
											className="px-3 py-1.5 text-left text-[10px] hover:bg-dark-fill-3 transition w-full text-white"
										>
											{d}
										</button>
									))}
								</div>
							</div>

							<button
								onClick={() => {
									setBulkTagsInput("");
									setShowBulkTagsModal(true);
								}}
								className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 rounded-md border border-[var(--border-subtle)] hover:border-emerald-500/30 transition text-[10px]"
							>
								Set Tags
							</button>

							<button
								onClick={handleBulkExport}
								className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 rounded-md border border-[var(--border-subtle)] hover:border-emerald-500/30 transition text-[10px] flex items-center gap-1 text-emerald-450"
							>
								<FiDownload size={10} />
								<span>Export</span>
							</button>

							<button
								onClick={() => setShowBulkDeleteConfirm(true)}
								className="px-2.5 py-1.5 bg-red-950/30 hover:bg-red-900/40 rounded-md border border-red-500/25 transition text-[10px] text-red-400"
							>
								Delete
							</button>
						</div>
					</div>
				)}

				{/* Table and Viewport panel */}
				<div className="overflow-x-auto">
					{loading ? (
						<div className="p-4">
							<div className="space-y-3">
								{Array.from({ length: itemsPerPage }).map((_, idx) => (
									<div key={idx} className="flex items-center justify-between p-4 bg-[var(--bg-dark-fill-3)]/30 border border-[var(--border-subtle)] rounded-xl animate-pulse">
										<div className="flex items-center gap-3 w-1/2">
											<div className="w-4 h-4 bg-white/5 rounded" />
											<div className="h-3.5 bg-white/5 rounded w-48" />
										</div>
										<div className="flex gap-2 w-1/3 justify-end">
											<div className="h-3.5 bg-white/5 rounded w-16" />
											<div className="h-3.5 bg-white/5 rounded w-16" />
										</div>
									</div>
								))}
							</div>
						</div>
					) : filteredProblems.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center select-none bg-[var(--bg-surface)] p-6">
							<div className="w-12 h-12 rounded-full bg-[var(--bg-dark-fill-3)] flex items-center justify-center text-[var(--text-muted)] mb-4">
								<FiBookOpen size={24} />
							</div>
							<h4 className="text-xs font-black text-[var(--text-primary)]">No problems found</h4>
							<p className="text-[10px] text-[var(--text-muted)] mt-1 mb-5 max-w-xs">
								No problems match the current filter criteria or the database is currently empty.
							</p>
							<button
								onClick={() => {
									setSearchQuery("");
									setDifficultyFilter("All");
									setTypeFilter("All");
									setTagFilter("All");
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold transition text-[var(--text-primary)]"
							>
								Reset Filters
							</button>
						</div>
					) : (
						<table className="w-full text-xs text-left text-[var(--text-secondary)]">
							<thead>
								<tr className="bg-[var(--bg-dark-fill-3)]/50 border-b border-[var(--border-subtle)] sticky top-0 select-none z-10">
									<th className="px-5 py-3 w-10">
										<input
											type="checkbox"
											checked={filteredProblems.length > 0 && selectedProblemIds.length === filteredProblems.length}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedProblemIds(filteredProblems.map((p) => p.id));
												} else {
													setSelectedProblemIds([]);
												}
											}}
											className="rounded border-[var(--border-subtle)] text-emerald-500 focus:ring-emerald-500 bg-[var(--bg-surface)] h-3.5 w-3.5"
										/>
									</th>
									<th className="px-5 py-3 font-extrabold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
										Problem Name
									</th>
									<th className="px-5 py-3 font-extrabold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-44">
										Tags
									</th>
									<th className="px-5 py-3 font-extrabold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-28">
										Difficulty
									</th>
									<th className="px-5 py-3 font-extrabold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-28">
										Storage Type
									</th>
									<th className="px-5 py-3 font-extrabold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-24 text-right">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-subtle)] select-text">
								{paginatedProblems.map((problem) => {
									const isChecked = selectedProblemIds.includes(problem.id);
									const diffColor =
										problem.difficulty === "Easy"
											? { color: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-900/30" }
											: problem.difficulty === "Medium"
											? { color: "text-amber-400", bg: "bg-amber-950/20 border-amber-900/30" }
											: { color: "text-red-400", bg: "bg-red-950/20 border-red-900/30" };
									return (
										<tr
											key={problem.id}
											className={`hover:bg-[var(--bg-hover)] transition ${
												isChecked ? "bg-emerald-500/5" : ""
											}`}
										>
											<td className="px-5 py-3 w-10 select-none">
												<input
													type="checkbox"
													checked={isChecked}
													onChange={(e) => {
														if (e.target.checked) {
															setSelectedProblemIds((prev) => [...prev, problem.id]);
														} else {
															setSelectedProblemIds((prev) => prev.filter((id) => id !== problem.id));
														}
													}}
													className="rounded border-[var(--border-subtle)] text-emerald-500 focus:ring-emerald-500 bg-[var(--bg-surface)] h-3.5 w-3.5"
												/>
											</td>
											<td className="px-5 py-3 font-bold text-[var(--text-primary)]">
												<Link
													href={`/problems/${problem.id}`}
													className="hover:text-emerald-400 transition"
													target="_blank"
												>
													{problem.title}
												</Link>
											</td>
											<td className="px-5 py-3">
												<div className="flex flex-wrap gap-1">
													{problem.tags.length > 0 ? (
														problem.tags.map((t) => (
															<span
																key={t}
																className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-[var(--bg-dark-fill-3)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
															>
																{t}
															</span>
														))
													) : (
														<span className="text-[10px] text-[var(--text-muted)] italic">no tags</span>
													)}
												</div>
											</td>
											<td className="px-5 py-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${diffColor.color} ${diffColor.bg}`}>
													{problem.difficulty}
												</span>
											</td>
											<td className="px-5 py-3 select-none">
												{problem.isStatic ? (
													<span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">
														Static
													</span>
												) : (
													<span className="text-[10px] text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
														Database
													</span>
												)}
											</td>
											<td className="px-5 py-3 text-right select-none">
												<div className="flex justify-end gap-1.5">
													<Link
														href={`/admin/problems/${problem.id}`}
														className="p-1.5 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] rounded-lg transition"
														title="Edit Problem Properties"
													>
														<FiEdit3 size={11} />
													</Link>
													<button
														type="button"
														onClick={() => setProblemToDelete(problem.id)}
														className="p-1.5 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-red-400 hover:text-red-300 border border-[var(--border-subtle)] rounded-lg transition"
														title="Delete Problem"
													>
														<FiTrash2 size={11} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{/* Pagination layout footer */}
				{totalPages > 1 && (
					<div className="px-5 py-3 bg-[var(--bg-dark-fill-3)]/30 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)] select-none">
						<span>
							Showing page <span className="font-bold text-[var(--text-primary)]">{currentPage}</span> of <span className="font-bold text-[var(--text-primary)]">{totalPages}</span>
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
								disabled={currentPage === 1}
								className="p-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg transition disabled:opacity-30 disabled:pointer-events-none"
							>
								<FiChevronLeft size={12} />
							</button>
							<button
								onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
								disabled={currentPage === totalPages}
								className="p-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg transition disabled:opacity-30 disabled:pointer-events-none"
							>
								<FiChevronRight size={12} />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* ==================== CONFIRMATION MODALS SYSTEM ==================== */}
			<ConfirmationModal
				isOpen={!!problemToDelete}
				onClose={() => setProblemToDelete(null)}
				onConfirm={handleConfirmDelete}
				title="Confirm Problem Deletion"
				message={`Are you sure you want to delete problem "${problemToDelete}"? This will permanently delete the problem document from Firestore. This cannot be undone.`}
				confirmText="Permanently Delete"
				isDanger={true}
			/>

			<ConfirmationModal
				isOpen={showBulkDeleteConfirm}
				onClose={() => setShowBulkDeleteConfirm(false)}
				onConfirm={handleBulkDelete}
				title="Confirm Bulk Deletion"
				message={`Are you sure you want to delete all ${selectedProblemIds.length} selected problems? This will permanently delete their documents from Firestore. This action is irreversible.`}
				confirmText={`Delete ${selectedProblemIds.length} Problems`}
				isDanger={true}
				loading={bulkSubmitting}
			/>

			{/* ==================== BULK OPTIONS MODALS ==================== */}
			{showBulkTagsModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-up select-none">
						<h3 className="text-base font-black text-[var(--text-primary)] mb-2">Set Tags in Bulk</h3>
						<p className="text-xs text-[var(--text-muted)] mb-4">
							Apply these tags to the <span className="font-bold text-emerald-450">{selectedProblemIds.length}</span> selected problems.
						</p>
						<div className="mb-6">
							<label htmlFor="bulkTags" className="text-[10px] font-bold block mb-1 text-[var(--text-secondary)]">
								Tags (comma-separated)
							</label>
							<input
								type="text"
								id="bulkTags"
								value={bulkTagsInput}
								onChange={(e) => setBulkTagsInput(e.target.value)}
								placeholder="e.g. arrays, dynamic-programming, math"
								className="bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-md p-2.5 w-full outline-none focus:border-emerald-500"
							/>
						</div>
						<div className="flex justify-end gap-2.5">
							<button
								type="button"
								onClick={() => setShowBulkTagsModal(false)}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md text-xs font-bold border border-[var(--border-subtle)] transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleBulkChangeTags}
								disabled={bulkSubmitting}
								className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-md text-xs font-semibold transition"
							>
								Apply Tags
							</button>
						</div>
					</div>
				</div>
			)}

			{showBulkModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-xl w-full mx-4 shadow-2xl animate-scale-up select-none">
						<h3 className="text-base font-black text-[var(--text-primary)] mb-1">Bulk Edit Execution Policy</h3>
						<p className="text-[10px] text-[var(--text-muted)] mb-5">
							Configure resource quotas and execution speed profiles for the <span className="font-bold text-emerald-450">{selectedProblemIds.length}</span> selected problems.
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
							<div>
								<label htmlFor="bulkProfile" className="text-[10px] font-bold block mb-1 text-[var(--text-secondary)]">
									Execution Profile
								</label>
								<BeastCodeSelect
									options={[
										{ value: "fast", label: "Fast (Short algorithmic problems)" },
										{ value: "normal", label: "Normal (Standard competitive programming)" },
										{ value: "long", label: "Long (Heavy computations)" },
										{ value: "machine_learning", label: "Machine Learning (Model training / AI challenges)" },
										{ value: "custom", label: "Custom (Individual Limits)" }
									]}
									value={bulkProfile}
									onChange={(val) => setBulkProfile(val)}
									size="sm"
								/>
							</div>
							<div className="p-3 bg-[var(--bg-dark-fill-3)]/40 border border-[var(--border-subtle)] rounded-md">
								<span className="text-[10px] font-bold uppercase block mb-2 text-emerald-450">
									Limits Preview
								</span>
								<div className="grid grid-cols-2 gap-y-1 text-[10px] text-[var(--text-secondary)] font-mono">
									<span>Timeout:</span>
									<span className="font-bold text-[var(--text-primary)]">
										{bulkProfile === "custom" ? bulkTimeoutMs : (bulkProfile === "fast" ? 1000 : (bulkProfile === "long" ? 15000 : (bulkProfile === "machine_learning" ? 60000 : 5000)))} ms
									</span>
									<span>Memory:</span>
									<span className="font-bold text-[var(--text-primary)]">
										{bulkProfile === "custom" ? bulkMemoryLimitMb : (bulkProfile === "fast" ? 64 : (bulkProfile === "long" ? 512 : (bulkProfile === "machine_learning" ? 2048 : 256)))} MB
									</span>
									<span>Output Limit:</span>
									<span className="font-bold text-[var(--text-primary)]">
										{bulkProfile === "custom" ? bulkMaxOutputSizeChars : (bulkProfile === "fast" ? 16384 : (bulkProfile === "long" ? 262144 : (bulkProfile === "machine_learning" ? 1048576 : 65536)))} chars
									</span>
								</div>
							</div>
						</div>

						{bulkProfile === "custom" && (
							<div className="grid grid-cols-3 gap-3 mb-5 p-3.5 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-md animate-scale-up">
								<div>
									<label htmlFor="bulkTimeoutMs" className="text-[9px] font-bold block mb-1 text-[var(--text-secondary)]">
										Timeout (ms)
									</label>
									<input
										type="number"
										id="bulkTimeoutMs"
										value={bulkTimeoutMs}
										onChange={(e) => setBulkTimeoutMs(Number(e.target.value) || 0)}
										className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-md p-2 w-full outline-none"
									/>
								</div>
								<div>
									<label htmlFor="bulkMemoryLimitMb" className="text-[9px] font-bold block mb-1 text-[var(--text-secondary)]">
										Memory (MB)
									</label>
									<input
										type="number"
										id="bulkMemoryLimitMb"
										value={bulkMemoryLimitMb}
										onChange={(e) => setBulkMemoryLimitMb(Number(e.target.value) || 0)}
										className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-md p-2 w-full outline-none"
									/>
								</div>
								<div>
									<label htmlFor="bulkMaxOutputSizeChars" className="text-[9px] font-bold block mb-1 text-[var(--text-secondary)]">
										Output (chars)
									</label>
									<input
										type="number"
										id="bulkMaxOutputSizeChars"
										value={bulkMaxOutputSizeChars}
										onChange={(e) => setBulkMaxOutputSizeChars(Number(e.target.value) || 0)}
										className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-md p-2 w-full outline-none"
									/>
								</div>
							</div>
						)}

						<div className="flex justify-end gap-2.5">
							<button
								type="button"
								onClick={() => setShowBulkModal(false)}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md text-xs font-bold border border-[var(--border-subtle)] transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleApplyBulkEdit}
								disabled={bulkSubmitting}
								className="px-5 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-md text-xs font-semibold transition flex items-center gap-1.5"
							>
								{bulkSubmitting ? "Applying..." : "Apply Policy"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
