import React, { useState } from "react";
import {
	FaReply,
	FaSmile,
	FaEdit,
	FaTrash,
	FaThumbtack,
	FaCopy,
	FaFlag,
	FaCheck,
} from "react-icons/fa";
import { ChatMessage } from "@/types/chat";

interface MessageActionsProps {
	message: ChatMessage;
	currentUserId?: string;
	isStaff?: boolean;
	onReply: (msg: ChatMessage) => void;
	onReact: (emoji: string) => void;
	onEdit?: (msg: ChatMessage) => void;
	onDelete?: (msgId: string) => void;
	onPin?: (msgId: string) => void;
	onReport?: (msg: ChatMessage) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀"];

export const MessageActions: React.FC<MessageActionsProps> = ({
	message,
	currentUserId,
	isStaff,
	onReply,
	onReact,
	onEdit,
	onDelete,
	onPin,
	onReport,
}) => {
	const [copied, setCopied] = useState(false);
	const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);

	const isAuthor = currentUserId ? message.senderId === currentUserId : false;
	const canDelete = isAuthor || isStaff;
	const canEdit = isAuthor && !message.isDeleted && Date.now() - message.createdAt < 86400000;

	const handleCopy = () => {
		if (message.text) {
			navigator.clipboard.writeText(message.text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="relative flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-dark-layer-1/90 backdrop-blur-md border border-border-default shadow-lg text-text-secondary">
			{/* Quick Reactions */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setEmojiMenuOpen(!emojiMenuOpen)}
					className="p-1.5 rounded-lg hover:text-brand-orange hover:bg-dark-fill-3 transition"
					title="React"
				>
					<FaSmile size={13} />
				</button>

				{emojiMenuOpen && (
					<>
						<div
							className="fixed inset-0 z-30"
							onClick={() => setEmojiMenuOpen(false)}
						/>
						<div className="absolute bottom-full left-0 mb-1 z-40 flex items-center gap-1 p-1 rounded-full bg-dark-layer-1 border border-border-default shadow-xl">
							{QUICK_EMOJIS.map((e) => (
								<button
									key={e}
									type="button"
									onClick={() => {
										onReact(e);
										setEmojiMenuOpen(false);
									}}
									className="p-1 hover:scale-125 transition text-sm select-none"
								>
									{e}
								</button>
							))}
						</div>
					</>
				)}
			</div>

			{/* Reply */}
			<button
				type="button"
				onClick={() => onReply(message)}
				className="p-1.5 rounded-lg hover:text-brand-orange hover:bg-dark-fill-3 transition"
				title="Reply"
			>
				<FaReply size={13} />
			</button>

			{/* Copy Text */}
			{message.text && (
				<button
					type="button"
					onClick={handleCopy}
					className="p-1.5 rounded-lg hover:text-brand-orange hover:bg-dark-fill-3 transition"
					title={copied ? "Copied!" : "Copy message"}
				>
					{copied ? <FaCheck size={13} className="text-emerald-400" /> : <FaCopy size={13} />}
				</button>
			)}

			{/* Pin */}
			{onPin && (
				<button
					type="button"
					onClick={() => onPin(message.id)}
					className={`p-1.5 rounded-lg hover:text-brand-orange hover:bg-dark-fill-3 transition ${
						message.isPinned ? "text-brand-orange" : ""
					}`}
					title={message.isPinned ? "Unpin message" : "Pin message"}
				>
					<FaThumbtack size={12} className={message.isPinned ? "rotate-45" : ""} />
				</button>
			)}

			{/* Edit */}
			{canEdit && onEdit && (
				<button
					type="button"
					onClick={() => onEdit(message)}
					className="p-1.5 rounded-lg hover:text-brand-orange hover:bg-dark-fill-3 transition"
					title="Edit message"
				>
					<FaEdit size={13} />
				</button>
			)}

			{/* Delete */}
			{canDelete && onDelete && (
				<button
					type="button"
					onClick={() => onDelete(message.id)}
					className="p-1.5 rounded-lg hover:text-rose-500 hover:bg-dark-fill-3 transition"
					title="Delete message"
				>
					<FaTrash size={12} />
				</button>
			)}

			{/* Report (for non-authors) */}
			{!isAuthor && onReport && (
				<button
					type="button"
					onClick={() => onReport(message)}
					className="p-1.5 rounded-lg hover:text-amber-400 hover:bg-dark-fill-3 transition"
					title="Report message"
				>
					<FaFlag size={12} />
				</button>
			)}
		</div>
	);
};
