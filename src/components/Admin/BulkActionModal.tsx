import React, { useState } from "react";
import { FaBan, FaUndo, FaTrash, FaSignOutAlt, FaUserShield, FaTimes, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { BulkActionType } from "./BulkActionBar";
import BeastCodeSelect from "../UI/BeastCodeSelect";

interface BulkActionModalProps {
	action: BulkActionType | null;
	selectedCount: number;
	onClose: () => void;
	onSubmit: (payload: {
		reason: string;
		duration?: "1 day" | "7 days" | "30 days" | "Permanent";
		newRole?: "admin" | "user";
		notes?: string;
		forceImmediate?: boolean;
	}) => Promise<void>;
	isSuperAdmin?: boolean;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
	action,
	selectedCount,
	onClose,
	onSubmit,
	isSuperAdmin = false,
}) => {
	const [reason, setReason] = useState("");
	const [duration, setDuration] = useState<"1 day" | "7 days" | "30 days" | "Permanent">("7 days");
	const [newRole, setNewRole] = useState<"admin" | "user">("user");
	const [notes, setNotes] = useState("");
	const [forceImmediate, setForceImmediate] = useState(false);
	const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
	const [submitting, setSubmitting] = useState(false);

	if (!action) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (action === "delete" && deleteConfirmationText.trim() !== "DELETE") {
			return;
		}

		setSubmitting(true);
		try {
			await onSubmit({
				reason: reason.trim() || (action === "unban" ? "Appeal accepted" : "Bulk administrative action"),
				duration,
				newRole,
				notes: notes.trim(),
				forceImmediate,
			});
		} finally {
			setSubmitting(false);
		}
	};

	const getTitle = () => {
		switch (action) {
			case "ban":
				return { text: "Bulk Suspend Accounts", icon: <FaBan className="text-amber-500" />, color: "text-amber-400" };
			case "unban":
				return { text: "Bulk Lift Suspension", icon: <FaUndo className="text-emerald-500" />, color: "text-emerald-400" };
			case "change_role":
				return { text: "Bulk Change Role", icon: <FaUserShield className="text-indigo-400" />, color: "text-indigo-400" };
			case "force_logout":
				return { text: "Bulk Force Logout", icon: <FaSignOutAlt className="text-sky-400" />, color: "text-sky-400" };
			case "delete":
				return { text: "Bulk Delete Accounts", icon: <FaTrash className="text-red-500" />, color: "text-red-500" };
		}
	};

	const modalInfo = getTitle();

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
			<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up select-none">
				<button
					type="button"
					onClick={onClose}
					disabled={submitting}
					className="absolute top-5 right-5 text-[var(--text-muted)] hover:text-white transition"
				>
					<FaTimes size={14} />
				</button>

				<div className="flex items-center gap-2.5 mb-2">
					{modalInfo.icon}
					<h3 className={`text-base font-black ${modalInfo.color}`}>{modalInfo.text}</h3>
				</div>

				<p className="text-xs text-[var(--text-secondary)] mb-5">
					Targeting <strong className="text-white font-mono">{selectedCount}</strong> selected account{selectedCount === 1 ? "" : "s"}.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4 text-xs">
					{/* Action-specific fields */}
					{action === "ban" && (
						<>
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Suspension Duration
								</label>
								<BeastCodeSelect
									options={[
										{ value: "1 day", label: "24 Hours (1 Day)" },
										{ value: "7 days", label: "7 Days (1 Week)" },
										{ value: "30 days", label: "30 Days (1 Month)" },
										...(isSuperAdmin ? [{ value: "Permanent", label: "Permanent Ban (Super Admin)" }] : []),
									]}
									value={duration}
									onChange={(val) => setDuration(val as any)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Reason for Suspension
								</label>
								<input
									type="text"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-amber-500 rounded-xl p-2.5 text-white outline-none"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Internal Notes (Optional)
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={2}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-amber-500 rounded-xl p-2.5 text-white outline-none resize-none"
								/>
							</div>
						</>
					)}

					{action === "unban" && (
						<>
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Reason for Lifting Suspension
								</label>
								<input
									type="text"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-xl p-2.5 text-white outline-none"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Internal Notes (Optional)
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={2}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-xl p-2.5 text-white outline-none resize-none"
								/>
							</div>
						</>
					)}

					{action === "change_role" && (
						<>
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Target Role
								</label>
								<BeastCodeSelect
									options={[
										{ value: "user", label: "User (Standard Solver)" },
										...(isSuperAdmin ? [{ value: "admin", label: "Administrator (Platform Admin)" }] : []),
									]}
									value={newRole}
									onChange={(val) => setNewRole(val as any)}
									size="md"
								/>
							</div>

							{newRole === "admin" && (
								<div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-400 flex items-start gap-2">
									<FaExclamationTriangle className="shrink-0 mt-0.5" size={13} />
									<p className="text-[11px] leading-relaxed">
										Granting Administrator privileges provides full access to moderation, contest editing, problem management, and system logs.
									</p>
								</div>
							)}

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Reason for Role Update
								</label>
								<input
									type="text"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-indigo-500 rounded-xl p-2.5 text-white outline-none"
								/>
							</div>
						</>
					)}

					{action === "force_logout" && (
						<div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-900/40 text-sky-300 space-y-2">
							<p className="font-bold">Revoke active sessions</p>
							<p className="text-[11px] leading-relaxed text-sky-300/80">
								This will revoke all active refresh tokens and terminate sessions for the {selectedCount} selected account{selectedCount === 1 ? "" : "s"}. Users will be forced to log in again upon their next request.
							</p>
						</div>
					)}

					{action === "delete" && (
						<div className="space-y-4">
							<div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 space-y-1.5">
								<p className="font-bold flex items-center gap-1.5 text-red-400">
									<FaExclamationTriangle size={12} /> High-Risk Bulk Operation
								</p>
								<p className="text-[11px] leading-relaxed text-red-300/80">
									By default, accounts enter a <strong>14-day deletion hold</strong> where users have 7 days to file an appeal.
									{isSuperAdmin && " As a Super Admin, you may force immediate permanent deletion."}
								</p>
							</div>

							{isSuperAdmin && (
								<label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)]">
									<input
										type="checkbox"
										checked={forceImmediate}
										onChange={(e) => setForceImmediate(e.target.checked)}
										className="rounded text-red-500 focus:ring-0 cursor-pointer"
									/>
									<span className="text-red-400 font-bold text-[11px]">
										Force Immediate Permanent Purge (Bypass 14-day hold)
									</span>
								</label>
							)}

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">
									Deletion Reason
								</label>
								<input
									type="text"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-red-500 rounded-xl p-2.5 text-white outline-none"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-red-400 uppercase tracking-wider">
									Type <strong className="font-mono text-white">DELETE</strong> to confirm:
								</label>
								<input
									type="text"
									value={deleteConfirmationText}
									onChange={(e) => setDeleteConfirmationText(e.target.value)}
									autoComplete="off"
									spellCheck={false}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-red-900/50 focus:border-red-500 rounded-xl p-2.5 text-white font-mono text-xs outline-none"
								/>
							</div>
						</div>
					)}

					<div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							className="px-4 py-2 rounded-xl bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-bold transition"
						>
							Cancel
						</button>

						<button
							type="submit"
							disabled={
								submitting ||
								(action === "delete" && deleteConfirmationText.trim() !== "DELETE")
							}
							className={`px-5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-white ${
								action === "delete"
									? "bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
									: action === "ban"
									? "bg-amber-600 hover:bg-amber-700 disabled:opacity-40"
									: action === "unban"
									? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
									: action === "change_role"
									? "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40"
									: "bg-sky-600 hover:bg-sky-700 disabled:opacity-40"
							}`}
						>
							{submitting ? (
								<>
									<FaSpinner className="animate-spin" size={12} />
									<span>Processing...</span>
								</>
							) : (
								<span>Execute on {selectedCount} Accounts</span>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
