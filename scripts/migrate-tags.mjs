import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

async function migrate() {
  console.log("Starting tagging architecture migration...");

  // 1. Fetch valid problem and thread tags maps to check existence
  const problemTagsSnap = await db.collection("problemTags").get();
  const problemTagsSet = new Set();
  problemTagsSnap.forEach(doc => problemTagsSet.add(doc.id));
  console.log(`Loaded ${problemTagsSet.size} valid Problem Tags from DB.`);

  const threadTagsSnap = await db.collection("threadTags").get();
  const threadTagsSet = new Set();
  const threadTagsMap = new Map(); // name lower -> id
  threadTagsSnap.forEach(doc => {
    threadTagsSet.add(doc.id);
    const data = doc.data();
    if (data.name) {
      threadTagsMap.set(data.name.toLowerCase(), doc.id);
    }
  });
  console.log(`Loaded ${threadTagsSet.size} valid Thread Tags from DB.`);

  // 2. Migrate Problems
  console.log("Migrating problems...");
  const problemsSnap = await db.collection("problems").get();
  let migratedProblemsCount = 0;

  for (const docSnap of problemsSnap.docs) {
    const data = docSnap.data();
    let originalTags = data.tags || [];
    let category = data.category || "";

    // Determine target problem tags
    let targetTags = [];
    if (Array.isArray(originalTags) && originalTags.length > 0) {
      targetTags = originalTags.map(t => slugify(t)).filter(t => t !== "");
    } else if (category) {
      targetTags = [slugify(category)].filter(t => t !== "");
    }

    // Ensure all target tags are valid (exist in problemTags). If not, fallback to 'array'
    const validatedTags = targetTags.map(tagId => {
      if (problemTagsSet.has(tagId)) {
        return tagId;
      }
      // Check if tag name matches slug
      const found = Array.from(problemTagsSet).find(id => slugify(id) === tagId);
      if (found) return found;
      return "array"; // Default fallback
    });

    // Make sure we have at least one tag
    if (validatedTags.length === 0) {
      validatedTags.push("array");
    }

    // Limit to max 3 tags
    const finalTags = [...new Set(validatedTags)].slice(0, 3);

    // Update if tags array is different or missing
    const needsUpdate = !data.tags || 
                        JSON.stringify(data.tags) !== JSON.stringify(finalTags);

    if (needsUpdate) {
      await db.collection("problems").doc(docSnap.id).update({
        tags: finalTags
      });
      console.log(`Updated problem "${data.title || docSnap.id}": [${originalTags.join(", ")}] -> [${finalTags.join(", ")}]`);
      migratedProblemsCount++;
    }
  }

  // 3. Migrate Threads
  console.log("Migrating threads...");
  const threadsSnap = await db.collection("threads").get();
  let migratedThreadsCount = 0;

  for (const docSnap of threadsSnap.docs) {
    const data = docSnap.data();
    
    // Only migrate top-level threads (parentThreadId is empty/missing)
    if (data.parentThreadId) {
      continue;
    }

    let hashtags = data.hashtags || [];
    let currentTags = data.tags || [];

    // Map hashtags or legacy tags to threadTags
    let targetTags = [];
    if (Array.isArray(currentTags) && currentTags.length > 0) {
      targetTags = currentTags.map(t => slugify(t)).filter(t => t !== "");
    } else if (Array.isArray(hashtags) && hashtags.length > 0) {
      targetTags = hashtags.map(h => slugify(h)).filter(h => h !== "");
    }

    // Validate against valid threadTags, or auto-create threadTag if it's a common one, or fallback to general-discussion
    const validatedTags = [];
    for (const tagId of targetTags) {
      if (threadTagsSet.has(tagId)) {
        validatedTags.push(tagId);
      } else {
        // Try case-insensitive name match
        const foundId = threadTagsMap.get(tagId.replace(/-/g, " "));
        if (foundId) {
          validatedTags.push(foundId);
        } else {
          // Check if it's a valid problem tag that is also commonly used in threads (e.g. python, cpp, javascript)
          // If the tag exists in threadTagsSet under another name or we can create it
          // Else we fallback to general-discussion
          validatedTags.push("general-discussion");
        }
      }
    }

    // Default fallback if no valid tags found
    if (validatedTags.length === 0) {
      validatedTags.push("general-discussion");
    }

    // Unique and limit to max 5 thread tags
    const finalTags = [...new Set(validatedTags)].slice(0, 5);

    // Update if different or missing
    const needsUpdate = !data.tags || 
                        JSON.stringify(data.tags) !== JSON.stringify(finalTags);

    if (needsUpdate) {
      await db.collection("threads").doc(docSnap.id).update({
        tags: finalTags
      });
      console.log(`Updated thread "${docSnap.id}" (by ${data.displayName}): [${hashtags.join(", ")}] -> [${finalTags.join(", ")}]`);
      migratedThreadsCount++;
    }
  }

  console.log("\nMigration completed successfully!");
  console.log(`- Problems migrated/updated: ${migratedProblemsCount}`);
  console.log(`- Threads migrated/updated: ${migratedThreadsCount}`);
}

migrate().catch(console.error);
