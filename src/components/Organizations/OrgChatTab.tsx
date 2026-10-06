import React, { useState, useEffect } from "react";
import { FaHashtag, FaBullhorn, FaPlus } from "react-icons/fa";
import { Organization } from "@/utils/orgEngine";
import { Conversation } from "@/types/chat";
import { ChatHeader } from "@/components/Chat/ChatHeader";
import { MessageList } from "@/components/Chat/MessageList";
import { MessageComposer } from "@/components/Chat/MessageComposer";
import { TypingIndicator } from "@/components/Chat/TypingIndicator";
import { useMessages } from "@/hooks/chat/useMessages";
import { useTyping } from "@/hooks/chat/useTyping";

interface OrgChatTabProps {
	org: Organization;
	user: any;
	userRole?: string | null;
}

export const OrgChatTab: React.FC<OrgChatTabProps> = ({ org, user, userRole }) => {
	const [channels, setChannels] = useState<Conversation[]>([]);
	const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
	const [loadingChannels, setLoadingChannels] = useState(true);
	const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
	const [newChannelTitle, setNewChannelTitle] = useState("");
	const [newChannelType, setNewChannelType] = useState<"general" | "announcements">("general");

	// Fetch org channels
	const fetchChannels = async () => {
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/chat/conversations", {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			const data = await res.json();
			if (data.success) {
				const orgChannels = (data.conversations || []).filter(
					(c: Conversation) => c.organizationId === org.id
				);
				setChannels(orgChannels);
				if (orgChannels.length > 0 && !selectedChannelId) {
					setSelectedChannelId(orgChannels[0].id);
				}
			}
		} catch (err: any) {
			console.error("[OrgChatTab fetch channels error]:", err);
		} finally {
			setLoadingChannels(false);
		}
	};

	useEffect(() => {
		if (org && user) {
			fetchChannels();
		}
	}, [org, user]);

	const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

	const {
		messages,
		loading: loadingMsgs,
		loadingOlder,
		hasMoreOlder,
		sendMessage,
		loadOlderMessages,
		toggleReaction,
		editMessage,
		deleteMessage,
		pinMessage,
	} = useMessages(selectedChannelId);

	const { typingUsers, sendTypingHeartbeat, clearTyping } = useTyping(selectedChannelId);

	const isStaff = ["owner", "admin", "coach", "instructor"].includes(userRole || "");

	const handleCreateChannel = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newChannelTitle.trim()) return;

		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/chat/conversations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					type: "organization_channel",
					organizationId: org.id,
					title: newChannelTitle.trim(),
					channelType: newChannelType,
				}),
			});
			const data = await res.json();
			if (data.success && data.conversation) {
				setChannels((prev) => [...prev, data.conversation]);
				setSelectedChannelId(data.conversation.id);
				setNewChannelModalOpen(false);
				setNewChannelTitle("");
			} else {
				alert(data.error || "Failed to create channel");
			}
		} catch (err: any) {
			alert(err.message || "Failed to create channel");
		}
	};

	return (
		<div className="flex h-[700px] rounded-lg overflow-hidden border border-border-default bg-bg-surface shadow-xl">
			{/* Channels Sidebar */}
			<div className="w-60 border-r border-border-subtle bg-bg-surface flex flex-col">
				<div className="p-3.5 border-b border-border-subtle flex items-center justify-between">
					<span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
						Channels
					</span>
					{isStaff && (
						<button
							type="button"
							onClick={() => setNewChannelModalOpen(true)}
							className="p-1 rounded-md text-text-muted hover:text-accent hover:bg-bg-hover transition"
							title="Create channel"
						>
							<FaPlus size={11} />
						</button>
					)}
				</div>

				<div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
					{loadingChannels ? (
						<div className="flex justify-center py-6">
							<div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
						</div>
					) : channels.length === 0 ? (
						<div className="p-4 text-center text-xs text-text-muted font-mono">
							No channels created yet.
						</div>
					) : (
						channels.map((ch) => (
							<button
								key={ch.id}
								type="button"
								onClick={() => setSelectedChannelId(ch.id)}
								className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition text-left ${
									ch.id === selectedChannelId
										? "bg-bg-elevated text-accent border border-border-default"
										: "text-text-muted hover:text-text-primary hover:bg-bg-hover/50"
								}`}
							>
								{ch.channelType === "announcements" ? (
									<FaBullhorn size={11} className={ch.id === selectedChannelId ? "text-accent" : "text-text-muted"} />
								) : (
									<FaHashtag size={11} className={ch.id === selectedChannelId ? "text-accent" : "text-text-muted"} />
								)}
								<span className="truncate">{ch.title}</span>
							</button>
						))
					)}
				</div>
			</div>

			{/* Active Channel Chat Area */}
			<div className="flex-1 flex flex-col min-w-0 bg-bg-surface">
				{selectedChannel ? (
					<>
						<ChatHeader conversation={selectedChannel} currentUserId={user?.uid} />
						<MessageList
							messages={messages}
							currentUserId={user?.uid}
							isStaff={isStaff}
							loading={loadingMsgs}
							loadingOlder={loadingOlder}
							hasMoreOlder={hasMoreOlder}
							onLoadOlder={loadOlderMessages}
							onReply={() => {}}
							onReact={toggleReaction}
							onEdit={(m) => {
								const newText = prompt("Edit message:", m.text);
								if (newText !== null && newText.trim() !== m.text) {
									editMessage(m.id, newText.trim());
								}
							}}
							onDelete={deleteMessage}
							onPin={pinMessage}
						/>
						<TypingIndicator typingUsers={typingUsers} />
						<MessageComposer
							conversationId={selectedChannel.id}
							replyToMessage={null}
							onCancelReply={() => {}}
							onSendMessage={async (params) => {
								await sendMessage(params);
								await clearTyping();
							}}
							onTyping={sendTypingHeartbeat}
							disabled={selectedChannel.channelType === "announcements" && !isStaff}
						/>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-xs text-text-muted font-mono">
						Select or create a channel to start chatting.
					</div>
				)}
			</div>

			{/* Create Channel Modal */}
			{newChannelModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
					<form
						onSubmit={handleCreateChannel}
						className="w-full max-w-sm rounded-lg bg-bg-surface border border-border-default p-5 shadow-2xl flex flex-col gap-3.5"
					>
						<h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-muted">Create Channel</h3>
						<div>
							<label className="block text-[10px] font-mono font-medium text-text-muted uppercase mb-1">
								Channel Name
							</label>
							<input
								type="text"
								value={newChannelTitle}
								onChange={(e) => setNewChannelTitle(e.target.value)}
								placeholder="e.g. general, announcements, contests"
								className="w-full text-xs px-3 py-2 rounded-md bg-bg-elevated border border-border-default text-text-primary focus:border-accent focus:outline-none font-sans"
								required
								autoFocus
							/>
						</div>
						<div>
							<label className="block text-[10px] font-mono font-medium text-text-muted uppercase mb-1">
								Type
							</label>
							<select
								value={newChannelType}
								onChange={(e) => setNewChannelType(e.target.value as any)}
								className="w-full text-xs px-3 py-2 rounded-md bg-bg-elevated border border-border-default text-text-primary focus:border-accent focus:outline-none font-sans"
							>
								<option value="general">General (all members can chat)</option>
								<option value="announcements">Announcements (staff only)</option>
							</select>
						</div>
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
							<button
								type="button"
								onClick={() => setNewChannelModalOpen(false)}
								className="px-3.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-elevated border border-border-default transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={!newChannelTitle.trim()}
								className="px-4 py-1.5 rounded-md text-xs font-medium bg-accent text-bg-page hover:bg-accent-hover transition disabled:opacity-50"
							>
								Create
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
};
