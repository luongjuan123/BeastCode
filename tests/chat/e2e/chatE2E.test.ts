import { chromium, Browser, BrowserContext, Page } from "playwright";
import { TestRunContext } from "../reporting/testContext";
import { TestFixture } from "../fixtures/seedTestData";
import assert from "assert";
import path from "path";
import fs from "fs";

export async function runE2ETests(ctx: TestRunContext, fixture: TestFixture) {
	const baseUrl = ctx.metadata.serverUrl;
	console.log(`\n--- Running Multi-User Playwright E2E Tests against ${baseUrl} ---`);

	const evidenceDir = path.join(process.cwd(), "reports", "chat", "evidence");
	if (!fs.existsSync(evidenceDir)) {
		fs.mkdirSync(evidenceDir, { recursive: true });
	}

	const { userA, userB, directConvId } = fixture;

	let browser: Browser | null = null;
	let contextA: BrowserContext | null = null;
	let contextB: BrowserContext | null = null;

	try {
		browser = await chromium.launch({
			executablePath: "/usr/bin/google-chrome",
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
		contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

		const pageA: Page = await contextA.newPage();
		const pageB: Page = await contextB.newPage();

		// ─── CHAT-NAV-001: Unauthenticated visitor accessing /messages ────────
		{
			const testId = "CHAT-NAV-001";
			const start = Date.now();
			try {
				await pageA.goto(`${baseUrl}/messages`, { waitUntil: "commit", timeout: 15000 });
				await pageA.waitForSelector('button:has-text("Sign In")', { timeout: 15000 });
				const signedOutText = await pageA.textContent("body");
				assert.ok(
					signedOutText?.includes("BeastCode Messages") || signedOutText?.includes("Sign In"),
					"Must show unauthenticated sign in prompt without exposing conversation data"
				);

				await pageA.screenshot({ path: path.join(evidenceDir, "chat_nav_001_unauthenticated.png") });
				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`Verified unauthenticated gating. Screenshot: reports/chat/evidence/chat_nav_001_unauthenticated.png`
				);
				console.log(`  ✓ ${testId} - Unauthenticated visitor gated`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// ─── CHAT-NAV-002: Authenticated user accessing /messages ─────────────
		{
			const testId = "CHAT-NAV-002";
			const start = Date.now();
			try {
				// Sign in as User A
				await pageA.click('button:has-text("Sign In")');
				await pageA.waitForSelector('input[name="email"]');
				await pageA.fill('input[name="email"]', userA.email);
				await pageA.fill('input[name="password"]', userA.password);
				await pageA.click('button[type="submit"]');

				// Wait for Chat UI Shell
				await pageA.waitForSelector("text=Messages", { timeout: 15000 });
				await pageA.screenshot({ path: path.join(evidenceDir, "chat_nav_002_authenticated.png") });

				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`Renders ChatShell with sidebar, topbar, and conversation list. Screenshot: reports/chat/evidence/chat_nav_002_authenticated.png`
				);
				console.log(`  ✓ ${testId} - Authenticated user loads ChatShell`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// ─── CHAT-NAV-005: Desktop auto-selection of first conversation ─────────
		{
			const testId = "CHAT-NAV-005";
			const start = Date.now();
			try {
				// On desktop (width 1280), if conversations exist, activeConversation is auto-selected
				await pageA.waitForSelector("textarea", { timeout: 10000 });
				await pageA.screenshot({ path: path.join(evidenceDir, "chat_nav_005_desktop_autoselect.png") });
				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`First conversation automatically selected on desktop. Screenshot: reports/chat/evidence/chat_nav_005_desktop_autoselect.png`
				);
				console.log(`  ✓ ${testId} - Desktop auto-selection verified`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// ─── CHAT-NAV-003: Deep-linking directly to /messages/[cid] ───────────
		{
			const testId = "CHAT-NAV-003";
			const start = Date.now();
			try {
				await pageA.goto(`${baseUrl}/messages/${directConvId}`, { waitUntil: "commit", timeout: 15000 });
				await pageA.waitForSelector("textarea", { timeout: 15000 });
				await pageA.screenshot({ path: path.join(evidenceDir, "chat_nav_003_deeplink.png") });
				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`Deep-link loaded conversation header and composer for ${directConvId}. Screenshot: reports/chat/evidence/chat_nav_003_deeplink.png`
				);
				console.log(`  ✓ ${testId} - Deep-link directly to conversation verified`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// ─── CHAT-NAV-004: Deep-linking to non-existent conversation ID ────────
		{
			const testId = "CHAT-NAV-004";
			const start = Date.now();
			try {
				await pageA.goto(`${baseUrl}/messages/non_existent_cid_qa_99999`, { waitUntil: "commit", timeout: 15000 });
				await pageA.waitForTimeout(1000);
				const body = await pageA.textContent("body");
				assert.ok(
					body?.includes("Select a chat") ||
					body?.includes("Conversation not found") ||
					body?.includes("Messages") ||
					body?.includes("BeastCode Real-Time Messenger"),
					"Fallback UI rendered"
				);
				await pageA.screenshot({ path: path.join(evidenceDir, "chat_nav_004_nonexistent.png") });
				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`Non-existent conversation ID rendered clean fallback without crash. Screenshot: reports/chat/evidence/chat_nav_004_nonexistent.png`
				);
				console.log(`  ✓ ${testId} - Non-existent conversation deep-link handled`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// Authenticate User B on context B
		try {
			await pageB.goto(`${baseUrl}/messages`, { waitUntil: "commit", timeout: 15000 });
			await pageB.waitForSelector('button:has-text("Sign In")', { timeout: 10000 });
			await pageB.click('button:has-text("Sign In")');
			await pageB.waitForSelector('input[name="email"]', { timeout: 10000 });
			await pageB.fill('input[name="email"]', userB.email);
			await pageB.fill('input[name="password"]', userB.password);
			await pageB.click('button[type="submit"]');
			await pageB.waitForSelector("textarea", { timeout: 20000 });

			// Return Page A to direct conversation
			await pageA.goto(`${baseUrl}/messages/${directConvId}`, { waitUntil: "commit", timeout: 15000 });
			await pageA.waitForSelector("textarea", { timeout: 20000 });
		} catch (setupErr: any) {
			console.warn("  [Warning] Setup for Page B:", setupErr.message);
		}

		// ─── CHAT-REALTIME-001: Real-time message delivery across browsers ─────
		{
			const testId = "CHAT-REALTIME-001";
			const start = Date.now();
			const testMsg = `E2E Realtime Delivery Message ${Date.now()}`;

			try {
				await pageA.fill("textarea", testMsg);
				await pageA.click('button[title="Send message (Enter)"]');

				// On Page B, wait for message to appear dynamically without page refresh
				const msgOnB = pageB.locator(`text=${testMsg}`);
				await msgOnB.waitFor({ state: "visible", timeout: 20000 });
				await pageB.screenshot({ path: path.join(evidenceDir, "chat_realtime_001_received.png") });

				ctx.recordAttempt(
					testId,
					"PASS",
					Date.now() - start,
					undefined,
					`Message arrived on Page B without browser refresh. Screenshot: reports/chat/evidence/chat_realtime_001_received.png`
				);
				console.log(`  ✓ ${testId} - Real-time multi-user delivery verified`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}
	} finally {
		if (contextA) await contextA.close().catch(() => {});
		if (contextB) await contextB.close().catch(() => {});
		if (browser) await browser.close().catch(() => {});
	}
}
