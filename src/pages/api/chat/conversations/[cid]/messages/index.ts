import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { checkRateLimit, resolveOrgAndMembership } from "@/utils/orgEngine";
import { NotificationDispatcher } from "@/utils/notificationDispatcher";
import { ChatMessage, Conversation } from "@/types/chat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { cid, before, limit: limitQuery } = req.query;
	const conversationId = cid as string;

	if (!conversationId) {
		return res.status(400).json({ success: false, error: "Missing conversation ID" });
	}

	const db = getAdminFirestore();
	const convRef = db.collection("conversations").doc(conversationId);
	const convSnap = await convRef.get();

	if (!convSnap.exists) {
		return res.status(404).json({ success: false, error: "Conversation not found" });
	}

	const convData = convSnap.data() as Conversation;

	// ─── Authorization Check ──────────────────────────────────────────────────
	let isAuthorized = false;
	let userOrgMemberRole: string | undefined = undefined;

	if (convData.type === "direct") {
		isAuthorized = (convData.participantUids || []).includes(user.uid);
	} else if (convData.type === "organization_channel" && convData.organizationId) {
		const { org, member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
		if (member && member.status === "active") {
			userOrgMemberRole = member.roleId;
			const isStaff =
				org?.ownerUid === user.uid ||
				["owner", "admin", "coach", "instructor"].includes(member.roleId);

			const isRestrictedChannel =
				convData.isPrivate ||
				convData.channelType === "private" ||
				convData.channelType === "staff";

			if (isRestrictedChannel) {
				// Only staff or explicitly listed participantUids can access restricted channels
				if (isStaff || (convData.participantUids || []).includes(user.uid)) {
					isAuthorized = true;
				}
			} else {
				isAuthorized = true;
			}
		}
	} else if (user.isAdmin) {
		isAuthorized = true;
	}

	if (!isAuthorized) {
		return res.status(403).json({ success: false, error: "You are not authorized to access this conversation" });
	}

	// ─── GET: Fetch Paginated Messages ─────────────────────────────────────────
	if (req.method === "GET") {
		try {
			const pageSize = Math.min(Math.max(parseInt(limitQuery as string, 10) || 40, 1), 100);
			let query = convRef
				.collection("messages")
				.orderBy("createdAt", "desc")
				.limit(pageSize);

			if (before) {
				const beforeTimestamp = parseInt(before as string, 10);
				if (!isNaN(beforeTimestamp)) {
					query = query.startAfter(beforeTimestamp);
				}
			}

			const messagesSnap = await query.get();
			const messages: ChatMessage[] = messagesSnap.docs.map((doc) => ({
				id: doc.id,
				...(doc.data() as Omit<ChatMessage, "id">),
			}));

			// Return chronological order (oldest to newest) for smooth stream rendering
			messages.reverse();

			return res.status(200).json({
				success: true,
				messages,
				hasMore: messagesSnap.docs.length === pageSize,
			});
		} catch (error: any) {
			console.error("[Get Messages Error]:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to load messages" });
		}
	}

	// ─── POST: Send Message ────────────────────────────────────────────────────
	if (req.method === "POST") {
		// 1. Rate limiting check (30 messages per minute)
		const withinRateLimit = await checkRateLimit(user.uid, "chat_send", 30, 60);
		if (!withinRateLimit) {
			return res.status(429).json({ success: false, error: "You are sending messages too quickly. Please slow down." });
		}

		// 2. Direct message block check
		if (convData.type === "direct") {
			const otherUid = (convData.participantUids || []).find((u) => u !== user.uid);
			if (otherUid) {
				const [blockA, blockB] = await Promise.all([
					db.collection("userBlocks").doc(`${user.uid}_${otherUid}`).get(),
					db.collection("userBlocks").doc(`${otherUid}_${user.uid}`).get(),
				]);
				if (blockA.exists || blockB.exists) {
					return res.status(403).json({ success: false, error: "Cannot send message: this conversation is blocked" });
				}
			}
		}

		// 3. Organization announcement channel write permission
		if (convData.type === "organization_channel" && convData.channelType === "announcements") {
			const isStaff = ["owner", "admin", "coach", "instructor"].includes(userOrgMemberRole || "");
			if (!isStaff && !user.isAdmin) {
				return res.status(403).json({
					success: false,
					error: "Only instructors, coaches, and administrators can post in announcements",
				});
			}
		}

		const {
			text = "",
			type = "text",
			code,
			attachments = [],
			replyTo,
			clientMessageId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		} = req.body;

		const trimmedText = (text || "").trim();
		if (!trimmedText && (!attachments || attachments.length === 0) && !code) {
			return res.status(400).json({ success: false, error: "Message content cannot be empty" });
		}

		if (trimmedText.length > 15000) {
			return res.status(400).json({ success: false, error: "Message exceeds maximum length of 15,000 characters" });
		}

		// 4. Idempotency check for duplicate submissions
		const existingSnap = await convRef
			.collection("messages")
			.where("clientMessageId", "==", clientMessageId)
			.limit(1)
			.get();

		if (!existingSnap.empty) {
			const existingDoc = existingSnap.docs[0];
			return res.status(200).json({
				success: true,
				message: { id: existingDoc.id, ...existingDoc.data() },
				isDuplicate: true,
			});
		}

		// 5. Fetch sender profile
		const userDoc = await db.collection("users").doc(user.uid).get();
		const userData = userDoc.data() || {};
		const senderDisplayName = userData.displayName || userData.username || "User";
		const senderUsername = userData.username || "";
		const senderAvatarUrl = userData.avatarUrl || "";

		const now = Date.now();

		// Parse @mentions
		const mentionRegex = /@([a-zA-Z0-9_]{3,20})/g;
		const mentionMatches = [...trimmedText.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());
		const uniqueMentionUsernames = Array.from(new Set(mentionMatches));

		let mentionedUids: string[] = [];
		if (uniqueMentionUsernames.length > 0) {
			const mentionUsersSnap = await db
				.collection("users")
				.where("username", "in", uniqueMentionUsernames.slice(0, 10))
				.get();
			mentionedUids = mentionUsersSnap.docs.map((d) => d.id).filter((id) => id !== user.uid);
		}

		// 6. Construct message
		const messageData: Omit<ChatMessage, "id"> = {
			conversationId,
			senderId: user.uid,
			senderDisplayName,
			senderUsername,
			senderAvatarUrl,
			senderRole: userOrgMemberRole || userData.role || "user",
			type: type || (code ? "code" : attachments.length > 0 ? (attachments[0].category === "images" ? "image" : "file") : "text"),
			text: trimmedText,
			...(code ? { code } : {}),
			...(attachments.length > 0 ? { attachments, hasAttachments: true } : { hasAttachments: false }),
			...(replyTo ? { replyTo } : {}),
			reactions: {},
			clientMessageId,
			createdAt: now,
			mentions: mentionedUids,
		};

		const msgDocRef = await convRef.collection("messages").add(messageData);

		// 7. Preview text for conversation metadata
		let preview = trimmedText.substring(0, 80);
		if (!preview) {
			if (code) preview = `💻 Code: ${code.language || "snippet"}`;
			else if (attachments.length > 0) {
				const cat = attachments[0].category;
				preview = cat === "images" ? "📷 Image" : cat === "audio" ? "🎤 Voice message" : "📎 Attachment";
			}
		}

		// 8. Update conversation lastActivity and sender read pointer
		await convRef.update({
			lastActivityAt: now,
			lastMessagePreview: preview,
			lastMessageSenderId: user.uid,
			lastMessageSenderName: senderDisplayName,
			lastMessageType: messageData.type,
			[`readPointers.${user.uid}`]: now,
			updatedAt: now,
		});

		// 9. Update sender's userConversationMeta lastReadAt
		await db.collection("userConversationMeta").doc(`${user.uid}_${conversationId}`).set(
			{
				uid: user.uid,
				conversationId,
				lastReadAt: now,
				lastReadMessageId: msgDocRef.id,
				updatedAt: now,
			},
			{ merge: true }
		);

		// 10. Asynchronously dispatch notifications
		(async () => {
			try {
				if (convData.type === "direct") {
					const recipientUid = (convData.participantUids || []).find((u) => u !== user.uid);
					if (recipientUid) {
						const recDoc = await db.collection("users").doc(recipientUid).get();
						if (recDoc.exists) {
							const recData = recDoc.data() || {};
							await NotificationDispatcher.dispatch("CHAT_DIRECT_MESSAGE", {
								toUid: recipientUid,
								toEmail: recData.email || "",
								userName: recData.displayName || recData.username || "Coder",
								fromUid: user.uid,
								fromDisplayName: senderDisplayName,
								fromAvatarUrl: senderAvatarUrl,
								placeholders: {
									senderName: senderDisplayName,
									messagePreview: preview,
									chatUrl: `/messages/${conversationId}`,
								},
								metadata: {
									conversationId,
									messageId: msgDocRef.id,
								},
							});
						}
					}
				}

				// Dispatch mentions
				for (const mUid of mentionedUids) {
					const mDoc = await db.collection("users").doc(mUid).get();
					if (mDoc.exists) {
						const mData = mDoc.data() || {};
						await NotificationDispatcher.dispatch("CHAT_MENTION", {
							toUid: mUid,
							toEmail: mData.email || "",
							userName: mData.displayName || mData.username || "Coder",
							fromUid: user.uid,
							fromDisplayName: senderDisplayName,
							fromAvatarUrl: senderAvatarUrl,
							placeholders: {
								senderName: senderDisplayName,
								channelName: convData.title,
								messagePreview: preview,
								chatUrl: `/messages/${conversationId}`,
							},
							metadata: {
								conversationId,
								messageId: msgDocRef.id,
							},
						});
					}
				}
			} catch (notifErr: any) {
				console.warn("[Chat Notification Dispatch Warning]:", notifErr.message);
			}
		})();

		return res.status(201).json({
			success: true,
			message: { id: msgDocRef.id, ...messageData },
		});
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
