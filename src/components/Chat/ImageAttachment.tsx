import React from "react";
import { FaImage, FaRedo, FaExclamationTriangle } from "react-icons/fa";
import { ChatAttachment } from "@/types/chat";
import { useAuthorizedChatMedia } from "@/hooks/chat/useAuthorizedChatMedia";

interface ImageAttachmentProps {
	attachment: ChatAttachment;
	onClick?: () => void;
	className?: string;
	isOutgoing?: boolean;
}

export const ImageAttachment: React.FC<ImageAttachmentProps> = ({
	attachment,
	onClick,
	className = "",
	isOutgoing = false,
}) => {
	const { blobUrl, loading, error, retry } = useAuthorizedChatMedia(attachment);

	// 0. Active Uploading State with inline progress bar
	if (attachment.isUploading || (attachment.uploadProgress !== undefined && attachment.uploadProgress < 100)) {
		const progress = attachment.uploadProgress ?? 0;
		return (
			<div className={`relative rounded-xl overflow-hidden border border-black/20 shadow-sm max-w-[280px] sm:max-w-[380px] ${className}`}>
				{attachment.url ? (
					<img
						src={attachment.url}
						alt={attachment.name}
						className="max-h-72 sm:max-h-80 w-auto object-cover rounded-xl filter brightness-50"
					/>
				) : (
					<div className="w-56 h-48 bg-black/40 flex items-center justify-center">
						<FaImage size={24} className="text-white/40" />
					</div>
				)}
				<div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-white">
					<div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-brand-orange animate-spin mb-2" />
					<span className="text-xs font-mono font-bold">{progress}%</span>
					<div className="w-32 bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
						<div
							className="bg-brand-orange h-full rounded-full transition-all duration-200"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<span className="text-[10px] text-white/80 truncate max-w-[200px] mt-1 font-mono">
						Uploading...
					</span>
				</div>
			</div>
		);
	}

	// 1. Loading Skeleton State (Smooth aspect-ratio placeholder, zero layout shift)
	if (loading) {
		return (
			<div
				className={`relative rounded-xl overflow-hidden flex flex-col items-center justify-center bg-black/20 border border-white/10 animate-pulse ${
					className || "w-56 h-48 sm:w-72 sm:h-56"
				}`}
			>
				<FaImage size={24} className="text-white/40 mb-2 animate-bounce" />
				<span className="text-[11px] font-mono text-white/60">Loading image...</span>
			</div>
		);
	}

	// 2. Controlled Error State (Never displays browser-native broken image icon or raw filename)
	if (error || !blobUrl) {
		return (
			<div
				className={`relative rounded-xl p-3.5 flex flex-col items-center justify-center text-center border ${
					isOutgoing
						? "bg-black/25 border-white/20 text-white"
						: "bg-dark-fill-2 border-border-subtle text-text-secondary"
				} max-w-[280px] sm:max-w-[320px]`}
			>
				<div className="flex items-center gap-2 mb-1.5 text-amber-400">
					<FaExclamationTriangle size={14} />
					<span className="text-xs font-bold">Image unavailable</span>
				</div>
				<p className="text-[10px] opacity-75 truncate max-w-[240px] mb-2.5 font-mono">
					{attachment.name}
				</p>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						retry();
					}}
					className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
				>
					<FaRedo size={10} />
					<span>Retry</span>
				</button>
			</div>
		);
	}

	// 3. Ready State: High-quality image rendering with hover preview
	return (
		<div
			onClick={onClick}
			className={`group/img relative cursor-pointer rounded-xl overflow-hidden border border-black/15 shadow-sm hover:opacity-95 transition-all duration-150 ${className}`}
		>
			<img
				src={blobUrl}
				alt={attachment.name}
				className="max-h-72 sm:max-h-80 w-auto max-w-[280px] sm:max-w-[380px] object-cover rounded-xl select-none"
				loading="lazy"
			/>
			{/* Bottom subtle metadata overlay on hover */}
			<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 opacity-0 group-hover/img:opacity-100 transition-opacity duration-150 flex items-center justify-between text-[10px] text-white font-mono">
				<span className="truncate max-w-[200px]">{attachment.name}</span>
				<span>{(attachment.size / 1024).toFixed(0)} KB</span>
			</div>
		</div>
	);
};
