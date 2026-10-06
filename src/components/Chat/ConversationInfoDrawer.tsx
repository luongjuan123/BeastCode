import React, { useState, useMemo } from "react";
import {
	FaTimes,
	FaThumbtack,
	FaImage,
	FaFile,
	FaBan,
	FaBellSlash,
	FaHashtag,
	FaBullhorn,
} from "react-icons/fa";
import { Conversation, ChatMessage, ChatAttachment } from "@/types/chat";
import { usePresence } from "@/hooks/chat/usePresence";
import { ImageAttachment } from "./ImageAttachment";
import { FileAttachment } from "./FileAttachment";
import Avatar from "@/components/Threads/Avatar";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";

interface ConversationInfoDrawerProps {
	isOpen: boolean;
	conversation: Conversation;
	messages: ChatMessage[];
	currentUserId?: string;
	onClose: () => void;
	onOpenMedia?: (att: ChatAttachment) => void;
	onBlockUser?: (uid: string) => void;
	onJumpToMessage?: (msgId: string) => void;
}

type DrawerTab = "pinned" | "media" | "files";

export const ConversationInfoDrawer: React.FC<ConversationInfoDrawerProps> = ({
	isOpen,
	conversation,
	messages,
	currentUserId,
	onClose,
	onOpenMedia,
	onBlockUser,
	onJumpToMessage,
}) => {
	const [activeTab, setActiveTab] = useState<"pinned" | "media" | "files">("pinned");

	const isDirect = conversation.type === "direct";
	const otherUid = isDirect
		? (conversation.participantUids || []).find((u) => u !== currentUserId)
		: null;
	const otherDetails = otherUid && conversation.participantDetails
		? conversation.participantDetails[otherUid]
		: null;

	const { statusText } = usePresence(otherUid);

	const title = isDirect
		? otherDetails?.displayName || otherDetails?.username || conversation.title
		: conversation.title;

	// Extract pinned messages, media attachments, file attachments
	const pinnedMessages = useMemo(
		() => messages.filter((m) => m.isPinned && !m.isDeleted),
		[messages]
	);

	const photos = useMemo(() => {
		const list: ChatAttachment[] = [];
		messages.forEach((m) => {
			if (!m.isDeleted && m.attachments) {
				m.attachments.forEach((att) => {
					if (att.mimeType?.startsWith("image/") || att.category === "images") {
						list.push(att);
					}
				});
			}
		});
		return list;
	}, [messages]);

	const files = useMemo(() => {
		const list: ChatAttachment[] = [];
		messages.forEach((m) => {
			if (!m.isDeleted && m.attachments) {
				m.attachments.forEach((att) => {
					if (!att.mimeType?.startsWith("image/") && !att.mimeType?.startsWith("audio/")) {
						list.push(att);
					}
				});
			}
		});
		return list;
	}, [messages]);

	if (!isOpen) return null;

	return (
		<div className="w-80 border-l border-border-default bg-dark-layer-1 flex flex-col h-full z-20 animate-slide-left shadow-2xl flex-shrink-0">
			{/* Drawer Header */}
			<div className="h-16 px-4 border-b border-border-subtle flex items-center justify-between bg-dark-fill-2">
				<h3 className="text-sm font-bold text-text-primary">Conversation Info</h3>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
				>
					<FaTimes size={15} />
				</button>
			</div>

			{/* Profile / Channel Overview */}
			<div className="p-5 flex flex-col items-center text-center border-b border-border-subtle">
				<div className="mb-3">
					{isDirect ? (
						<Avatar
							src={otherDetails?.avatarUrl}
							displayName={title}
							size={64}
						/>
					) : conversation.organizationAvatar ? (
						<OrganizationAvatar
							src={conversation.organizationAvatar}
							name={conversation.organizationName || conversation.title}
							size="lg"
							shape="rounded"
						/>
					) : (
						<div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center bg-dark-fill-3 border-2 border-border-default shadow-md">
							{conversation.channelType === "announcements" ? (
								<FaBullhorn size={24} className="text-brand-orange" />
							) : (
								<FaHashtag size={24} className="text-text-secondary" />
							)}
						</div>
					)}
				</div>

				<h4 className="text-sm font-bold text-text-primary mb-0.5">{title}</h4>
				<div className="text-xs text-text-muted">
					{isDirect ? statusText : conversation.description || "Organization channel"}
				</div>
			</div>

			{/* Tabs: Pinned, Media, Files */}
			<div className="flex border-b border-border-subtle bg-dark-fill-2 text-xs">
				<button
					type="button"
					onClick={() => setActiveTab("pinned")}
					className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold transition border-b-2 ${
						activeTab === "pinned"
							? "border-brand-orange text-brand-orange"
							: "border-transparent text-text-muted hover:text-text-primary"
					}`}
				>
					<FaThumbtack size={11} />
					<span>Pinned ({pinnedMessages.length})</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("media")}
					className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold transition border-b-2 ${
						activeTab === "media"
							? "border-brand-orange text-brand-orange"
							: "border-transparent text-text-muted hover:text-text-primary"
					}`}
				>
					<FaImage size={11} />
					<span>Photos ({photos.length})</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("files")}
					className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold transition border-b-2 ${
						activeTab === "files"
							? "border-brand-orange text-brand-orange"
							: "border-transparent text-text-muted hover:text-text-primary"
					}`}
				>
					<FaFile size={11} />
					<span>Files ({files.length})</span>
				</button>
			</div>

			{/* Tab Contents */}
			<div className="flex-1 overflow-y-auto p-4">
				{activeTab === "pinned" && (
					<div className="flex flex-col gap-2.5">
						{pinnedMessages.length === 0 ? (
							<div className="text-center text-xs text-text-muted py-8">
								No pinned messages in this chat.
							</div>
						) : (
							pinnedMessages.map((msg) => (
								<div
									key={msg.id}
									onClick={() => onJumpToMessage && onJumpToMessage(msg.id)}
									className="p-3 rounded-xl bg-dark-fill-3 border border-border-subtle hover:border-brand-orange/40 transition cursor-pointer text-left"
								>
									<div className="flex items-center justify-between text-[10px] text-text-muted mb-1 font-bold">
										<span>{msg.senderDisplayName}</span>
										<span>{new Date(msg.createdAt).toLocaleDateString()}</span>
									</div>
									<p className="text-xs text-text-secondary line-clamp-3">
										{msg.text || (msg.code ? "Code snippet" : "Attachment")}
									</p>
								</div>
							))
						)}
					</div>
				)}

				{activeTab === "media" && (
					<div>
						{photos.length === 0 ? (
							<div className="text-center text-xs text-text-muted py-8">
								No photos shared yet.
							</div>
						) : (
							<div className="grid grid-cols-3 gap-2">
								{photos.map((photo) => (
									<div
										key={photo.id}
										onClick={() => onOpenMedia && onOpenMedia(photo)}
										className="aspect-square rounded-lg overflow-hidden border border-border-subtle cursor-pointer hover:opacity-90 transition"
									>
										<ImageAttachment
											attachment={photo}
											className="w-full h-full object-cover"
										/>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === "files" && (
					<div className="flex flex-col gap-2">
						{files.length === 0 ? (
							<div className="text-center text-xs text-text-muted py-8">
								No files shared yet.
							</div>
						) : (
							files.map((file) => (
								<FileAttachment
									key={file.id}
									attachment={file}
								/>
							))
						)}
					</div>
				)}
			</div>

			{/* Danger / Privacy Actions */}
			{isDirect && otherUid && onBlockUser && (
				<div className="p-4 border-t border-border-subtle bg-dark-fill-2">
					<button
						type="button"
						onClick={() => onBlockUser(otherUid)}
						className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition"
					>
						<FaBan size={12} />
						<span>Block User</span>
					</button>
				</div>
			)}
		</div>
	);
};
