import React, { useState, useMemo, useEffect } from "react";
import { FaSearch, FaTimes, FaPlus, FaMinus, FaArrowUp, FaArrowDown, FaStar, FaFilter, FaSpinner } from "react-icons/fa";
import BeastCodeSelect from "./BeastCodeSelect";
import BeastCodePagination from "./BeastCodePagination";

export interface RichProblem {
	id: string;
	title: string;
	difficulty: string;
	tags: string[];
	attempts?: number;
	solved?: number;
	createdAt?: number;
	author?: string;
}

interface SearchableProblemPickerProps {
	isOpen: boolean;
	onClose: () => void;
	availableProblems: RichProblem[];
	currentContestProblemIds: string[];
	onAddProblems: (problemIds: string[]) => void | Promise<void>;
	onRemoveProblems: (problemIds: string[]) => void | Promise<void>;
	onReorderProblems: (problemIds: string[]) => void | Promise<void>;
}

const SearchableProblemPicker: React.FC<SearchableProblemPickerProps> = ({
	isOpen,
	onClose,
	availableProblems,
	currentContestProblemIds,
	onAddProblems,
	onRemoveProblems,
	onReorderProblems,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [difficultyFilter, setDifficultyFilter] = useState("all");
	const [selectedTag, setSelectedTag] = useState("all");
	
	// UX lists
	const [favorites, setFavorites] = useState<string[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [pendingIds, setPendingIds] = useState<string[]>([]);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 8;

	// Load local storage items
	useEffect(() => {
		if (typeof window !== "undefined") {
			const savedFavs = localStorage.getItem("bc_problem_favorites");
			if (savedFavs) setFavorites(JSON.parse(savedFavs));
		}
	}, []);

	// Keep selectedIds in sync with currentContestProblemIds
	useEffect(() => {
		setSelectedIds(currentContestProblemIds);
	}, [currentContestProblemIds]);

	// Extract unique tags
	const tags = useMemo(() => {
		const tgs = new Set<string>();
		availableProblems.forEach((p) => {
			if (p.tags) p.tags.forEach((t) => tgs.add(t));
		});
		return Array.from(tgs);
	}, [availableProblems]);

	// Toggle Favorite
	const toggleFavorite = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		let updated: string[];
		if (favorites.includes(id)) {
			updated = favorites.filter((favId) => favId !== id);
		} else {
			updated = [...favorites, id];
		}
		setFavorites(updated);
		localStorage.setItem("bc_problem_favorites", JSON.stringify(updated));
	};

	// Filter available problems
	const filteredProblems = useMemo(() => {
		let result = [...availableProblems];

		// Filter by search text
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					p.id.toLowerCase().includes(q) ||
					p.author?.toLowerCase().includes(q) ||
					p.tags.some((t) => t.toLowerCase().includes(q))
			);
		}

		// Filter by difficulty
		if (difficultyFilter !== "all") {
			result = result.filter((p) => p.difficulty.toLowerCase() === difficultyFilter.toLowerCase());
		}

		// Filter by tags
		if (selectedTag !== "all") {
			result = result.filter((p) => p.tags.includes(selectedTag));
		}

		return result;
	}, [availableProblems, searchQuery, difficultyFilter, selectedTag]);

	// Paginated results
	const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
	const paginatedProblems = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredProblems.slice(start, start + itemsPerPage);
	}, [filteredProblems, currentPage]);

	// Reorder selected items
	const moveItem = (index: number, direction: "up" | "down") => {
		const nextIndex = direction === "up" ? index - 1 : index + 1;
		if (nextIndex < 0 || nextIndex >= selectedIds.length) return;

		const updated = [...selectedIds];
		const temp = updated[index];
		updated[index] = updated[nextIndex];
		updated[nextIndex] = temp;

		setSelectedIds(updated);
		onReorderProblems(updated);
	};

	const handleAdd = async (id: string) => {
		if (selectedIds.includes(id) || pendingIds.includes(id)) return;
		setPendingIds((prev) => [...prev, id]);
		setSelectedIds((prev) => [...prev, id]);
		try {
			await onAddProblems([id]);
		} catch (err) {
			setSelectedIds((prev) => prev.filter((x) => x !== id));
		} finally {
			setPendingIds((prev) => prev.filter((x) => x !== id));
		}
	};

	const handleRemove = async (id: string) => {
		if (pendingIds.includes(id)) return;
		setPendingIds((prev) => [...prev, id]);
		const prevSelected = [...selectedIds];
		setSelectedIds((prev) => prev.filter((x) => x !== id));
		try {
			await onRemoveProblems([id]);
		} catch (err) {
			setSelectedIds(prevSelected);
		} finally {
			setPendingIds((prev) => prev.filter((x) => x !== id));
		}
	};

	const handleBulkAdd = async () => {
		const toAdd = filteredProblems
			.map((p) => p.id)
			.filter((id) => !selectedIds.includes(id) && !pendingIds.includes(id));
		if (toAdd.length > 0) {
			setPendingIds((prev) => [...prev, ...toAdd]);
			setSelectedIds((prev) => [...prev, ...toAdd]);
			try {
				await onAddProblems(toAdd);
			} catch (err) {
				setSelectedIds((prev) => prev.filter((x) => !toAdd.includes(x)));
			} finally {
				setPendingIds((prev) => prev.filter((x) => !toAdd.includes(x)));
			}
		}
	};

	const handleBulkRemove = async () => {
		const toRemove = filteredProblems
			.map((p) => p.id)
			.filter((id) => selectedIds.includes(id) && !pendingIds.includes(id));
		if (toRemove.length > 0) {
			setPendingIds((prev) => [...prev, ...toRemove]);
			const prevSelected = [...selectedIds];
			setSelectedIds((prev) => prev.filter((x) => !toRemove.includes(x)));
			try {
				await onRemoveProblems(toRemove);
			} catch (err) {
				setSelectedIds(prevSelected);
			} finally {
				setPendingIds((prev) => prev.filter((x) => !toRemove.includes(x)));
			}
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
			{/* Modal Container */}
			<div
				className="w-full max-w-6xl h-[85vh] rounded-lg flex flex-col overflow-hidden border shadow-2xl animate-scale-up"
				style={{
					background: "var(--bg-surface)",
					borderColor: "var(--border-default)",
				}}
			>
				{/* Header */}
				<div
					className="flex items-center justify-between px-6 py-4 border-b"
					style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
				>
					<div>
						<h2 className="text-lg font-bold text-white flex items-center gap-2">
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-yellow-500">
								Searchable Problem Picker
							</span>
						</h2>
						<p className="text-xs" style={{ color: "var(--text-muted)" }}>
							Query, filter, check stats, and bulk add problems into your contest.
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-xl transition hover:bg-dark-fill-3 text-gray-400 hover:text-white"
					>
						<FaTimes size={14} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="flex-1 flex overflow-hidden">
					{/* Left Panel: Filters & Search History */}
					<div
						className="w-64 border-r p-4 overflow-y-auto space-y-5"
						style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
					>
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
								<FaFilter size={10} /> Filters
							</h3>
							
							<div className="space-y-3">
								{/* Difficulty */}
								<div>
									<label className="text-[10px] font-bold block mb-1 text-gray-500">Difficulty</label>
									<BeastCodeSelect
										options={[
											{ value: "all", label: "All Difficulties" },
											{ value: "easy", label: "Easy" },
											{ value: "medium", label: "Medium" },
											{ value: "hard", label: "Hard" },
										]}
										value={difficultyFilter}
										onChange={(val) => {
											setDifficultyFilter(val);
											setCurrentPage(1);
										}}
									/>
								</div>

								{/* Tag */}
								<div>
									<label className="text-[10px] font-bold block mb-1 text-gray-500">Tag</label>
									<BeastCodeSelect
										options={[
											{ value: "all", label: "All Tags" },
											...tags.map((t) => ({ value: t, label: t })),
										]}
										value={selectedTag}
										onChange={(val) => {
											setSelectedTag(val);
											setCurrentPage(1);
										}}
										searchable
									/>
								</div>
							</div>
						</div>

						{/* Favorites Quick Access */}
						{favorites.length > 0 && (
							<div>
								<h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 flex items-center gap-1">
									<FaStar size={8} className="text-yellow-400" /> Favorites ({favorites.length})
								</h4>
								<div className="space-y-1">
									{availableProblems
										.filter((p) => favorites.includes(p.id))
										.map((p) => (
											<div
												key={p.id}
												onClick={() => {
													setSearchQuery(p.title);
													setCurrentPage(1);
												}}
												className="w-full text-left truncate text-[11px] p-1.5 rounded transition hover:bg-dark-fill-3 text-gray-300 hover:text-white cursor-pointer flex items-center justify-between"
											>
												<span className="truncate">{p.title}</span>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleAdd(p.id);
													}}
													className="text-[9px] text-green-400 hover:underline"
												>
													+ Add
												</button>
											</div>
										))}
								</div>
							</div>
						)}
					</div>

					{/* Middle Panel: Problem List & Search */}
					<div className="flex-1 flex flex-col p-6 overflow-hidden">
						{/* Search & Bulk Bar */}
						<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
							<div className="relative flex-1">
								<FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
								<input
									type="text"
									placeholder="Search problem title, ID, author, tags..."
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setCurrentPage(1);
									}}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full pl-9 pr-4 py-2 text-xs rounded-xl outline-none border border-border-default transition"
									style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
								/>
							</div>

							<div className="flex gap-2">
								<button
									onClick={handleBulkAdd}
									className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
								>
									Bulk Add ({filteredProblems.length})
								</button>
								<button
									onClick={handleBulkRemove}
									className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/20 transition"
								>
									Bulk Remove
								</button>
							</div>
						</div>

						{/* Problems Grid / List */}
						<div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
							{paginatedProblems.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-48 text-center" style={{ color: "var(--text-muted)" }}>
									<FaSearch size={24} className="text-gray-500 mb-2" />
									<p className="text-sm font-semibold">No problems match your query.</p>
								</div>
							) : (
								paginatedProblems.map((prob) => {
									const isAdded = selectedIds.includes(prob.id);
									const isFav = favorites.includes(prob.id);
									
									// Compute acceptance rate
									const acceptanceRate =
										prob.attempts && prob.attempts > 0
											? Math.round(((prob.solved ?? 0) / prob.attempts) * 100)
											: null;

									const diffColor =
										prob.difficulty === "Easy" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
										prob.difficulty === "Medium" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/5" :
										"text-red-400 border-red-500/20 bg-red-500/5";

									return (
										<div
											key={prob.id}
											className="p-3.5 rounded-xl border flex items-center justify-between transition-all duration-150"
											style={{
												background: "var(--bg-elevated)",
												borderColor: isAdded ? "var(--brand-orange)" : "var(--border-subtle)",
											}}
										>
											<div className="space-y-1 max-w-[70%]">
												<div className="flex items-center gap-2">
													<button
														onClick={(e) => toggleFavorite(prob.id, e)}
														className={`transition ${isFav ? "text-yellow-400 scale-110" : "text-gray-500 hover:text-yellow-400"}`}
													>
														<FaStar size={12} />
													</button>
													<span className="font-semibold text-xs text-white truncate">{prob.title}</span>
													<span className="text-[10px] font-mono text-gray-500">#{prob.id}</span>
												</div>

												<div className="flex flex-wrap items-center gap-2 text-[10px]">
													<span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${diffColor}`}>
														{prob.difficulty}
													</span>



													{acceptanceRate !== null && (
														<span className="text-gray-400">
															Acceptance: <span className="text-white font-medium">{acceptanceRate}%</span>
														</span>
													)}
												</div>

												{prob.tags && prob.tags.length > 0 && (
													<div className="flex flex-wrap gap-1">
														{prob.tags.map((t) => (
															<span
																key={t}
																className="text-[9px] px-1.5 py-0.5 rounded font-medium border"
																style={{
																	background: "var(--bg-base)",
																	borderColor: "var(--border-subtle)",
																	color: "var(--text-secondary)",
																}}
															>
																{t}
															</span>
														))}
													</div>
												)}
											</div>

											<button
												disabled={pendingIds.includes(prob.id)}
												onClick={() => (isAdded ? handleRemove(prob.id) : handleAdd(prob.id))}
												className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
													pendingIds.includes(prob.id)
														? "opacity-75 cursor-not-allowed bg-dark-fill-3 text-gray-400"
														: isAdded
														? "bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white"
														: "bg-brand-orange hover:bg-brand-orange-s text-white"
												}`}
											>
												{pendingIds.includes(prob.id) ? (
													<>
														<FaSpinner className="animate-spin" size={10} />
														{isAdded ? "Removing..." : "Adding..."}
													</>
												) : isAdded ? (
													<>
														<FaMinus size={10} /> Remove
													</>
												) : (
													<>
														<FaPlus size={10} /> Add
													</>
												)}
											</button>
										</div>
									);
								})
							)}
						</div>

						{/* Pagination Controls */}
						{totalPages > 1 && (
							<BeastCodePagination
								currentPage={currentPage}
								totalPages={totalPages}
								onPageChange={setCurrentPage}
							/>
						)}
					</div>

					{/* Right Panel: Selected Problems & Reordering */}
					<div
						className="w-72 border-l p-4 flex flex-col overflow-hidden"
						style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
					>
						<div className="mb-3">
							<h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
								Contest Sequence ({selectedIds.length})
							</h3>
							<p className="text-[10px] text-gray-500">Order of problems in solving interface</p>
						</div>

						<div className="flex-1 overflow-y-auto space-y-2 pr-1">
							{selectedIds.length === 0 ? (
								<div className="h-48 flex flex-col items-center justify-center text-center text-gray-500">
									<p className="text-[11px]">No problems added yet.</p>
								</div>
							) : (
								selectedIds.map((id, index) => {
									const prob = availableProblems.find((p) => p.id === id);
									return (
										<div
											key={id}
											className="p-2.5 rounded-lg border flex items-center justify-between text-xs transition duration-150"
											style={{
												background: "var(--bg-base)",
												borderColor: "var(--border-subtle)",
											}}
										>
											<div className="truncate mr-2 max-w-[65%]">
												<div className="font-semibold text-white truncate">{prob?.title || id}</div>
												<span className="text-[9px] text-gray-500 font-mono">#{id}</span>
											</div>

											<div className="flex items-center gap-1">
												<button
													onClick={() => moveItem(index, "up")}
													disabled={index === 0}
													className="p-1 hover:bg-dark-fill-3 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
												>
													<FaArrowUp size={10} />
												</button>
												<button
													onClick={() => moveItem(index, "down")}
													disabled={index === selectedIds.length - 1}
													className="p-1 hover:bg-dark-fill-3 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
												>
													<FaArrowDown size={10} />
												</button>
												<button
													onClick={() => handleRemove(id)}
													disabled={pendingIds.includes(id)}
													className="p-1 hover:bg-red-500/10 rounded text-red-400 hover:bg-red-600 hover:text-white transition duration-150 disabled:opacity-40 disabled:pointer-events-none"
												>
													{pendingIds.includes(id) ? (
														<FaSpinner className="animate-spin" size={10} />
													) : (
														<FaTimes size={10} />
													)}
												</button>
											</div>
										</div>
									);
								})
							)}
						</div>

						<div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
							<button
								onClick={onClose}
								className="w-full py-2.5 rounded-xl font-bold text-xs text-center transition bg-brand-orange hover:bg-brand-orange-s text-white shadow"
							>
								Done / Apply
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SearchableProblemPicker;
