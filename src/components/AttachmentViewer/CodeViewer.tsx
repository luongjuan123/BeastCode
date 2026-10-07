import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { FaCopy, FaCheck, FaSpinner, FaAlignLeft, FaSearch } from "react-icons/fa";

interface CodeViewerProps {
	url: string;
	name: string;
	idToken?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({
	url,
	name,
	idToken
}) => {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);
	const [wordWrap, setWordWrap] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	const srcUrl = idToken && url.startsWith("/api/attachments") 
		? `${url}&idToken=${encodeURIComponent(idToken)}` 
		: url;

	// Fetch or decode file contents
	useEffect(() => {
		const loadContent = async () => {
			setLoading(true);
			try {
				if (url.startsWith("data:")) {
					const parts = url.split(",");
					const base64Data = parts[1];
					const decoded = atob(base64Data);
					setContent(decoded);
				} else {
					const response = await fetch(srcUrl);
					const text = await response.text();
					setContent(text);
				}
			} catch (e) {
				console.error("Error loading text content:", e);
				setContent("Error loading file content. Please try downloading the file instead.");
			} finally {
				setLoading(false);
			}
		};
		loadContent();
	}, [url]);

	// Detect CodeMirror extension based on file name extension
	const getExtension = () => {
		const ext = name.split(".").pop()?.toLowerCase();
		switch (ext) {
			case "js":
			case "jsx":
			case "ts":
			case "tsx":
			case "json":
				return [javascript({ jsx: true, typescript: true })];
			case "py":
				return [python()];
			case "java":
				return [java()];
			case "cpp":
			case "h":
			case "c":
			case "cs":
			case "go":
			case "rs":
			case "swift":
			case "kt":
			case "sh":
			case "sql":
			case "css":
			case "html":
			case "xml":
				return [cpp()];
			default:
				return [];
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center w-full h-[50vh] text-[var(--text-muted)] bg-[var(--bg-dark-fill-3)] rounded-lg border border-[var(--border-subtle)]">
				<FaSpinner className="animate-spin text-[var(--brand-orange)] mb-3" size={24} />
				<p className="text-xs">Reading file contents...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-[60vh] bg-[#1e1e1e] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-lg">
			
			{/* Toolbar Panel */}
			<div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-dark-fill-3)] border-b border-[var(--border-subtle)] select-none">
				<div className="flex items-center gap-2">
					<span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
						{name}
					</span>
				</div>

				<div className="flex items-center gap-2">
					{/* Search field */}
					<div className="relative flex items-center bg-[var(--bg-surface)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
						<FaSearch className="text-[var(--text-muted)] mr-1.5" size={10} />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Find..."
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="bg-transparent text-xs text-[var(--text-primary)] outline-none w-28 placeholder:text-[var(--text-muted)] border-0 p-0 focus:ring-0"
						/>
					</div>

					{/* Wrap toggler */}
					<button
						onClick={() => setWordWrap(!wordWrap)}
						className={`p-2 rounded-lg border transition ${
							wordWrap 
								? "border-[var(--brand-orange)] bg-[var(--brand-glow)] text-[var(--brand-orange)]"
								: "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
						}`}
						title="Toggle Word Wrap"
					>
						<FaAlignLeft size={11} />
					</button>

					{/* Copy button */}
					<button
						onClick={handleCopy}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-fill-3 hover:bg-dark-fill-2 text-xs font-bold rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] transition"
					>
						{copied ? <FaCheck className="text-emerald-450" size={10} /> : <FaCopy size={10} />}
						<span>{copied ? "Copied" : "Copy"}</span>
					</button>
				</div>
			</div>

			{/* CodeMirror Editor Area */}
			<div className="flex-1 overflow-auto font-mono text-xs scrollbar-thin">
				<CodeMirror
					value={content}
					theme={vscodeDark}
					extensions={getExtension()}
					readOnly={true}
					editable={false}
					basicSetup={{
						lineNumbers: true,
						foldGutter: true,
						highlightActiveLine: false,
						searchKeymap: true,
					}}
					style={{
						height: "100%",
						whiteSpace: wordWrap ? "pre-wrap" : "pre"
					}}
				/>
			</div>
		</div>
	);
};

export default CodeViewer;
