#!/usr/bin/env node
/**
 * BeastCode Organization Avatar Migration Tool
 *
 * Scans all organizations in Firestore, classifies avatar storage status,
 * migrates available local uploads to durable Google Cloud Storage,
 * and clears unrecoverable ephemeral links.
 *
 * Usage:
 *   node scripts/migrate-org-avatars.js [--dry-run]
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load local environment variables if available
if (fs.existsSync(".env.local")) {
	const envContent = fs.readFileSync(".env.local", "utf8");
	envContent.split("\n").forEach((line) => {
		const parts = line.split("=");
		if (parts.length >= 2) {
			const key = parts[0].trim();
			let val = parts.slice(1).join("=").trim();
			if (val.startsWith('"') && val.endsWith('"')) {
				val = val.substring(1, val.length - 1);
			}
			if (!process.env[key]) {
				process.env[key] = val;
			}
		}
	});
}

const isDryRun = process.argv.includes("--dry-run");
const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const storageBucket =
	process.env.FIREBASE_STORAGE_BUCKET ||
	process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
	"beastcode-media-348293518232";

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert({
			projectId,
			clientEmail,
			privateKey,
		}),
		storageBucket,
	});
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function runMigration() {
	console.log("=====================================================================");
	console.log(`BEASTCODE ORGANIZATION AVATAR MIGRATION (${isDryRun ? "DRY RUN" : "LIVE"})`);
	console.log(`Target GCS Bucket: ${bucket.name}`);
	console.log("=====================================================================\n");

	const orgsSnap = await db.collection("organizations").get();
	console.log(`Found ${orgsSnap.docs.length} organizations in Firestore.\n`);

	const results = [];

	for (const doc of orgsSnap.docs) {
		const org = doc.data();
		const orgId = doc.id;
		const orgName = org.displayName || org.name || orgId;
		const currentAvatar = org.avatarUrl || org.avatar || "";
		const currentStoragePath = org.avatarStoragePath || "";

		const item = {
			id: orgId,
			name: orgName,
			current: currentAvatar,
			classification: "UNKNOWN",
			action: "NONE",
		};

		if (!currentAvatar) {
			item.classification = "NO_AVATAR";
			item.action = "None needed (already clean)";
			results.push(item);
			continue;
		}

		// Case 1: Already durable Google Cloud Storage
		if (
			currentAvatar.includes("storage.googleapis.com") ||
			currentAvatar.includes("firebasestorage.googleapis.com")
		) {
			item.classification = "DURABLE_STORAGE";
			item.action = "Already permanent in Cloud Storage";
			results.push(item);
			continue;
		}

		// Case 2: Local ephemeral attachment URL
		if (currentAvatar.includes("/api/attachments?path=avatars/")) {
			const filename = currentAvatar.split("avatars/")[1];
			const localFilePath = path.join(process.cwd(), "uploads", "avatars", filename);

			if (fs.existsSync(localFilePath)) {
				item.classification = "LOCAL_FILE_FOUND";
				item.action = `Migrate to GCS: organizations/${orgId}/avatar/${filename}`;

				if (!isDryRun) {
					const fileBuffer = fs.readFileSync(localFilePath);
					const ext = path.extname(filename).toLowerCase();
					let mime = "image/png";
					if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
					else if (ext === ".webp") mime = "image/webp";

					const gcsPath = `organizations/${orgId}/avatar/${filename}`;
					const gcsFile = bucket.file(gcsPath);

					await gcsFile.save(fileBuffer, {
						contentType: mime,
						metadata: { cacheControl: "public, max-age=31536000, immutable" },
					});
					await gcsFile.makePublic();

					const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;

					await db.collection("organizations").doc(orgId).update({
						avatar: publicUrl,
						avatarUrl: publicUrl,
						avatarStoragePath: gcsPath,
						avatarUpdatedAt: Date.now(),
						updatedAt: Date.now(),
					});
					item.action = `SUCCESS: Migrated to ${publicUrl}`;
				}
			} else {
				item.classification = "EPHEMERAL_LOST_FILE";
				item.action = "Clear dead attachment link (enable deterministic initials fallback)";

				if (!isDryRun) {
					await db.collection("organizations").doc(orgId).update({
						avatar: "",
						avatarUrl: "",
						avatarStoragePath: "",
						avatarUpdatedAt: Date.now(),
						updatedAt: Date.now(),
					});
					item.action = "CLEARED: Dead link removed. Deterministic fallback enabled.";
				}
			}
			results.push(item);
			continue;
		}

		// Case 3: Invalid string (blob: or undefined or null)
		if (
			currentAvatar.startsWith("blob:") ||
			currentAvatar === "undefined" ||
			currentAvatar === "null"
		) {
			item.classification = "INVALID_PERSISTED_URL";
			item.action = "Clear corrupt URL";

			if (!isDryRun) {
				await db.collection("organizations").doc(orgId).update({
					avatar: "",
					avatarUrl: "",
					avatarStoragePath: "",
					avatarUpdatedAt: Date.now(),
					updatedAt: Date.now(),
				});
				item.action = "CLEARED: Corrupted value removed.";
			}
			results.push(item);
			continue;
		}

		// Other URL: external or unknown
		item.classification = "EXTERNAL_OR_CUSTOM";
		item.action = "Preserved";
		results.push(item);
	}

	console.table(
		results.map((r) => ({
			"Org ID": r.id,
			Name: r.name,
			Classification: r.classification,
			"Action / Result": r.action,
		}))
	);

	console.log("\n=====================================================================");
	console.log(`MIGRATION ${isDryRun ? "DRY RUN" : "EXECUTION"} COMPLETE.`);
	console.log("=====================================================================");
}

runMigration().catch((err) => {
	console.error("Migration fatal error:", err);
	process.exit(1);
});
