import React, { useState } from "react";
import { FaCode, FaTimes, FaCheck } from "react-icons/fa";

interface CodeSnippetModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (code: { language: string; content: string }, comment?: string) => void;
}

const SUPPORTED_LANGUAGES = [
	{ id: "cpp", label: "C++" },
	{ id: "python", label: "Python" },
	{ id: "javascript", label: "JavaScript" },
	{ id: "typescript", label: "TypeScript" },
	{ id: "java", label: "Java" },
	{ id: "rust", label: "Rust" },
	{ id: "go", label: "Go" },
	{ id: "sql", label: "SQL" },
];

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
}) => {
	const [language, setLanguage] = useState("cpp");
	const [content, setContent] = useState("");
	const [comment, setComment] = useState("");

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) return;
		onSubmit({ language, content: content.trim() }, comment.trim() || undefined);
		setContent("");
		setComment("");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div className="w-full max-w-2xl rounded-lg bg-dark-layer-1 border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-dark-fill-2">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange">
							<FaCode size={16} />
						</div>
						<h3 className="text-base font-bold text-text-primary">Share Code Snippet</h3>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
						aria-label="Close modal"
					>
						<FaTimes size={16} />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
					{/* Language Selector */}
					<div>
						<label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
							Programming Language
						</label>
						<div className="flex flex-wrap gap-2">
							{SUPPORTED_LANGUAGES.map((lang) => (
								<button
									key={lang.id}
									type="button"
									onClick={() => setLanguage(lang.id)}
									className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
										language === lang.id
											? "bg-brand-orange text-white shadow-md shadow-brand-orange/20"
											: "bg-dark-fill-3 text-text-secondary hover:text-text-primary border border-border-subtle"
									}`}
								>
									{lang.label}
								</button>
							))}
						</div>
					</div>

					{/* Code Area */}
					<div className="flex-1 flex flex-col">
						<label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
							Source Code
						</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder={`// Paste your ${language} code here...`}
							rows={10}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full font-mono text-xs p-3.5 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none resize-none"
							autoFocus
							required
						/>
					</div>

					{/* Optional Message */}
					<div>
						<label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
							Optional Comment
						</label>
						<input
							type="text"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Explain this snippet or question..."
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none"
						/>
					</div>

					{/* Footer buttons */}
					<div className="flex items-center justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-dark-fill-3 hover:bg-dark-fill-2 transition"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!content.trim()}
							className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-orange/20"
						>
							<FaCheck size={12} />
							<span>Post Snippet</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
