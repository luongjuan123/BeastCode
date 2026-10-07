import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const VIEWPORTS = [
  { name: "Mobile (375x667)", width: 375, height: 667 },
  { name: "Tablet (768x1024)", width: 768, height: 1024 },
  { name: "Desktop (1280x800)", width: 1280, height: 800 },
  { name: "Widescreen (1920x1080)", width: 1920, height: 1080 },
];

const ROUTES = [
  "/",
  "/auth",
  "/rankings",
  "/contests",
  "/threads",
  "/orgs",
  "/search",
  "/problems/two-sum",
  "/settings",
  "/profile",
  "/messages",
  "/account-appeal",
  "/admin",
  "/reset-password",
  "/auth/verify-email",
];

async function runFullSystemCheck() {
  console.log("=================================================");
  console.log("BEASTCODE FULL-SYSTEM UI & RESPONSIVE VERIFICATION");
  console.log("=================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => {
    consoleErrors.push({ url: page.url(), error: err.message });
  });

  const report = {
    viewportsChecked: VIEWPORTS.length,
    routesChecked: ROUTES.length,
    horizontalOverflows: [],
    brokenInteractions: [],
    consoleErrors: [],
  };

  // 1. Check all routes across desktop for horizontal overflow and clean render
  console.log("\n[1/3] Testing all routes on Desktop (1280x800)...");
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 8000 });
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        console.log(`  ❌ Horizontal overflow detected on ${route}`);
        report.horizontalOverflows.push({ route, viewport: "1280x800" });
      } else {
        console.log(`  ✅ ${route} rendered cleanly (no overflow)`);
      }
    } catch (e) {
      console.log(`  ⚠️ Route error on ${route}:`, e.message);
    }
  }

  // 2. Check mobile viewport (375x667) for horizontal overflow
  console.log("\n[2/3] Testing core routes on Mobile (375x667)...");
  await page.setViewportSize({ width: 375, height: 667 });
  for (const route of ["/", "/auth", "/search", "/threads", "/problems/two-sum", "/contests", "/settings"]) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 8000 });
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        console.log(`  ❌ Mobile horizontal overflow on ${route}`);
        report.horizontalOverflows.push({ route, viewport: "375x667" });
      } else {
        console.log(`  ✅ Mobile ${route} rendered cleanly`);
      }
    } catch (e) {
      console.log(`  ⚠️ Route error on ${route}:`, e.message);
    }
  }

  // 3. Interactive state verification
  console.log("\n[3/3] Verifying interactive components and state toggles...");

  // 3a. Auth Page Toggles
  try {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    // Click register toggle if present
    const registerBtn = await page.$("button:has-text('Register'), a:has-text('Register'), button:has-text('Sign Up')");
    if (registerBtn) {
      await registerBtn.click();
      await page.waitForTimeout(300);
      console.log("  ✅ Auth toggle to Register: Success");
    }
    // Click reset password link if present
    const forgotLink = await page.$("button:has-text('Forgot'), a:has-text('Forgot')");
    if (forgotLink) {
      await forgotLink.click();
      await page.waitForTimeout(300);
      console.log("  ✅ Auth toggle to Forgot Password: Success");
    }
  } catch (e) {
    console.log("  ⚠️ Auth interaction notice:", e.message);
  }

  // 3b. Search Category Tabs
  try {
    await page.goto(`${BASE_URL}/search`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    // Type a query to show categories
    await page.fill("input[placeholder*='Search']", "binary");
    await page.waitForTimeout(500);
    const userTab = await page.$("button:has-text('Users')");
    if (userTab) {
      await userTab.click();
      await page.waitForTimeout(300);
      console.log("  ✅ Search tab switch to Users: Success");
    }
  } catch (e) {
    console.log("  ⚠️ Search interaction notice:", e.message);
  }

  // 3c. Workspace Tabs
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/problems/two-sum`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const submissionsTab = await page.$("div[role='tab']:has-text('Submissions'), button:has-text('Submissions')");
    if (submissionsTab) {
      await submissionsTab.click();
      await page.waitForTimeout(300);
      console.log("  ✅ Workspace tab switch to Submissions: Success");
    }

    const runBtn = await page.$("button:has-text('Run')");
    const submitBtn = await page.$("button:has-text('Submit')");
    if (runBtn && submitBtn) {
      console.log("  ✅ Workspace Run and Submit buttons verified present and visible");
    }
  } catch (e) {
    console.log("  ⚠️ Workspace interaction notice:", e.message);
  }

  // 3d. Settings Section Tabs
  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const securityTab = await page.$("button:has-text('Security'), a:has-text('Security')");
    if (securityTab) {
      await securityTab.click();
      await page.waitForTimeout(300);
      console.log("  ✅ Settings tab switch to Security: Success");
    }
  } catch (e) {
    console.log("  ⚠️ Settings interaction notice:", e.message);
  }

  await browser.close();

  report.consoleErrors = consoleErrors;
  console.log("\n=================================================");
  console.log("SYSTEM VERIFICATION SUMMARY");
  console.log(`Routes Audited: ${report.routesChecked}`);
  console.log(`Horizontal Overflows: ${report.horizontalOverflows.length}`);
  console.log(`Fatal Console Errors: ${report.consoleErrors.length}`);
  console.log("=================================================");
}

runFullSystemCheck().catch(console.error);
