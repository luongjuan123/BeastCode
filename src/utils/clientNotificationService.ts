import { auth as clientAuth } from "@/firebase/firebase";
import { BeastNotificationEvent } from "./notificationTypes";

/**
 * Client-side trigger service to dispatch a notification via the secure Next.js API route.
 * This is designed to run in browser environments and never imports server-only libraries.
 */
export async function clientSendNotification(
	eventType: BeastNotificationEvent,
	recipientUid: string,
	options: {
		placeholders?: Record<string, string>;
		ctaUrl?: string;
		customContent?: string;
		metadata?: Record<string, any>;
	} = {}
) {
	try {
		const currentUser = clientAuth.currentUser;
		const token = currentUser ? await currentUser.getIdToken() : null;

		const headers: HeadersInit = {
			"Content-Type": "application/json",
		};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}

		const response = await fetch("/api/notifications/dispatch", {
			method: "POST",
			headers,
			body: JSON.stringify({
				eventType,
				recipientUid,
				...options,
			}),
		});

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error triggering client notification:", error);
		return { success: false, message: "Network error or failure during dispatch" };
	}
}
