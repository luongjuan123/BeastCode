import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { useAdmin } from "@/hooks/useAdmin";
import { Conversation, ChatMessage, ChatAttachment } from "@/types/chat";
import { useConversations } from "@/hooks/chat/useConversations";
import { useMessages } from "@/hooks/chat/useMessages";
import { useTyping } from "@/hooks/chat/useTyping";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { ConversationInfoDrawer } from "./ConversationInfoDrawer";
import { ChatMediaLightbox } from "./ChatMediaLightbox";
import { NewConversationModal } from "./NewConversationModal";
import { ReportMessageModal } from "./ReportMessageModal";
import { FaBan } from "react-icons/fa";

interface ChatShellProps {
	initialConversationId?: string;
}

export const ChatShell: React.FC<ChatShellProps> = ({ initialConversationId }) => {
	const router = useRouter();
	const [user] = useAuthState(auth);
	const [isAdmin] = useAdmin();

	const {
		conversations,
		loading: loadingConvs,
		startDirectConversation,
	} = useConversations();

	const [activeConversationId, setActiveConversationId] = useState<string | null>(
		initialConversationId || null
	);

	// UI panels
	const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
	const [newChatModalOpen, setNewChatModalOpen] = useState(false);
	const [activeLightboxMedia, setActiveLightboxMedia] = useState<ChatAttachment | null>(null);

	// Reply, Edit & Report state
	const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
	const [blockingUserModal, setBlockingUserModal] = useState<{ targetUid: string } | null>(null);

	// Active conversation object
	const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

	const initialSyncDoneRef = useRef(false);

	// Synchronize URL initialConversationId on direct mount or navigation
	useEffect(() => {
		if (initialConversationId && (!initialSyncDoneRef.current || !activeConversationId)) {
			setActiveConversationId(initialConversationId);
			initialSyncDoneRef.current = true;
		}
	}, [initialConversationId, activeConversationId]);

	// Auto-select first conversation on desktop ONLY ONCE if no conversation was specified
	useEffect(() => {
		if (
			!initialSyncDoneRef.current &&
			!initialConversationId &&
			conversations.length > 0 &&
			!activeConversationId
		) {
			if (typeof window !== "undefined" && window.innerWidth >= 768) {
				const firstId = conversations[0].id;
				setActiveConversationId(firstId);
				window.history.replaceState(null, "", `/messages/${firstId}`);
			}
			initialSyncDoneRef.current = true;
		}
	}, [conversations, initialConversationId, activeConversationId]);

	// Listen to browser Back/Forward (popstate) navigation without full page reloads
	useEffect(() => {
		const handlePopState = () => {
			if (typeof window === "undefined") return;
			const path = window.location.pathname;
			const match = path.match(/^\/messages\/([^/?#]+)/);
			if (match && match[1]) {
				setActiveConversationId(match[1]);
			} else if (path === "/messages") {
				setActiveConversationId(null);
			}
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	// Messages hook
	const {
		messages,
		initialLastReadAt,
		loading: loadingMsgs,
		loadingOlder,
		hasMoreOlder,
		sendMessage,
		retryMessage,
		loadOlderMessages,
		markAsRead,
		toggleReaction,
		editMessage,
		deleteMessage,
		pinMessage,
	} = useMessages(activeConversationId);

	// Typing hook
	const { typingUsers, sendTypingHeartbeat, clearTyping } = useTyping(activeConversationId);

	// Mark as read when active conversation has unread messages
	useEffect(() => {
		if (activeConversationId && messages.length > 0) {
			markAsRead();
		}
	}, [activeConversationId, messages.length, markAsRead]);

	const handleSelectConversation = (conv: Conversation) => {
		setActiveConversationId(conv.id);
		setReplyingMessage(null);
		setEditingMessage(null);
		setReportingMessage(null);
		if (typeof window !== "undefined") {
			window.history.pushState(null, "", `/messages/${conv.id}`);
		}
	};

	const handleBackToList = () => {
		setActiveConversationId(null);
		setReplyingMessage(null);
		setEditingMessage(null);
		setReportingMessage(null);
		if (typeof window !== "undefined") {
			window.history.pushState(null, "", "/messages");
		}
	};

	const handleSendMessage = async (params: any) => {
		const targetConversationId = params.conversationId || activeConversationId;
		if (!targetConversationId) return;

		await sendMessage({
			...params,
			targetConversationId,
		});
		await clearTyping();
	};

	const handleConfirmBlockUser = async (targetUid: string) => {
		try {
			const idToken = await user?.getIdToken();
			await fetch("/api/chat/users/block", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ targetUid, action: "block" }),
			});
			setInfoDrawerOpen(false);
		} catch (err: any) {
			console.error("[Block user error]:", err);
		}
	};

	return (
		<div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg-base text-text-primary">
			{/* ── 1. SIDEBAR (Hidden on mobile if conversation is active) ── */}
			<div
				className={`${
					activeConversationId ? "hidden md:flex" : "flex"
				} h-full w-full md:w-auto flex-shrink-0`}
			>
				<ConversationSidebar
					conversations={conversations}
					selectedConversationId={activeConversationId}
					currentUserId={user?.uid}
					onSelectConversation={handleSelectConversation}
					onNewConversation={() => setNewChatModalOpen(true)}
					loading={loadingConvs}
				/>
			</div>

			{/* ── 2. ACTIVE CHAT AREA (Hidden on mobile if no conversation selected) ── */}
			<div
				className={`${
					!activeConversationId ? "hidden md:flex" : "flex"
				} flex-1 h-full flex-col min-w-0 bg-bg-base`}
			>
				{activeConversation ? (
					<>
						{/* Chat Header */}
						<ChatHeader
							conversation={activeConversation}
							currentUserId={user?.uid}
							onBack={handleBackToList}
							onTogglePinned={() => setInfoDrawerOpen(true)}
							onToggleInfo={() => setInfoDrawerOpen(!infoDrawerOpen)}
							pinnedCount={messages.filter((m) => m.isPinned).length}
						/>

						{/* Messages Container */}
						<MessageList
							messages={messages}
							currentUserId={user?.uid}
							isStaff={isAdmin}
							initialLastReadAt={initialLastReadAt}
							loading={loadingMsgs}
							loadingOlder={loadingOlder}
							hasMoreOlder={hasMoreOlder}
							onLoadOlder={loadOlderMessages}
							onReply={(m) => {
								setReplyingMessage(m);
								setEditingMessage(null);
							}}
							onReact={toggleReaction}
							onEdit={(m) => {
								setEditingMessage(m);
								setReplyingMessage(null);
							}}
							onDelete={deleteMessage}
							onPin={pinMessage}
							onReport={(m) => setReportingMessage(m)}
							onRetry={retryMessage}
							onOpenMedia={(att) => setActiveLightboxMedia(att)}
						/>

						{/* Ephemeral Typing Indicator */}
						<TypingIndicator typingUsers={typingUsers} />

						{/* Composer */}
						<MessageComposer
							conversationId={activeConversation.id}
							replyToMessage={replyingMessage}
							editingMessage={editingMessage}
							onCancelReply={() => setReplyingMessage(null)}
							onCancelEdit={() => setEditingMessage(null)}
							onEditMessage={editMessage}
							onSendMessage={handleSendMessage}
							onTyping={sendTypingHeartbeat}
							disabled={
								activeConversation.channelType === "announcements" && !isAdmin
							}
						/>
					</>
				) : (
					/* No Conversation Selected Placeholder (Desktop) */
					<div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none text-text-muted">
						<div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center text-xl mb-3 text-accent-brand">
							#
						</div>
						<h2 className="text-sm font-semibold text-text-primary mb-1">
							Real-Time Developer Chat
						</h2>
						<p className="text-xs text-text-muted max-w-sm mb-5 font-mono">
							Select a channel from the sidebar or start a technical discussion thread with your peers.
						</p>
						<button
							type="button"
							onClick={() => setNewChatModalOpen(true)}
							className="px-4 py-2 rounded-md bg-accent-brand hover:bg-accent-hover text-bg-base text-xs font-mono font-medium transition-colors"
						>
							Start Conversation
						</button>
					</div>
				)}
			</div>

			{/* ── 3. COLLAPSIBLE INFO DRAWER ── */}
			{activeConversation && (
				<ConversationInfoDrawer
					isOpen={infoDrawerOpen}
					conversation={activeConversation}
					messages={messages}
					currentUserId={user?.uid}
					onClose={() => setInfoDrawerOpen(false)}
					onOpenMedia={(att) => setActiveLightboxMedia(att)}
					onBlockUser={(targetUid) => setBlockingUserModal({ targetUid })}
				/>
			)}

			{/* ── 4. LIGHTBOX MODAL ── */}
			<ChatMediaLightbox
				isOpen={!!activeLightboxMedia}
				attachment={activeLightboxMedia}
				onClose={() => setActiveLightboxMedia(null)}
			/>

			{/* ── 5. NEW CONVERSATION MODAL ── */}
			<NewConversationModal
				isOpen={newChatModalOpen}
				onClose={() => setNewChatModalOpen(false)}
				onSelectConversation={handleSelectConversation}
				onStartDirectChat={startDirectConversation}
			/>

			{/* ── 6. REPORT MESSAGE MODAL ── */}
			{activeConversation && (
				<ReportMessageModal
					isOpen={!!reportingMessage}
					message={reportingMessage}
					conversationId={activeConversation.id}
					onClose={() => setReportingMessage(null)}
				/>
			)}

			{/* ── 7. BLOCK USER CONFIRMATION MODAL ── */}
			{blockingUserModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
					<div className="w-full max-w-sm rounded-lg bg-dark-layer-1 border border-border-default shadow-2xl p-5 flex flex-col gap-4 animate-scale-in">
						<div className="flex items-center gap-2.5 text-rose-500">
							<FaBan size={18} />
							<h3 className="text-sm font-bold text-text-primary">Block User</h3>
						</div>
						<p className="text-xs text-text-secondary leading-relaxed">
							Are you sure you want to block this user? You will no longer be able to send or receive direct messages from each other.
						</p>
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
							<button
								type="button"
								onClick={() => setBlockingUserModal(null)}
								className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={async () => {
									const target = blockingUserModal.targetUid;
									setBlockingUserModal(null);
									await handleConfirmBlockUser(target);
								}}
								className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-md shadow-rose-600/20"
							>
								Confirm Block
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
