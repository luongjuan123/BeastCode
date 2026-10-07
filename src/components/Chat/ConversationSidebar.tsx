import React, { useState, useMemo } from "react";
import { FaSearch, FaPlus, FaComments, FaUsers, FaEnvelopeOpenText } from "react-icons/fa";
import { Conversation } from "@/types/chat";
import { ConversationRow } from "./ConversationRow";

interface ConversationSidebarProps {
	conversations: Conversation[];
	selectedConversationId: string | null;
	currentUserId?: string;
	onSelectConversation: (conv: Conversation) => void;
	onNewConversation: () => void;
	loading?: boolean;
}

type FilterTab = "all" | "direct" | "orgs" | "unread";

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
	conversations,
	selectedConversationId,
	currentUserId,
	onSelectConversation,
	onNewConversation,
	loading,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<FilterTab>("all");

	// Filter and search
	const filteredConversations = useMemo(() => {
		let list = [...conversations];

		// Apply tab filter
		if (activeTab === "direct") {
			list = list.filter((c) => c.type === "direct");
		} else if (activeTab === "orgs") {
			list = list.filter((c) => c.type === "organization_channel");
		} else if (activeTab === "unread") {
			list = list.filter((c) => c.isUnread);
		}

		// Apply text search
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((c) => {
				const titleMatch = c.title.toLowerCase().includes(q);
				const orgMatch = c.organizationName?.toLowerCase().includes(q);
				const previewMatch = c.lastMessagePreview?.toLowerCase().includes(q);
				return titleMatch || orgMatch || previewMatch;
			});
		}

		return list;
	}, [conversations, activeTab, searchQuery]);

	const unreadCount = useMemo(
		() => conversations.filter((c) => c.isUnread && !c.isMuted).length,
		[conversations]
	);

	return (
		<div className="w-full md:w-80 lg:w-96 h-full flex flex-col border-r border-border-default bg-bg-surface select-none">
			{/* Header */}
			<div className="p-3.5 border-b border-border-default flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h1 className="text-sm font-semibold text-text-primary tracking-wide">Messages</h1>
					{unreadCount > 0 && (
						<span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-accent-brand text-bg-base">
							{unreadCount}
						</span>
					)}
				</div>

				<button
					type="button"
					onClick={onNewConversation}
					className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-brand hover:bg-accent-hover text-bg-base text-xs font-mono font-medium transition-colors"
					title="Start a new direct message or create channel"
				>
					<FaPlus size={10} />
					<span>New</span>
				</button>
			</div>

			{/* Search input */}
			<div className="px-3 pt-2.5">
				<div className="relative">
					<FaSearch
						size={11}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search conversations..."
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md bg-bg-base border border-border-default text-text-primary focus:border-accent-brand focus:outline-none transition-colors"
					/>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="flex items-center gap-1 px-3 pt-2 pb-1">
				{(["all", "direct", "orgs", "unread"] as FilterTab[]).map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={`flex-1 py-1 text-center text-xs font-mono rounded transition-colors capitalize ${
							activeTab === tab
								? "bg-bg-base text-accent-brand font-medium border border-border-default"
								: "text-text-muted hover:text-text-primary"
						}`}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Conversation List */}
			<div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
				{loading && conversations.length === 0 ? (
					<div className="flex justify-center py-10">
						<div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
					</div>
				) : filteredConversations.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 px-4 text-center text-text-muted">
						<FaEnvelopeOpenText size={28} className="mb-2 opacity-50" />
						<div className="text-xs font-bold text-text-secondary mb-1">
							{searchQuery ? "No matches found" : "No conversations yet"}
						</div>
						<p className="text-[11px] max-w-[200px]">
							{searchQuery
								? "Try a different search keyword"
								: "Start chatting by creating a new conversation"}
						</p>
					</div>
				) : (
					filteredConversations.map((conv) => (
						<ConversationRow
							key={conv.id}
							conversation={conv}
							isSelected={conv.id === selectedConversationId}
							currentUserId={currentUserId}
							onSelect={onSelectConversation}
						/>
					))
				)}
			</div>
		</div>
	);
};
