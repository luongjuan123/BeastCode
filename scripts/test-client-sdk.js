// A Node script to test fetching the problem using the Client Web SDK, mimicking Next.js server-side getStaticProps
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const fs = require("fs");

// Read env variables manually
const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach(line => {
	const parts = line.split("=");
	if (parts.length >= 2) {
		const key = parts[0].trim();
		const val = parts.slice(1).join("=").trim();
		process.env[key] = val;
	}
});

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function testFetch(pid) {
	console.log(`\nTesting fetch for: ${pid}`);
	try {
		const docRef = doc(firestore, "problems", pid);
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			console.log(`SUCCESS! Document exists. Data keys:`, Object.keys(docSnap.data()));
			const data = docSnap.data();
			console.log(`Examples count: ${data.examples ? data.examples.length : 0}`);
		} else {
			console.log("FAILED! Document does not exist.");
		}
	} catch (error) {
		console.error("ERROR FETCHING DOCUMENT:", error);
	}
}

async function run() {
	await testFetch("subscription-forecast");
	await testFetch("the-kings-road-network");
}

run();
