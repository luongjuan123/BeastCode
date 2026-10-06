import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
	const screenshotsDir = path.resolve(process.cwd(), "organization-validation-evidence/screenshots");
	if (!fs.existsSync(screenshotsDir)) {
		fs.mkdirSync(screenshotsDir, { recursive: true });
	}

	console.log("Launching Playwright Chromium browser...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const BASE_URL = "http://localhost:3000";
	const ORG_SLUG = "qa-automated-org-a";

	const viewports = [
		{ name: "desktop", width: 1920, height: 1080 },
		{ name: "tablet", width: 768, height: 1024 },
		{ name: "mobile", width: 390, height: 844 },
	];

	// 1. Capture Organization Directory across viewports
	for (const vp of viewports) {
		console.log(`Capturing Organization Directory on ${vp.name} (${vp.width}x${vp.height})...`);
		const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
		try {
			await page.goto(`${BASE_URL}/orgs`, { waitUntil: "networkidle", timeout: 30000 });
			await page.waitForTimeout(2000);
			const screenshotPath = path.join(screenshotsDir, `${vp.name}_01_orgs_directory.png`);
			await page.screenshot({ path: screenshotPath, fullPage: false });
			console.log(`Saved: ${screenshotPath}`);
		} catch (err: any) {
			console.error(`Error on ${vp.name} directory:`, err.message);
		} finally {
			await page.close();
		}
	}

	// 2. Capture Organization Overview across viewports
	for (const vp of viewports) {
		console.log(`Capturing Organization Overview on ${vp.name}...`);
		const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
		try {
			await page.goto(`${BASE_URL}/orgs/${ORG_SLUG}`, { waitUntil: "networkidle", timeout: 30000 });
			await page.waitForTimeout(2000);
			const screenshotPath = path.join(screenshotsDir, `${vp.name}_02_org_overview.png`);
			await page.screenshot({ path: screenshotPath, fullPage: false });
			console.log(`Saved: ${screenshotPath}`);
		} catch (err: any) {
			console.error(`Error on ${vp.name} overview:`, err.message);
		} finally {
			await page.close();
		}
	}

	// 3. Capture specific tabs on Desktop
	const tabs = [
		{ id: "courses", name: "03_org_courses", label: "Courses" },
		{ id: "problems", name: "04_org_problems", label: "Problems" },
		{ id: "assessments", name: "05_org_assessments", label: "Assessments" },
		{ id: "teams", name: "06_org_teams", label: "Teams" },
		{ id: "recruitment", name: "07_org_recruitment", label: "Recruitment" },
		{ id: "announcements", name: "08_org_announcements", label: "Announcements" },
		{ id: "members", name: "09_org_members", label: "Members" },
		{ id: "settings", name: "10_org_settings", label: "Settings" },
	];

	const desktopPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	try {
		await desktopPage.goto(`${BASE_URL}/orgs/${ORG_SLUG}`, { waitUntil: "networkidle", timeout: 30000 });
		await desktopPage.waitForTimeout(2000);

		for (const tab of tabs) {
			console.log(`Navigating to tab: ${tab.label}...`);
			// Try clicking button or link containing tab label or updating query
			try {
				const tabButton = desktopPage.locator(`button:has-text("${tab.label}"), a:has-text("${tab.label}")`).first();
				if (await tabButton.isVisible()) {
					await tabButton.click();
					await desktopPage.waitForTimeout(1500);
				} else {
					await desktopPage.goto(`${BASE_URL}/orgs/${ORG_SLUG}?tab=${tab.id}`, { waitUntil: "networkidle", timeout: 20000 });
					await desktopPage.waitForTimeout(1500);
				}

				const screenshotPath = path.join(screenshotsDir, `desktop_${tab.name}.png`);
				await desktopPage.screenshot({ path: screenshotPath, fullPage: false });
				console.log(`Saved: ${screenshotPath}`);
			} catch (e: any) {
				console.warn(`Could not capture tab ${tab.label}:`, e.message);
			}
		}

		// 4. Capture Create Org Modal (from /orgs)
		console.log("Capturing Create Organization Modal...");
		await desktopPage.goto(`${BASE_URL}/orgs`, { waitUntil: "networkidle", timeout: 30000 });
		await desktopPage.waitForTimeout(1500);
		try {
			const createBtn = desktopPage.locator('button:has-text("Create Organization"), button:has-text("New Organization")').first();
			if (await createBtn.isVisible()) {
				await createBtn.click();
				await desktopPage.waitForTimeout(1000);
			}
			const modalPath = path.join(screenshotsDir, "desktop_11_create_org_modal.png");
			await desktopPage.screenshot({ path: modalPath, fullPage: false });
			console.log(`Saved: ${modalPath}`);
		} catch (e: any) {
			console.warn("Could not open create org modal:", e.message);
		}

		// 5. Capture Empty Search State
		console.log("Capturing Empty Search State...");
		try {
			await desktopPage.goto(`${BASE_URL}/orgs?q=NONEXISTENT_WORKSPACE_SEARCH_QUERY_XYZ`, { waitUntil: "networkidle", timeout: 30000 });
			await desktopPage.waitForTimeout(1500);
			const emptyPath = path.join(screenshotsDir, "desktop_12_empty_search_state.png");
			await desktopPage.screenshot({ path: emptyPath, fullPage: false });
			console.log(`Saved: ${emptyPath}`);
		} catch (e: any) {
			console.warn("Could not capture empty search:", e.message);
		}
	} finally {
		await desktopPage.close();
		await browser.close();
	}

	console.log("All screenshots captured successfully!");
}

main().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
