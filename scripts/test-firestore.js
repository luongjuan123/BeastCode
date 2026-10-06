const admin = require("firebase-admin");

// Initialize Firebase Admin SDK using application default credentials or local project context
admin.initializeApp({
	projectId: "beastcode-7555e",
});

const db = admin.firestore();

async function run() {
	try {
		console.log("Searching for contest named 'dfasdsfas'...");
		const snap = await db.collection("contests").where("title", "==", "dfasdsfas").get();
		if (snap.empty) {
			console.log("No contest found with title 'dfasdsfas'. Listing all contests:");
			const allSnap = await db.collection("contests").get();
			allSnap.forEach((doc) => {
				console.log(`- ID: ${doc.id}, Title: ${doc.data().title}, Status: ${doc.data().status}`);
			});
			return;
		}

		for (const doc of snap.docs) {
			const data = doc.data();
			console.log("Contest Found:");
			console.log("- ID:", doc.id);
			console.log("- Title:", data.title);
			console.log("- Status:", data.status);
			console.log("- Start Time:", new Date(data.startTime).toISOString(), `(${data.startTime})`);
			console.log("- End Time:", new Date(data.endTime).toISOString(), `(${data.endTime})`);
			console.log("- Current Time:", new Date().toISOString(), `(${Date.now()})`);

			// Fetch participants
			console.log("Fetching participants for this contest...");
			const partSnap = await db.collection("contest_participants").where("contestId", "==", doc.id).get();
			console.log("- Number of participants:", partSnap.size);
			partSnap.forEach((pDoc) => {
				console.log(`  * Participant UID: ${pDoc.data().uid}, Username: ${pDoc.data().username}, Status: ${pDoc.data().status}`);
			});
		}
	} catch (error) {
		console.error("Error occurred:", error);
	}
}

run();
