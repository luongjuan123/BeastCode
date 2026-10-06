import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { checkOrgPermission, resolveOrgAndMembership } from "@/utils/orgEngine";
import { Conversation, UserConversationMeta } from "@/types/chat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const db = getAdminFirestore();

	// ─── GET: List User's Conversations ─────────────────────────────────────────
	if (req.method === "GET") {
		try {
			// 1. Fetch direct conversations where user is a participant
			const dmQuerySnap = await db
				.collection("conversations")
				.where("participantUids", "array-contains", user.uid)
				.limit(50)
				.get();

			const directConvs: Conversation[] = dmQuerySnap.docs.map((doc) => ({
				id: doc.id,
				...(doc.data() as Omit<Conversation, "id">),
			}));

			// 2. Fetch user's organizations to get org channels
			const memberQuerySnap = await db
				.collection("organizationMembers")
				.where("uid", "==", user.uid)
				.limit(50)
				.get();

			const orgIds = memberQuerySnap.docs
				.map((d) => d.data())
				.filter((d) => d.status === "active")
				.map((d) => d.organizationId)
				.filter(Boolean);

			let orgConvs: Conversation[] = [];
			if (orgIds.length > 0) {
				// Chunk into batches of 10 for Firestore 'in' limitation
				const orgBatches: string[][] = [];
				for (let i = 0; i < orgIds.length; i += 10) {
					orgBatches.push(orgIds.slice(i, i + 10));
				}

				for (const batch of orgBatches) {
					const orgChannelsSnap = await db
						.collection("conversations")
						.where("organizationId", "in", batch)
						.limit(50)
						.get();

					const batchConvs: Conversation[] = orgChannelsSnap.docs
						.map((doc) => ({
							id: doc.id,
							...(doc.data() as Omit<Conversation, "id">),
						}))
						.filter((c) => c.type === "organization_channel");
					orgConvs.push(...batchConvs);
				}
			}

			// Combine and deduplicate
			const allConvsMap = new Map<string, Conversation>();
			[...directConvs, ...orgConvs].forEach((c) => {
				allConvsMap.set(c.id, c);
			});
			const allConvs = Array.from(allConvsMap.values()).sort(
				(a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
			);

			// 3. Fetch user's conversation metadata (lastReadAt, muted, pinned)
			const metaSnap = await db
				.collection("userConversationMeta")
				.where("uid", "==", user.uid)
				.get();

			const metaMap = new Map<string, UserConversationMeta>();
			metaSnap.forEach((d) => {
				const m = d.data() as UserConversationMeta;
				metaMap.set(m.conversationId, m);
			});

			// 4. Augment with unread status and preferences
			const enriched = allConvs.map((conv) => {
				const meta = metaMap.get(conv.id);
				const lastReadAt = meta?.lastReadAt || 0;
				const isUnread =
					(conv.lastActivityAt || 0) > lastReadAt &&
					conv.lastMessageSenderId !== user.uid;

				return {
					...conv,
					isUnread,
					isMuted: !!(meta?.mutedUntil && (meta.mutedUntil === -1 || meta.mutedUntil > Date.now())),
					isPinned: !!meta?.isPinned,
					isArchived: !!meta?.isArchived,
				};
			});

			return res.status(200).json({
				success: true,
				conversations: enriched,
			});
		} catch (error: any) {
			console.error("[Chat List Error]:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to load conversations" });
		}
	}

	// ─── POST: Create or Get Conversation ─────────────────────────────────────────
	if (req.method === "POST") {
		const { type, targetUid, organizationId, title, description, channelType } = req.body;

		// ── DIRECT MESSAGE CREATION / LOOKUP ────────────────────────────────────
		if (type === "direct" || targetUid) {
			if (!targetUid || typeof targetUid !== "string") {
				return res.status(400).json({ success: false, error: "Target user ID is required for direct messaging" });
			}
			if (targetUid === user.uid) {
				return res.status(400).json({ success: false, error: "You cannot start a direct message with yourself" });
			}

			// Check block status in either direction
			const blockCheckA = await db.collection("userBlocks").doc(`${user.uid}_${targetUid}`).get();
			const blockCheckB = await db.collection("userBlocks").doc(`${targetUid}_${user.uid}`).get();
			if (blockCheckA.exists || blockCheckB.exists) {
				return res.status(403).json({ success: false, error: "Direct messaging is unavailable between these users" });
			}

			// Deterministic canonical conversation ID
			const sortedUids = [user.uid, targetUid].sort();
			const convId = `dm_${sortedUids.join("_")}`;
			const convRef = db.collection("conversations").doc(convId);
			const convSnap = await convRef.get();

			if (convSnap.exists) {
				return res.status(200).json({
					success: true,
					conversation: { id: convSnap.id, ...convSnap.data() },
					isExisting: true,
				});
			}

			// Fetch user profiles for participantDetails
			const [userDoc, targetDoc] = await Promise.all([
				db.collection("users").doc(user.uid).get(),
				db.collection("users").doc(targetUid).get(),
			]);

			if (!targetDoc.exists) {
				return res.status(404).json({ success: false, error: "Target user does not exist" });
			}

			const userData = userDoc.data() || {};
			const targetData = targetDoc.data() || {};

			const now = Date.now();
			const newConv: Omit<Conversation, "id"> = {
				type: "direct",
				title: targetData.displayName || targetData.username || "User",
				participantUids: sortedUids,
				participantDetails: {
					[user.uid]: {
						displayName: userData.displayName || userData.username || "User",
						username: userData.username || "",
						avatarUrl: userData.avatarUrl || "",
					},
					[targetUid]: {
						displayName: targetData.displayName || targetData.username || "User",
						username: targetData.username || "",
						avatarUrl: targetData.avatarUrl || "",
					},
				},
				lastActivityAt: now,
				lastMessagePreview: "Started a new conversation",
				lastMessageSenderId: user.uid,
				lastMessageSenderName: userData.displayName || userData.username || "User",
				lastMessageType: "system",
				createdBy: user.uid,
				createdAt: now,
				updatedAt: now,
			};

			await convRef.set(newConv);

			// Initialize read metadata for creator
			await db.collection("userConversationMeta").doc(`${user.uid}_${convId}`).set({
				uid: user.uid,
				conversationId: convId,
				lastReadAt: now,
				updatedAt: now,
			});

			return res.status(201).json({
				success: true,
				conversation: { id: convId, ...newConv },
				isExisting: false,
			});
		}

		// ── ORGANIZATION CHANNEL CREATION ────────────────────────────────────────
		if (type === "organization_channel") {
			if (!organizationId || typeof organizationId !== "string") {
				return res.status(400).json({ success: false, error: "Organization ID is required" });
			}
			if (!title || typeof title !== "string" || !title.trim()) {
				return res.status(400).json({ success: false, error: "Channel title is required" });
			}

			const { org, member, role } = await resolveOrgAndMembership(organizationId, user.uid);
			if (!org) {
				return res.status(404).json({ success: false, error: "Organization not found" });
			}
			if (!member) {
				return res.status(403).json({ success: false, error: "You are not a member of this organization" });
			}

			// Only owner, admin, or coaches can create channels
			const isPrivileged =
				org.ownerUid === user.uid ||
				["owner", "admin", "coach", "instructor"].includes(member.roleId);
			if (!isPrivileged) {
				return res.status(403).json({ success: false, error: "Insufficient permissions to create organization channels" });
			}

			const channelSlug = title
				.toLowerCase()
				.trim()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			const convId = `org_${org.id}_${channelSlug || Date.now()}`;
			const convRef = db.collection("conversations").doc(convId);
			const convSnap = await convRef.get();

			if (convSnap.exists) {
				return res.status(409).json({ success: false, error: "A channel with this name already exists" });
			}

			const now = Date.now();
			const newChannel: Omit<Conversation, "id"> = {
				type: "organization_channel",
				title: title.trim(),
				description: (description || "").trim(),
				organizationId: org.id,
				organizationSlug: org.slug,
				organizationName: org.name,
				organizationAvatar: org.avatarUrl || org.avatar || "",
				channelType: channelType || "general",
				participantUids: [],
				lastActivityAt: now,
				lastMessagePreview: `Channel created by ${user.email}`,
				lastMessageSenderId: user.uid,
				lastMessageSenderName: "System",
				lastMessageType: "system",
				createdBy: user.uid,
				createdAt: now,
				updatedAt: now,
				isAnnouncement: channelType === "announcements",
			};

			await convRef.set(newChannel);

			return res.status(201).json({
				success: true,
				conversation: { id: convId, ...newChannel },
			});
		}

		return res.status(400).json({ success: false, error: "Invalid conversation type" });
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
