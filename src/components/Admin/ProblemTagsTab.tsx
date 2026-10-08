import React, { useEffect, useState, useCallback } from "react";
import { auth } from "@/firebase/firebase";
import { ProblemTag } from "@/utils/types/tag";
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaAngleUp, FaAngleDown, FaEyeSlash, FaEye, FaSpinner } from "react-icons/fa";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";

interface ProblemTagsTabProps {
	triggerStatusMessage: (type: "success" | "error" | "info", msg: string) => void;
}

export const ProblemTagsTab: React.FC<ProblemTagsTabProps> = ({ triggerStatusMessage }) => {
	const [tags, setTags] = useState<ProblemTag[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");

	// Edit / Create form states
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingTag, setEditingTag] = useState<Partial<ProblemTag> | null>(null);
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const fetchTags = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/problem-tags?includeHidden=true");
			const data = await res.json();
			if (data.success) {
				setTags(data.tags || []);
			} else {
				triggerStatusMessage("error", data.error || "Failed to fetch tags");
			}
		} catch (error) {
			console.error("fetchTags error:", error);
			triggerStatusMessage("error", "Network error when fetching tags");
		} finally {
			setLoading(false);
		}
	}, [triggerStatusMessage]);

	useEffect(() => {
		fetchTags();
	}, [fetchTags]);

	const slugify = (text: string) => {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");
	};

	const handleOpenCreateModal = () => {
		setEditingTag({
			id: "",
			name: "",
			description: "",
			isHidden: false,
			isEnabled: true,
			order: tags.length,
			difficultyMetadata: "Medium"
		});
		setModalError(null);
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (tag: ProblemTag) => {
		setEditingTag({ ...tag });
		setModalError(null);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setEditingTag(null);
	};

	const handleSaveTag = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTag || !editingTag.name) return;

		setSubmitting(true);
		setModalError(null);

		const idToken = await auth.currentUser?.getIdToken();
		if (!idToken) {
			setModalError("Session expired, please login again");
			setSubmitting(false);
			return;
		}

		const isNew = !editingTag.createdAt;
		const method = isNew ? "POST" : "PUT";
		const payload = {
			idToken,
			tag: {
				...editingTag,
				id: editingTag.id || slugify(editingTag.name)
			}
		};

		try {
			const res = await fetch("/api/problem-tags", {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Tag ${isNew ? "created" : "updated"} successfully!`);
				handleCloseModal();
				const savedTag: ProblemTag = data.tag || {
					...editingTag,
					id: editingTag.id || (editingTag.name ? editingTag.name.toLowerCase().replace(/\s+/g, "-") : Math.random().toString(36).substring(2, 7)),
					createdAt: editingTag.createdAt || Date.now()
				};
				setTags((prev) =>
					isNew
						? [...prev, savedTag]
						: prev.map((t) => (t.id === savedTag.id ? savedTag : t))
				);
			} else {
				setModalError(data.error || "Failed to save tag");
			}
		} catch (error: any) {
			console.error("Save tag error:", error);
			setModalError(getFriendlyErrorMessage(error, "Failed to save tag due to network error"));
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteTag = async (id: string) => {
		if (!confirm("Are you sure you want to delete this tag? Problems using this tag will need to be updated manually.")) return;

		const idToken = await auth.currentUser?.getIdToken();
		if (!idToken) {
			triggerStatusMessage("error", "Session expired, please login again");
			return;
		}

		try {
			const res = await fetch("/api/problem-tags", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken, id })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", "Tag deleted successfully");
				setTags((prev) => prev.filter((t) => t.id !== id));
			} else {
				triggerStatusMessage("error", data.error || "Failed to delete tag");
			}
		} catch (error: any) {
			console.error("Delete tag error:", error);
			triggerStatusMessage("error", "Failed to delete tag due to network error");
		}
	};

	const handleReorder = async (index: number, direction: "up" | "down") => {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= tags.length) return;

		const previousTags = [...tags];
		const reordered = [...tags];
		const temp = reordered[index];
		reordered[index] = reordered[newIndex];
		reordered[newIndex] = temp;

		const updatedTags = reordered.map((t, idx) => ({ ...t, order: idx }));
		setTags(updatedTags);

		const idToken = await auth.currentUser?.getIdToken();
		if (!idToken) {
			triggerStatusMessage("error", "Session expired, please login again");
			return;
		}

		try {
			const res = await fetch("/api/problem-tags", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken, tags: updatedTags })
			});
			const data = await res.json();
			if (!data.success) {
				triggerStatusMessage("error", data.error || "Failed to save reordered tags");
				setTags(previousTags);
			}
		} catch (error) {
			console.error("Reorder tag error:", error);
			triggerStatusMessage("error", "Failed to save tag order");
			setTags(previousTags);
		}
	};

	const handleToggleVisibility = async (tag: ProblemTag) => {
		const idToken = await auth.currentUser?.getIdToken();
		if (!idToken) return;

		const updatedTag = { ...tag, isHidden: !tag.isHidden };

		try {
			const res = await fetch("/api/problem-tags", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken, tag: updatedTag })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Tag ${updatedTag.isHidden ? "hidden" : "made visible"}`);
				setTags((prev) => prev.map((t) => (t.id === tag.id ? updatedTag : t)));
			} else {
				triggerStatusMessage("error", data.error || "Failed to update tag visibility");
			}
		} catch (error) {
			console.error("Visibility toggle error:", error);
			triggerStatusMessage("error", "Network error when updating tag visibility");
		}
	};

	const filteredTags = tags.filter(
		(t) =>
			t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="flex flex-col gap-6">
			{/* Top Panel Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
				<div>
					<h2 className="text-base font-bold text-[var(--text-primary)]">Problem Tags</h2>
					<p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
						Create, configure, reorder, and toggle visibility for algorithmic problem topics.
					</p>
				</div>

				<button
					onClick={handleOpenCreateModal}
					className="flex items-center gap-2 bg-[var(--brand-orange)] hover:opacity-95 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow"
				>
					<FaPlus size={10} />
					Create Tag
				</button>
			</div>

			{/* Search */}
			<div className="relative max-w-xs select-none">
				<input
					type="text"
					aria-label="Search problem tags"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className="w-full px-3.5 py-2 text-xs rounded-xl outline-none border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:border-[var(--brand-orange)]"
				/>
			</div>

			{/* Tags Table */}
			{loading ? (
				<div className="flex flex-col justify-center items-center py-20 gap-3 select-none">
					<FaSpinner className="animate-spin text-[var(--brand-orange)]" size={24} />
					<p className="text-xs text-[var(--text-muted)]">Loading tags...</p>
				</div>
			) : filteredTags.length === 0 ? (
				<div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-muted)] select-none">
					No problem tags found.
				</div>
			) : (
				<div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
					<table className="w-full text-xs text-left text-[var(--text-secondary)]">
						<thead>
							<tr className="border-b border-[var(--border-subtle)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-dark-fill-3)]/50 select-none">
								<th className="px-6 py-3 w-16 text-center">Order</th>
								<th className="px-6 py-3 w-44">Tag Name</th>
								<th className="px-6 py-3">Description</th>
								<th className="px-6 py-3 w-28">Difficulty</th>
								<th className="px-6 py-3 w-28 text-center">Status</th>
								<th className="px-6 py-3 w-24 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--border-subtle)]">
							{filteredTags.map((tag, idx) => (
								<tr key={tag.id} className="hover:bg-[var(--bg-hover)] transition">
									<td className="px-6 py-3 text-center select-none">
										<div className="flex items-center justify-center gap-1.5">
											<button
												disabled={idx === 0}
												onClick={() => handleReorder(idx, "up")}
												className="text-[var(--text-muted)] hover:text-[var(--brand-orange)] disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition"
											>
												<FaAngleUp size={14} />
											</button>
											<button
												disabled={idx === tags.length - 1}
												onClick={() => handleReorder(idx, "down")}
												className="text-[var(--text-muted)] hover:text-[var(--brand-orange)] disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition"
											>
												<FaAngleDown size={14} />
											</button>
										</div>
									</td>
									<td className="px-6 py-3 font-bold text-[var(--text-primary)]">
										{tag.name}
										<div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5 select-text">{tag.id}</div>
									</td>
									<td className="px-6 py-3 text-[var(--text-muted)] truncate max-w-xs select-text">
										{tag.description || <span className="italic text-[var(--bg-dark-fill-3)]">No description</span>}
									</td>
									<td className="px-6 py-3 select-none">
										<span className="px-2 py-0.5 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded text-[10px] text-[var(--text-muted)] font-mono">
											{tag.difficultyMetadata || "Medium"}
										</span>
									</td>
									<td className="px-6 py-3 text-center select-none">
										<button
											onClick={() => handleToggleVisibility(tag)}
											className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
												tag.isHidden
													? "bg-amber-950/20 border-amber-800/40 text-amber-500 hover:bg-amber-950/30"
													: "bg-emerald-950/20 border-emerald-800/40 text-emerald-500 hover:bg-emerald-950/30"
											}`}
										>
											{tag.isHidden ? (
												<>
													<FaEyeSlash size={9} />
													<span>Hidden</span>
												</>
											) : (
												<>
													<FaEye size={9} />
													<span>Visible</span>
												</>
											)}
										</button>
									</td>
									<td className="px-6 py-3 text-right select-none">
										<div className="flex justify-end gap-1.5">
											<button
												onClick={() => handleOpenEditModal(tag)}
												className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-blue-400 hover:text-blue-300 rounded-lg transition border border-[var(--border-subtle)]"
												title="Edit Tag"
											>
												<FaEdit size={11} />
											</button>
											<button
												onClick={() => handleDeleteTag(tag.id)}
												className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-red-400 hover:text-red-300 rounded-lg transition border border-[var(--border-subtle)]"
												title="Delete Tag"
											>
												<FaTrash size={11} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Create/Edit Modal */}
			{isModalOpen && editingTag && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in select-none">
					<form
						onSubmit={handleSaveTag}
						className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-base font-black text-[var(--text-primary)]">
								{editingTag.createdAt ? "Edit Problem Tag" : "Create Problem Tag"}
							</h3>
							<button
								type="button"
								onClick={handleCloseModal}
								className="text-[var(--text-muted)] hover:text-white transition"
							>
								<FaTimes size={14} />
							</button>
						</div>

						{modalError && (
							<div className="mb-4 p-3 bg-rose-950/20 border border-rose-800/50 rounded-xl text-xs font-bold text-rose-400">
								{modalError}
							</div>
						)}

						<div className="space-y-4 mb-6">
							<div>
								<label className="text-[10px] font-bold block mb-1.5 text-[var(--text-secondary)]">Tag Name</label>
								<input
									type="text"
									required
									value={editingTag.name || ""}
									onChange={(e) =>
										setEditingTag((prev: any) => ({
											...prev,
											name: e.target.value,
											id: prev.createdAt ? prev.id : slugify(e.target.value)
										}))
									}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-orange)] transition"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1.5 text-[var(--text-secondary)]">Tag ID (Slug)</label>
								<input
									type="text"
									required
									disabled={!!editingTag.createdAt}
									value={editingTag.id || ""}
									onChange={(e) => setEditingTag((prev: any) => ({ ...prev, id: slugify(e.target.value) }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-orange)] disabled:opacity-50 transition"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1.5 text-[var(--text-secondary)]">Description</label>
								<textarea
									rows={3}
									value={editingTag.description || ""}
									onChange={(e) => setEditingTag((prev) => ({ ...prev, description: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-orange)] transition"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1.5 text-[var(--text-secondary)]">Difficulty Metadata</label>
								<input
									type="text"
									value={editingTag.difficultyMetadata || ""}
									onChange={(e) => setEditingTag((prev) => ({ ...prev, difficultyMetadata: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-orange)] transition"
								/>
							</div>

							<div className="flex gap-4 items-center pt-2">
								<label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] select-none">
									<input
										type="checkbox"
										checked={editingTag.isHidden || false}
										onChange={(e) => setEditingTag((prev) => ({ ...prev, isHidden: e.target.checked }))}
										className="rounded border-[var(--border-subtle)] text-[var(--brand-orange)] bg-[var(--bg-dark-fill-3)] focus:ring-[var(--brand-orange)] h-4 w-4"
									/>
									<span>Hide from Users</span>
								</label>

								<label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] select-none">
									<input
										type="checkbox"
										checked={editingTag.isEnabled ?? true}
										onChange={(e) => setEditingTag((prev) => ({ ...prev, isEnabled: e.target.checked }))}
										className="rounded border-[var(--border-subtle)] text-[var(--brand-orange)] bg-[var(--bg-dark-fill-3)] focus:ring-[var(--brand-orange)] h-4 w-4"
									/>
									<span>Enabled</span>
								</label>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								type="button"
								onClick={handleCloseModal}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={submitting}
								className="flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-orange)] hover:opacity-95 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
							>
								<FaSave size={10} />
								<span>{submitting ? "Saving..." : "Save Tag"}</span>
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
};
