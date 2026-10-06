import React, { useRef, useState } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { FaBold, FaItalic, FaListUl, FaListOl, FaImage, FaLink, FaCode } from "react-icons/fa";

interface MarkdownEditorProps {
	value: string;
	onChange: (val: string) => void;
	placeholder?: string;
	height?: string;
	maxChars?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
	value,
	onChange,
	placeholder = "",
	height = "200px",
	maxChars,
}) => {
	const editorRef = useRef<ReactCodeMirrorRef>(null);
	const [preview, setPreview] = useState(false);

	const handleToolbarClick = (action: string) => {
		if (preview) return;

		const view = editorRef.current?.view;
		if (!view) return;

		const { state } = view;
		const selection = state.selection.main;
		const selectedText = state.sliceDoc(selection.from, selection.to);

		let insertText = "";
		let selectionOffsetStart = 0;
		let selectionOffsetEnd = 0;

		switch (action) {
			case "bold":
				insertText = `**${selectedText || "bold text"}**`;
				selectionOffsetStart = 2;
				selectionOffsetEnd = insertText.length - 2;
				break;
			case "italic":
				insertText = `*${selectedText || "italic text"}*`;
				selectionOffsetStart = 1;
				selectionOffsetEnd = insertText.length - 1;
				break;
			case "unordered-list":
				insertText = `\n* ${selectedText || "item"}`;
				selectionOffsetStart = 3;
				selectionOffsetEnd = insertText.length;
				break;
			case "ordered-list":
				insertText = `\n1. ${selectedText || "item"}`;
				selectionOffsetStart = 4;
				selectionOffsetEnd = insertText.length;
				break;
			case "image":
				insertText = `![${selectedText || "image alt"}](url)`;
				selectionOffsetStart = 2;
				selectionOffsetEnd = 2 + (selectedText || "image alt").length;
				break;
			case "link":
				insertText = `[${selectedText || "link text"}](url)`;
				selectionOffsetStart = 1;
				selectionOffsetEnd = 1 + (selectedText || "link text").length;
				break;
			case "code":
				insertText = `\`\`\`\n${selectedText || "code block"}\n\`\`\``;
				selectionOffsetStart = 4;
				selectionOffsetEnd = 4 + (selectedText || "code block").length;
				break;
			default:
				return;
		}

		view.dispatch({
			changes: {
				from: selection.from,
				to: selection.to,
				insert: insertText,
			},
			selection: {
				anchor: selection.from + selectionOffsetStart,
				head: selection.from + selectionOffsetEnd,
			},
		});

		view.focus();
	};

	// Helper to render markdown/HTML. If simple markdown is used, convert basic features.
	const renderPreviewContent = (text: string) => {
		if (!text) return `<p style="color: var(--text-muted); font-style: italic;">Nothing to preview</p>`;
		
		// Very simple regex-based markdown to HTML converter for basic tags
		let html = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			// Bold
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			// Italic
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			// Code Block
			.replace(/```([\s\S]*?)```/g, "<pre style='background: var(--bg-dark-layer-1); color: var(--text-primary); border: 1px solid var(--border-subtle); padding: 0.75rem; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.75rem; overflow: auto; margin: 0.5rem 0;'>$1</pre>")
			// Inline code
			.replace(/`(.*?)`/g, "<code style='background: var(--bg-dark-layer-1); color: var(--text-accent); padding: 0.125rem 0.25rem; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.75rem;'>$1</code>")
			// Image
			.replace(/!\[(.*?)\]\((.*?)\)/g, "<img src='$2' alt='$1' style='max-w-full; height: auto; border-radius: var(--radius-md); margin: 0.5rem 0;' />")
			// Link
			.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' style='color: var(--accent); text-decoration: underline;'>$1</a>")
			// Unordered List
			.replace(/^\s*\*\s+(.*)$/gm, "<li style='list-style-type: disc; margin-left: 1.25rem;'>$1</li>")
			// Ordered List
			.replace(/^\s*\d+\.\s+(.*)$/gm, "<li style='list-style-type: decimal; margin-left: 1.25rem;'>$1</li>")
			// Paragraphs / Newlines
			.split("\n")
			.map(line => {
				if (line.trim().startsWith("<li") || line.trim().startsWith("<pre") || line.trim().startsWith("</pre")) return line;
				return line.trim() ? `<p style='margin: 0.25rem 0;'>${line}</p>` : "<br />";
			})
			.join("\n");

		return html;
	};

	return (
		<div 
			className="border rounded flex flex-col shadow-sm"
			style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
		>
			{/* Toolbar */}
			<div 
				className="flex justify-between items-center border-b px-3 py-1.5 select-none"
				style={{ background: "var(--bg-dark-layer-1)", borderBottomColor: "var(--border-subtle)" }}
			>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => handleToolbarClick("bold")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Bold"
					>
						<FaBold size={13} />
					</button>
					<button
						type="button"
						onClick={() => handleToolbarClick("italic")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent font-serif italic font-bold"
						style={{ color: "var(--text-secondary)" }}
						title="Italic"
					>
						<FaItalic size={13} />
					</button>
					<div className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />
					<button
						type="button"
						onClick={() => handleToolbarClick("unordered-list")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Bullet List"
					>
						<FaListUl size={13} />
					</button>
					<button
						type="button"
						onClick={() => handleToolbarClick("ordered-list")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Numbered List"
					>
						<FaListOl size={13} />
					</button>
					<div className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />
					<button
						type="button"
						onClick={() => handleToolbarClick("image")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Image"
					>
						<FaImage size={13} />
					</button>
					<button
						type="button"
						onClick={() => handleToolbarClick("link")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Link"
					>
						<FaLink size={13} />
					</button>
					<button
						type="button"
						onClick={() => handleToolbarClick("code")}
						disabled={preview}
						className="p-2 hover:bg-dark-hover rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
						style={{ color: "var(--text-secondary)" }}
						title="Code Block"
					>
						<FaCode size={13} />
					</button>
				</div>

				<button
					type="button"
					onClick={() => setPreview(!preview)}
					className="text-xs px-3 py-1 rounded-md border shadow-sm font-semibold transition hover:bg-dark-hover"
					style={{
						color: preview ? "var(--accent)" : "var(--text-secondary)",
						borderColor: preview ? "var(--accent)" : "var(--border-default)",
						background: preview ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--bg-surface)",
					}}
				>
					{preview ? "Edit" : "Preview"}
				</button>
			</div>

			{/* Editor Content Area */}
			<div className="relative flex-1 min-h-[150px]">
				{preview ? (
					<div
						className="p-4 overflow-y-auto text-sm font-sans"
						style={{ height, background: "var(--bg-surface)", color: "var(--text-primary)" }}
						dangerouslySetInnerHTML={{ __html: renderPreviewContent(value) }}
					/>
				) : (
					<CodeMirror
						ref={editorRef}
						value={value}
						height={height}
						placeholder={placeholder}
						onChange={onChange}
						className="outline-none text-sm md:text-base border-none custom-cm-editor"
						basicSetup={{
							lineNumbers: true,
							foldGutter: false,
							highlightActiveLine: true,
							dropCursor: true,
							allowMultipleSelections: false,
							indentOnInput: true,
						}}
					/>
				)}
			</div>

			{/* Gutter / Footer */}
			{maxChars && (
				<div 
					className="border-t px-3 py-1 text-right text-xs font-semibold select-none"
					style={{ background: "var(--bg-dark-layer-1)", borderTopColor: "var(--border-subtle)", color: "var(--text-muted)" }}
				>
					Characters left: {Math.max(0, maxChars - value.length)}
				</div>
			)}
		</div>
	);
};

export default MarkdownEditor;
