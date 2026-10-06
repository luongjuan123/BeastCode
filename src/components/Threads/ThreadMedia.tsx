import React, { useState, useEffect, useRef } from "react";
import {
	FaChevronLeft,
	FaChevronRight,
	FaHeart,
	FaSearchPlus,
	FaSearchMinus,
	FaTimes,
	FaExpand,
	FaCompress
} from "react-icons/fa";

interface ThreadMediaProps {
	photos?: string[];
	gif?: string | null;
	onDoubleTap?: () => void;
}

const ThreadMedia: React.FC<ThreadMediaProps> = ({
	photos = [],
	gif = null,
	onDoubleTap,
}) => {
	const [activeIdx, setActiveIdx] = useState(0);
	const [doubleTapAnim, setDoubleTapAnim] = useState(false);
	const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

	// Lightbox State
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0); // index for photos, -1 for gif
	const [zoom, setZoom] = useState(1);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const dragStart = useRef({ x: 0, y: 0 });

	const lightboxRef = useRef<HTMLDivElement>(null);

	const handleDoubleTap = (e: React.MouseEvent) => {
		if (onDoubleTap) {
			onDoubleTap();
		}
		setDoubleTapAnim(true);
		setTimeout(() => setDoubleTapAnim(false), 800);
	};

	const markLoaded = (src: string) => {
		setLoadedImages((prev) => ({ ...prev, [src]: true }));
	};

	const openLightbox = (idx: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setLightboxIndex(idx);
		setLightboxOpen(true);
		setZoom(1);
		setPan({ x: 0, y: 0 });
	};

	const closeLightbox = () => {
		setLightboxOpen(false);
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		}
		setIsFullscreen(false);
	};

	const handlePrev = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (gif) return; // Only 1 GIF possible
		setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
		setZoom(1);
		setPan({ x: 0, y: 0 });
	};

	const handleNext = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (gif) return;
		setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
		setZoom(1);
		setPan({ x: 0, y: 0 });
	};

	const toggleFullscreen = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!lightboxRef.current) return;
		if (!document.fullscreenElement) {
			lightboxRef.current.requestFullscreen().then(() => {
				setIsFullscreen(true);
			}).catch((err) => {
				console.error("Fullscreen error:", err);
			});
		} else {
			document.exitFullscreen().then(() => {
				setIsFullscreen(false);
			}).catch(() => {});
		}
	};

	// Mouse Drag to Pan Zoomed Image
	const handleMouseDown = (e: React.MouseEvent) => {
		if (zoom === 1) return;
		e.preventDefault();
		setIsDragging(true);
		dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;
		setPan({
			x: e.clientX - dragStart.current.x,
			y: e.clientY - dragStart.current.y
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Keyboard Navigation inside Lightbox
	useEffect(() => {
		if (!lightboxOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeLightbox();
			} else if (e.key === "ArrowLeft") {
				handlePrev();
			} else if (e.key === "ArrowRight") {
				handleNext();
			} else if (e.key === "+" || e.key === "=") {
				setZoom((z) => Math.min(z + 0.5, 4));
			} else if (e.key === "-") {
				setZoom((z) => Math.max(z - 0.5, 1));
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [lightboxOpen, lightboxIndex, photos]);

	const hasPhotos = photos && photos.length > 0;
	const totalPhotos = photos.length;

	if (!hasPhotos && !gif) return null;

	return (
		<div
			onDoubleClick={handleDoubleTap}
			className="relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-dark-fill-3)] select-none"
			style={{ contentVisibility: "auto", containIntrinsicSize: "0 280px" } as React.CSSProperties}
		>
			{/* Double-tap Heart Pop Animation */}
			{doubleTapAnim && (
				<div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
					<FaHeart className="text-red-500 scale-0 animate-heart-pop drop-shadow-lg" size={64} />
				</div>
			)}

			{/* Progressive Loading Shimmer background */}
			<div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-hover)] to-[var(--bg-elevated)] animate-pulse -z-10 rounded-xl" />

			{/* GIF Rendering */}
			{gif && !hasPhotos && (
				<div
					onClick={(e) => openLightbox(-1, e)}
					className="w-full overflow-hidden rounded-xl cursor-zoom-in relative group aspect-video"
				>
					<img
						src={gif}
						alt="Thread GIF"
						onLoad={() => markLoaded(gif)}
						className={`w-full h-full object-cover rounded-xl transition-all duration-500 ease-out ${
							loadedImages[gif] ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-95"
						}`}
						loading="lazy"
					/>
					<div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-200" />
				</div>
			)}

			{/* Single Photo Rendering */}
			{hasPhotos && totalPhotos === 1 && (
				<div
					onClick={(e) => openLightbox(0, e)}
					className="w-full overflow-hidden rounded-xl flex items-center justify-center cursor-zoom-in relative group min-h-[140px]"
				>
					<img
						src={photos[0]}
						alt="Attachment"
						onLoad={() => markLoaded(photos[0])}
						className={`w-full h-auto max-h-[520px] object-contain rounded-xl transition-all duration-500 ease-out ${
							loadedImages[photos[0]] ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-95"
						}`}
						loading="lazy"
					/>
					<div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-all duration-200" />
				</div>
			)}

			{/* Double Photos Split Layout */}
			{hasPhotos && totalPhotos === 2 && (
				<div className="grid grid-cols-2 gap-1.5 w-full aspect-video overflow-hidden rounded-xl">
					{photos.map((photo, idx) => (
						<div
							key={idx}
							onClick={(e) => openLightbox(idx, e)}
							className="w-full h-full overflow-hidden relative cursor-zoom-in group"
						>
							<img
								src={photo}
								alt={`Attachment ${idx + 1}`}
								onLoad={() => markLoaded(photo)}
								className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.01] ${
									loadedImages[photo] ? "opacity-100 blur-0" : "opacity-0 blur-md"
								}`}
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-all duration-200" />
						</div>
					))}
				</div>
			)}

			{/* Triple Photos Collage Layout */}
			{hasPhotos && totalPhotos === 3 && (
				<div className="grid grid-cols-3 gap-1.5 w-full aspect-video overflow-hidden rounded-xl">
					<div
						onClick={(e) => openLightbox(0, e)}
						className="col-span-2 w-full h-full overflow-hidden relative cursor-zoom-in group"
					>
						<img
							src={photos[0]}
							alt="Attachment 1"
							onLoad={() => markLoaded(photos[0])}
							className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.01] ${
								loadedImages[photos[0]] ? "opacity-100 blur-0" : "opacity-0 blur-md"
							}`}
							loading="lazy"
						/>
						<div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-all duration-200" />
					</div>
					<div className="grid grid-rows-2 gap-1.5 w-full h-full">
						{photos.slice(1, 3).map((photo, idx) => (
							<div
								key={idx}
								onClick={(e) => openLightbox(idx + 1, e)}
								className="w-full h-full overflow-hidden relative cursor-zoom-in group"
							>
								<img
									src={photo}
									alt={`Attachment ${idx + 2}`}
									onLoad={() => markLoaded(photo)}
									className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.01] ${
										loadedImages[photo] ? "opacity-100 blur-0" : "opacity-0 blur-md"
									}`}
									loading="lazy"
								/>
								<div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-all duration-200" />
							</div>
						))}
					</div>
				</div>
			)}

			{/* 4+ Photos Collage Layout / Swiper Option */}
			{hasPhotos && totalPhotos >= 4 && (
				<div className="relative w-full aspect-video overflow-hidden rounded-xl group">
					<div
						onClick={(e) => openLightbox(activeIdx, e)}
						className="w-full h-full cursor-zoom-in relative"
					>
						<img
							src={photos[activeIdx]}
							alt={`Attachment ${activeIdx + 1}`}
							onLoad={() => markLoaded(photos[activeIdx])}
							className={`w-full h-full object-cover transition-all duration-500 ease-out ${
								loadedImages[photos[activeIdx]] ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-95"
							}`}
							loading="lazy"
						/>
						<div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-all duration-200" />
					</div>

					{/* Navigation Arrow buttons */}
					{totalPhotos > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
								}}
								className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/55 hover:bg-black/75 text-white rounded-full opacity-0 group-hover:opacity-100 hover:scale-105 transition duration-150 z-10 shrink-0"
							>
								<FaChevronLeft size={10} />
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
								}}
								className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/55 hover:bg-black/75 text-white rounded-full opacity-0 group-hover:opacity-100 hover:scale-105 transition duration-150 z-10 shrink-0"
							>
								<FaChevronRight size={10} />
							</button>
						</>
					)}

					{/* Overlay Count */}
					<div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full flex gap-1.5 items-center select-none text-[10px] text-white font-mono z-10 shrink-0">
						<span>{activeIdx + 1} / {totalPhotos}</span>
					</div>
				</div>
			)}

			{/* ====================================================
			    LIGHTBOX OVERLAY (Fullscreen view)
			   ==================================================== */}
			{lightboxOpen && (
				<div
					ref={lightboxRef}
					onClick={closeLightbox}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
				>
					{/* Top Actions panel */}
					<div
						onClick={(e) => e.stopPropagation()}
						className="absolute top-4 right-4 flex items-center gap-2 z-[60] bg-black/35 backdrop-blur-md border border-white/10 p-2 rounded-xl"
					>
						<button
							onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
							className="p-2.5 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10"
							title="Zoom In"
						>
							<FaSearchPlus size={14} />
						</button>
						<button
							onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
							className="p-2.5 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10"
							title="Reset Zoom"
						>
							<FaSearchMinus size={14} />
						</button>
						<button
							onClick={toggleFullscreen}
							className="p-2.5 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10"
							title="Fullscreen"
						>
							{isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
						</button>
						<button
							onClick={closeLightbox}
							className="p-2.5 text-red-400 hover:text-red-300 transition rounded-lg hover:bg-white/10 ml-2"
							title="Close Lightbox"
						>
							<FaTimes size={15} />
						</button>
					</div>

					{/* Left / Right Nav inside Lightbox */}
					{!gif && totalPhotos > 1 && (
						<>
							<button
								onClick={handlePrev}
								className="absolute left-6 top-1/2 -translate-y-1/2 z-[60] p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition hover:scale-105 active:scale-95"
							>
								<FaChevronLeft size={16} />
							</button>
							<button
								onClick={handleNext}
								className="absolute right-6 top-1/2 -translate-y-1/2 z-[60] p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition hover:scale-105 active:scale-95"
							>
								<FaChevronRight size={16} />
							</button>
						</>
					)}

					{/* Image / GIF container */}
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative flex items-center justify-center max-w-[85vw] max-h-[85vh] overflow-hidden"
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseUp}
						style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
					>
						<img
							src={lightboxIndex === -1 ? gif! : photos[lightboxIndex]}
							alt="Enlarged media view"
							style={{
								transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
								transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
							}}
							className="max-w-full max-h-[85vh] object-contain rounded-lg pointer-events-none"
						/>
					</div>

					{/* Navigation Indicator count */}
					{!gif && totalPhotos > 1 && (
						<div
							onClick={(e) => e.stopPropagation()}
							className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/45 px-4 py-1.5 border border-white/10 text-xs font-mono text-white/70 rounded-full select-none"
						>
							{lightboxIndex + 1} / {totalPhotos}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ThreadMedia;
