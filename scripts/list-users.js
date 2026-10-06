const admin = require("firebase-admin");
const fs = require("fs");

// Read env variables manually
const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach(line => {
	const parts = line.split("=");
	if (parts.length >= 2) {
		const key = parts[0].trim();
		let val = parts.slice(1).join("=").trim();
		// Strip outer quotes if any
		if (val.startsWith('"') && val.endsWith('"')) {
			val = val.substring(1, val.length - 1);
		}
		process.env[key] = val;
	}
});

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: "beastcode-7555e",
		credential: admin.credential.cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: privateKey,
		})
	});
}

async function run() {
	const db = admin.firestore();
	const auth = admin.auth();

	console.log("Fetching users from Firestore...");
	const snap = await db.collection("users").limit(10).get();
	for (const doc of snap.docs) {
		const data = doc.data();
		console.log(`Firestore UID: ${doc.id}, email: ${data.email}, username: ${data.username}`);
		try {
			const userRecord = await auth.getUser(doc.id);
			console.log(`  Auth Record found: ${userRecord.email}`);
		} catch (e) {
			console.log(`  No Auth Record for UID ${doc.id}`);
		}
	}
}

run().catch(console.error);
