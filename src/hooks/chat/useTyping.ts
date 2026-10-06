import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { TypingState } from "@/types/chat";

export function useTyping(conversationId: string | null) {
	const [user] = useAuthState(auth);
	const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
	const lastSentTypingRef = useRef<number>(0);
	const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Clean up timers on unmount or conversation change
	useEffect(() => {
		return () => {
			if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		};
	}, [conversationId]);

	// Real-time listener for typing users
	useEffect(() => {
		if (!conversationId || !user) {
			setTypingUsers([]);
			return;
		}

		const typingCol = collection(firestore, "conversations", conversationId, "typing");
		const unsub = onSnapshot(
			typingCol,
			(snap) => {
				const now = Date.now();
				const active: TypingState[] = [];
				snap.forEach((doc) => {
					if (doc.id !== user.uid) {
						const data = doc.data() as TypingState;
						if (data.expiresAt && data.expiresAt > now) {
							active.push(data);
						}
					}
				});
				setTypingUsers(active);
			},
			(err) => {
				console.warn("[useTyping onSnapshot warning]:", err.message);
			}
		);

		return () => unsub();
	}, [conversationId, user]);

	// Active sweep timer every 1000ms to clear expired typers even without new Firestore writes
	useEffect(() => {
		if (typingUsers.length === 0) return;

		const interval = setInterval(() => {
			const now = Date.now();
			setTypingUsers((prev) => {
				const filtered = prev.filter((t) => t.expiresAt && t.expiresAt > now);
				return filtered.length === prev.length ? prev : filtered;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [typingUsers.length]);

	// Clear typing indicator immediately (e.g. on message submit, blur, or inactivity)
	const clearTyping = useCallback(async () => {
		if (inactivityTimeoutRef.current) {
			clearTimeout(inactivityTimeoutRef.current);
			inactivityTimeoutRef.current = null;
		}
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}

		if (!conversationId || !user || lastSentTypingRef.current === 0) return;
		lastSentTypingRef.current = 0;

		try {
			const idToken = await user.getIdToken();
			await fetch(`/api/chat/conversations/${conversationId}/typing`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${idToken}` },
			});
		} catch (err: any) {
			console.warn("[clearTyping error]:", err.message);
		}
	}, [conversationId, user]);

	// Execute actual network write
	const executeHeartbeat = useCallback(async () => {
		if (!conversationId || !user) return;
		lastSentTypingRef.current = Date.now();
		try {
			const idToken = await user.getIdToken();
			await fetch(`/api/chat/conversations/${conversationId}/typing`, {
				method: "POST",
				headers: { Authorization: `Bearer ${idToken}` },
			});
		} catch (err: any) {
			console.warn("[sendTypingHeartbeat error]:", err.message);
		}
	}, [conversationId, user]);

	// Send debounced typing heartbeat (coalesces keystrokes and throttles to max 1 write per 3000ms)
	const sendTypingHeartbeat = useCallback(() => {
		if (!conversationId || !user) return;

		// 1. Reset automatic inactivity timer: auto-clear after 2500ms of silence
		if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
		inactivityTimeoutRef.current = setTimeout(() => {
			clearTyping();
		}, 2500);

		// 2. Debounce/Throttle network writes to avoid excessive Firestore traffic
		const now = Date.now();
		const elapsed = now - lastSentTypingRef.current;

		if (lastSentTypingRef.current === 0 || elapsed >= 3000) {
			// First stroke or throttle elapsed: execute immediately
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			executeHeartbeat();
		} else if (!debounceTimerRef.current) {
			// Queue debounced trailing heartbeat to fire once throttle window opens
			const remainingWait = Math.max(800, 3000 - elapsed);
			debounceTimerRef.current = setTimeout(() => {
				debounceTimerRef.current = null;
				executeHeartbeat();
			}, remainingWait);
		}
	}, [conversationId, user, executeHeartbeat, clearTyping]);

	return {
		typingUsers,
		sendTypingHeartbeat,
		clearTyping,
	};
}
