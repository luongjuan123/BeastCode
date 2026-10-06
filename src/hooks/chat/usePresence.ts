import { useState, useEffect } from "react";
import { firestore } from "@/firebase/firebase";
import { collection, query, where, limit, onSnapshot, doc } from "firebase/firestore";

function formatLastSeen(timestamp?: number): string {
	if (!timestamp) return "Offline";
	const diffMs = Date.now() - timestamp;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHours = Math.floor(diffMin / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSec < 180) return "Online";
	if (diffMin < 60) return `Last seen ${diffMin}m ago`;
	if (diffHours < 24) return `Last seen ${diffHours}h ago`;
	if (diffDays === 1) return "Last seen yesterday";
	if (diffDays < 7) return `Last seen ${diffDays}d ago`;
	return "Offline";
}

export function usePresence(targetUid: string | null | undefined) {
	const [isOnline, setIsOnline] = useState(false);
	const [lastActive, setLastActive] = useState<number | undefined>(undefined);
	const [statusText, setStatusText] = useState("Offline");

	useEffect(() => {
		if (!targetUid) {
			setIsOnline(false);
			setStatusText("Offline");
			return;
		}

		// 1. Listen to activeSessions for targetUid
		const sessionsQuery = query(
			collection(firestore, "activeSessions"),
			where("userId", "==", targetUid),
			limit(1)
		);

		const unsubSession = onSnapshot(
			sessionsQuery,
			(snap) => {
				if (!snap.empty) {
					const data = snap.docs[0].data();
					const last = data.lastActive || data.createdAt;
					setLastActive(last);
					const online = !!last && Date.now() - last < 180000;
					setIsOnline(online);
					setStatusText(online ? "Online" : formatLastSeen(last));
				} else {
					// Fallback to user doc
					setIsOnline(false);
					setStatusText("Offline");
				}
			},
			(err) => {
				console.warn("[usePresence error]:", err.message);
			}
		);

		return () => unsubSession();
	}, [targetUid]);

	return {
		isOnline,
		lastActive,
		statusText,
	};
}
