import React, { useState, useEffect, useRef } from "react";
import {
	FaChevronLeft,
	FaChevronRight,
	FaSearchPlus,
	FaSearchMinus,
	FaUndo,
	FaRedo,
	FaDownload,
	FaPrint,
	FaExpand,
	FaCompress,
	FaSearch,
	FaTimes,
	FaThList,
	FaSpinner
} from "react-icons/fa";

interface PdfViewerProps {
	url: string;
	name: string;
	idToken?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
	url,
	name,
	idToken
}) => {
	const [pdfjs, setPdfjs] = useState<any>(null);
	const [pdfDoc, setPdfDoc] = useState<any>(null);
	const [pageNum, setPageNum] = useState(1);
	const [numPages, setNumPages] = useState(0);
	const [zoom, setZoom] = useState(1.0);
	const [rotation, setRotation] = useState(0);
	const [loading, setLoading] = useState(true);
	const [showThumbnails, setShowThumbnails] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	
	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchMatches, setSearchMatches] = useState<number[]>([]);
	const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
	
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const thumbnailContainersRef = useRef<Record<number, HTMLCanvasElement | null>>({});

	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// 1. Lazy load PDF.js from CDN
	useEffect(() => {
		const loadPdfJs = async () => {
			if (typeof window !== "undefined") {
				if ((window as any)['pdfjs-dist/build/pdf']) {
					setPdfjs((window as any)['pdfjs-dist/build/pdf']);
					return;
				}

				const script = document.createElement("script");
				script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
				script.onload = () => {
					const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
					pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
					setPdfjs(pdfjsLib);
				};
				document.body.appendChild(script);
			}
		};
		loadPdfJs();
	}, []);

	// 2. Load PDF Document
	useEffect(() => {
		if (!pdfjs) return;

		const loadDocument = async () => {
			setLoading(true);
			try {
				const loadingTask = pdfjs.getDocument(srcUrl);
				const doc = await loadingTask.promise;
				setPdfDoc(doc);
				setNumPages(doc.numPages);
				setPageNum(1);
				setLoading(false);
			} catch (err) {
				console.error("Error loading PDF document:", err);
				setLoading(false);
			}
		};
		loadDocument();
	}, [pdfjs, url]);

	// 3. Render Active Page on Main Canvas
	const renderPage = async (pageNumber: number, currentZoom: number, currentRotation: number) => {
		if (!pdfDoc || !canvasRef.current) return;

		try {
			const page = await pdfDoc.getPage(pageNumber);
			const canvas = canvasRef.current;
			const context = canvas.getContext("2d");
			if (!context) return;

			const viewport = page.getViewport({ scale: currentZoom, rotation: currentRotation });
			
			// Set high DPI support
			const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
			canvas.width = viewport.width * pixelRatio;
			canvas.height = viewport.height * pixelRatio;
			canvas.style.width = `${viewport.width}px`;
			canvas.style.height = `${viewport.height}px`;

			context.scale(pixelRatio, pixelRatio);

			const renderContext = {
				canvasContext: context,
				viewport: viewport
			};
			await page.render(renderContext).promise;
		} catch (err) {
			console.error("Page render error:", err);
		}
	};

	useEffect(() => {
		if (pdfDoc) {
			renderPage(pageNum, zoom, rotation);
		}
	}, [pdfDoc, pageNum, zoom, rotation]);

	// 4. Render Thumbnails
	useEffect(() => {
		if (!pdfDoc || !showThumbnails) return;

		const renderThumbnails = async () => {
			for (let i = 1; i <= numPages; i++) {
				const canvas = thumbnailContainersRef.current[i];
				if (!canvas) continue;

				try {
					const page = await pdfDoc.getPage(i);
					const context = canvas.getContext("2d");
					if (!context) continue;

					const viewport = page.getViewport({ scale: 0.2, rotation: 0 });
					canvas.width = viewport.width;
					canvas.height = viewport.height;

					const renderContext = {
						canvasContext: context,
						viewport: viewport
					};
					await page.render(renderContext).promise;
				} catch (err) {
					console.error(`Thumbnail render error for page ${i}:`, err);
				}
			}
		};

		renderThumbnails();
	}, [pdfDoc, numPages, showThumbnails]);

	// 5. Search Text Contents
	const handleSearch = async () => {
		if (!pdfDoc || !searchQuery.trim()) return;
		
		const matches: number[] = [];
		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDoc.getPage(i);
			const textContent = await page.getTextContent();
			const text = textContent.items.map((item: any) => item.str).join(" ");
			if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
				matches.push(i);
			}
		}

		setSearchMatches(matches);
		if (matches.length > 0) {
			setCurrentMatchIndex(0);
			setPageNum(matches[0]);
		} else {
			setCurrentMatchIndex(-1);
		}
	};

	const handleNextMatch = () => {
		if (searchMatches.length === 0) return;
		const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
		setCurrentMatchIndex(nextIdx);
		setPageNum(searchMatches[nextIdx]);
	};

	const handlePrevMatch = () => {
		if (searchMatches.length === 0) return;
		const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
		setCurrentMatchIndex(prevIdx);
		setPageNum(searchMatches[prevIdx]);
	};

	const clearSearch = () => {
		setSearchQuery("");
		setSearchMatches([]);
		setCurrentMatchIndex(-1);
	};

	// 6. Navigation Controls
	const handlePrevPage = () => {
		if (pageNum > 1) setPageNum(pageNum - 1);
	};

	const handleNextPage = () => {
		if (pageNum < numPages) setPageNum(pageNum + 1);
	};

	// Zoom and Rotation handlers
	const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3.0));
	const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
	const handleRotateRight = () => setRotation((r) => (r + 90) % 360);

	// Download and Print
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
			console.error("Error downloading PDF:", error);
		}
	};

	const handlePrint = () => {
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		iframe.src = srcUrl;
		document.body.appendChild(iframe);
		iframe.onload = () => {
			iframe.contentWindow?.print();
		};
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

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	// Keyboard shortcut listeners
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") {
				handleNextPage();
			} else if (e.key === "ArrowLeft") {
				handlePrevPage();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [pageNum, numPages]);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center w-full h-[60vh] text-[var(--text-muted)] bg-[var(--bg-dark-fill-3)] rounded-lg border border-[var(--border-subtle)]">
				<FaSpinner className="animate-spin text-[var(--brand-orange)] mb-3" size={28} />
				<p className="text-xs font-medium">Loading document viewer...</p>
			</div>
		);
	}

	return (
		<div 
			ref={containerRef}
			className="flex flex-col w-full h-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-lg"
		>
			{/* PDF Control Panel Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-dark-fill-3)] border-b border-[var(--border-subtle)] select-none">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowThumbnails(!showThumbnails)}
						className={`p-2 rounded-lg border transition ${
							showThumbnails 
								? "border-[var(--brand-orange)] bg-[var(--brand-glow)] text-[var(--brand-orange)]"
								: "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
						}`}
						title="Toggle Thumbnails"
					>
						<FaThList size={12} />
					</button>

					{/* Navigation controls */}
					<div className="flex items-center gap-1 bg-[var(--bg-surface)] px-2 py-1 rounded-lg border border-[var(--border-subtle)] text-xs">
						<button
							onClick={handlePrevPage}
							disabled={pageNum <= 1}
							className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition"
						>
							<FaChevronLeft size={10} />
						</button>
						<span className="font-mono text-[var(--text-primary)] font-bold">
							{pageNum} <span className="text-[var(--text-muted)]">/ {numPages}</span>
						</span>
						<button
							onClick={handleNextPage}
							disabled={pageNum >= numPages}
							className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition"
						>
							<FaChevronRight size={10} />
						</button>
					</div>
				</div>

				{/* Search Panel */}
				<div className="relative flex items-center bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] max-w-xs flex-1">
					<FaSearch className="text-[var(--text-muted)] mr-2 shrink-0" size={11} />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						placeholder="Search text in document..."
						className="bg-transparent text-xs text-[var(--text-primary)] outline-none flex-grow placeholder:text-[var(--text-muted)] border-0 p-0 ring-0 focus:ring-0"
					/>
					{searchQuery && (
						<button onClick={clearSearch} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-1">
							<FaTimes size={10} />
						</button>
					)}
					{searchMatches.length > 0 && (
						<div className="flex items-center gap-1.5 ml-2 border-l border-[var(--border-subtle)] pl-2 text-[10px] text-[var(--text-muted)] font-mono shrink-0">
							<span>{currentMatchIndex + 1}/{searchMatches.length}</span>
							<button onClick={handlePrevMatch} className="hover:text-[var(--text-primary)]"><FaChevronLeft size={8} /></button>
							<button onClick={handleNextMatch} className="hover:text-[var(--text-primary)]"><FaChevronRight size={8} /></button>
						</div>
					)}
				</div>

				{/* View and export controls */}
				<div className="flex items-center gap-1.5">
					<button
						onClick={handleZoomOut}
						className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Zoom Out"
					>
						<FaSearchMinus size={12} />
					</button>
					<span className="text-[10px] font-mono text-[var(--text-secondary)] select-none min-w-[36px] text-center">
						{Math.round(zoom * 100)}%
					</span>
					<button
						onClick={handleZoomIn}
						className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Zoom In"
					>
						<FaSearchPlus size={12} />
					</button>
					<button
						onClick={handleRotateRight}
						className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Rotate Page"
					>
						<FaRedo size={11} />
					</button>

					<div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

					<button
						onClick={handlePrint}
						className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Print Document"
					>
						<FaPrint size={12} />
					</button>
					<button
						onClick={handleDownload}
						className="p-2 text-emerald-400 hover:text-emerald-300 transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Download PDF"
					>
						<FaDownload size={12} />
					</button>
					<button
						onClick={toggleFullscreen}
						className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] rounded-lg"
						title="Toggle Fullscreen"
					>
						{isFullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
					</button>
				</div>
			</div>

			{/* Main Document Frame */}
			<div className="flex flex-1 overflow-hidden w-full h-[65vh]">
				{/* Thumbnails Sidebar */}
				{showThumbnails && (
					<div className="w-44 bg-[var(--bg-dark-fill-3)] border-r border-[var(--border-subtle)] overflow-y-auto p-3 flex flex-col gap-4 select-none shrink-0 scrollbar-thin">
						{Array.from({ length: numPages }, (_, i) => i + 1).map((num) => (
							<div
								key={num}
								onClick={() => setPageNum(num)}
								className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
									pageNum === num 
										? "border-[var(--brand-orange)] bg-[var(--brand-glow)]"
										: "border-transparent hover:bg-[var(--bg-hover)]"
								}`}
							>
								<canvas
									ref={(el) => { thumbnailContainersRef.current[num] = el; }}
									className="max-w-[120px] max-h-[140px] rounded-lg shadow-sm border border-[var(--border-subtle)] bg-white object-contain"
								/>
								<span className="text-[10px] font-mono font-bold text-[var(--text-secondary)]">
									Page {num}
								</span>
							</div>
						))}
					</div>
				)}

				{/* Active Page Viewport */}
				<div className="flex-1 overflow-auto bg-[var(--bg-surface)] flex items-start justify-center p-6 scrollbar-thin">
					<div className="shadow-2xl rounded-xl border border-[var(--border-subtle)] bg-white overflow-hidden p-2">
						<canvas ref={canvasRef} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default PdfViewer;
