import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	FaPaperPlane,
	FaPaperclip,
	FaCode,
	FaSmile,
	FaMicrophone,
	FaTimes,
	FaPencilAlt,
	FaCheck,
} from "react-icons/fa";
import { ChatAttachment, MessageReplyReference, ChatMessage } from "@/types/chat";
import { ReplyPreview } from "./ReplyPreview";
import { CodeSnippetModal } from "./CodeSnippetModal";
import { VoiceRecorder } from "./VoiceRecorder";

export interface StagedFile {
	id: string;
	file: File;
	name: string;
	size: number;
	mimeType: string;
	previewUrl?: string;
	category: "images" | "documents" | "audio" | "code";
}

interface MessageComposerProps {
	conversationId: string;
	replyToMessage: ChatMessage | null;
	editingMessage?: ChatMessage | null;
	onCancelReply: () => void;
	onCancelEdit?: () => void;
	onEditMessage?: (messageId: string, newText: string) => Promise<void>;
	onSendMessage: (params: {
		text?: string;
		type?: "text" | "code" | "image" | "file" | "voice";
		code?: { language: string; content: string };
		attachments?: ChatAttachment[];
		stagedFiles?: File[];
		replyTo?: MessageReplyReference;
	}) => Promise<void> | void;
	onTyping: () => void;
	disabled?: boolean;
	placeholder?: string;
}

function getFileCategory(file: File): "images" | "documents" | "audio" | "code" {
	if (file.type.startsWith("image/")) return "images";
	if (file.type.startsWith("audio/")) return "audio";
	if (
		file.type.includes("json") ||
		file.type.includes("javascript") ||
		file.type.includes("typescript") ||
		/\.(ts|tsx|js|jsx|py|cpp|c|java|go|rs|html|css|json|sql|sh)$/i.test(file.name)
	) {
		return "code";
	}
	return "documents";
}

const COMMON_EMOJIS = ["😀", "🔥", "🚀", "👍", "❤️", "🎉", "💯", "💻", "🤔", "👏", "✅", "⚡"];

export const MessageComposer: React.FC<MessageComposerProps> = ({
	conversationId,
	replyToMessage,
	editingMessage = null,
	onCancelReply,
	onCancelEdit,
	onEditMessage,
	onSendMessage,
	onTyping,
	disabled = false,
	placeholder = "Write a message... (Shift+Enter for newline)",
}) => {
	const [text, setText] = useState("");
	const [codeModalOpen, setCodeModalOpen] = useState(false);
	const [voiceRecording, setVoiceRecording] = useState(false);
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
	const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const prevConvIdRef = useRef<string>(conversationId);

	// Auto-expand textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
		}
	}, [text]);

	// Clean up object URLs on unmount or staged files change
	useEffect(() => {
		return () => {
			stagedFiles.forEach((f) => {
				if (f.previewUrl) {
					try {
						URL.revokeObjectURL(f.previewUrl);
					} catch (_) {}
				}
			});
		};
	}, [stagedFiles]);

	// Draft persistence per conversationId
	useEffect(() => {
		if (typeof window === "undefined") return;

		// If conversation switched, persist draft for old conversation if non-empty
		if (prevConvIdRef.current && prevConvIdRef.current !== conversationId) {
			if (text && !editingMessage) {
				sessionStorage.setItem(`beastcode_chat_draft_${prevConvIdRef.current}`, text);
			}
		}

		prevConvIdRef.current = conversationId;

		// Load draft for new conversation if not currently editing
		if (!editingMessage) {
			const savedDraft = sessionStorage.getItem(`beastcode_chat_draft_${conversationId}`) || "";
			setText(savedDraft);
		}
	}, [conversationId]);

	// Synchronize editing message
	useEffect(() => {
		if (editingMessage) {
			setText(editingMessage.text || "");
			if (textareaRef.current) {
				textareaRef.current.focus();
			}
		} else if (typeof window !== "undefined") {
			// Restore draft if editing was cancelled
			const savedDraft = sessionStorage.getItem(`beastcode_chat_draft_${conversationId}`) || "";
			setText(savedDraft);
		}
	}, [editingMessage, conversationId]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Escape") {
			e.preventDefault();
			if (editingMessage) {
				onCancelEdit?.();
			} else if (replyToMessage) {
				onCancelReply();
			}
			return;
		}

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setText(val);

		// Cache draft in sessionStorage while typing (only when not editing an existing message)
		if (!editingMessage && typeof window !== "undefined") {
			if (val.trim()) {
				sessionStorage.setItem(`beastcode_chat_draft_${conversationId}`, val);
			} else {
				sessionStorage.removeItem(`beastcode_chat_draft_${conversationId}`);
			}
		}

		onTyping();
	};

	// ─── Stage Files (From File Picker, Drag & Drop, or Clipboard Paste) ────────
	const handleFilesAdded = useCallback((fileList: FileList | File[] | null) => {
		if (!fileList || fileList.length === 0) return;

		const filesArray = Array.from(fileList);
		const validFiles: StagedFile[] = [];

		for (const file of filesArray) {
			if (file.size > 15 * 1024 * 1024) {
				alert(`File "${file.name}" exceeds maximum allowed size of 15MB`);
				continue;
			}
			if (file.size === 0) {
				continue;
			}

			const isImage = file.type.startsWith("image/");
			const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
			validFiles.push({
				id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
				file,
				name: file.name,
				size: file.size,
				mimeType: file.type || "application/octet-stream",
				previewUrl,
				category: getFileCategory(file),
			});
		}

		if (validFiles.length > 0) {
			setStagedFiles((prev) => [...prev, ...validFiles]);
		}
	}, []);

	const handleRemoveStagedFile = useCallback((id: string) => {
		setStagedFiles((prev) => {
			const target = prev.find((f) => f.id === id);
			if (target?.previewUrl) {
				try {
					URL.revokeObjectURL(target.previewUrl);
				} catch (_) {}
			}
			return prev.filter((f) => f.id !== id);
		});
	}, []);

	// ─── Clipboard Paste Handler ───────────────────────────────────────────────
	const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const clipboardData = e.clipboardData;
		if (!clipboardData) return;

		const files: File[] = [];
		if (clipboardData.files && clipboardData.files.length > 0) {
			for (let i = 0; i < clipboardData.files.length; i++) {
				files.push(clipboardData.files[i]);
			}
		} else if (clipboardData.items && clipboardData.items.length > 0) {
			for (let i = 0; i < clipboardData.items.length; i++) {
				const item = clipboardData.items[i];
				if (item.kind === "file") {
					const f = item.getAsFile();
					if (f) files.push(f);
				}
			}
		}

		if (files.length > 0) {
			const hasText = clipboardData.getData("text/plain");
			if (!hasText) {
				e.preventDefault();
			}
			handleFilesAdded(files);
		}
	};

	// ─── Instant Optimistic Send ───────────────────────────────────────────────
	const handleSend = () => {
		const trimmed = text.trim();
		if ((!trimmed && stagedFiles.length === 0) || disabled) return;

		if (editingMessage) {
			if (!trimmed) return;
			const msgId = editingMessage.id;
			onCancelEdit?.();
			setText("");
			if (typeof window !== "undefined") {
				const savedDraft = sessionStorage.getItem(`beastcode_chat_draft_${conversationId}`) || "";
				setText(savedDraft);
			}
			if (onEditMessage) {
				onEditMessage(msgId, trimmed);
			}
			return;
		}

		// Clear draft from storage
		if (typeof window !== "undefined") {
			sessionStorage.removeItem(`beastcode_chat_draft_${conversationId}`);
		}

		const replyTo: MessageReplyReference | undefined = replyToMessage
			? {
					messageId: replyToMessage.id,
					senderDisplayName: replyToMessage.senderDisplayName,
					textPreview:
						replyToMessage.text?.substring(0, 80) ||
						(replyToMessage.code ? "Code snippet" : "Attachment"),
					type: replyToMessage.type,
			  }
			: undefined;

		const filesToSend = stagedFiles.map((f) => f.file);
		const messageText = trimmed;

		// INSTANT UI CLEARANCE (<5ms perceived latency)
		setText("");
		setStagedFiles([]);
		onCancelReply();
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.focus();
		}

		// Fire optimistic background send
		onSendMessage({
			text: messageText,
			stagedFiles: filesToSend.length > 0 ? filesToSend : undefined,
			replyTo,
		});
	};

	const handleSendVoice = async (base64Audio: string, durationSeconds: number) => {
		setVoiceRecording(false);
		try {
			const idToken = await (await import("@/firebase/firebase")).auth.currentUser?.getIdToken();
			const res = await fetch("/api/chat/attachment", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					fileData: base64Audio,
					fileName: `voice_${Date.now()}.webm`,
					conversationId,
					duration: durationSeconds,
				}),
			});
			const data = await res.json();
			if (data.success && data.attachment) {
				onSendMessage({
					type: "voice",
					attachments: [data.attachment],
				});
			}
		} catch (err: any) {
			console.error("[Send voice error]:", err);
		}
	};

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setIsDragOver(false);
				handleFilesAdded(e.dataTransfer.files);
			}}
			className={`relative border-t border-border-default bg-dark-fill-2 transition-colors ${
				isDragOver ? "bg-brand-orange/10 border-brand-orange" : ""
			}`}
		>
			{/* Editing Banner */}
			{editingMessage && (
				<div className="flex items-center justify-between px-4 py-2 bg-dark-fill-3 border-t border-b border-border-subtle text-xs animate-slide-up">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="text-brand-orange">
							<FaPencilAlt size={12} />
						</div>
						<div className="border-l-2 border-brand-orange pl-2 min-w-0">
							<span className="font-bold text-text-primary block truncate">
								Editing message
							</span>
							<span className="text-text-muted truncate block text-[11px]">
								{editingMessage.text || (editingMessage.code ? "Code snippet" : "Attachment")}
							</span>
						</div>
					</div>

					<button
						type="button"
						onClick={onCancelEdit}
						className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-2 transition flex items-center gap-1"
						aria-label="Cancel editing"
						title="Cancel edit (Esc)"
					>
						<span className="text-[10px] text-text-muted hidden sm:inline">Esc to cancel</span>
						<FaTimes size={12} />
					</button>
				</div>
			)}

			{/* Replying Banner (mutually exclusive with editing) */}
			{!editingMessage && <ReplyPreview replyMessage={replyToMessage} onCancel={onCancelReply} />}

			{/* Drag & Drop Full-Surface Overlay */}
			{isDragOver && (
				<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-dark-layer-1/95 border-2 border-dashed border-brand-orange text-brand-orange font-bold text-sm gap-2 backdrop-blur-sm pointer-events-none animate-fade-in">
					<FaPaperclip size={24} className="animate-bounce" />
					<span>Drop files to attach to message</span>
				</div>
			)}

			{/* Rich Pre-Send Attachment Staging Area */}
			{stagedFiles.length > 0 && (
				<div className="px-3 pt-2.5 pb-2 flex items-center gap-2 overflow-x-auto border-b border-border-subtle bg-dark-fill-3/70">
					{stagedFiles.map((staged) => (
						<div
							key={staged.id}
							className="group relative flex items-center gap-2.5 p-1.5 pr-8 rounded-xl bg-dark-fill-2 border border-border-default hover:border-brand-orange/40 transition shrink-0 max-w-[220px]"
						>
							{staged.previewUrl ? (
								<img
									src={staged.previewUrl}
									alt={staged.name}
									className="w-10 h-10 rounded-lg object-cover bg-black/20 shrink-0"
								/>
							) : (
								<div className="w-10 h-10 rounded-lg bg-dark-fill-3 flex items-center justify-center text-brand-orange shrink-0">
									{staged.category === "code" ? (
										<FaCode size={16} />
									) : staged.category === "audio" ? (
										<FaMicrophone size={16} />
									) : (
										<FaPaperclip size={16} />
									)}
								</div>
							)}
							<div className="min-w-0 flex-1">
								<div className="text-[11px] font-bold text-text-primary truncate" title={staged.name}>
									{staged.name}
								</div>
								<div className="text-[9px] text-text-muted font-mono">
									{(staged.size / 1024).toFixed(0)} KB
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleRemoveStagedFile(staged.id)}
								className="absolute top-1.5 right-1.5 p-1 rounded-md text-text-muted hover:text-rose-400 hover:bg-dark-fill-3 transition"
								title="Remove attachment"
								aria-label="Remove attachment"
							>
								<FaTimes size={11} />
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() => {
							stagedFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
							setStagedFiles([]);
						}}
						className="text-[10px] text-text-muted hover:text-rose-400 px-2 py-1 rounded transition shrink-0 font-medium"
					>
						Clear all
					</button>
				</div>
			)}

			{/* Voice Recording Mode */}
			{voiceRecording ? (
				<div className="p-3">
					<VoiceRecorder
						onSendAudio={handleSendVoice}
						onCancel={() => setVoiceRecording(false)}
					/>
				</div>
			) : (
				/* Normal Composer Input */
				<div className="p-3 flex items-end gap-2">
					{/* Action Buttons: Attach, Code, Emoji */}
					<div className="flex items-center gap-1 pb-1">
						{/* Hidden File Input (supports multiple files) */}
						<input
							ref={fileInputRef}
							type="file"
							multiple
							className="hidden"
							onChange={(e) => {
								handleFilesAdded(e.target.files);
								if (e.target) e.target.value = "";
							}}
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="p-2 rounded-xl text-text-muted hover:text-brand-orange hover:bg-dark-fill-3 transition disabled:opacity-50"
							title="Attach files or photos"
						>
							<FaPaperclip size={15} />
						</button>

						{/* Code Snippet Button */}
						<button
							type="button"
							onClick={() => setCodeModalOpen(true)}
							className="p-2 rounded-xl text-text-muted hover:text-brand-orange hover:bg-dark-fill-3 transition"
							title="Share code snippet"
						>
							<FaCode size={15} />
						</button>

						{/* Emoji Popover Trigger */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
								className="p-2 rounded-xl text-text-muted hover:text-brand-orange hover:bg-dark-fill-3 transition"
								title="Add emoji"
							>
								<FaSmile size={15} />
							</button>

							{emojiPickerOpen && (
								<>
									<div
										className="fixed inset-0 z-30"
										onClick={() => setEmojiPickerOpen(false)}
									/>
									<div className="absolute bottom-full left-0 mb-2 z-40 p-2 rounded-lg bg-dark-layer-1 border border-border-default shadow-2xl grid grid-cols-4 gap-1.5 animate-scale-in">
										{COMMON_EMOJIS.map((em) => (
											<button
												key={em}
												type="button"
												onClick={() => {
													setText((prev) => prev + em);
													setEmojiPickerOpen(false);
													textareaRef.current?.focus();
												}}
												className="p-1.5 text-lg hover:scale-125 transition select-none"
											>
												{em}
											</button>
										))}
									</div>
								</>
							)}
						</div>
					</div>

					{/* Auto-expanding Textarea with Clipboard Paste Support */}
					<div className="flex-1 relative">
						<textarea
							ref={textareaRef}
							value={text}
							onChange={handleTextChange}
							onKeyDown={handleKeyDown}
							onPaste={handlePaste}
							placeholder={disabled ? "Posting restricted in this channel" : placeholder}
							disabled={disabled}
							rows={1}
							className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none resize-none max-h-40 disabled:opacity-50 leading-relaxed"
						/>
					</div>

					{/* Send, Save or Voice Record Button */}
					<div className="pb-1">
						{editingMessage ? (
							<button
								type="button"
								onClick={handleSend}
								disabled={disabled || !text.trim()}
								className="p-2.5 rounded-xl bg-brand-orange text-white hover:bg-brand-orange-hover transition shadow-md shadow-brand-orange/20 disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
								title="Save changes (Enter)"
							>
								<FaCheck size={12} />
								<span className="hidden sm:inline">Save</span>
							</button>
						) : text.trim() || stagedFiles.length > 0 ? (
							<button
								type="button"
								onClick={handleSend}
								disabled={disabled}
								className="p-2.5 rounded-xl bg-brand-orange text-white hover:bg-brand-orange-hover transition shadow-md shadow-brand-orange/20 disabled:opacity-50"
								title="Send message (Enter)"
							>
								<FaPaperPlane size={14} />
							</button>
						) : (
							<button
								type="button"
								onClick={() => setVoiceRecording(true)}
								disabled={disabled}
								className="p-2.5 rounded-xl text-text-muted hover:text-brand-orange hover:bg-dark-fill-3 transition disabled:opacity-50"
								title="Record voice message"
							>
								<FaMicrophone size={15} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* Code Snippet Modal */}
			<CodeSnippetModal
				isOpen={codeModalOpen}
				onClose={() => setCodeModalOpen(false)}
				onSubmit={(code, comment) => {
					onSendMessage({
						type: "code",
						code,
						text: comment,
					});
				}}
			/>
		</div>
	);
};
