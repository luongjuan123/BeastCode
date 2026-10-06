import React from "react";
import { FaReply, FaTimes } from "react-icons/fa";
import { ChatMessage } from "@/types/chat";

interface ReplyPreviewProps {
	replyMessage: ChatMessage | null;
	onCancel: () => void;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyMessage, onCancel }) => {
	if (!replyMessage) return null;

	return (
		<div className="flex items-center justify-between px-4 py-2 bg-dark-fill-3 border-t border-b border-border-subtle text-xs animate-slide-up">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="text-brand-orange">
					<FaReply size={12} />
				</div>
				<div className="border-l-2 border-brand-orange pl-2 min-w-0">
					<span className="font-bold text-text-primary block truncate">
						Replying to {replyMessage.senderDisplayName}
					</span>
					<span className="text-text-muted truncate block text-[11px]">
						{replyMessage.text ||
							(replyMessage.code ? "💻 Code snippet" : "📎 Attachment")}
					</span>
				</div>
			</div>

			<button
				type="button"
				onClick={onCancel}
				className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-2 transition"
				aria-label="Cancel reply"
			>
				<FaTimes size={12} />
			</button>
		</div>
	);
};
