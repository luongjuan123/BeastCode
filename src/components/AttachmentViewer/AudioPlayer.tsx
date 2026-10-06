import React, { useState, useEffect, useRef } from "react";
import {
	FaPlay,
	FaPause,
	FaVolumeMute,
	FaVolumeUp,
	FaDownload,
	FaMusic
} from "react-icons/fa";

interface AudioPlayerProps {
	url: string;
	name: string;
	idToken?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	name,
	idToken
}) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [isMuted, setIsMuted] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);

	const audioRef = useRef<HTMLAudioElement>(null);

	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// Reset play state when URL changes
	useEffect(() => {
		setIsPlaying(false);
		setCurrentTime(0);
		if (audioRef.current) {
			audioRef.current.load();
		}
	}, [url]);

	const togglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current.play().then(() => {
				setIsPlaying(true);
			}).catch((err) => console.error("Error playing audio:", err));
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (audioRef.current) {
			const seekTime = parseFloat(e.target.value);
			audioRef.current.currentTime = seekTime;
			setCurrentTime(seekTime);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		setVolume(vol);
		setIsMuted(vol === 0);
		if (audioRef.current) {
			audioRef.current.volume = vol;
			audioRef.current.muted = vol === 0;
		}
	};

	const toggleMute = () => {
		if (!audioRef.current) return;
		const nextMuted = !isMuted;
		setIsMuted(nextMuted);
		audioRef.current.muted = nextMuted;
	};

	const handleSpeedChange = (speed: number) => {
		setPlaybackSpeed(speed);
		if (audioRef.current) {
			audioRef.current.playbackRate = speed;
		}
	};

	const handleDownload = async () => {
		try {
			const response = await fetch(srcUrl);
			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error("Error downloading audio:", error);
		}
	};

	const formatTime = (secs: number) => {
		if (isNaN(secs)) return "0:00";
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s < 10 ? "0" : ""}${s}`;
	};

	return (
		<div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-lg w-full max-w-lg mx-auto shadow-md">
			<audio
				ref={audioRef}
				src={srcUrl}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				onEnded={() => setIsPlaying(false)}
			/>

			{/* Audio Icon & Visual Container */}
			<div className="flex items-center justify-center w-16 h-16 bg-[var(--brand-glow)] text-[var(--brand-orange)] rounded-full mb-4 shadow-inner">
				<FaMusic size={24} className={isPlaying ? "animate-bounce" : ""} />
			</div>

			{/* Filename title */}
			<p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-full mb-4" title={name}>
				{name}
			</p>

			{/* Timeline Scrubber */}
			<div className="flex items-center gap-3 w-full mb-4">
				<span className="text-[10px] font-mono text-[var(--text-muted)] select-none">
					{formatTime(currentTime)}
				</span>
				<input
					type="range"
					min={0}
					max={duration || 0}
					value={currentTime}
					onChange={handleSeek}
					className="flex-grow h-1 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-orange)] focus:outline-none"
				/>
				<span className="text-[10px] font-mono text-[var(--text-muted)] select-none">
					{formatTime(duration)}
				</span>
			</div>

			{/* Controls Toolbar */}
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-4">
					{/* Play/Pause */}
					<button
						onClick={togglePlay}
						className="w-10 h-10 flex items-center justify-center bg-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange-hover)] rounded-full transition shadow-md active:scale-95"
					>
						{isPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ml-0.5" />}
					</button>

					{/* Volume controls */}
					<div className="flex items-center gap-1.5 group/volume">
						<button 
							onClick={toggleMute}
							className="text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition"
						>
							{isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
						</button>
						<input
							type="range"
							min={0}
							max={1}
							step={0.05}
							value={isMuted ? 0 : volume}
							onChange={handleVolumeChange}
							className="w-16 h-1 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-orange)]"
						/>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Speed settings */}
					<div className="relative group/speed flex items-center">
						<span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold border border-[var(--border-subtle)] px-2 py-0.5 rounded cursor-pointer hover:bg-[var(--bg-hover)] select-none">
							{playbackSpeed}x
						</span>
						<div className="absolute bottom-6 right-0 hidden group-hover/speed:flex flex-col bg-dark-layer-2 border border-gray-800 rounded-lg py-1 shadow-xl z-30 min-w-[64px]">
							{[0.5, 1, 1.25, 1.5, 2].map((speed) => (
								<button
									key={speed}
									onClick={() => handleSpeedChange(speed)}
									className={`px-3 py-1 text-left text-[10px] hover:bg-dark-fill-3 transition w-full ${
										playbackSpeed === speed ? "text-[var(--brand-orange)] font-bold" : "text-white"
									}`}
								>
									{speed}x
								</button>
							))}
						</div>
					</div>

					<button
						onClick={handleDownload}
						className="p-2 text-emerald-400 hover:text-emerald-300 transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Download Audio"
					>
						<FaDownload size={13} />
					</button>
				</div>
			</div>
		</div>
	);
};

export default AudioPlayer;
