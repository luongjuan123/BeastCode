import React, { useState, useEffect, useRef } from "react";
import {
	FaPlay,
	FaPause,
	FaVolumeMute,
	FaVolumeUp,
	FaExpand,
	FaCompress,
	FaDownload,
	FaSpinner
} from "react-icons/fa";

interface VideoViewerProps {
	url: string;
	name: string;
	idToken?: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({
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
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [loading, setLoading] = useState(true);

	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// Load progress memory from LocalStorage
	const progressKey = `video-progress-${name}`;

	useEffect(() => {
		const savedProgress = localStorage.getItem(progressKey);
		if (savedProgress && videoRef.current) {
			const time = parseFloat(savedProgress);
			videoRef.current.currentTime = time;
			setCurrentTime(time);
		}
	}, [url]);

	// Update localStorage as video plays
	const handleTimeUpdate = () => {
		if (videoRef.current) {
			const time = videoRef.current.currentTime;
			setCurrentTime(time);
			localStorage.setItem(progressKey, time.toString());
		}
	};

	const handleLoadedMetadata = () => {
		if (videoRef.current) {
			setDuration(videoRef.current.duration);
			setLoading(false);
		}
	};

	const togglePlay = () => {
		if (!videoRef.current) return;
		if (isPlaying) {
			videoRef.current.pause();
			setIsPlaying(false);
		} else {
			videoRef.current.play().then(() => {
				setIsPlaying(true);
			}).catch((err) => console.error("Error playing video:", err));
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (videoRef.current) {
			const seekTime = parseFloat(e.target.value);
			videoRef.current.currentTime = seekTime;
			setCurrentTime(seekTime);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		setVolume(vol);
		setIsMuted(vol === 0);
		if (videoRef.current) {
			videoRef.current.volume = vol;
			videoRef.current.muted = vol === 0;
		}
	};

	const toggleMute = () => {
		if (!videoRef.current) return;
		const nextMuteState = !isMuted;
		setIsMuted(nextMuteState);
		videoRef.current.muted = nextMuteState;
	};

	const handleSpeedChange = (speed: number) => {
		setPlaybackSpeed(speed);
		if (videoRef.current) {
			videoRef.current.playbackRate = speed;
		}
	};

	const toggleFullscreen = () => {
		if (!containerRef.current) return;
		if (!document.fullscreenElement) {
			containerRef.current.requestFullscreen().then(() => {
				setIsFullscreen(true);
			}).catch((err) => console.error("Fullscreen error:", err));
		} else {
			document.exitFullscreen().then(() => {
				setIsFullscreen(false);
			}).catch(() => {});
		}
	};

	const handlePip = async () => {
		if (!videoRef.current) return;
		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else if (videoRef.current !== document.pictureInPictureElement) {
				await videoRef.current.requestPictureInPicture();
			}
		} catch (err) {
			console.error("Picture-in-Picture error:", err);
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
			console.error("Error downloading video:", error);
		}
	};

	// Format time helper (e.g. 01:23)
	const formatTime = (secs: number) => {
		if (isNaN(secs)) return "0:00";
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s < 10 ? "0" : ""}${s}`;
	};

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	return (
		<div 
			ref={containerRef}
			className="relative flex flex-col items-center justify-center w-full h-[60vh] bg-[var(--bg-dark-fill-3)] rounded-lg overflow-hidden border border-[var(--border-subtle)] group shadow-xl"
		>
			{loading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30">
					<FaSpinner className="animate-spin text-[var(--brand-orange)] mb-3" size={24} />
					<p className="text-xs text-white/70">Buffering media...</p>
				</div>
			)}

			{/* HTML5 Video Element */}
			<video
				ref={videoRef}
				src={srcUrl}
				onClick={togglePlay}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				className="w-full h-full object-contain cursor-pointer"
				preload="metadata"
				playsInline
			/>

			{/* Custom Playback Controls Overlay (Fade-in on hover) */}
			<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
				
				{/* Progress Scrubber Bar */}
				<div className="flex items-center gap-3 w-full">
					<span className="text-[10px] font-mono text-white/80 select-none">
						{formatTime(currentTime)}
					</span>
					<input
						type="range"
						min={0}
						max={duration || 0}
						value={currentTime}
						onChange={handleSeek}
						className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--brand-orange)] focus:outline-none"
					/>
					<span className="text-[10px] font-mono text-white/80 select-none">
						{formatTime(duration)}
					</span>
				</div>

				{/* Primary Control Buttons */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{/* Play/Pause */}
						<button 
							onClick={togglePlay} 
							className="text-white hover:text-[var(--brand-orange)] transition"
						>
							{isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
						</button>

						{/* Volume controls */}
						<div className="flex items-center gap-1.5 group/volume">
							<button 
								onClick={toggleMute} 
								className="text-white hover:text-[var(--brand-orange)] transition"
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
								className="w-0 group-hover/volume:w-16 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-[var(--brand-orange)] transition-all duration-200"
							/>
						</div>

						{/* Speed control dropdown */}
						<div className="relative group/speed flex items-center">
							<span className="text-[10px] font-mono text-white/70 font-bold border border-white/20 px-2 py-0.5 rounded cursor-pointer hover:bg-white/10 select-none">
								{playbackSpeed}x
							</span>
							<div className="absolute bottom-6 left-0 hidden group-hover/speed:flex flex-col bg-dark-layer-2 border border-gray-800 rounded-lg py-1 shadow-xl z-30 min-w-[64px]">
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
					</div>

					{/* Right Controls */}
					<div className="flex items-center gap-3">
						<button 
							onClick={handlePip}
							className="text-[10px] font-bold text-white/80 hover:text-white border border-white/20 rounded px-1.5 py-0.5 hover:bg-white/10 transition select-none"
							title="Picture in Picture"
						>
							PIP
						</button>
						<button
							onClick={handleDownload}
							className="text-emerald-450 hover:text-emerald-400 transition"
							title="Download video"
						>
							<FaDownload size={12} />
						</button>
						<button 
							onClick={toggleFullscreen} 
							className="text-white hover:text-[var(--brand-orange)] transition"
						>
							{isFullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default VideoViewer;
