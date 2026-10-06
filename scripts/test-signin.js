const admin = require("firebase-admin");
const fs = require("fs");

// Read env variables manually
const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach(line => {
	const parts = line.split("=");
	if (parts.length >= 2) {
		const key = parts[0].trim();
		let val = parts.slice(1).join("=").trim();
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

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function run() {
	const auth = admin.auth();
	const email = "testuser_gemini2@example.com";
	const password = "MyNewSecurePassword123!";

	console.log(`Resetting password for ${email}...`);
	const userRecord = await auth.getUserByEmail(email);
	await auth.updateUser(userRecord.uid, { password });
	console.log("Password reset successful.");

	console.log("Testing signInWithPassword with returnSecureToken: false");
	const res = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email,
				password,
				returnSecureToken: false
			}),
		}
	);

	console.log("Status:", res.status);
	const data = await res.json();
	console.log("Response:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
