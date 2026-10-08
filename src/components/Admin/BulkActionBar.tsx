import React from "react";
import { FaBan, FaUndo, FaTrash, FaSignOutAlt, FaUserShield, FaTimes } from "react-icons/fa";

export type BulkActionType = "ban" | "unban" | "change_role" | "force_logout" | "delete";

interface BulkActionBarProps {
	selectedCount: number;
	onClearSelection: () => void;
	onTriggerAction: (action: BulkActionType) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
	selectedCount,
	onClearSelection,
	onTriggerAction,
}) => {
	if (selectedCount <= 0) return null;

	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 text-xs select-none animate-slide-up">
			<div className="flex items-center gap-2 pr-2 border-r border-[var(--border-subtle)]">
				<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
				<span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg text-[11px]">
					{selectedCount} Selected
				</span>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onTriggerAction("ban")}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 transition font-bold"
				>
					<FaBan size={11} />
					<span>Suspend</span>
				</button>

				<button
					type="button"
					onClick={() => onTriggerAction("unban")}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition font-bold"
				>
					<FaUndo size={11} />
					<span>Lift Suspension</span>
				</button>

				<button
					type="button"
					onClick={() => onTriggerAction("change_role")}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 transition font-bold"
				>
					<FaUserShield size={11} />
					<span>Change Role</span>
				</button>

				<button
					type="button"
					onClick={() => onTriggerAction("force_logout")}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] transition font-bold"
				>
					<FaSignOutAlt size={11} />
					<span>Force Logout</span>
				</button>

				<button
					type="button"
					onClick={() => onTriggerAction("delete")}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-800/40 transition font-bold"
				>
					<FaTrash size={11} />
					<span>Delete</span>
				</button>
			</div>

			<div className="pl-2 border-l border-[var(--border-subtle)]">
				<button
					type="button"
					onClick={onClearSelection}
					className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition"
					title="Clear selection"
				>
					<FaTimes size={12} />
				</button>
			</div>
		</div>
	);
};
