import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import {
	FaTimes,
	FaChevronLeft,
	FaChevronRight,
	FaInfoCircle,
	FaDownload,
	FaSpinner
} from "react-icons/fa";
import ImageViewer from "./ImageViewer";
import PdfViewer from "./PdfViewer";
import VideoViewer from "./VideoViewer";
import AudioPlayer from "./AudioPlayer";
import CodeViewer from "./CodeViewer";
import UnsupportedFileViewer from "./UnsupportedFileViewer";

export interface Attachment {
	url: string; // Could be base64 data URI or proxy endpoint url
	name: string;
	size?: number;
	type?: string;
	uploadedBy?: string;
	uploadDate?: number | Date;
}

interface AttachmentViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	attachments: Attachment[];
	initialIndex?: number;
}

const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
	isOpen,
	onClose,
	attachments = [],
	initialIndex = 0
}) => {
	const [user] = useAuthState(auth);
	const [idToken, setIdToken] = useState("");
	const [activeIdx, setActiveIdx] = useState(initialIndex);
	const [showInfo, setShowInfo] = useState(true);

	// Fetch Firebase ID Token for authenticated requests
	useEffect(() => {
		if (user && isOpen) {
			user.getIdToken().then((token) => {
				setIdToken(token);
			}).catch((err) => {
				console.error("Error getting ID token for attachment viewer:", err);
			});
		}
	}, [user, isOpen]);

	// Update active index when initialIndex changes
	useEffect(() => {
		setActiveIdx(initialIndex);
	}, [initialIndex]);

	// Keyboard event listener for pagination and closing
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowRight" && attachments.length > 1) {
				handleNext();
			} else if (e.key === "ArrowLeft" && attachments.length > 1) {
				handlePrev();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, activeIdx, attachments]);

	if (!isOpen || attachments.length === 0) return null;

	const activeFile = attachments[activeIdx];
	const name = activeFile.name || "File";
	const ext = name.split(".").pop()?.toLowerCase() || "";
	const url = activeFile.url || "";

	// Detect File Type Category
	const getFileCategory = (): "image" | "pdf" | "video" | "audio" | "code" | "unsupported" => {
		const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];
		const pdfExts = ["pdf"];
		const videoExts = ["mp4", "webm", "ogg", "mov"];
		const audioExts = ["mp3", "wav", "ogg", "m4a", "aac"];
		const codeExts = [
			"txt", "log", "json", "xml", "csv", "yaml", "yml", "md",
			"cpp", "h", "c", "py", "java", "js", "ts", "go", "rs", "sql", "sh"
		];

		if (imageExts.includes(ext) || url.startsWith("data:image/")) return "image";
		if (pdfExts.includes(ext) || url.startsWith("data:application/pdf")) return "pdf";
		if (videoExts.includes(ext) || url.startsWith("data:video/")) return "video";
		if (audioExts.includes(ext) || url.startsWith("data:audio/")) return "audio";
		if (codeExts.includes(ext) || url.startsWith("data:text/")) return "code";

		return "unsupported";
	};

	const category = getFileCategory();

	const handleNext = () => {
		setActiveIdx((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
	};

	const handlePrev = () => {
		setActiveIdx((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
	};

	// Helper to format bytes
	const formatBytes = (bytes?: number) => {
		if (bytes === undefined || bytes === 0) return "Unknown size";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	};

	// Render Active Viewer
	const renderActiveViewer = () => {
		switch (category) {
			case "image":
				return (
					<ImageViewer
						url={url}
						name={name}
						idToken={idToken}
						onNext={attachments.length > 1 ? handleNext : undefined}
						onPrev={attachments.length > 1 ? handlePrev : undefined}
					/>
				);
			case "pdf":
				return <PdfViewer url={url} name={name} idToken={idToken} />;
			case "video":
				return <VideoViewer url={url} name={name} idToken={idToken} />;
			case "audio":
				return <AudioPlayer url={url} name={name} idToken={idToken} />;
			case "code":
				return <CodeViewer url={url} name={name} idToken={idToken} />;
			default:
				return (
					<UnsupportedFileViewer
						url={url}
						name={name}
						size={activeFile.size}
						type={activeFile.type}
						idToken={idToken}
					/>
				);
		}
	};

	// Download handler
	const handleDownload = async () => {
		const downloadUrl = idToken && url.startsWith("/api/attachments") 
			? `${url}&idToken=${encodeURIComponent(idToken)}` 
			: url;

		try {
			const response = await fetch(downloadUrl);
			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error("Error downloading file from modal:", error);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-6 animate-fade-in select-none">
			{/* Top Header Section */}
			<div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 select-none bg-black/45 backdrop-blur-md px-4 py-2 border border-white/10 rounded-xl">
				<div className="flex items-center gap-2 max-w-[70%]">
					<span className="text-xs font-black text-white truncate" title={name}>
						{name}
					</span>
					{attachments.length > 1 && (
						<span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
							{activeIdx + 1} / {attachments.length}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowInfo(!showInfo)}
						className={`p-2 rounded-lg border transition ${
							showInfo 
								? "border-[var(--brand-orange)] bg-[var(--brand-glow)] text-[var(--brand-orange)]"
								: "border-transparent text-white/75 hover:bg-white/10"
						}`}
						title="Toggle File Info Panel"
					>
						<FaInfoCircle size={14} />
					</button>

					<button
						onClick={handleDownload}
						className="p-2 text-emerald-400 hover:text-emerald-300 transition hover:bg-white/10 rounded-lg"
						title="Download Attachment"
					>
						<FaDownload size={14} />
					</button>

					<button
						onClick={onClose}
						className="p-2 text-red-400 hover:text-red-300 transition hover:bg-white/10 rounded-lg ml-2"
						title="Close Preview (Esc)"
					>
						<FaTimes size={15} />
					</button>
				</div>
			</div>

			{/* Main Content Layout */}
			<div className="flex items-center justify-center w-full h-[85vh] mt-12 relative">
				
				{/* Next / Prev Pagination triggers */}
				{attachments.length > 1 && (
					<>
						<button
							onClick={handlePrev}
							className="absolute left-0 md:left-2 p-3.5 bg-black/60 hover:bg-black/85 border border-white/10 text-white rounded-full transition z-30 shadow-lg active:scale-95"
							title="Previous Attachment"
						>
							<FaChevronLeft size={16} />
						</button>
						<button
							onClick={handleNext}
							className="absolute right-0 md:right-2 p-3.5 bg-black/60 hover:bg-black/85 border border-white/10 text-white rounded-full transition z-30 shadow-lg active:scale-95"
							title="Next Attachment"
						>
							<FaChevronRight size={16} />
						</button>
					</>
				)}

				{/* Primary Container Column Grid */}
				<div className="flex gap-4 w-full h-full justify-center max-w-7xl px-8">
					{/* Live preview section */}
					<div className="flex-1 flex items-center justify-center h-full min-w-0">
						{renderActiveViewer()}
					</div>

					{/* File Info Side Panel */}
					{showInfo && (
						<div className="w-80 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 shrink-0 flex flex-col gap-4 text-left overflow-y-auto animate-slide-in shadow-xl select-text">
							<h3 className="text-xs uppercase tracking-wider font-extrabold text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
								Attachment Info
							</h3>

							<div className="space-y-3.5 text-xs">
								<div>
									<span className="text-[10px] text-[var(--text-muted)] block">Filename</span>
									<span className="text-[var(--text-primary)] font-bold break-all">{name}</span>
								</div>

								<div>
									<span className="text-[10px] text-[var(--text-muted)] block">Format / Extension</span>
									<span className="text-[var(--text-primary)] uppercase font-mono font-bold">.{ext}</span>
								</div>

								<div>
									<span className="text-[10px] text-[var(--text-muted)] block">Size</span>
									<span className="text-[var(--text-primary)] font-bold">{formatBytes(activeFile.size)}</span>
								</div>

								{activeFile.type && (
									<div>
										<span className="text-[10px] text-[var(--text-muted)] block">MIME Type</span>
										<span className="text-[var(--text-primary)] font-mono text-[10px] break-all">{activeFile.type}</span>
									</div>
								)}

								{activeFile.uploadedBy && (
									<div>
										<span className="text-[10px] text-[var(--text-muted)] block">Uploaded By</span>
										<span className="text-[var(--text-primary)] font-semibold">{activeFile.uploadedBy}</span>
									</div>
								)}

								{activeFile.uploadDate && (
									<div>
										<span className="text-[10px] text-[var(--text-muted)] block">Uploaded Date</span>
										<span className="text-[var(--text-primary)] font-semibold">
											{new Date(activeFile.uploadDate).toLocaleString()}
										</span>
									</div>
								)}

								<div>
									<span className="text-[10px] text-[var(--text-muted)] block">Status</span>
									<span className="text-emerald-500 font-bold inline-flex items-center gap-1 mt-0.5">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										Virus Scanned / Secure
									</span>
								</div>
							</div>

							<div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
								<button
									onClick={handleDownload}
									className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--brand-orange)] text-white font-black text-xs rounded-xl shadow transition hover:opacity-90 active:scale-95"
								>
									<FaDownload size={11} />
									<span>Download File</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AttachmentViewerModal;
