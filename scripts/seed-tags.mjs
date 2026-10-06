import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "beastcode-7555e";
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

const DEFAULT_PROBLEM_TAGS = [
  "Array", "String", "Graph", "Dynamic Programming", "DFS", "BFS",
  "Greedy", "Binary Search", "Segment Tree", "Math", "Machine Learning",
  "Database", "SQL", "Simulation", "Geometry", "Bit Manipulation"
];

const DEFAULT_THREAD_TAGS = [
  "General Discussion", "Question", "Help", "Bug Report", "Feature Request",
  "Tutorial", "Announcement", "Contest", "Career", "Interview",
  "Machine Learning", "AI", "Web Development", "Backend", "Frontend",
  "Mobile", "C++", "Python", "Java", "JavaScript", "Rust", "Research", "Off Topic"
];

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

async function seed() {
  console.log("Seeding problem tags...");
  for (let i = 0; i < DEFAULT_PROBLEM_TAGS.length; i++) {
    const name = DEFAULT_PROBLEM_TAGS[i];
    const id = slugify(name);
    const docRef = db.collection("problemTags").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        id,
        name,
        description: `Problems related to ${name}`,
        isHidden: false,
        isEnabled: true,
        order: i,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        popularityCount: 0
      });
      console.log(`Created problem tag: ${name}`);
    }
  }

  console.log("Seeding thread tags...");
  for (let i = 0; i < DEFAULT_THREAD_TAGS.length; i++) {
    const name = DEFAULT_THREAD_TAGS[i];
    const id = slugify(name);
    const docRef = db.collection("threadTags").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        id,
        name,
        description: `Discussions about ${name}`,
        isHidden: false,
        isEnabled: true,
        order: i,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        icon: "fa-comments",
        popularityCount: 0
      });
      console.log(`Created thread tag: ${name}`);
    }
  }
  
  console.log("Seeding complete!");
}

seed().catch(console.error);
