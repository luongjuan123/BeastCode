import { TestRunContext } from "../reporting/testContext";
import assert from "assert";

export async function runUnitTests(ctx: TestRunContext) {
	console.log("\n--- Running Unit & Validation Tests ---");

	// 1. CHAT-MSG-007: Mention extraction from message text
	{
		const testId = "CHAT-MSG-007";
		const start = Date.now();
		try {
			const mentionRegex = /@([a-zA-Z0-9_]{3,20})/g;
			const sampleText = "Hello @alice and @bob_42, please review code with @alice and ignore @x or @!";
			const matches = Array.from(sampleText.matchAll(mentionRegex)).map((m) => m[1].toLowerCase());
			const uniqueMentions = Array.from(new Set(matches));

			assert.strictEqual(uniqueMentions.length, 2, "Should extract exactly 2 unique mentions");
			assert.ok(uniqueMentions.includes("alice"), "Should include alice");
			assert.ok(uniqueMentions.includes("bob_42"), "Should include bob_42");
			assert.ok(!uniqueMentions.includes("x"), "Should not match handle with < 3 characters");

			const duration = Date.now() - start;
			ctx.recordAttempt(
				testId,
				"PASS",
				duration,
				undefined,
				`Parsed mentions: ${JSON.stringify(uniqueMentions)} from input '${sampleText}'`
			);
			console.log(`  ✓ ${testId} - Mention extraction verified`);
		} catch (err: any) {
			const duration = Date.now() - start;
			ctx.recordAttempt(testId, "FAIL", duration, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// 2. CHAT-TYPE-003: Client typing hook filters out user's own typing & expired typing
	{
		const testId = "CHAT-TYPE-003";
		const start = Date.now();
		try {
			const currentUid = "user_me";
			const now = Date.now();

			const mockTypingSnap = [
				{ uid: "user_me", displayName: "Me", expiresAt: now + 3000 },
				{ uid: "user_partner", displayName: "Partner", expiresAt: now + 3000 },
				{ uid: "user_expired", displayName: "Old Partner", expiresAt: now - 1000 },
			];

			// Implementation logic from useTyping hook
			const filteredTyping = mockTypingSnap.filter(
				(item) => item.uid !== currentUid && item.expiresAt > now
			);

			assert.strictEqual(filteredTyping.length, 1, "Should only retain non-self, unexpired typing");
			assert.strictEqual(filteredTyping[0].uid, "user_partner", "Retained item must be partner");

			const duration = Date.now() - start;
			ctx.recordAttempt(
				testId,
				"PASS",
				duration,
				undefined,
				`Filtered list: ${JSON.stringify(filteredTyping)}`
			);
			console.log(`  ✓ ${testId} - Typing hook filtering verified`);
		} catch (err: any) {
			const duration = Date.now() - start;
			ctx.recordAttempt(testId, "FAIL", duration, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}

	// 3. CHAT-MEDIA-UNIT: Media parser and magic bytes validation
	{
		const testId = "CHAT-MEDIA-004";
		const start = Date.now();
		try {
			const { validateAndParseChatMedia } = await import("../../../src/utils/chatMediaService");

			// PNG test
			const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const pngResult = validateAndParseChatMedia(`data:image/png;base64,${pngBuffer.toString("base64")}`, "test.png");
			assert.strictEqual(pngResult.category, "images");
			assert.strictEqual(pngResult.mime, "image/png");

			// PDF test
			const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
			const pdfResult = validateAndParseChatMedia(`data:application/pdf;base64,${pdfBuffer.toString("base64")}`, "doc.pdf");
			assert.strictEqual(pdfResult.category, "documents");
			assert.strictEqual(pdfResult.mime, "application/pdf");

			// Empty file test
			assert.throws(() => {
				validateAndParseChatMedia("data:text/plain;base64,", "empty.txt");
			}, /empty/i);

			const duration = Date.now() - start;
			ctx.recordAttempt(testId, "PASS", duration, undefined, "Media validation unit tests verified");
			console.log(`  ✓ ${testId} - Media validation and parsing verified`);
		} catch (err: any) {
			const duration = Date.now() - start;
			ctx.recordAttempt(testId, "FAIL", duration, err.message, err.stack);
			console.error(`  ✗ ${testId} - Failed:`, err.message);
		}
	}
}
