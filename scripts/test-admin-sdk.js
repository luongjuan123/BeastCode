const admin = require("firebase-admin");
try {
	if (!admin.apps.length) {
		admin.initializeApp({
			projectId: "beastcode-7555e",
		});
	}
	const db = admin.firestore();
	db.collection("problems").doc("subscription-forecast").get().then(docSnap => {
		if (docSnap.exists) {
			console.log("Admin SDK Success! Document exists.");
		} else {
			console.log("Admin SDK Fail! Document not found.");
		}
	}).catch(err => {
		console.error("Admin SDK Error:", err);
	});
} catch (e) {
	console.error("Initialization error:", e);
}
