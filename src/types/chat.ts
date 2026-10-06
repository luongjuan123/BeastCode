export type ConversationType = "direct" | "organization_channel";
export type ChannelType = "general" | "announcements" | "team" | "course" | "private" | "staff";
export type MessageType = "text" | "code" | "image" | "file" | "voice" | "system";

export interface ParticipantDetail {
	displayName: string;
	username: string;
	avatarUrl?: string;
	role?: string;
	isOnline?: boolean;
	lastSeenAt?: number;
}

export interface Conversation {
	id: string; // e.g. "dm_uid1_uid2" or "org_orgId_channelId"
	type: ConversationType;
	title: string;
	description?: string;
	organizationId?: string;
	organizationSlug?: string;
	organizationName?: string;
	organizationAvatar?: string;
	channelType?: ChannelType;
	participantUids: string[];
	participantDetails?: Record<string, ParticipantDetail>;
	lastActivityAt: number;
	lastMessagePreview?: string;
	lastMessageSenderId?: string;
	lastMessageSenderName?: string;
	lastMessageType?: MessageType;
	createdBy: string;
	createdAt: number;
	updatedAt: number;
	isArchived?: boolean;
	isAnnouncement?: boolean;
	isPrivate?: boolean;
	readPointers?: Record<string, number>;
	// Computed client-side for active user
	unreadCount?: number;
	isUnread?: boolean;
	isMuted?: boolean;
	isPinned?: boolean;
}

export interface ChatAttachment {
	id: string;
	name: string;
	size: number;
	mimeType: string;
	url: string;
	storagePath?: string;
	category: "images" | "documents" | "audio" | "code";
	width?: number;
	height?: number;
	duration?: number; // In seconds for voice
	uploadProgress?: number; // 0-100% upload progress
	isUploading?: boolean; // Client-side uploading state
}

export interface MessageReplyReference {
	messageId: string;
	senderDisplayName: string;
	textPreview: string;
	type: MessageType;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	senderId: string;
	senderDisplayName: string;
	senderUsername: string;
	senderAvatarUrl?: string;
	senderRole?: string;
	type: MessageType;
	text: string;
	code?: {
		language: string;
		content: string;
	};
	attachments?: ChatAttachment[];
	hasAttachments?: boolean;
	replyTo?: MessageReplyReference;
	reactions?: Record<string, string[]>; // emoji -> array of user UIDs
	isEdited?: boolean;
	editedAt?: number;
	isDeleted?: boolean;
	deletedAt?: number;
	deletedBy?: string;
	isPinned?: boolean;
	pinnedAt?: number;
	pinnedBy?: string;
	clientMessageId: string;
	createdAt: number;
	mentions?: string[];
	// Client-side delivery state
	deliveryStatus?: "sending" | "sent" | "failed" | "read";
	isUploadingMedia?: boolean;
}

export interface UserConversationMeta {
	id: string; // `${uid}_${conversationId}`
	uid: string;
	conversationId: string;
	lastReadAt: number;
	lastReadMessageId?: string;
	mutedUntil?: number; // 0 = unmuted, -1 = forever, > 0 = timestamp
	isArchived?: boolean;
	isPinned?: boolean;
	draftText?: string;
	updatedAt: number;
}

export interface TypingState {
	uid: string;
	displayName: string;
	expiresAt: number;
}
