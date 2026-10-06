import React, { useState, useEffect, useRef } from "react";
import {
	FaSearchPlus,
	FaSearchMinus,
	FaUndo,
	FaRedo,
	FaExpand,
	FaCompress,
	FaDownload
} from "react-icons/fa";

interface ImageViewerProps {
	url: string;
	name: string;
	idToken?: string;
	onNext?: () => void;
	onPrev?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
	url,
	name,
	idToken,
	onNext,
	onPrev
}) => {
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [rotation, setRotation] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const viewerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	// Append token to URL if needed for authenticated request
	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// Reset zoom, pan, rotation when source changes
	useEffect(() => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setRotation(0);
	}, [url]);

	// Mouse Drag to Pan
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

	// Touch Drag to Pan / Zoom Gestures
	const touchStart = useRef({ x: 0, y: 0 });
	const touchDist = useRef(0);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.touches.length === 1) {
			touchStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
		} else if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			touchDist.current = Math.sqrt(dx * dx + dy * dy);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (e.touches.length === 1 && zoom > 1) {
			setPan({
				x: e.touches[0].clientX - touchStart.current.x,
				y: e.touches[0].clientY - touchStart.current.y
			});
		} else if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const factor = dist / touchDist.current;
			setZoom((z) => Math.min(Math.max(z * factor, 1), 5));
			touchDist.current = dist;
		}
	};

	const handleTouchEnd = () => {
		setIsDragging(false);
	};

	const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
	const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 1));
	const handleReset = () => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setRotation(0);
	};

	const handleRotateLeft = () => setRotation((r) => (r - 90) % 360);
	const handleRotateRight = () => setRotation((r) => (r + 90) % 360);

	const toggleFullscreen = () => {
		if (!viewerRef.current) return;
		if (!document.fullscreenElement) {
			viewerRef.current.requestFullscreen().then(() => {
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

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	// Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "+" || e.key === "=") {
				handleZoomIn();
			} else if (e.key === "-") {
				handleZoomOut();
			} else if (e.key === "0") {
				handleReset();
			} else if (e.key === "r" || e.key === "R") {
				handleRotateRight();
			} else if (e.key === "ArrowRight" && onNext) {
				onNext();
			} else if (e.key === "ArrowLeft" && onPrev) {
				onPrev();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [zoom, rotation, onNext, onPrev]);

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
			console.error("Error downloading file:", error);
		}
	};

	return (
		<div 
			ref={viewerRef}
			className="relative flex flex-col items-center justify-center w-full h-full bg-[var(--bg-dark-fill-3)] rounded-lg overflow-hidden border border-[var(--border-subtle)]"
		>
			{/* Controls Toolbar */}
			<div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-md z-20 shadow-lg">
				<button
					onClick={handleZoomIn}
					className="p-2 text-white/85 hover:text-white transition rounded-lg hover:bg-white/10"
					title="Zoom In (+)"
				>
					<FaSearchPlus size={13} />
				</button>
				<button
					onClick={handleZoomOut}
					className="p-2 text-white/85 hover:text-white transition rounded-lg hover:bg-white/10"
					title="Zoom Out (-)"
				>
					<FaSearchMinus size={13} />
				</button>
				<button
					onClick={handleReset}
					className="px-2 py-1 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 rounded transition"
					title="Reset Zoom (0)"
				>
					Reset
				</button>
				<div className="w-px h-4 bg-white/10 mx-1" />
				<button
					onClick={handleRotateLeft}
					className="p-2 text-white/85 hover:text-white transition rounded-lg hover:bg-white/10"
					title="Rotate Left"
				>
					<FaUndo size={12} />
				</button>
				<button
					onClick={handleRotateRight}
					className="p-2 text-white/85 hover:text-white transition rounded-lg hover:bg-white/10"
					title="Rotate Right (R)"
				>
					<FaRedo size={12} />
				</button>
				<div className="w-px h-4 bg-white/10 mx-1" />
				<button
					onClick={toggleFullscreen}
					className="p-2 text-white/85 hover:text-white transition rounded-lg hover:bg-white/10"
					title="Toggle Fullscreen"
				>
					{isFullscreen ? <FaCompress size={13} /> : <FaExpand size={13} />}
				</button>
				<button
					onClick={handleDownload}
					className="p-2 text-emerald-400 hover:text-emerald-300 transition rounded-lg hover:bg-white/10"
					title="Download"
				>
					<FaDownload size={13} />
				</button>
			</div>

			{/* Main Image Viewport */}
			<div
				className="w-full h-full flex items-center justify-center cursor-move overflow-hidden select-none"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
			>
				<img
					ref={imgRef}
					src={srcUrl}
					alt={name}
					style={{
						transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
						transition: isDragging ? "none" : "transform 0.2s ease-out"
					}}
					className="max-w-[90%] max-h-[85%] object-contain rounded-lg shadow-xl pointer-events-none"
				/>
			</div>
		</div>
	);
};

export default ImageViewer;
