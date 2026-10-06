import React, { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaRedo, FaMicrophone } from "react-icons/fa";
import { ChatAttachment } from "@/types/chat";
import { useAuthorizedChatMedia } from "@/hooks/chat/useAuthorizedChatMedia";

interface AudioAttachmentProps {
	attachment: ChatAttachment;
	isOutgoing?: boolean;
}

export const AudioAttachment: React.FC<AudioAttachmentProps> = ({ attachment, isOutgoing = false }) => {
	const { blobUrl, loading, error, retry } = useAuthorizedChatMedia(attachment);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (blobUrl) {
			const audio = new Audio(blobUrl);
			audioRef.current = audio;

			audio.ontimeupdate = () => {
				if (audio.duration) {
					setProgress((audio.currentTime / audio.duration) * 100);
					setCurrentTime(Math.round(audio.currentTime));
				}
			};

			audio.onended = () => {
				setIsPlaying(false);
				setProgress(0);
				setCurrentTime(0);
			};

			return () => {
				audio.pause();
				audioRef.current = null;
			};
		}
	}, [blobUrl]);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
				console.warn("[Audio playback error]:", e);
			});
		}
	};

	if (loading) {
		return (
			<div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 min-w-[200px] animate-pulse">
				<div className="w-8 h-8 rounded-full bg-white/20" />
				<div className="flex-1 space-y-1.5">
					<div className="w-full bg-white/20 h-1.5 rounded-full" />
					<div className="w-16 bg-white/20 h-2.5 rounded" />
				</div>
			</div>
		);
	}

	if (error || !blobUrl) {
		return (
			<div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 min-w-[200px] text-xs">
				<span className="opacity-80">Voice note unavailable</span>
				<button
					type="button"
					onClick={() => retry()}
					className="text-white hover:text-brand-orange transition"
					title="Retry"
				>
					<FaRedo size={11} />
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 min-w-[220px] select-none">
			<button
				type="button"
				onClick={togglePlay}
				className="p-2.5 rounded-full bg-white text-brand-orange hover:scale-105 active:scale-95 transition shadow-sm"
				aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
			>
				{isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
			</button>
			<div className="flex-1">
				<div
					onClick={(e) => {
						if (!audioRef.current || !audioRef.current.duration) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const clickX = e.clientX - rect.left;
						const pct = Math.max(0, Math.min(1, clickX / rect.width));
						audioRef.current.currentTime = pct * audioRef.current.duration;
					}}
					className="w-full bg-white/20 hover:bg-white/30 cursor-pointer h-1.5 rounded-full overflow-hidden transition"
				>
					<div
						className="bg-white h-full transition-all duration-100"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<div className="flex justify-between text-[9px] mt-1 opacity-75 font-mono">
					<span className="flex items-center gap-1">
						<FaMicrophone size={8} /> Voice Memo
					</span>
					<span>{isPlaying ? `${currentTime}s` : attachment.duration ? `${attachment.duration}s` : ""}</span>
				</div>
			</div>
		</div>
	);
};
