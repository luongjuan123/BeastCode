import React from "react";
import AppShell from "@/components/UI/AppShell";
import useHasMounted from "@/hooks/useHasMounted";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import NotificationCenter from "@/components/Notification/NotificationCenter";

export default function NotificationsPage() {
	const hasMounted = useHasMounted();
	const [user] = useAuthState(auth);

	if (!hasMounted) return null;

	return (
		<AppShell activeNav="" maxWidth="normal">
			{!user ? (
				<div className="py-16 text-center rounded-lg p-6 bg-bg-surface border border-border-subtle">
					<p className="text-xs font-medium text-text-muted">
						Please sign in to access your notification workspace.
					</p>
				</div>
			) : (
				<NotificationCenter />
			)}
		</AppShell>
	);
}
