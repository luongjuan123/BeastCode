import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "beastcode-7555e";
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

async function main() {
  const snapshot = await db.collection("threads").limit(5).get();
  console.log(`Found ${snapshot.size} threads`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("ID:", doc.id);
    console.log("DisplayName:", data.displayName);
    console.log("Content:", data.content);
    console.log("Replies Count:", data.replies?.length || 0);
    console.log("--------------------------------------");
  });
}

main().catch(console.error);
