import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaUser, FaUsers, FaPlus, FaBullhorn } from "react-icons/fa";
import { Conversation } from "@/types/chat";

interface NewConversationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectConversation: (conv: Conversation) => void;
	onStartDirectChat: (targetUid: string) => Promise<Conversation | null>;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
	isOpen,
	onClose,
	onSelectConversation,
	onStartDirectChat,
}) => {
	const [activeTab, setActiveTab] = useState<"direct" | "channel">("direct");
	const [searchQuery, setSearchQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [userResults, setUserResults] = useState<any[]>([]);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Debounced user search
	useEffect(() => {
		if (activeTab !== "direct" || searchQuery.trim().length < 2) {
			setUserResults([]);
			return;
		}

		const timer = setTimeout(async () => {
			setSearching(true);
			setError(null);
			try {
				const idToken = await (await import("@/firebase/firebase")).auth.currentUser?.getIdToken();
				const res = await fetch(
					`/api/chat/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
					{
						headers: { Authorization: `Bearer ${idToken}` },
					}
				);
				const data = await res.json();
				if (data.success) {
					setUserResults(data.users || []);
				} else {
					setError(data.error);
				}
			} catch (err: any) {
				console.error("[Search users error]:", err);
				setError("Failed to search users");
			} finally {
				setSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery, activeTab]);

	if (!isOpen) return null;

	const handleSelectUser = async (targetUid: string) => {
		setCreating(true);
		setError(null);
		try {
			const conv = await onStartDirectChat(targetUid);
			if (conv) {
				onSelectConversation(conv);
				onClose();
			}
		} catch (err: any) {
			setError(err.message || "Failed to start conversation");
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
			<div className="w-full max-w-md rounded-lg bg-dark-layer-1 border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-dark-fill-2">
					<h3 className="text-base font-bold text-text-primary">New Conversation</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition"
					>
						<FaTimes size={16} />
					</button>
				</div>

				{/* Body */}
				<div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
					{error && (
						<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
							{error}
						</div>
					)}

					{/* Search input */}
					<div className="relative">
						<FaSearch
							size={13}
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Type a username or display name..."
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl bg-dark-fill-3 border border-border-default text-text-primary focus:border-brand-orange focus:outline-none transition"
							autoFocus
						/>
					</div>

					{/* Results */}
					<div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-[220px]">
						{searching ? (
							<div className="flex justify-center items-center py-10">
								<div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
							</div>
						) : userResults.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
								<FaUser size={24} className="mb-2 opacity-40" />
								<div className="text-xs font-bold text-text-secondary">
									{searchQuery.trim().length >= 2
										? "No coders found"
										: "Find coders to message"}
								</div>
								<p className="text-[11px] max-w-[200px] mt-1">
									{searchQuery.trim().length >= 2
										? "Check the username spelling and try again"
										: "Type at least 2 characters to search"}
								</p>
							</div>
						) : (
							userResults.map((u) => (
								<button
									key={u.uid}
									type="button"
									disabled={creating}
									onClick={() => handleSelectUser(u.uid)}
									className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-dark-fill-3 transition text-left disabled:opacity-50"
								>
									<div className="w-10 h-10 rounded-full overflow-hidden bg-dark-fill-2 border border-border-subtle flex items-center justify-center flex-shrink-0">
										{u.avatarUrl ? (
											<img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
										) : (
											<span className="text-xs font-bold text-brand-orange uppercase">
												{(u.displayName || "U")[0]}
											</span>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-xs font-bold text-text-primary truncate">
											{u.displayName}
										</div>
										<div className="text-[11px] text-text-muted font-mono truncate">
											@{u.username}
										</div>
									</div>
									<span className="text-xs font-bold text-brand-orange">
										{creating ? "Opening..." : "Chat"}
									</span>
								</button>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
