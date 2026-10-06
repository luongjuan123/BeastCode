/**
 * Uses firebase-admin with Application Default Credentials (gcloud/Firebase CLI login)
 * to set isAdmin:true on the Firestore user doc for dungpubgame@gmail.com
 *
 * Run: node scripts/make-admin-sdk.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = "beastcode-7555e";
const TARGET_EMAIL = "dungpubgame@gmail.com";

// Use Application Default Credentials (already set by `firebase login --reauth`)
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();
const auth = getAuth();

async function main() {
  console.log(`🔍 Looking up Firebase Auth user for: ${TARGET_EMAIL}`);
  try {
    const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
    const uid = userRecord.uid;
    console.log(`✓ Found UID: ${uid}`);

    await db.collection("users").doc(uid).set(
      { isAdmin: true, role: "admin" },
      { merge: true }
    );

    console.log(`✅ Successfully granted admin to ${TARGET_EMAIL} (UID: ${uid})`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
