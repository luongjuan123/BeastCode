const admin = require("firebase-admin");

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: "beastcode-7555e",
	});
}

const db = admin.firestore();

async function run() {
	try {
		console.log("Resetting all terminated participant states...");
		const snap = await db.collection("contest_participants").where("status", "==", "terminated").get();
		if (snap.empty) {
			console.log("No terminated participants found.");
			return;
		}

		for (const doc of snap.docs) {
			console.log(`Resetting participant ${doc.data().username || doc.data().uid} back to 'active'...`);
			await doc.ref.update({ status: "active" });
		}
		console.log("Successfully reset all terminated participants.");
	} catch (error) {
		console.error("Error occurred:", error);
	}
}

run();
