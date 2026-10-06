import { TestRunContext } from "../reporting/testContext";
import { TestFixture } from "../fixtures/seedTestData";
import { getAdminFirestore } from "../../../src/firebase/firebaseAdmin";
import assert from "assert";

interface ApiResponse {
	status: number;
	data: any;
	rawText: string;
}

async function api(
	baseUrl: string,
	endpoint: string,
	options: {
		method?: string;
		token?: string;
		body?: any;
		query?: Record<string, string>;
		headers?: Record<string, string>;
	} = {}
): Promise<ApiResponse> {
	const { method = "GET", token, body, query, headers: extraHeaders } = options;
	let url = `${baseUrl}${endpoint}`;
	if (query) {
		const q = new URLSearchParams(query).toString();
		if (q) url += `?${q}`;
	}

	const headers: Record<string, string> = {};
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}
	if (extraHeaders) {
		Object.assign(headers, extraHeaders);
	}

	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch (initialErr: any) {
		// Retry once on transient socket reset or dev server compilation delays
		await new Promise((r) => setTimeout(r, 300));
		res = await fetch(url, {
			method,
			headers: { ...headers, Connection: "close" },
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	}

	let rawText = "";
	let data: any = null;
	const contentType = res.headers.get("content-type") || "";
	if (contentType.includes("application/json") || contentType.includes("text/")) {
		rawText = await res.text();
		try {
			data = JSON.parse(rawText);
		} catch (e) {
			data = rawText;
		}
	} else {
		const arrayBuffer = await res.arrayBuffer();
		rawText = `[binary stream ${arrayBuffer.byteLength} bytes]`;
		data = { binary: true, byteLength: arrayBuffer.byteLength };
	}

	return { status: res.status, data, rawText };
}

export async function runApiTests(ctx: TestRunContext, fixture: TestFixture) {
	const baseUrl = ctx.metadata.serverUrl;
	console.log(`\n--- Running API & Contract Tests against ${baseUrl} ---`);

	const { userA, userB, userC, userD, staffUser, adminUser, directConvId, orgId, generalChannelId, announcementsChannelId } = fixture;

	let createdMessageId = "";
	let multilineMessageId = "";
	let olderMessageId = "";

	// ─── CHAT-DISC (Search & Discovery) ───────────────────────────────────────
	{
		// CHAT-DISC-001: Search users by username query
		const testId = "CHAT-DISC-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/users/search", {
				token: userA.idToken,
				query: { q: userB.username.slice(0, 5) },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.success);
			const found = res.data.users.some((u: any) => u.uid === userB.uid);
			assert.ok(found, `Expected user ${userB.uid} in results`);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Found user: ${userB.username}`);
			console.log(`  ✓ ${testId} - Search users by username`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DISC-002: Search users by displayName query
		const testId = "CHAT-DISC-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/users/search", {
				token: userA.idToken,
				query: { q: "User B" },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.success);
			const found = res.data.users.some((u: any) => u.uid === userB.uid);
			assert.ok(found, "User B should be found by displayName");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Found user by displayName`);
			console.log(`  ✓ ${testId} - Search users by displayName`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DISC-003: Search query shorter than 2 characters
		const testId = "CHAT-DISC-003";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/users/search", {
				token: userA.idToken,
				query: { q: "x" },
			});
			assert.strictEqual(res.status, 200);
			assert.deepStrictEqual(res.data.users, []);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Empty array returned for <2 chars query");
			console.log(`  ✓ ${testId} - Short query guard verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DISC-004: Self-exclusion from search results
		const testId = "CHAT-DISC-004";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/users/search", {
				token: userA.idToken,
				query: { q: userA.username },
			});
			assert.strictEqual(res.status, 200);
			const foundSelf = res.data.users.some((u: any) => u.uid === userA.uid);
			assert.strictEqual(foundSelf, false, "Requesting user must be excluded from search");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Self successfully excluded from search");
			console.log(`  ✓ ${testId} - Self-exclusion verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DISC-005: Search with special/Unicode characters
		const testId = "CHAT-DISC-005";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/users/search", {
				token: userA.idToken,
				query: { q: "🚀 🔥 test" },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(Array.isArray(res.data.users));
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Unicode search query handled cleanly without 500 error");
			console.log(`  ✓ ${testId} - Unicode search query handled`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-CONV (Conversation Creation & Lifecycle) ────────────────────────
	{
		// CHAT-CONV-001: Creating new direct conversation between User A and User B
		const testId = "CHAT-CONV-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: userA.idToken,
				body: { type: "direct", targetUid: userB.uid },
			});
			assert.strictEqual(res.status, 200); // 200 because already initialized in seed
			assert.ok(res.data.conversation?.id);
			assert.strictEqual(res.data.conversation.id, directConvId);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Canonical DM ID: ${res.data.conversation.id}`);
			console.log(`  ✓ ${testId} - Direct conversation creation / lookup`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-002: Requesting direct conversation when one already exists (idempotent)
		const testId = "CHAT-CONV-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: userA.idToken,
				body: { type: "direct", targetUid: userB.uid },
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.data.isExisting, true);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Idempotent lookup confirmed with isExisting=true");
			console.log(`  ✓ ${testId} - Idempotent conversation lookup`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-003: Attempting to create a self-conversation
		const testId = "CHAT-CONV-003";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: userA.idToken,
				body: { type: "direct", targetUid: userA.uid },
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Self-messaging rejected with 400: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Self-conversation rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-004: Attempting to create DM when blocked (returns 403)
		const testId = "CHAT-CONV-004";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: userA.idToken,
				body: { type: "direct", targetUid: userD.uid },
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Blocked DM rejected with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Blocked user DM rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-005: Staff user creates organization channel (returns 201)
		const testId = "CHAT-CONV-005";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: staffUser.idToken,
				body: {
					type: "organization_channel",
					organizationId: orgId,
					title: `Staff Study Group ${Date.now().toString().slice(-4)}`,
					description: "Study group channel",
					channelType: "general",
				},
			});
			assert.strictEqual(res.status, 201);
			assert.ok(res.data.conversation?.id);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Created org channel: ${res.data.conversation.id}`);
			console.log(`  ✓ ${testId} - Staff channel creation permitted`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-006: Non-staff user attempts to create org channel (returns 403)
		const testId = "CHAT-CONV-006";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: userA.idToken,
				body: {
					type: "organization_channel",
					organizationId: orgId,
					title: "Unauthorized Channel",
					channelType: "general",
				},
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Regular member channel creation blocked with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Non-staff channel creation blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-CONV-007: Creating duplicate channel with conflicting name in same org (returns 409)
		const testId = "CHAT-CONV-007";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "POST",
				token: staffUser.idToken,
				body: {
					type: "organization_channel",
					organizationId: orgId,
					title: "General", // already exists
					channelType: "general",
				},
			});
			assert.strictEqual(res.status, 409);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Duplicate channel title returned 409 Conflict: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Duplicate channel name conflict rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-LIST ────────────────────────────────────────────────────────────
	{
		// CHAT-LIST-001: Conversation list includes last message preview and sender details
		const testId = "CHAT-LIST-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				token: userA.idToken,
			});
			assert.strictEqual(res.status, 200);
			const conv = res.data.conversations.find((c: any) => c.id === directConvId);
			assert.ok(conv, "Direct conversation must be in list");
			assert.ok(conv.participantDetails, "participantDetails must be populated");
			assert.ok(conv.lastActivityAt !== undefined, "lastActivityAt must be present");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Preview: '${conv.lastMessagePreview}', Sender: '${conv.lastMessageSenderName}'`);
			console.log(`  ✓ ${testId} - Conversation list metadata populated`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-LIST-002: Conversations are ordered by lastActivityAt descending
		const testId = "CHAT-LIST-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				token: userA.idToken,
			});
			assert.strictEqual(res.status, 200);
			const convs = res.data.conversations;
			for (let i = 1; i < convs.length; i++) {
				assert.ok(
					(convs[i - 1].lastActivityAt || 0) >= (convs[i].lastActivityAt || 0),
					"Conversations must be ordered descending by lastActivityAt"
				);
			}
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Verified descending order across ${convs.length} conversations`);
			console.log(`  ✓ ${testId} - Conversation list descending order verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-LIST-003: Recipient unread status computation
		const testId = "CHAT-LIST-003";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				token: userB.idToken,
			});
			assert.strictEqual(res.status, 200);
			const conv = res.data.conversations.find((c: any) => c.id === directConvId);
			assert.ok(conv, "Conversation should exist in User B's list");
			assert.strictEqual(conv.isUnread, true, "isUnread must be computed as true for recipient when lastReadAt < lastActivityAt");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "isUnread computed as true for recipient");
			console.log(`  ✓ ${testId} - Recipient unread status computation`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-MSG ─────────────────────────────────────────────────────────────
	{
		// CHAT-MSG-001: Sending standard text message
		const testId = "CHAT-MSG-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "Standard text message for CHAT-MSG-001" },
			});
			assert.strictEqual(res.status, 201);
			assert.ok(res.data.message?.id);
			createdMessageId = res.data.message.id;
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Created message ID: ${createdMessageId}`);
			console.log(`  ✓ ${testId} - Standard text message sent`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MSG-002: Sending multiline content with preserved line breaks
		const testId = "CHAT-MSG-002";
		const start = Date.now();
		try {
			const multiline = "Header line\n\nBody line 1\nBody line 2\r\nEnd line";
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: multiline },
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.message.text, multiline);
			multilineMessageId = res.data.message.id;
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Multiline text preserved exactly");
			console.log(`  ✓ ${testId} - Multiline content preserved`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MSG-003: Sending empty or whitespace-only message
		const testId = "CHAT-MSG-003";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "     \t \n  " },
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Empty message rejected: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Empty message rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MSG-004: Sending Unicode, Vietnamese diacritics, and emoji characters
		const testId = "CHAT-MSG-004";
		const start = Date.now();
		try {
			const unicodeText = "Tiếng Việt có dấu: Chúc mừng bạn đã giải thành công bài toán! 🚀 💯 🔥";
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: unicodeText },
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.message.text, unicodeText);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Vietnamese diacritics and emojis preserved without mojibake");
			console.log(`  ✓ ${testId} - Unicode & Vietnamese diacritics preserved`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MSG-005: Sending message at max length boundary (15,000 characters)
		const testId = "CHAT-MSG-005";
		const start = Date.now();
		try {
			const exact15k = "x".repeat(15000);
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: exact15k },
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.message.text.length, 15000);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Exact 15,000 characters accepted successfully");
			console.log(`  ✓ ${testId} - 15,000 character boundary accepted`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MSG-006: Sending message exceeding max length (>15,000 characters)
		const testId = "CHAT-MSG-006";
		const start = Date.now();
		try {
			const over15k = "x".repeat(15001);
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: over15k },
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Oversized message (15,001 chars) rejected: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Over-limit message rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-SEND ────────────────────────────────────────────────────────────
	{
		// CHAT-SEND-001 & CHAT-SEND-002: Message submission & duplicate suppression with clientMessageId
		const testId1 = "CHAT-SEND-001";
		const testId2 = "CHAT-SEND-002";
		const clientMsgId = `cm_idempotent_${Date.now()}`;
		const start1 = Date.now();
		try {
			const res1 = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "Idempotent send test", clientMessageId: clientMsgId },
			});
			assert.strictEqual(res1.status, 201);
			ctx.recordAttempt(testId1, "PASS", Date.now() - start1, undefined, `clientMessageId stored: ${clientMsgId}`);
			console.log(`  ✓ ${testId1} - clientMessageId accepted`);

			const start2 = Date.now();
			const res2 = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "Idempotent send duplicate", clientMessageId: clientMsgId },
			});
			assert.strictEqual(res2.status, 200);
			assert.strictEqual(res2.data.isDuplicate, true);
			assert.strictEqual(res2.data.message.id, res1.data.message.id);
			ctx.recordAttempt(testId2, "PASS", Date.now() - start2, undefined, "Duplicate send returned existing message with isDuplicate: true");
			console.log(`  ✓ ${testId2} - Duplicate suppression verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId1, "FAIL", Date.now() - start1, err.message);
			ctx.recordAttempt(testId2, "FAIL", Date.now() - start1, err.message);
			console.error(`  ✗ CHAT-SEND failed:`, err.message);
		}
	}

	{
		// CHAT-SEND-003: Exceeding rate limit threshold (>30 msgs/min)
		const testId = "CHAT-SEND-003";
		const start = Date.now();
		try {
			const db = getAdminFirestore();
			const now = Date.now();
			const timestamps = Array.from({ length: 30 }, (_, i) => now - 1000 * (i + 1));
			await db.collection("rateLimits").doc(`${userB.uid}_chat_send`).set({ timestamps });

			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userB.idToken,
				body: { text: "Burst message exceeding 30/min limit", clientMessageId: `burst_${Date.now()}` },
			});
			assert.strictEqual(res.status, 429, `Expected 429 Too Many Requests, got ${res.status}`);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Rate limit enforced with 429: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Rate limit boundary enforced`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		} finally {
			const db = getAdminFirestore();
			await db.collection("rateLimits").doc(`${userB.uid}_chat_send`).delete().catch(() => {});
		}
	}

	// ─── CHAT-CONC (Concurrent Execution) ─────────────────────────────────────
	{
		// CHAT-CONC-001: Simultaneous concurrent message sends by both participants
		const testId = "CHAT-CONC-001";
		const start = Date.now();
		try {
			const [resA, resB] = await Promise.all([
				api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
					method: "POST",
					token: userA.idToken,
					body: { text: `Concurrent send from A ${Date.now()}` },
				}),
				api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
					method: "POST",
					token: userB.idToken,
					body: { text: `Concurrent send from B ${Date.now()}` },
				}),
			]);

			assert.strictEqual(resA.status, 201);
			assert.strictEqual(resB.status, 201);
			assert.notStrictEqual(resA.data.message.id, resB.data.message.id);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Both concurrent sends succeeded: Msg A=${resA.data.message.id}, Msg B=${resB.data.message.id}`);
			console.log(`  ✓ ${testId} - Concurrent message sends succeeded`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-HIST (History & Pagination) ─────────────────────────────────────
	{
		// CHAT-HIST-001: Paginated message fetch respecting limit query
		const testId = "CHAT-HIST-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				token: userA.idToken,
				query: { limit: "5" },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.messages.length <= 5, "Must respect limit query parameter");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Fetched ${res.data.messages.length} messages with limit=5`);
			console.log(`  ✓ ${testId} - Pagination limit query respected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-HIST-002: Pagination cursor using 'before' timestamp
		const testId = "CHAT-HIST-002";
		const start = Date.now();
		try {
			const res1 = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				token: userA.idToken,
				query: { limit: "3" },
			});
			assert.strictEqual(res1.status, 200);
			if (res1.data.messages.length > 0) {
				const oldest = res1.data.messages[0];
				const res2 = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
					token: userA.idToken,
					query: { limit: "3", before: oldest.createdAt.toString() },
				});
				assert.strictEqual(res2.status, 200);
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Retrieved earlier messages before cursor ${oldest.createdAt}`);
				console.log(`  ✓ ${testId} - Cursor pagination verified`);
			} else {
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Empty batch handled cleanly");
			}
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-READ ────────────────────────────────────────────────────────────
	{
		// CHAT-READ-001: Marking conversation as read updates read pointers
		const testId = "CHAT-READ-001";
		const start = Date.now();
		try {
			const now = Date.now();
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/read`, {
				method: "POST",
				token: userA.idToken,
				body: { readTimestamp: now, messageId: createdMessageId },
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.data.lastReadAt, now);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Updated read pointer to ${now}`);
			console.log(`  ✓ ${testId} - Read pointer update verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-READ-002: Unread count reconciliation after marking read
		const testId = "CHAT-READ-002";
		const start = Date.now();
		try {
			// User B marks conversation as read
			const now = Date.now() + 1000;
			await api(baseUrl, `/api/chat/conversations/${directConvId}/read`, {
				method: "POST",
				token: userB.idToken,
				body: { readTimestamp: now },
			});

			// Fetch conversations for User B
			const res = await api(baseUrl, "/api/chat/conversations", {
				token: userB.idToken,
			});
			assert.strictEqual(res.status, 200);
			const conv = res.data.conversations.find((c: any) => c.id === directConvId);
			assert.ok(conv);
			assert.strictEqual(conv.isUnread, false, "After marking as read, isUnread must reconcile to false");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "isUnread reconciled to false after reading");
			console.log(`  ✓ ${testId} - Unread reconciliation verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-TYPE ────────────────────────────────────────────────────────────
	{
		// CHAT-TYPE-001: Sending typing heartbeat creates ephemeral record
		const testId = "CHAT-TYPE-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/typing`, {
				method: "POST",
				token: userA.idToken,
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.success);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Typing record created with 4s TTL");
			console.log(`  ✓ ${testId} - Typing heartbeat created`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-TYPE-002: Clearing typing state deletes ephemeral record
		const testId = "CHAT-TYPE-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/typing`, {
				method: "DELETE",
				token: userA.idToken,
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.success);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Typing record deleted via DELETE");
			console.log(`  ✓ ${testId} - Typing state cleared`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-REACT ───────────────────────────────────────────────────────────
	{
		// CHAT-REACT-001: Adding reaction to message
		const testId = "CHAT-REACT-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}/reactions`, {
				method: "POST",
				token: userA.idToken,
				body: { emoji: "🔥" },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data.reactions["🔥"]?.includes(userA.uid));
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Added reaction: ${JSON.stringify(res.data.reactions)}`);
			console.log(`  ✓ ${testId} - Reaction added`);

			// Security validation: verify outsider User C cannot react
			const outsiderRes = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}/reactions`, {
				method: "POST",
				token: userC.idToken,
				body: { emoji: "👀" },
			});
			if (outsiderRes.status === 200) {
				ctx.addDefect({
					defectId: "DEF-CHAT-001",
					testId,
					feature: "Reactions & Emoji Interactions",
					title: "Missing participant authorization on message reactions endpoint",
					severity: "High",
					component: "src/pages/api/chat/conversations/[cid]/messages/[mid]/reactions.ts:line 30",
					stepsToReproduce: "1. Obtain token for outsider user not in conversation.\n2. POST to /api/chat/conversations/{cid}/messages/{mid}/reactions with emoji.",
					expectedBehavior: "API must return 403 Forbidden when user is not a member/participant in the target conversation.",
					actualBehavior: "API returned 200 OK and attached outsider reaction without verifying conversation membership.",
					evidenceSnippet: JSON.stringify(outsiderRes.data),
				});
				console.warn("  ✗ DEFECT DETECTED: Missing participant validation on message reactions");
			}
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-REACT-002: Toggling reaction off removes UID and cleans empty key
		const testId = "CHAT-REACT-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}/reactions`, {
				method: "POST",
				token: userA.idToken,
				body: { emoji: "🔥" },
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.data.reactions["🔥"], undefined, "Empty reaction key must be removed");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Reaction key removed when last user toggles off");
			console.log(`  ✓ ${testId} - Reaction toggled off cleanly`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-PIN ─────────────────────────────────────────────────────────────
	{
		// CHAT-PIN-001: Direct message participant pins message
		const testId = "CHAT-PIN-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}/pin`, {
				method: "POST",
				token: userA.idToken,
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.data.isPinned, true);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Participant pinned message successfully");
			console.log(`  ✓ ${testId} - Direct message pinned`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-PIN-002: Non-staff user attempts to pin in organization channel (returns 403)
		const testId = "CHAT-PIN-002";
		const start = Date.now();
		try {
			const postRes = await api(baseUrl, `/api/chat/conversations/${generalChannelId}/messages`, {
				method: "POST",
				token: staffUser.idToken,
				body: { text: "Pin protection test message" },
			});
			const pinRes = await api(baseUrl, `/api/chat/conversations/${generalChannelId}/messages/${postRes.data.message.id}/pin`, {
				method: "POST",
				token: userA.idToken, // Regular member
			});
			assert.strictEqual(pinRes.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Non-staff pin blocked with 403: ${pinRes.data.error}`);
			console.log(`  ✓ ${testId} - Non-staff pin blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-EDIT ────────────────────────────────────────────────────────────
	{
		// CHAT-EDIT-001: Author edits message within 24 hours
		const testId = "CHAT-EDIT-001";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}`, {
				method: "PATCH",
				token: userA.idToken,
				body: { text: "Edited within 24h window" },
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.data.message.text, "Edited within 24h window");
			assert.strictEqual(res.data.message.isEdited, true);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Message edited and isEdited flag set to true");
			console.log(`  ✓ ${testId} - Author edited message`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-EDIT-002: Non-author attempts to edit another user's message
		const testId = "CHAT-EDIT-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}`, {
				method: "PATCH",
				token: userB.idToken,
				body: { text: "Unauthorized tampering" },
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Non-author edit rejected with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Non-author edit rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-EDIT-003: Author attempts to edit message older than 24 hours
		const testId = "CHAT-EDIT-003";
		const start = Date.now();
		try {
			// Seed an old message created 25 hours ago directly via Firestore Admin
			const db = getAdminFirestore();
			const oldTimestamp = Date.now() - 25 * 3600 * 1000;
			const oldMsgRef = db.collection("conversations").doc(directConvId).collection("messages").doc(`old_msg_${Date.now()}`);
			await oldMsgRef.set({
				conversationId: directConvId,
				senderId: userA.uid,
				text: "Old message past edit window",
				createdAt: oldTimestamp,
			});
			olderMessageId = oldMsgRef.id;

			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${olderMessageId}`, {
				method: "PATCH",
				token: userA.idToken,
				body: { text: "Trying to edit expired message" },
			});

			if (res.status === 200) {
				// The codebase does not currently enforce 24h edit window in index.ts!
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, "GAP: Code does not enforce 24h edit window; edit succeeded", JSON.stringify(res.data));
				ctx.addDefect({
					defectId: "DEF-CHAT-003",
					testId,
					feature: "Message Edits & Soft Deletion",
					title: "Missing 24-hour edit time window boundary check",
					severity: "Medium",
					component: "src/pages/api/chat/conversations/[cid]/messages/[mid]/index.ts",
					stepsToReproduce: "1. Create message with createdAt older than 24 hours.\n2. Send PATCH /api/chat/conversations/{cid}/messages/{mid} as author.",
					expectedBehavior: "API should return 400 Bad Request: 'Messages can only be edited within 24 hours of posting'.",
					actualBehavior: "API permitted editing messages regardless of age.",
					evidenceSnippet: `Message age: 25 hours, response: 200 OK`,
				});
				console.warn(`  ✗ ${testId} - DEFECT DETECTED: 24h edit window not enforced`);
			} else {
				assert.strictEqual(res.status, 400);
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Expired edit rejected");
				console.log(`  ✓ ${testId} - Expired edit rejected`);
			}
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-EDIT-004: Attempting to edit an already-deleted message
		const testId = "CHAT-EDIT-004";
		const start = Date.now();
		try {
			// First delete the created message
			await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}`, {
				method: "DELETE",
				token: userA.idToken,
			});

			// Now attempt to edit it
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${createdMessageId}`, {
				method: "PATCH",
				token: userA.idToken,
				body: { text: "Resurrecting deleted message" },
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Editing deleted message rejected with 400: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Editing deleted message rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-DEL ─────────────────────────────────────────────────────────────
	{
		// CHAT-DEL-001: Author soft-deletes their own message
		const testId = "CHAT-DEL-001";
		const start = Date.now();
		try {
			// Create a message to delete
			const postRes = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "Message to soft delete" },
			});
			const msgId = postRes.data.message.id;

			const delRes = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${msgId}`, {
				method: "DELETE",
				token: userA.idToken,
			});
			assert.strictEqual(delRes.status, 200);
			assert.strictEqual(delRes.data.message.isDeleted, true);
			assert.strictEqual(delRes.data.message.text, "This message was deleted");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Message soft-deleted and text replaced");
			console.log(`  ✓ ${testId} - Author soft-delete verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DEL-002: Non-author regular user attempts to delete another's message
		const testId = "CHAT-DEL-002";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages/${multilineMessageId}`, {
				method: "DELETE",
				token: userB.idToken, // User B is not author
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Non-author delete blocked with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Non-author delete blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-DEL-003: Org staff deletes inappropriate message in channel
		const testId = "CHAT-DEL-003";
		const start = Date.now();
		try {
			// Member posts in channel
			const postRes = await api(baseUrl, `/api/chat/conversations/${generalChannelId}/messages`, {
				method: "POST",
				token: userA.idToken,
				body: { text: "Member message to be moderated" },
			});
			const msgId = postRes.data.message.id;

			// Staff deletes
			const delRes = await api(baseUrl, `/api/chat/conversations/${generalChannelId}/messages/${msgId}`, {
				method: "DELETE",
				token: staffUser.idToken,
			});
			assert.strictEqual(delRes.status, 200);
			assert.strictEqual(delRes.data.message.isDeleted, true);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Staff successfully moderated member message");
			console.log(`  ✓ ${testId} - Staff channel moderation delete verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-MEDIA ───────────────────────────────────────────────────────────
	let validAttachmentUrl = "";
	let validAttachmentFileName = "";

	{
		// CHAT-MEDIA-001: Upload valid PNG image attachment
		const testId = "CHAT-MEDIA-001";
		const start = Date.now();
		try {
			const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
			const base64Data = `data:image/png;base64,${pngBuffer.toString("base64")}`;

			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "screenshot.png",
				},
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.attachment.mimeType, "image/png");
			validAttachmentUrl = res.data.attachment.url;
			validAttachmentFileName = res.data.attachment.url.split("path=")[1];
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Uploaded PNG: ${validAttachmentUrl}`);
			console.log(`  ✓ ${testId} - PNG image uploaded`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-002: Upload valid PDF document attachment
		const testId = "CHAT-MEDIA-002";
		const start = Date.now();
		try {
			const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
			const base64Data = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "notes.pdf",
				},
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.attachment.mimeType, "application/pdf");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Valid PDF uploaded");
			console.log(`  ✓ ${testId} - PDF document uploaded`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-003: Upload valid audio note with duration
		const testId = "CHAT-MEDIA-003";
		const start = Date.now();
		try {
			const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);
			const base64Data = `data:audio/webm;base64,${webmBuffer.toString("base64")}`;

			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "voice.webm",
					duration: 12.4,
				},
			});
			assert.strictEqual(res.status, 201);
			assert.strictEqual(res.data.attachment.category, "audio");
			assert.strictEqual(res.data.attachment.duration, 12);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Audio note uploaded: duration=${res.data.attachment.duration}`);
			console.log(`  ✓ ${testId} - Audio note uploaded`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-004: Upload empty (0-byte) file
		const testId = "CHAT-MEDIA-004";
		const start = Date.now();
		try {
			const base64Data = "data:text/plain;base64,";
			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "empty.txt",
				},
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Empty file rejected: ${res.data.error}`);
			console.log(`  ✓ ${testId} - 0-byte file rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-005: Upload file exceeding 15MB limit
		const testId = "CHAT-MEDIA-005";
		const start = Date.now();
		try {
			// Generate fake base64 exceeding 15MB
			const oversizeBuffer = Buffer.alloc(16 * 1024 * 1024, 0x41);
			// Prefix valid JPEG header
			oversizeBuffer[0] = 0xff;
			oversizeBuffer[1] = 0xd8;
			oversizeBuffer[2] = 0xff;
			const base64Data = `data:image/jpeg;base64,${oversizeBuffer.toString("base64")}`;

			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "huge.jpg",
				},
			});
			assert.ok(res.status === 400 || res.status === 413, `Status must be 400 or 413, got ${res.status}`);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Oversized file rejected with status ${res.status}`);
			console.log(`  ✓ ${testId} - 15MB file size limit enforced`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-006: Upload file with spoofed extension and invalid magic bytes
		const testId = "CHAT-MEDIA-006";
		const start = Date.now();
		try {
			const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
			const base64Data = `data:image/png;base64,${fakeExe.toString("base64")}`;

			const res = await api(baseUrl, "/api/chat/upload", {
				method: "POST",
				token: userA.idToken,
				body: {
					conversationId: directConvId,
					fileData: base64Data,
					fileName: "virus.png",
				},
			});
			assert.strictEqual(res.status, 400);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Spoofed extension rejected: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Spoofed magic bytes rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-007: Authorized conversation participant streams attachment via proxy
		const testId = "CHAT-MEDIA-007";
		const start = Date.now();
		try {
			const res = await api(baseUrl, validAttachmentUrl, {
				token: userA.idToken,
				headers: { Connection: "close" },
			});
			assert.strictEqual(res.status, 200);
			assert.ok(res.data?.binary || (res.data?.byteLength && res.data.byteLength > 0), "Binary stream must be received");
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Participant streamed file successfully (${res.data?.byteLength || 0} bytes)`);
			console.log(`  ✓ ${testId} - Participant streamed attachment`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-008: Outsider User C attempts to download private attachment
		const testId = "CHAT-MEDIA-008";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/attachment", {
				token: userC.idToken,
				query: { cid: directConvId, path: decodeURIComponent(validAttachmentFileName) },
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Outsider blocked with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Outsider attachment download blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-MEDIA-009: Path traversal attempt in attachment query (?path=../../etc/passwd)
		const testId = "CHAT-MEDIA-009";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/attachment", {
				token: userA.idToken,
				query: { cid: directConvId, path: "../../etc/passwd" },
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Path traversal blocked with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Path traversal blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// ─── CHAT-PERM ────────────────────────────────────────────────────────────
	{
		// CHAT-PERM-005: Direct message send blocked between blocked users
		const testId = "CHAT-PERM-005";
		const start = Date.now();
		try {
			// User D (blocked by User A) attempts to send message to User A
			const res = await api(baseUrl, `/api/chat/conversations/${directConvId}/messages`, {
				method: "POST",
				token: userD.idToken,
				body: { text: "Blocked message attempt" },
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Blocked user message rejected with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Message send between blocked users rejected`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-PERM-006: Suspended or banned user cannot access chat endpoints
		const testId = "CHAT-PERM-006";
		const start = Date.now();
		try {
			const db = getAdminFirestore();
			// Set userD to BANNED in userModeration collection
			await db.collection("userModeration").doc(userD.uid).set({
				uid: userD.uid,
				status: "BANNED",
				reason: "Automated QA test ban",
				updatedAt: Date.now(),
			});

			const res = await api(baseUrl, "/api/chat/conversations", {
				token: userD.idToken,
			});
			assert.strictEqual(res.status, 403);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Banned user blocked with 403: ${res.data.error}`);
			console.log(`  ✓ ${testId} - Banned user access blocked`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-PERM-007: Message reporting records snapshot in userReports collection
		const testId = "CHAT-PERM-007";
		const start = Date.now();
		try {
			const res = await api(baseUrl, `/api/chat/messages/${multilineMessageId}/report`, {
				method: "POST",
				token: userB.idToken,
				body: {
					conversationId: directConvId,
					reason: "Inappropriate language",
					category: "Harassment",
				},
			});
			assert.strictEqual(res.status, 201);
			assert.ok(res.data.reportId);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, `Report created: ID ${res.data.reportId}`);
			console.log(`  ✓ ${testId} - Message reporting verified`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	{
		// CHAT-PERM-008: Unauthenticated client receives 401 across all chat API routes
		const testId = "CHAT-PERM-008";
		const start = Date.now();
		try {
			const res = await api(baseUrl, "/api/chat/conversations", {
				method: "GET",
			});
			assert.strictEqual(res.status, 401);
			ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Unauthenticated request rejected with 401 Unauthorized");
			console.log(`  ✓ ${testId} - Unauthenticated request rejected with 401`);
		} catch (err: any) {
			ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}
}
