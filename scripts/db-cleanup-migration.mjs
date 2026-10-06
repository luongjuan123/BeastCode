import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "beastcode-7555e";
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

function slugify(text) {
  if (!text) return "";
  let str = text.trim().toLowerCase();
  const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  const to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from[i], "g"), to[i]);
  }
  return str
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function cleanup() {
  console.log("Starting database consistency and metadata cleanup...");

  // 1. Fetch valid problem tag IDs from problemTags
  const problemTagsSnap = await db.collection("problemTags").get();
  const validTagIds = new Set();
  problemTagsSnap.forEach((doc) => {
    validTagIds.add(doc.id);
  });
  console.log(`Loaded ${validTagIds.size} valid problem tags.`);

  // 2. Fetch all problems
  const problemsSnap = await db.collection("problems").get();
  console.log(`Auditing ${problemsSnap.size} problem documents...`);

  let problemsUpdated = 0;

  for (const docSnap of problemsSnap.docs) {
    const data = docSnap.data();
    const problemId = docSnap.id;
    
    // Normalize tags
    let rawTags = data.tags;
    if (!rawTags || !Array.isArray(rawTags)) {
      rawTags = [];
    }

    // Map and slugify existing tags, filter out empty and invalid ones
    let normalizedTags = rawTags
      .map(t => slugify(t))
      .filter(t => t && validTagIds.has(t));

    // Remove duplicates
    normalizedTags = [...new Set(normalizedTags)];

    // Check for legacy fields
    const legacyFields = ["category", "categories", "tagNames", "topicTags", "cachedTags"];
    const updatePayload = {};
    let needsUpdate = false;

    // Check if tags changed
    if (JSON.stringify(rawTags) !== JSON.stringify(normalizedTags)) {
      updatePayload.tags = normalizedTags;
      needsUpdate = true;
      console.log(`- Problem "${problemId}": Normalizing tags ${JSON.stringify(rawTags)} -> ${JSON.stringify(normalizedTags)}`);
    }

    // Delete legacy fields if present
    legacyFields.forEach((field) => {
      if (field in data) {
        updatePayload[field] = FieldValue.delete();
        needsUpdate = true;
        console.log(`- Problem "${problemId}": Removing legacy field "${field}"`);
      }
    });

    if (needsUpdate) {
      await db.collection("problems").doc(problemId).update(updatePayload);
      problemsUpdated++;
    }
  }

  console.log(`\nCleanup complete! Updated ${problemsUpdated} problems.`);
}

cleanup().catch(console.error);
