/**
 * Script to manage platform administrators in BeastCode.
 *
 * Usage:
 *   node scripts/manage-platform-admin.mjs grant <email> [role: super_admin|admin]
 *   node scripts/manage-platform-admin.mjs revoke <email>
 *   node scripts/manage-platform-admin.mjs list
 *
 * Example:
 *   node scripts/manage-platform-admin.mjs grant dungpubgame@gmail.com super_admin
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, "\n");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!getApps().length) {
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      projectId,
    });
  } else {
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    initializeApp({ projectId });
  }
}

const db = getFirestore();
const auth = getAuth();

async function grantAdmin(email, role = "admin") {
  console.log(`🔍 Resolving user for email: ${email}...`);
  const user = await auth.getUserByEmail(email);
  const uid = user.uid;
  console.log(`✓ Found user UID: ${uid}`);

  const now = Date.now();
  const adminDoc = {
    email: user.email,
    role: role,
    active: true,
    updatedAt: now,
    grantedBy: "system_cli"
  };

  await db.collection("platformAdmins").doc(uid).set(adminDoc, { merge: true });
  console.log(`✓ Written /platformAdmins/${uid} doc with role "${role}" and active: true`);

  await auth.setCustomUserClaims(uid, {
    admin: true,
    role: role
  });
  console.log(`✓ Set custom claims { admin: true, role: "${role}" }`);

  await auth.revokeRefreshTokens(uid);
  console.log(`✓ Revoked refresh tokens for ${uid} to force fresh token refresh`);

  console.log(`\n🎉 SUCCESS: ${email} (${uid}) is now a Platform Admin [${role}].`);
}

async function revokeAdmin(email) {
  console.log(`🔍 Resolving user for email: ${email}...`);
  const user = await auth.getUserByEmail(email);
  const uid = user.uid;
  console.log(`✓ Found user UID: ${uid}`);

  await db.collection("platformAdmins").doc(uid).set({
    active: false,
    revokedAt: Date.now(),
    revokedBy: "system_cli"
  }, { merge: true });
  console.log(`✓ Marked /platformAdmins/${uid} as active: false`);

  await auth.setCustomUserClaims(uid, {
    admin: false,
    role: null
  });
  console.log(`✓ Cleared custom claims`);

  await auth.revokeRefreshTokens(uid);
  console.log(`✓ Revoked refresh tokens for ${uid}`);

  console.log(`\n🛑 SUCCESS: Platform Admin privileges revoked for ${email} (${uid}).`);
}

async function listAdmins() {
  console.log("📋 Platform Admins in /platformAdmins:");
  const snap = await db.collection("platformAdmins").get();
  if (snap.empty) {
    console.log("  (None found)");
    return;
  }
  snap.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`  - UID: ${docSnap.id} | Email: ${data.email} | Role: ${data.role} | Active: ${data.active}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === "grant") {
      const email = args[1];
      const role = args[2] || "super_admin";
      if (!email) {
        console.error("Usage: node scripts/manage-platform-admin.mjs grant <email> [role]");
        process.exit(1);
      }
      await grantAdmin(email, role);
    } else if (command === "revoke") {
      const email = args[1];
      if (!email) {
        console.error("Usage: node scripts/manage-platform-admin.mjs revoke <email>");
        process.exit(1);
      }
      await revokeAdmin(email);
    } else if (command === "list") {
      await listAdmins();
    } else {
      console.log("Usage:");
      console.log("  node scripts/manage-platform-admin.mjs grant <email> [role]");
      console.log("  node scripts/manage-platform-admin.mjs revoke <email>");
      console.log("  node scripts/manage-platform-admin.mjs list");
    }
  } catch (err) {
    console.error("❌ Operation failed:", err.message);
    process.exit(1);
  }
}

main();
