const admin = require("firebase-admin");

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: "beastcode-7555e",
	});
}

const db = admin.firestore();

async function run() {
	try {
		console.log("=== BEASTCODE TESTCASE DIAGNOSTICS ===");
		const problemsSnap = await db.collection("problems").get();
		console.log(`Total problems in Firestore: ${problemsSnap.size}\n`);

		let count0 = 0;
		let count1 = 0;
		let countMulti = 0;

		for (const doc of problemsSnap.docs) {
			const data = doc.data();
			const examples = data.examples || [];
			const sampleCount = examples.filter(e => !!e.isSample).length;
			const hiddenCount = examples.filter(e => !e.isSample).length;
			const totalCount = examples.length;

			// Check if there are subcollections like 'testcases'
			const subcollections = await doc.ref.listCollections();
			const subColNames = subcollections.map(c => c.id);

			if (totalCount === 0) count0++;
			else if (totalCount === 1) count1++;
			else countMulti++;

			console.log(`Problem: [${doc.id}] "${data.title}"`);
			console.log(`  - Total examples stored in doc.examples: ${totalCount}`);
			console.log(`  - With isSample === true: ${sampleCount}`);
			console.log(`  - With isSample !== true: ${hiddenCount}`);
			if (subColNames.length > 0) {
				console.log(`  - Subcollections: ${subColNames.join(", ")}`);
				for (const col of subcollections) {
					const subSnap = await col.get();
					console.log(`    * ${col.id}: ${subSnap.size} documents`);
				}
			}
		}

		console.log("\n=== SUMMARY ===");
		console.log(`Total problems: ${problemsSnap.size}`);
		console.log(`Problems with 0 tests in doc.examples: ${count0}`);
		console.log(`Problems with 1 test in doc.examples: ${count1}`);
		console.log(`Problems with >1 tests in doc.examples: ${countMulti}`);

	} catch (error) {
		console.error("Diagnostic error:", error);
	}
}

run();
