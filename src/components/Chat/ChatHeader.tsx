import React from "react";
import {
	FaArrowLeft,
	FaSearch,
	FaThumbtack,
	FaInfoCircle,
	FaHashtag,
	FaBullhorn,
	FaUsers,
} from "react-icons/fa";
import { Conversation } from "@/types/chat";
import { usePresence } from "@/hooks/chat/usePresence";
import Avatar from "@/components/Threads/Avatar";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";

interface ChatHeaderProps {
	conversation: Conversation;
	currentUserId?: string;
	onBack?: () => void;
	onToggleSearch?: () => void;
	onTogglePinned?: () => void;
	onToggleInfo?: () => void;
	pinnedCount?: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
	conversation,
	currentUserId,
	onBack,
	onToggleSearch,
	onTogglePinned,
	onToggleInfo,
	pinnedCount = 0,
}) => {
	const isDirect = conversation.type === "direct";

	// Determine other user for direct message
	const otherUid = isDirect
		? (conversation.participantUids || []).find((u) => u !== currentUserId)
		: null;
	const otherDetails = otherUid && conversation.participantDetails
		? conversation.participantDetails[otherUid]
		: null;

	const { isOnline, statusText } = usePresence(otherUid);

	const title = isDirect
		? otherDetails?.displayName || otherDetails?.username || conversation.title
		: conversation.title;

	const avatarUrl = isDirect
		? otherDetails?.avatarUrl
		: conversation.organizationAvatar;

	return (
		<div className="h-16 px-4 border-b border-border-default bg-dark-fill-2 flex items-center justify-between z-20">
			{/* Left: Back (mobile) + Avatar + Title & Status */}
			<div className="flex items-center gap-3 min-w-0">
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="md:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
						aria-label="Back to conversations"
					>
						<FaArrowLeft size={16} />
					</button>
				)}

				{/* Avatar / Channel Icon */}
				<div className="relative flex-shrink-0">
					{isDirect ? (
						<Avatar
							src={avatarUrl}
							displayName={title}
							size={40}
							isOnline={isOnline}
						/>
					) : conversation.organizationAvatar ? (
						<OrganizationAvatar
							src={conversation.organizationAvatar}
							name={conversation.organizationName || conversation.title}
							size="sm"
							shape="rounded"
						/>
					) : (
						<div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-dark-fill-3 border border-border-subtle">
							{conversation.channelType === "announcements" ? (
								<FaBullhorn size={16} className="text-brand-orange" />
							) : (
								<FaHashtag size={16} className="text-text-secondary" />
							)}
						</div>
					)}
				</div>

				{/* Title and Subtitle */}
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h2 className="text-sm font-bold text-text-primary truncate">
							{title}
						</h2>
						{!isDirect && conversation.organizationName && (
							<span className="text-[10px] px-1.5 py-0.2 rounded bg-dark-fill-3 border border-border-subtle text-text-muted truncate hidden sm:inline">
								{conversation.organizationName}
							</span>
						)}
					</div>
					<div className="text-[11px] text-text-muted truncate">
						{isDirect ? (
							<span className={isOnline ? "text-emerald-400 font-medium" : ""}>
								{statusText}
							</span>
						) : conversation.description ? (
							<span>{conversation.description}</span>
						) : (
							<span>Organization Channel</span>
						)}
					</div>
				</div>
			</div>

			{/* Right Actions */}
			<div className="flex items-center gap-1">
				{/* Pinned Messages Trigger */}
				{onTogglePinned && (
					<button
						type="button"
						onClick={onTogglePinned}
						className={`relative p-2 rounded-xl transition ${
							pinnedCount > 0
								? "text-brand-orange hover:bg-brand-orange/10"
								: "text-text-muted hover:text-text-primary hover:bg-dark-fill-3"
						}`}
						title={`${pinnedCount} pinned message${pinnedCount === 1 ? "" : "s"}`}
					>
						<FaThumbtack size={15} />
						{pinnedCount > 0 && (
							<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-orange"></span>
						)}
					</button>
				)}

				{/* Search Trigger */}
				{onToggleSearch && (
					<button
						type="button"
						onClick={onToggleSearch}
						className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
						title="Search in conversation"
					>
						<FaSearch size={15} />
					</button>
				)}

				{/* Details / Info Trigger */}
				{onToggleInfo && (
					<button
						type="button"
						onClick={onToggleInfo}
						className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
						title="Conversation details"
					>
						<FaInfoCircle size={16} />
					</button>
				)}
			</div>
		</div>
	);
};
