import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import {
	collection,
	query,
	where,
	onSnapshot,
	orderBy,
	limit,
} from "firebase/firestore";
import { Conversation, UserConversationMeta } from "@/types/chat";

// In-memory cache across component mounts to eliminate reload lag
let cachedConversations: Conversation[] = [];
let cachedUserMeta: Record<string, UserConversationMeta> = {};

export function useConversations(options?: { enabled?: boolean }) {
	const enabled = options?.enabled !== false;
	const [user] = useAuthState(auth);
	const [conversations, setConversations] = useState<Conversation[]>(cachedConversations);
	const [userMeta, setUserMeta] = useState<Record<string, UserConversationMeta>>(cachedUserMeta);
	const [loading, setLoading] = useState(cachedConversations.length > 0 ? false : enabled);
	const [error, setError] = useState<string | null>(null);

	// Fetch initial conversation list from API (handles org channels and direct messages)
	const fetchConversations = useCallback(async () => {
		if (!user || !enabled) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/chat/conversations", {
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				const list = data.conversations || [];
				cachedConversations = list;
				setConversations(list);
			} else {
				setError(data.error || "Failed to load conversations");
			}
		} catch (err: any) {
			console.error("[useConversations fetch error]:", err);
			setError(err.message || "Network error");
		} finally {
			setLoading(false);
		}
	}, [user, enabled]);

	useEffect(() => {
		if (enabled) {
			fetchConversations();
		}
	}, [fetchConversations, enabled]);

	// Real-time listener on user's conversation metadata (for instant unread status updates)
	useEffect(() => {
		if (!user || !enabled) return;

		const metaQuery = query(
			collection(firestore, "userConversationMeta"),
			where("uid", "==", user.uid)
		);

		const unsub = onSnapshot(
			metaQuery,
			(snap) => {
				const map: Record<string, UserConversationMeta> = {};
				snap.forEach((doc) => {
					const data = doc.data() as UserConversationMeta;
					map[data.conversationId] = data;
				});
				cachedUserMeta = map;
				setUserMeta(map);
			},
			(err) => {
				console.warn("[userConversationMeta onSnapshot error]:", err.message);
			}
		);

		return () => unsub();
	}, [user, enabled]);

	// Real-time listener on direct conversations for instant lastMessage updates
	useEffect(() => {
		if (!user || !enabled) return;

		const dmQuery = query(
			collection(firestore, "conversations"),
			where("participantUids", "array-contains", user.uid),
			limit(50)
		);

		const unsub = onSnapshot(
			dmQuery,
			(snap) => {
				setConversations((prev) => {
					const updatedMap = new Map(prev.map((c) => [c.id, c]));
					snap.forEach((doc) => {
						const d = doc.data() as Omit<Conversation, "id">;
						const existing = updatedMap.get(doc.id);
						updatedMap.set(doc.id, {
							...(existing || {}),
							id: doc.id,
							...d,
						});
					});
					const sorted = Array.from(updatedMap.values()).sort(
						(a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
					);
					cachedConversations = sorted;
					return sorted;
				});
			},
			(err) => {
				console.warn("[conversations onSnapshot error]:", err.message);
			}
		);

		return () => unsub();
	}, [user, enabled]);

	// Enriched conversations with unread flags and pinned status
	const enrichedConversations = useMemo(() => {
		const list = conversations.map((conv) => {
			const meta = userMeta[conv.id];
			const lastReadAt = meta?.lastReadAt || 0;
			const isUnread =
				(conv.lastActivityAt || 0) > lastReadAt &&
				conv.lastMessageSenderId !== user?.uid;

			return {
				...conv,
				isUnread,
				isMuted: !!(meta?.mutedUntil && (meta.mutedUntil === -1 || meta.mutedUntil > Date.now())),
				isPinned: !!meta?.isPinned,
				isArchived: !!meta?.isArchived,
			};
		});

		// Sort: pinned first, then latest activity descending
		return list.sort((a, b) => {
			if (a.isPinned !== b.isPinned) {
				return a.isPinned ? -1 : 1;
			}
			return (b.lastActivityAt || 0) - (a.lastActivityAt || 0);
		});
	}, [conversations, userMeta, user?.uid]);

	// Total unread count across non-muted conversations
	const totalUnreadCount = useMemo(() => {
		return enrichedConversations.filter((c) => c.isUnread && !c.isMuted).length;
	}, [enrichedConversations]);

	// Start or open a direct conversation
	const startDirectConversation = useCallback(
		async (targetUid: string): Promise<Conversation | null> => {
			if (!user) return null;
			try {
				const idToken = await user.getIdToken();
				const res = await fetch("/api/chat/conversations", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${idToken}`,
					},
					body: JSON.stringify({
						type: "direct",
						targetUid,
					}),
				});
				const data = await res.json();
				if (data.success && data.conversation) {
					// Refresh list
					fetchConversations();
					return data.conversation;
				} else {
					throw new Error(data.error || "Failed to start conversation");
				}
			} catch (err: any) {
				console.error("[startDirectConversation error]:", err);
				throw err;
			}
		},
		[user, fetchConversations]
	);

	return {
		conversations: enrichedConversations,
		loading,
		error,
		totalUnreadCount,
		refresh: fetchConversations,
		startDirectConversation,
	};
}
