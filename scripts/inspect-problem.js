const admin = require("firebase-admin");

admin.initializeApp({
	projectId: "beastcode-7555e",
});

const db = admin.firestore();

async function run() {
	try {
		console.log("Fetching problem: the-kings-road-network...");
		const problemDoc = await db.collection("problems").doc("the-kings-road-network").get();
		if (!problemDoc.exists) {
			console.log("Problem the-kings-road-network does not exist!");
		} else {
			const data = problemDoc.data();
			console.log("Problem Title:", data.title);
			console.log("Execution Profile:", data.executionProfile);
			console.log("Examples Count:", data.examples ? data.examples.length : 0);
			console.log("Limits: timeoutMs =", data.customTimeoutMs, ", memoryLimitMb =", data.customMemoryLimitMb);
		}

		console.log("\nFetching recent pending submissions...");
		const subSnap = await db.collection("submissions")
			.where("problemId", "==", "the-kings-road-network")
			.limit(10)
			.get();

		if (subSnap.empty) {
			console.log("No submissions found for the-kings-road-network.");
		} else {
			subSnap.forEach((doc) => {
				const data = doc.data();
				console.log(`- ID: ${doc.id}`);
				console.log(`  Verdict: ${data.verdict}`);
				console.log(`  Status: ${data.status}`);
				console.log(`  Timestamp: ${new Date(data.timestamp).toISOString()}`);
				console.log(`  Language: ${data.language}`);
				console.log(`  Score: ${data.score}`);
				if (data.error) {
					console.log(`  Error: ${data.error}`);
				}
			});
		}
	} catch (error) {
		console.error("Error occurred:", error);
	}
}

run();
