import React, { useEffect, useState, useRef } from "react";
import { FaTimes, FaAngleDown, FaCheck, FaSearch } from "react-icons/fa";
import { ProblemTag, ThreadTag } from "@/utils/types/tag";

interface TagSelectProps {
	type: "problem" | "thread";
	selectedTags: string[];
	onChange: (tags: string[]) => void;
	maxTags?: number;
	placeholder?: string;
}

const TagSelect: React.FC<TagSelectProps> = ({
	type,
	selectedTags,
	onChange,
	maxTags = 3,
	placeholder
}) => {
	const [availableTags, setAvailableTags] = useState<(ProblemTag | ThreadTag)[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const defaultPlaceholder = type === "problem" ? "Select problem tags" : "Select discussion tags";
	const actualPlaceholder = placeholder || defaultPlaceholder;

	useEffect(() => {
		const fetchTags = async () => {
			setLoading(true);
			try {
				const endpoint = type === "problem" ? "/api/problem-tags" : "/api/thread-tags";
				const res = await fetch(endpoint);
				const data = await res.json();
				if (data.success) {
					// Only keep active/enabled tags
					setAvailableTags(data.tags || []);
				}
			} catch (e) {
				console.error("Failed to load tags for selector:", e);
			} finally {
				setLoading(false);
			}
		};

		fetchTags();
	}, [type]);

	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const handleToggleTag = (tagId: string) => {
		if (selectedTags.includes(tagId)) {
			onChange(selectedTags.filter(t => t !== tagId));
			return;
		}

		// Verify tag type match (e.g. tagId must exist in availableTags list)
		const exists = availableTags.find(t => t.id === tagId);
		if (!exists) {
			console.error(`Rejected tag ${tagId}: tag type mismatch`);
			return;
		}

		if (selectedTags.length >= maxTags) {
			return;
		}
		onChange([...selectedTags, tagId]);
	};

	const filteredTags = availableTags.filter(t =>
		t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		t.id.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Get tag details helper
	const getTagDetails = (tagId: string) => {
		const tag = availableTags.find(t => t.id === tagId);
		if (tag) return tag;
		// fallback to capitalize
		return {
			id: tagId,
			name: tagId.charAt(0).toUpperCase() + tagId.slice(1),
			color: "#3B82F6"
		};
	};

	return (
		<div className="relative w-full" ref={dropdownRef}>
			{/* Selector Box */}
			<div
				onClick={() => setIsOpen(!isOpen)}
				className="border rounded-md p-2 flex flex-wrap gap-2 items-center justify-between cursor-pointer focus-within:border-emerald-500 transition shadow-sm min-h-[42px] w-full bg-[var(--bg-elevated)] border-[var(--border-default)]"
			>
				<div className="flex flex-wrap gap-2 flex-grow">
					{selectedTags.length === 0 ? (
						<span className="text-sm text-[var(--text-muted)] select-none pl-1">&nbsp;</span>
					) : (
						selectedTags.map((tagId) => {
							const tag = getTagDetails(tagId);
							const color = (tag as any).color || "var(--color-success)";
							return (
								<span
									key={tagId}
									className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold select-none border"
									style={{
										color: color,
										background: `color-mix(in srgb, ${color} 10%, transparent)`,
										borderColor: `color-mix(in srgb, ${color} 25%, transparent)`
									}}
									onClick={(e) => {
										e.stopPropagation();
										handleToggleTag(tagId);
									}}
								>
									{tag.name}
									<button
										type="button"
										className="p-0.5 rounded transition hover:bg-black/10"
										style={{ color }}
									>
										<FaTimes size={10} />
									</button>
								</span>
							);
						})
					)}
				</div>

				<div className="flex items-center gap-2 pr-1 text-[var(--text-muted)]">
					{selectedTags.length >= maxTags && (
						<span className="text-[10px] italic">Max {maxTags} tags</span>
					)}
					<FaAngleDown size={14} className={`transition duration-200 ${isOpen ? "transform rotate-180 text-emerald-450" : ""}`} />
				</div>
			</div>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute left-0 right-0 mt-1.5 z-[100] rounded-md border shadow-2xl p-2 bg-[var(--bg-elevated)] border-[var(--border-default)] max-h-60 overflow-y-auto animate-fade-in scrollbar-thin">
					{/* Search */}
					<div className="relative mb-2">
						<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={10} />
						<input
							type="text"
							aria-label="Search tags"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] outline-none text-[var(--text-primary)] focus:border-emerald-500"
						/>
					</div>

					{/* Options */}
					{loading ? (
						<div className="text-center py-4 text-xs text-[var(--text-muted)]">Loading tags...</div>
					) : filteredTags.length === 0 ? (
						<div className="text-center py-4 text-xs text-[var(--text-muted)]">No tags match search</div>
					) : (
						<div className="space-y-0.5">
							{filteredTags.map((tag) => {
								const isSelected = selectedTags.includes(tag.id);
								const color = (tag as any).color || "var(--color-success)";

								return (
									<div
										key={tag.id}
										onClick={(e) => {
											e.stopPropagation();
											handleToggleTag(tag.id);
										}}
										className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold cursor-pointer transition ${
											isSelected
												? "bg-emerald-500/10 text-emerald-450"
												: "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
										}`}
									>
										<div className="flex items-center gap-2">
											<span
												className="w-2.5 h-2.5 rounded-full inline-block"
												style={{ backgroundColor: color }}
											/>
											<span>{tag.name}</span>
										</div>

										{isSelected && <FaCheck size={10} />}
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default TagSelect;
