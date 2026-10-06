import React from "react";
import { ChatMessage, ChatAttachment } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

interface MessageGroupProps {
	messages: ChatMessage[];
	isOutgoing: boolean;
	currentUserId?: string;
	isStaff?: boolean;
	showDateDivider?: string | null;
	onReply: (msg: ChatMessage) => void;
	onReact: (msgId: string, emoji: string) => void;
	onEdit?: (msg: ChatMessage) => void;
	onDelete?: (msgId: string) => void;
	onPin?: (msgId: string) => void;
	onReport?: (msg: ChatMessage) => void;
	onRetry?: (clientMsgId: string) => void;
	onOpenMedia?: (attachment: ChatAttachment) => void;
	onJumpToMessage?: (msgId: string) => void;
}

export const MessageGroup: React.FC<MessageGroupProps> = ({
	messages,
	isOutgoing,
	currentUserId,
	isStaff,
	showDateDivider,
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
	if (messages.length === 0) return null;

	const first = messages[0];

	return (
		<div className="flex flex-col w-full">
			{/* Optional Date Divider */}
			{showDateDivider && (
				<div className="flex items-center justify-center my-4 select-none">
					<span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-dark-fill-3 border border-border-subtle text-text-muted shadow-sm">
						{showDateDivider}
					</span>
				</div>
			)}

			<div
				className={`flex items-end gap-2.5 my-1 w-full ${
					isOutgoing ? "flex-row-reverse" : "flex-row"
				}`}
			>
				{/* Avatar (Incoming only) */}
				{!isOutgoing && (
					<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-dark-fill-2 border border-border-subtle mb-1">
						{first.senderAvatarUrl ? (
							<img
								src={first.senderAvatarUrl}
								alt={first.senderDisplayName}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-orange bg-brand-orange/10 uppercase">
								{(first.senderDisplayName || "U")[0]}
							</div>
						)}
					</div>
				)}

				{/* Messages Column */}
				<div
					className={`flex flex-col gap-1 w-full ${
						isOutgoing ? "items-end" : "items-start"
					}`}
				>
					{/* Sender Name & Role Header (Incoming only, on first message of group) */}
					{!isOutgoing && (
						<div className="flex items-center gap-2 px-1 mb-0.5">
							<span className="text-xs font-bold text-text-primary">
								{first.senderDisplayName}
							</span>
							{first.senderRole && first.senderRole !== "user" && (
								<span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-brand-orange/15 text-brand-orange font-bold">
									{first.senderRole}
								</span>
							)}
						</div>
					)}

					{/* Sequential Messages */}
					{messages.map((msg) => (
						<MessageBubble
							key={msg.id || msg.clientMessageId}
							message={msg}
							isOutgoing={isOutgoing}
							currentUserId={currentUserId}
							isStaff={isStaff}
							onReply={onReply}
							onReact={(emoji) => onReact(msg.id, emoji)}
							onEdit={onEdit}
							onDelete={onDelete}
							onPin={onPin}
							onReport={onReport}
							onRetry={onRetry}
							onOpenMedia={onOpenMedia}
							onJumpToMessage={onJumpToMessage}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
