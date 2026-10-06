import React from "react";
import { FaHashtag, FaBullhorn, FaVolumeMute } from "react-icons/fa";
import { Conversation } from "@/types/chat";
import { usePresence } from "@/hooks/chat/usePresence";
import Avatar from "@/components/Threads/Avatar";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";

interface ConversationRowProps {
	conversation: Conversation;
	isSelected: boolean;
	currentUserId?: string;
	onSelect: (conv: Conversation) => void;
}

function formatRelativeTime(timestamp: number): string {
	if (!timestamp) return "";
	const date = new Date(timestamp);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) {
		return "Yesterday";
	}

	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const ConversationRow: React.FC<ConversationRowProps> = ({
	conversation,
	isSelected,
	currentUserId,
	onSelect,
}) => {
	const isDirect = conversation.type === "direct";

	const otherUid = isDirect
		? (conversation.participantUids || []).find((u) => u !== currentUserId)
		: null;
	const otherDetails = otherUid && conversation.participantDetails
		? conversation.participantDetails[otherUid]
		: null;

	const { isOnline } = usePresence(otherUid);

	const title = isDirect
		? otherDetails?.displayName || otherDetails?.username || conversation.title
		: conversation.title;

	const avatarUrl = isDirect
		? otherDetails?.avatarUrl
		: conversation.organizationAvatar;

	return (
		<div
			onClick={() => onSelect(conversation)}
			className={`group relative flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors select-none ${
				isSelected
					? "bg-accent-brand/10 border border-accent-brand/30 text-text-primary"
					: "hover:bg-bg-surface-elevated/60 border border-transparent text-text-secondary"
			}`}
		>
			{/* Avatar */}
			<div className="relative flex-shrink-0">
				{isDirect ? (
					<Avatar
						src={avatarUrl}
						displayName={title}
						size={38}
						isOnline={isOnline}
					/>
				) : conversation.organizationAvatar ? (
					<OrganizationAvatar
						src={conversation.organizationAvatar}
						name={conversation.organizationName || conversation.title}
						size="md"
						shape="rounded"
					/>
				) : (
					<div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center bg-bg-base border border-border-default">
						{conversation.channelType === "announcements" ? (
							<FaBullhorn size={13} className="text-accent-brand" />
						) : (
							<FaHashtag size={13} className="text-text-secondary" />
						)}
					</div>
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-1 mb-0.5">
					<span
						className={`text-xs font-medium truncate ${
							isSelected || conversation.isUnread ? "text-text-primary" : "text-text-secondary"
						}`}
					>
						{title}
					</span>
					<span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
						{formatRelativeTime(conversation.lastActivityAt)}
					</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<p
						className={`text-[11px] truncate flex-1 ${
							conversation.isUnread
								? "font-semibold text-text-primary"
								: "text-text-muted"
						}`}
					>
						{conversation.lastMessageSenderName && !isDirect && (
							<span className="opacity-80 mr-1">
								{conversation.lastMessageSenderName.split(" ")[0]}:
							</span>
						)}
						{conversation.lastMessagePreview || "No messages yet"}
					</p>

					{/* Badges: Muted / Unread */}
					<div className="flex items-center gap-1.5 flex-shrink-0">
						{conversation.isMuted && (
							<FaVolumeMute size={10} className="text-text-muted" />
						)}

						{conversation.isUnread && (
							<span className="w-1.5 h-1.5 rounded-full bg-accent-brand"></span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
