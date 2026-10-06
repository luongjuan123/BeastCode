const admin = require("firebase-admin");

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: "beastcode-7555e",
	});
}

const db = admin.firestore();

async function run() {
	const ids = ["subscription-forecast", "the-kings-road-network"];
	for (const id of ids) {
		const doc = await db.collection("problems").doc(id).get();
		if (doc.exists) {
			const data = doc.data();
			const jsonStr = JSON.stringify(data);
			console.log(`\nProblem ID: ${id}`);
			console.log(`Total Document Size (JSON length): ${jsonStr.length} characters`);
			console.log(`Examples Count: ${data.examples ? data.examples.length : 0}`);
			if (data.examples) {
				const examplesJson = JSON.stringify(data.examples);
				console.log(`Examples Size (JSON length): ${examplesJson.length} characters`);
				
				// Calculate average size
				console.log(`Average Example Size: ${(examplesJson.length / data.examples.length).toFixed(1)} characters`);
				
				// Let's print first 2 examples
				console.log(`First Example:`, JSON.stringify(data.examples[0]).substring(0, 200));
			}
		} else {
			console.log(`Problem ${id} not found.`);
		}
	}
}

run();
