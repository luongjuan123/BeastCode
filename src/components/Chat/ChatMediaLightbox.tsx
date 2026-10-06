import React, { useEffect } from "react";
import { FaTimes, FaDownload, FaChevronLeft, FaChevronRight, FaSpinner, FaRedo, FaExclamationTriangle } from "react-icons/fa";
import { ChatAttachment } from "@/types/chat";
import { useAuthorizedChatMedia, downloadAuthorizedMedia } from "@/hooks/chat/useAuthorizedChatMedia";

interface ChatMediaLightboxProps {
	isOpen: boolean;
	attachment: ChatAttachment | null;
	onClose: () => void;
	onNext?: () => void;
	onPrev?: () => void;
	hasNext?: boolean;
	hasPrev?: boolean;
}

export const ChatMediaLightbox: React.FC<ChatMediaLightboxProps> = ({
	isOpen,
	attachment,
	onClose,
	onNext,
	onPrev,
	hasNext,
	hasPrev,
}) => {
	const { blobUrl, loading, error, retry } = useAuthorizedChatMedia(isOpen ? attachment : null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return;
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight" && onNext && hasNext) onNext();
			if (e.key === "ArrowLeft" && onPrev && hasPrev) onPrev();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

	if (!isOpen || !attachment) return null;

	const handleDownload = () => {
		downloadAuthorizedMedia(attachment);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity">
			{/* Close & Action Buttons */}
			<div className="absolute top-4 right-4 flex items-center gap-3 z-10">
				<button
					type="button"
					onClick={handleDownload}
					className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
					title="Download original"
				>
					<FaDownload size={12} />
					<span>Download</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
					aria-label="Close preview"
				>
					<FaTimes size={16} />
				</button>
			</div>

			{/* Navigation Buttons */}
			{hasPrev && onPrev && (
				<button
					type="button"
					onClick={onPrev}
					className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10 cursor-pointer"
					aria-label="Previous media"
				>
					<FaChevronLeft size={18} />
				</button>
			)}

			{hasNext && onNext && (
				<button
					type="button"
					onClick={onNext}
					className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10 cursor-pointer"
					aria-label="Next media"
				>
					<FaChevronRight size={18} />
				</button>
			)}

			{/* Media Display Area */}
			<div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center justify-center p-4">
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 text-white/70">
						<FaSpinner size={32} className="animate-spin text-brand-orange mb-3" />
						<span className="text-xs font-mono">Loading full-resolution image...</span>
					</div>
				) : error || !blobUrl ? (
					<div className="p-6 rounded-lg bg-dark-layer-1 border border-border-subtle flex flex-col items-center text-center max-w-sm">
						<FaExclamationTriangle size={28} className="text-amber-400 mb-2" />
						<h5 className="text-sm font-bold text-white mb-1">Image unavailable</h5>
						<p className="text-xs text-text-muted mb-4">{error || "Could not retrieve media"}</p>
						<button
							type="button"
							onClick={() => retry()}
							className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange-s transition"
						>
							<FaRedo size={11} />
							<span>Retry</span>
						</button>
					</div>
				) : (
					<img
						src={blobUrl}
						alt={attachment.name}
						className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
					/>
				)}

				<div className="mt-3 text-center text-xs text-white/70 font-mono">
					{attachment.name} • {(attachment.size / 1024).toFixed(1)} KB
				</div>
			</div>
		</div>
	);
};
