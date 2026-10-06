import React from "react";
import {
	FaFilePdf,
	FaFileImage,
	FaFileVideo,
	FaFileAudio,
	FaFileCode,
	FaFileArchive,
	FaFileAlt,
	FaEye,
	FaDownload
} from "react-icons/fa";

export interface AttachmentFile {
	url: string;
	name: string;
	size?: number;
	type?: string;
	uploadedBy?: string;
	uploadDate?: number | Date;
}

interface AttachmentCardProps {
	file: AttachmentFile;
	onPreview: () => void;
	idToken?: string;
}

const AttachmentCard: React.FC<AttachmentCardProps> = ({
	file,
	onPreview,
	idToken
}) => {
	const name = file.name || "File";
	const ext = name.split(".").pop()?.toLowerCase() || "";
	const size = file.size;

	// Append idToken for secure image rendering
	const srcUrl = idToken && file.url.startsWith("/api/attachments")
		? `${file.url}&idToken=${encodeURIComponent(idToken)}`
		: file.url;

	// Helper to format bytes
	const formatBytes = (bytes?: number) => {
		if (bytes === undefined || bytes === 0) return "Unknown size";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	};

	// Detect type
	const isImage = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"].includes(ext) || file.url.startsWith("data:image/");
	const isPdf = ext === "pdf" || file.url.startsWith("data:application/pdf");
	const isVideo = ["mp4", "webm", "ogg", "mov"].includes(ext);
	const isAudio = ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);
	const isCode = [
		"txt", "log", "json", "xml", "csv", "yaml", "yml", "md",
		"cpp", "h", "c", "py", "java", "js", "ts", "go", "rs", "sql", "sh"
	].includes(ext);

	const getFileIcon = () => {
		if (isPdf) return <FaFilePdf className="text-red-500" size={20} />;
		if (isVideo) return <FaFileVideo className="text-purple-500" size={20} />;
		if (isAudio) return <FaFileAudio className="text-teal-500" size={20} />;
		if (isCode) return <FaFileCode className="text-blue-500" size={20} />;
		if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
			return <FaFileArchive className="text-amber-500" size={20} />;
		}
		return <FaFileAlt className="text-gray-400" size={20} />;
	};

	const handleDownload = async (e: React.MouseEvent) => {
		e.stopPropagation();
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
			onClick={onPreview}
			className="group relative flex items-center gap-3 p-3 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] hover:border-[var(--brand-orange)] rounded-xl cursor-pointer transition-all duration-200 select-none overflow-hidden max-w-xs w-full shadow-sm"
		>
			{/* Thumbnail or File type icon */}
			<div className="flex items-center justify-center w-12 h-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shrink-0 relative">
				{isImage ? (
					<img 
						src={srcUrl} 
						alt={name} 
						className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-200" 
						loading="lazy"
					/>
				) : (
					getFileIcon()
				)}
			</div>

			{/* File meta descriptions */}
			<div className="flex-1 min-w-0 pr-6">
				<p className="text-xs font-black text-[var(--text-primary)] truncate" title={name}>
					{name}
				</p>
				<p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
					{formatBytes(size)}
				</p>
			</div>

			{/* Hover overlay actions */}
			<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
				<button
					onClick={(e) => { e.stopPropagation(); onPreview(); }}
					className="p-1.5 bg-black/60 hover:bg-black text-white hover:text-[var(--brand-orange)] rounded-lg transition"
					title="Preview file"
				>
					<FaEye size={10} />
				</button>
				<button
					onClick={handleDownload}
					className="p-1.5 bg-black/60 hover:bg-black text-emerald-400 hover:text-emerald-300 rounded-lg transition"
					title="Download file"
				>
					<FaDownload size={10} />
				</button>
			</div>
		</div>
	);
};

export default AttachmentCard;
