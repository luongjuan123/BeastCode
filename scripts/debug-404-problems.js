const admin = require("firebase-admin");

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: "beastcode-7555e",
	});
}

const db = admin.firestore();

async function run() {
	try {
		console.log("Fetching all problems from Firestore...");
		const snap = await db.collection("problems").get();
		console.log(`Found ${snap.docs.length} problems.`);
		
		for (const doc of snap.docs) {
			const data = doc.data();
			console.log(`ID: ${doc.id} | Title: "${data.title}" | Difficulty: ${data.difficulty} | Examples Count: ${data.examples ? data.examples.length : 0}`);
		}
	} catch (error) {
		console.error("Error occurred:", error);
	}
}

run();
