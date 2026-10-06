import React, { useState } from "react";
import {
	FaCheck,
	FaCheckDouble,
	FaClock,
	FaExclamationTriangle,
	FaFile,
	FaDownload,
	FaPlay,
	FaPause,
	FaCopy,
	FaThumbtack,
} from "react-icons/fa";
import { ChatMessage, ChatAttachment } from "@/types/chat";
import { ReactionBar } from "./ReactionBar";
import { MessageActions } from "./MessageActions";
import { ImageAttachment } from "./ImageAttachment";
import { AudioAttachment } from "./AudioAttachment";
import { FileAttachment } from "./FileAttachment";

interface MessageBubbleProps {
	message: ChatMessage;
	isOutgoing: boolean;
	currentUserId?: string;
	isStaff?: boolean;
	onReply: (msg: ChatMessage) => void;
	onReact: (emoji: string) => void;
	onEdit?: (msg: ChatMessage) => void;
	onDelete?: (msgId: string) => void;
	onPin?: (msgId: string) => void;
	onReport?: (msg: ChatMessage) => void;
	onRetry?: (clientMsgId: string) => void;
	onOpenMedia?: (attachment: ChatAttachment) => void;
	onJumpToMessage?: (msgId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
	message,
	isOutgoing,
	currentUserId,
	isStaff,
	onReply,
	onReact,
	onEdit,
	onDelete,
	onPin,
	onReport,
	onRetry,
	onOpenMedia,
	onJumpToMessage,
}) => {
	const [copiedCode, setCopiedCode] = useState(false);

	const formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const handleCopyCode = (codeStr: string) => {
		navigator.clipboard.writeText(codeStr);
		setCopiedCode(true);
		setTimeout(() => setCopiedCode(false), 2000);
	};

	return (
		<div
			className={`group relative flex flex-col ${
				isOutgoing ? "items-end" : "items-start"
			} w-full max-w-[85%] sm:max-w-[75%]`}
		>
			{/* Pinned Badge */}
			{message.isPinned && (
				<div className="flex items-center gap-1 text-[10px] text-brand-orange font-bold mb-0.5 px-2">
					<FaThumbtack size={9} />
					<span>Pinned message</span>
				</div>
			)}

			{/* Bubble Shell */}
			<div
				className={`relative rounded-lg p-3 shadow-sm transition-all duration-150 ${
					message.deliveryStatus === "sending" ? "opacity-85" : "opacity-100"
				} ${
					isOutgoing
						? "bg-brand-orange text-white rounded-br-sm"
						: "bg-dark-fill-3 border border-border-subtle text-text-primary rounded-bl-sm"
				}`}
			>
				{/* Reply Reference Quote */}
				{message.replyTo && (
					<div
						onClick={() => onJumpToMessage && onJumpToMessage(message.replyTo!.messageId)}
						className={`mb-2 p-2 rounded-lg border-l-4 cursor-pointer text-xs transition ${
							isOutgoing
								? "bg-black/20 border-white/80 text-white/90 hover:bg-black/30"
								: "bg-dark-fill-2 border-brand-orange text-text-secondary hover:bg-dark-layer-1"
						}`}
					>
						<div className="font-bold text-[11px] mb-0.5">
							{message.replyTo.senderDisplayName}
						</div>
						<div className="truncate text-[11px] opacity-80">
							{message.replyTo.textPreview || "Message"}
						</div>
					</div>
				)}

				{/* Deleted Message Placeholder */}
				{message.isDeleted ? (
					<p className="italic text-xs opacity-70 flex items-center gap-1.5 py-1">
						<span>🚫</span> This message was deleted.
					</p>
				) : (
					<>
						{/* Text Content */}
						{message.text && (
							<div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words selection:bg-white/30">
								{message.text}
							</div>
						)}

						{/* Code Block Snippet */}
						{message.code && (
							<div className="mt-2 rounded-xl overflow-hidden border border-white/15 bg-black/40">
								<div className="flex items-center justify-between px-3 py-1.5 bg-black/50 border-b border-white/10 text-[10px] font-mono text-white/70">
									<span className="uppercase font-bold">{message.code.language || "code"}</span>
									<button
										type="button"
										onClick={() => handleCopyCode(message.code!.content)}
										className="flex items-center gap-1 text-white/70 hover:text-white transition"
										title="Copy code"
									>
										<FaCopy size={10} />
										<span>{copiedCode ? "Copied!" : "Copy"}</span>
									</button>
								</div>
								<pre className="p-3 font-mono text-xs overflow-x-auto text-emerald-300">
									<code>{message.code.content}</code>
								</pre>
							</div>
						)}

						{/* Media & Attachments */}
						{message.attachments && message.attachments.length > 0 && (
							<div className="mt-2 flex flex-col gap-2">
								{message.attachments.map((att) => {
									if (att.category === "images") {
										return (
											<ImageAttachment
												key={att.id}
												attachment={att}
												onClick={() => onOpenMedia && onOpenMedia(att)}
												isOutgoing={isOutgoing}
											/>
										);
									}

									if (att.category === "audio") {
										return (
											<AudioAttachment
												key={att.id}
												attachment={att}
												isOutgoing={isOutgoing}
											/>
										);
									}

									// Document / Generic File Card
									return (
										<FileAttachment
											key={att.id}
											attachment={att}
											isOutgoing={isOutgoing}
										/>
									);
								})}
							</div>
						)}
					</>
				)}

				{/* Metadata Footer: Timestamp & Delivery State */}
				<div
					className={`flex items-center justify-end gap-1 text-[10px] mt-1 font-mono select-none ${
						isOutgoing ? "text-white/80" : "text-text-muted"
					}`}
				>
					{message.isEdited && <span className="text-[9px] opacity-80">(edited)</span>}
					<span>{formatTime(message.createdAt)}</span>

					{/* Outgoing Delivery Checkmarks */}
					{isOutgoing && (
						<span className="ml-0.5">
							{message.deliveryStatus === "sending" && (
								<FaClock size={9} className="animate-spin opacity-80" />
							)}
							{message.deliveryStatus === "sent" && <FaCheck size={9} />}
							{message.deliveryStatus === "read" && (
								<FaCheckDouble size={10} className="text-white font-bold" />
							)}
							{message.deliveryStatus === "failed" && (
								<button
									type="button"
									onClick={() => onRetry && onRetry(message.clientMessageId)}
									className="flex items-center gap-1 text-rose-300 hover:text-white font-sans font-bold"
									title="Failed to send. Click to retry."
								>
									<FaExclamationTriangle size={10} />
									<span className="text-[9px]">Retry</span>
								</button>
							)}
						</span>
					)}
				</div>
			</div>

			{/* Reactions Display */}
			<ReactionBar
				reactions={message.reactions}
				currentUserId={currentUserId}
				onToggleReaction={onReact}
				canReact={!message.isDeleted}
			/>

			{/* Floating Hover Actions */}
			<div
				className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-150 z-20 ${
					isOutgoing ? "right-2" : "left-2"
				}`}
			>
				<MessageActions
					message={message}
					currentUserId={currentUserId}
					isStaff={isStaff}
					onReply={onReply}
					onReact={onReact}
					onEdit={onEdit}
					onDelete={onDelete}
					onPin={onPin}
					onReport={onReport}
				/>
			</div>
		</div>
	);
};
