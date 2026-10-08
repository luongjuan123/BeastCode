import admin from "firebase-admin";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach((line) => {
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

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

if (!admin.apps.length) {
	admin.initializeApp({
		projectId: process.env.FIREBASE_PROJECT_ID || "beastcode-7555e",
		credential: admin.credential.cert({
			projectId: process.env.FIREBASE_PROJECT_ID || "beastcode-7555e",
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: privateKey,
		}),
	});
}

async function testEndpoint() {
	const handler = (await import("../src/pages/api/leaderboard")).default;

	const createMockRes = () => {
		const res: any = {
			statusCode: 200,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			json(data: any) {
				this.data = data;
				return this;
			},
		};
		return res;
	};

	console.log("=== TEST 1: Default Global Query ===");
	const req1: any = { method: "GET", query: {}, body: {} };
	const res1 = createMockRes();
	await handler(req1, res1);

	console.log("Status:", res1.statusCode);
	console.log("totalItems:", res1.data.totalItems);
	console.log("totalPages:", res1.data.totalPages);
	console.log("returned users count:", res1.data.users?.length);
	console.log("Users in ranking list:");
	res1.data.users?.forEach((u: any) => {
		console.log(`  #${u.rank} [${u.uid}] ${u.displayName} - ${u.score} pts (${u.easyCount}E / ${u.mediumCount}M / ${u.hardCount}H)`);
	});

	console.log("\n=== TEST 2: Sort by XP ===");
	const req2: any = { method: "GET", query: { sortField: "xp" }, body: {} };
	const res2 = createMockRes();
	await handler(req2, res2);
	console.log("XP Sort totalItems:", res2.data.totalItems, "users count:", res2.data.users?.length);

	console.log("\n=== TEST 3: Search Handle 'nihao' ===");
	const req3: any = { method: "GET", query: { search: "nihao" }, body: {} };
	const res3 = createMockRes();
	await handler(req3, res3);
	console.log("Search target UID:", res3.data.highlightedUid);
	console.log("Search target page:", res3.data.page);
	console.log("Search target index:", res3.data.highlightedIndex);

	console.log("\n=== TEST 4: Country Filter (Vietnam 'VN') ===");
	const req4: any = { method: "GET", query: { country: "VN" }, body: {} };
	const res4 = createMockRes();
	await handler(req4, res4);
	console.log("VN Filter totalItems:", res4.data.totalItems);
}

testEndpoint().catch(console.error);
