import React, { useState } from "react";
import { FaTimes, FaFlag, FaExclamationTriangle } from "react-icons/fa";
import { ChatMessage } from "@/types/chat";

interface ReportMessageModalProps {
	isOpen: boolean;
	message: ChatMessage | null;
	conversationId: string;
	onClose: () => void;
	onSuccess?: () => void;
}

const REPORT_CATEGORIES = [
	"Harassment or Bullying",
	"Spam or Advertising",
	"Academic Dishonesty / Cheating",
	"Inappropriate Content",
	"Hate Speech",
	"Other",
];

export const ReportMessageModal: React.FC<ReportMessageModalProps> = ({
	isOpen,
	message,
	conversationId,
	onClose,
	onSuccess,
}) => {
	const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	if (!isOpen || !message) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!reason.trim()) {
			setError("Please provide a brief explanation for this report.");
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const idToken = await (await import("@/firebase/firebase")).auth.currentUser?.getIdToken();
			const res = await fetch(`/api/chat/messages/${message.id}/report`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					conversationId,
					category,
					reason: reason.trim(),
				}),
			});

			const data = await res.json();
			if (res.ok && data.success) {
				setSuccessMsg("Report submitted successfully. Our moderation team will review this message.");
				setTimeout(() => {
					setSuccessMsg(null);
					setReason("");
					onClose();
					if (onSuccess) onSuccess();
				}, 1500);
			} else {
				setError(data.error || "Failed to submit report");
			}
		} catch (err: any) {
			setError(err.message || "Network error. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
			<div className="w-full max-w-md rounded-lg bg-dark-layer-1 border border-border-default shadow-2xl overflow-hidden flex flex-col animate-scale-in">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-dark-fill-2">
					<div className="flex items-center gap-2 text-rose-400">
						<FaFlag size={15} />
						<h3 className="text-sm font-bold text-text-primary">Report Message</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
					>
						<FaTimes size={15} />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
					{error && (
						<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
							<FaExclamationTriangle size={14} className="flex-shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{successMsg && (
						<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-center">
							{successMsg}
						</div>
					)}

					{/* Message Quote Preview */}
					<div className="p-3 rounded-xl bg-dark-fill-3 border border-border-subtle flex flex-col gap-1">
						<div className="font-bold text-text-muted text-[11px]">
							Reported Message ({message.senderDisplayName}):
						</div>
						<div className="text-text-secondary truncate italic">
							&ldquo;{message.text || (message.code ? "Code snippet" : "Attachment")}&rdquo;
						</div>
					</div>

					{/* Category Selector */}
					<div className="flex flex-col gap-1.5">
						<label className="font-bold text-text-secondary">Violation Category</label>
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="px-3 py-2 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none transition"
						>
							{REPORT_CATEGORIES.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
					</div>

					{/* Explanation Textarea */}
					<div className="flex flex-col gap-1.5">
						<label className="font-bold text-text-secondary">Why are you reporting this?</label>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							placeholder="Provide details about why this message violates community guidelines..."
							className="p-3 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none transition resize-none"
							autoFocus
						/>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition font-semibold"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || !reason.trim()}
							className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
						>
							{submitting ? "Filing Report..." : "Submit Report"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
