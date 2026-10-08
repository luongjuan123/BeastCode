import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function run() {
	const outputDir = path.resolve(process.cwd(), "docs/screenshots");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	console.log("Launching Chromium with system Chrome...");
	const browser = await chromium.launch({
		executablePath: "/usr/bin/google-chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	console.log("Navigating to login page...");
	await page.goto("http://localhost:3000/auth?type=login", { waitUntil: "domcontentloaded" });
	await page.waitForSelector("input[name=\"email\"]", { timeout: 15000 });
	
	console.log("Authenticating as dungpubgame@gmail.com...");
	await page.fill("input[name=\"email\"]", "dungpubgame@gmail.com");
	await page.fill("input[name=\"password\"]", "Nguyenvandung1@");
	await page.click("button[type=\"submit\"]");
	await page.waitForTimeout(5000);

	console.log("Authenticated as dungpubgame@gmail.com (Nihao123)!");

	// 1. Problems Directory (Wait until problem rows are visible)
	console.log("Capturing 01_problems_directory.png...");
	await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
	try {
		await page.waitForSelector("table tbody tr", { timeout: 15000 });
		await page.waitForTimeout(2000);
	} catch (e) {
		await page.waitForTimeout(5000);
	}
	await page.screenshot({ path: path.join(outputDir, "01_problems_directory.png") });

	// 2. Problem Workspace & Code Editor (Scroll down to show CodeMirror editor & testcases)
	console.log("Capturing 02_problem_workspace.png...");
	await page.goto("http://localhost:3000/problems/academy-course-prerequisites", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	// Scroll to editor
	await page.evaluate(() => {
		const playground = document.querySelector(".cm-editor") || document.querySelector("button:has-text('Run')") || document.body;
		window.scrollBy(0, 520);
	});
	await page.waitForTimeout(2000);
	await page.screenshot({ path: path.join(outputDir, "02_problem_workspace.png") });

	// 3. Contests Arena
	console.log("Capturing 03_contests_arena.png...");
	await page.goto("http://localhost:3000/contests", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: path.join(outputDir, "03_contests_arena.png") });

	// 4. Global Rankings
	console.log("Capturing 04_global_rankings.png...");
	await page.goto("http://localhost:3000/rankings", { waitUntil: "domcontentloaded" });
	try {
		await page.waitForSelector("table tbody tr", { timeout: 15000 });
		await page.waitForTimeout(2000);
	} catch (e) {
		await page.waitForTimeout(4000);
	}
	await page.screenshot({ path: path.join(outputDir, "04_global_rankings.png") });

	// 5. Organization Workspaces Directory
	console.log("Capturing 05_organization_directory.png...");
	await page.goto("http://localhost:3000/orgs", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5000);
	await page.screenshot({ path: path.join(outputDir, "05_organization_directory.png") });

	// 6. Organization Workspace View
	console.log("Capturing 06_organization_workspace.png...");
	await page.goto("http://localhost:3000/orgs/nihao", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5000);
	await page.screenshot({ path: path.join(outputDir, "06_organization_workspace.png") });

	// 7. Real-Time Chat & Direct Messaging (Click first conversation)
	console.log("Capturing 07_realtime_chat.png...");
	await page.goto("http://localhost:3000/messages", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);
	try {
		const firstConv = page.locator("div[role=\"button\"], button, .cursor-pointer").filter({ hasText: "Thái Hoàng Nguyễn" }).first();
		if (await firstConv.isVisible()) {
			await firstConv.click();
			await page.waitForTimeout(3000);
		}
	} catch (e) {}
	await page.screenshot({ path: path.join(outputDir, "07_realtime_chat.png") });

	// 8. Community Discussions & Threads
	console.log("Capturing 08_community_threads.png...");
	await page.goto("http://localhost:3000/threads", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: path.join(outputDir, "08_community_threads.png") });

	// 9. Developer Settings & Profile
	console.log("Capturing 09_developer_settings.png...");
	await page.goto("http://localhost:3000/settings", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: path.join(outputDir, "09_developer_settings.png") });

	// 10. Platform Administration Dashboard
	console.log("Capturing 10_admin_dashboard.png...");
	await page.goto("http://localhost:3000/admin", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: path.join(outputDir, "10_admin_dashboard.png") });

	// 11. Admin Moderation with Bulk Actions Checkbox
	console.log("Capturing 11_admin_moderation.png...");
	await page.goto("http://localhost:3000/admin?tab=moderation", { waitUntil: "domcontentloaded" });
	try {
		await page.waitForSelector("table tbody tr", { timeout: 15000 });
		await page.waitForTimeout(2000);
	} catch (e) {
		await page.waitForTimeout(4000);
	}
	await page.screenshot({ path: path.join(outputDir, "11_admin_moderation.png") });

	console.log("All updated screenshots captured successfully!");
	await browser.close();
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
