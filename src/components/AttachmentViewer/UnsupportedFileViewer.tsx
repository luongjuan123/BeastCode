import React from "react";
import { FaFileArchive, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaDownload } from "react-icons/fa";

interface UnsupportedFileViewerProps {
	url: string;
	name: string;
	size?: number;
	type?: string;
	idToken?: string;
}

const UnsupportedFileViewer: React.FC<UnsupportedFileViewerProps> = ({
	url,
	name,
	size,
	type,
	idToken
}) => {
	const ext = name.split(".").pop()?.toLowerCase() || "";
	
	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// Helper to format bytes
	const formatBytes = (bytes?: number) => {
		if (bytes === undefined || bytes === 0) return "Unknown size";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	};

	// Determine file icon based on extension
	const getFileIcon = () => {
		switch (ext) {
			case "zip":
			case "rar":
			case "tar":
			case "gz":
			case "7z":
				return <FaFileArchive className="text-amber-500" size={48} />;
			case "doc":
			case "docx":
				return <FaFileWord className="text-blue-500" size={48} />;
			case "xls":
			case "xlsx":
				return <FaFileExcel className="text-emerald-500" size={48} />;
			case "ppt":
			case "pptx":
				return <FaFilePowerpoint className="text-orange-500" size={48} />;
			default:
				return <FaFileAlt className="text-gray-400" size={48} />;
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
			console.error("Error downloading unsupported file:", error);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-lg w-full max-w-sm mx-auto shadow-md text-center">
			<div className="mb-4">
				{getFileIcon()}
			</div>
			
			<h4 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-full mb-1">
				{name}
			</h4>
			
			<div className="flex flex-col gap-0.5 text-[10px] text-[var(--text-muted)] font-mono mb-6">
				<span>Size: {formatBytes(size)}</span>
				{type && <span>MIME: {type}</span>}
				<span>Extension: .{ext.toUpperCase()}</span>
			</div>

			<button
				onClick={handleDownload}
				className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
			>
				<FaDownload size={12} />
				<span>Download File</span>
			</button>
		</div>
	);
};

export default UnsupportedFileViewer;
