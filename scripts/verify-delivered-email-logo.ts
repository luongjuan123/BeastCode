import https from "https";
import fs from "fs";

// Preload .env.local if present
if (fs.existsSync(".env.local")) {
	const envLines = fs.readFileSync(".env.local", "utf-8").split("\n");
	for (const line of envLines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			const key = trimmed.substring(0, eqIdx).trim();
			let val = trimmed.substring(eqIdx + 1).trim();
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			process.env[key] = val;
		}
	}
}

import { getEmailHtml, EMAIL_LOGO_CONFIG } from "../src/utils/emailTemplate";
import { EmailService } from "../src/utils/emailService";

async function verifyLogoDeliverability() {
	console.log("============================================================");
	console.log(" BEASTCODE EMAIL LOGO VERIFICATION & TEST DELIVERY");
	console.log("============================================================\n");

	// 1. Verify Public Image URL accessibility via HTTPS
	console.log(`[1] Verifying Public HTTPS Logo URL: ${EMAIL_LOGO_CONFIG.url}`);
	await new Promise<void>((resolve, reject) => {
		https.get(EMAIL_LOGO_CONFIG.url, (res) => {
			console.log(`    HTTP Status: ${res.statusCode}`);
			console.log(`    Content-Type: ${res.headers["content-type"]}`);
			console.log(`    Content-Length: ${res.headers["content-length"]} bytes`);
			console.log(`    SSL Cipher: ${res.socket.getCipher()?.name || "verified"}`);

			if (res.statusCode !== 200) {
				return reject(new Error(`Logo URL returned non-200 status: ${res.statusCode}`));
			}
			if (res.headers["content-type"] !== "image/png") {
				return reject(new Error(`Logo URL returned non-png content-type: ${res.headers["content-type"]}`));
			}

			const chunks: Buffer[] = [];
			res.on("data", (chunk) => chunks.push(chunk));
			res.on("end", () => {
				const buffer = Buffer.concat(chunks);
				// Verify PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
				const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
				if (!isPng) {
					return reject(new Error("File downloaded is not a valid PNG binary"));
				}
				console.log(`    ✓ Verified Valid PNG binary (${buffer.length} bytes)`);
				resolve();
			});
		}).on("error", (err) => reject(err));
	});

	// 2. Generate Real Email HTML
	console.log("\n[2] Generating actual email HTML via getEmailHtml()...");
	const testEmailHtml = getEmailHtml({
		headerTitle: "BRANDING SYNCHRONIZED",
		title: "BeastCode Email Logo Delivery Verification",
		leadText: "This email verifies that the official BeastCode logo renders crisply and correctly in your inbox.",
		description: "The logo uses a permanent, SSL-verified, globally-cached Google CDN asset with bulletproof email-client compatibility.",
		details: [
			{ label: "Logo URL", value: EMAIL_LOGO_CONFIG.url },
			{ label: "Dimensions", value: `${EMAIL_LOGO_CONFIG.width}x${EMAIL_LOGO_CONFIG.height}px (High-DPI 512x512 Source)` },
			{ label: "Brand Accent", value: "#22c55e (Technical Green)", isHighlight: true },
			{ label: "Surface Theme", value: "#0f1210 Dark Card on #080909 Base" },
			{ label: "Delivery Status", value: "DIRECT VERIFIED", isHighlight: true }
		],
		ctaText: "Launch BeastCode Platform",
		ctaUrl: "https://bomboclatbeastcode.codes",
		recipientEmail: process.env.SMTP_USER || "bomemebo6996@gmail.com",
		preferenceType: "system"
	});

	// Save HTML snapshot for visual inspection
	fs.writeFileSync("reports/verified-delivered-email.html", testEmailHtml);
	console.log("    Saved HTML snapshot to reports/verified-delivered-email.html");

	// 3. Inspect Generated HTML
	console.log("\n[3] Inspecting rendered <img> tag in HTML:");
	const imgMatch = testEmailHtml.match(/<img[^>]+alt="BeastCode"[^>]*>/i);
	if (!imgMatch) {
		throw new Error("FAIL: No <img> tag found with alt=\"BeastCode\"!");
	}
	console.log(`    Rendered Tag:\n    ${imgMatch[0]}`);

	if (!imgMatch[0].includes(EMAIL_LOGO_CONFIG.url)) {
		throw new Error(`FAIL: <img> does not contain correct logo URL: ${EMAIL_LOGO_CONFIG.url}`);
	}
	if (testEmailHtml.includes("localhost:3000/logo") || testEmailHtml.includes("/logo.png\"")) {
		throw new Error("FAIL: Found localhost or relative path in email HTML!");
	}
	console.log("    ✓ Verified <img> tag attributes and clean canonical HTTPS URL.");

	// 4. Send Real Test Email via SMTP
	const targetRecipient = process.env.SMTP_USER || "bomemebo6996@gmail.com";
	console.log(`\n[4] Sending live verification email to: ${targetRecipient}...`);
	const sendResult = await EmailService.sendDirectEmailResult(
		targetRecipient,
		`[BeastCode] Official Brand Logo Verification - ${new Date().toLocaleTimeString()}`,
		testEmailHtml
	);

	if (!sendResult.success) {
		console.error(`    ✗ FAILED to send email: ${sendResult.error}`);
		process.exit(1);
	}

	console.log("    ✓ EMAIL DELIVERED TO SMTP PROVIDER!");
	console.log(`    Message ID: ${sendResult.messageId}`);
	console.log(`    Provider Response: ${sendResult.response}`);
	console.log("\n============================================================");
	console.log(" LOGO VERIFICATION COMPLETE & SUCCESSFUL");
	console.log("============================================================");
}

verifyLogoDeliverability().catch((err) => {
	console.error("\nFATAL ERROR:", err);
	process.exit(1);
});
