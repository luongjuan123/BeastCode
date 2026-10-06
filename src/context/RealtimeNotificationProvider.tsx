import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import {
	collection,
	query,
	where,
	onSnapshot,
	writeBatch,
	doc,
	updateDoc,
	deleteDoc
} from "firebase/firestore";

export interface RawNotification {
	id: string;
	toUid: string;
	type: string;
	title: string;
	body: string;
	category: string;
	priority: "critical" | "high" | "normal" | "low" | "silent";
	createdAt: number;
	read: boolean;
	ctaText?: string;
	ctaUrl?: string;
	fromUid?: string;
	fromDisplayName?: string;
	fromAvatarUrl?: string;
	threadId?: string;
	contestId?: string;
	problemId?: string;
	expiresAt?: number;
	metadata?: Record<string, any>;
	placeholders?: Record<string, string>;
}

interface NotificationContextProps {
	notifications: RawNotification[];
	unreadCount: number;
	loading: boolean;
	markAllAsRead: () => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	deleteNotification: (ids: string[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error("useNotifications must be used within a RealtimeNotificationProvider");
	}
	return context;
};

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user] = useAuthState(auth);
	const [notifications, setNotifications] = useState<RawNotification[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) {
			setNotifications([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		const q = query(
			collection(firestore, "notifications"),
			where("toUid", "==", user.uid)
		);

		const unsubscribe = onSnapshot(
			q,
			(snap) => {
				const list: RawNotification[] = [];
				snap.forEach((docSnap) => {
					list.push({
						id: docSnap.id,
						...docSnap.data()
					} as RawNotification);
				});
				// Sort reverse chronological
				list.sort((a, b) => b.createdAt - a.createdAt);
				setNotifications(list);
				setLoading(false);
			},
			(err) => {
				console.error("[RealtimeNotificationProvider Error]:", err);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	// Filter out expired notifications
	const activeNotifications = useMemo(() => {
		const now = Date.now();
		return notifications.filter(n => !n.expiresAt || n.expiresAt > now);
	}, [notifications]);

	const unreadCount = useMemo(() => {
		return activeNotifications.filter(n => !n.read).length;
	}, [activeNotifications]);

	const markAllAsRead = async () => {
		if (!user || activeNotifications.length === 0) return;
		const unread = activeNotifications.filter((n) => !n.read);
		if (unread.length === 0) return;

		try {
			const batch = writeBatch(firestore);
			unread.forEach((notif) => {
				const docRef = doc(firestore, "notifications", notif.id);
				batch.update(docRef, { read: true });
			});
			await batch.commit();
		} catch (err) {
			console.error("Failed to mark all as read:", err);
		}
	};

	const markAsRead = async (id: string) => {
		try {
			const docRef = doc(firestore, "notifications", id);
			await updateDoc(docRef, { read: true });
		} catch (err) {
			console.error("Failed to mark notification as read:", err);
		}
	};

	const deleteNotification = async (ids: string[]) => {
		if (ids.length === 0) return;
		try {
			const batch = writeBatch(firestore);
			ids.forEach((id) => {
				const docRef = doc(firestore, "notifications", id);
				batch.delete(docRef);
			});
			await batch.commit();
		} catch (err) {
			console.error("Failed to delete notification(s):", err);
		}
	};

	return (
		<NotificationContext.Provider
			value={{
				notifications: activeNotifications,
				unreadCount,
				loading,
				markAllAsRead,
				markAsRead,
				deleteNotification
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};
