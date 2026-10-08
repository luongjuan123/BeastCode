import admin from "firebase-admin";
import fs from "fs";
import { calculateExperience } from "../src/utils/experienceConfig";
import { isTestAccount } from "../src/utils/rankingEligibility";

// Read env variables manually
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

const db = admin.firestore();

async function reconcileRankings() {
	console.log("==================================================");
	console.log("   BEASTCODE DATABASE RECONCILIATION & AUDIT      ");
	console.log("==================================================");

	// 1. Fetch problem difficulties
	const problemsSnap = await db.collection("problems").get();
	const problemDifficultyMap: Record<string, string> = {
		"two-sum": "easy",
		"reverse-linked-list": "hard",
		"jump-game": "medium",
		"valid-parentheses": "easy",
		"search-a-2d-matrix": "medium",
	};
	problemsSnap.forEach((doc) => {
		const data = doc.data();
		problemDifficultyMap[doc.id] = (data.difficulty || "medium").toLowerCase();
	});
	console.log(`Loaded ${Object.keys(problemDifficultyMap).length} problem difficulties.`);

	// 2. Fetch moderation records
	const modSnap = await db.collection("userModeration").get();
	const modMap: Record<string, any> = {};
	modSnap.forEach((doc) => {
		modMap[doc.id] = doc.data();
	});
	console.log(`Loaded ${Object.keys(modMap).length} moderation records.`);

	// 3. Fetch all users
	const usersSnap = await db.collection("users").get();
	console.log(`Auditing ${usersSnap.size} user documents...\n`);

	let realUsersUpdated = 0;
	let testUsersTagged = 0;
	let batch = db.batch();
	let opsCount = 0;
	const BATCH_LIMIT = 400;

	const eligibleUsersSummary: any[] = [];
	const testFixturesSummary: any[] = [];

	for (const docSnap of usersSnap.docs) {
		const data = docSnap.data();
		const uid = docSnap.id;
		const email = data.email || "";
		const mod = modMap[uid] || {};

		const isTest = isTestAccount(uid, email);

		if (isTest) {
			// Tag test fixtures safely
			batch.set(
				docSnap.ref,
				{
					isTest: true,
					status: "TEST_FIXTURE",
					updatedAt: Date.now(),
				},
				{ merge: true }
			);
			testUsersTagged++;
			opsCount++;
			testFixturesSummary.push({ uid, email, displayName: data.displayName });
		} else {
			// Real platform member: reconcile solve stats & scores
			const solvedProblems: string[] = Array.isArray(data.solvedProblems) ? data.solvedProblems : [];

			let easyCount = 0;
			let mediumCount = 0;
			let hardCount = 0;
			let mlCount = 0;

			solvedProblems.forEach((pid) => {
				const diff = problemDifficultyMap[pid];
				if (diff === "easy") easyCount++;
				else if (diff === "medium") mediumCount++;
				else if (diff === "hard") hardCount++;
				else if (diff === "ml") mlCount++;
			});

			// If existing user document has verified counts, use them if higher
			if (typeof data.easyCount === "number" && data.easyCount > easyCount) {
				easyCount = data.easyCount;
			}
			if (typeof data.mediumCount === "number" && data.mediumCount > mediumCount) {
				mediumCount = data.mediumCount;
			}
			if (typeof data.hardCount === "number" && data.hardCount > hardCount) {
				hardCount = data.hardCount;
			}
			if (typeof data.mlCount === "number" && data.mlCount > mlCount) {
				mlCount = data.mlCount;
			}

			const contestParticipation = typeof data.contestParticipation === "number" ? data.contestParticipation : 0;
			const contestWins = typeof data.contestWins === "number" ? data.contestWins : 0;

			const expInfo = calculateExperience({
				easySolved: easyCount,
				mediumSolved: mediumCount,
				hardSolved: hardCount,
				mlSolved: mlCount,
				contestParticipation,
				contestWins,
			});

			const calculatedScore = expInfo.score;
			const calculatedXp = expInfo.score;
			const experienceLevel = expInfo.currentTier.name;

			// Determine status based on moderation record
			let status = data.status || "ACTIVE";
			if (mod.status === "BANNED" || mod.status === "SUSPENDED" || mod.status === "PENDING_DELETION") {
				if (mod.expiresAt && Date.now() > mod.expiresAt) {
					status = "ACTIVE";
				} else {
					status = mod.status;
				}
			}

			const updatePayload: Record<string, any> = {
				isTest: false,
				score: calculatedScore,
				xp: calculatedXp,
				easyCount,
				mediumCount,
				hardCount,
				mlCount,
				experienceLevel,
				rating: typeof data.rating === "number" ? data.rating : 1500,
				contestRating: typeof data.contestRating === "number" ? data.contestRating : 1500,
				mlRating: typeof data.mlRating === "number" ? data.mlRating : 1000,
				problemSolvingRating: typeof data.problemSolvingRating === "number" ? data.problemSolvingRating : 1000,
				country: typeof data.country === "string" ? data.country : "",
				school: typeof data.school === "string" ? data.school : "",
				status,
				updatedAt: Date.now(),
			};

			batch.set(docSnap.ref, updatePayload, { merge: true });
			realUsersUpdated++;
			opsCount++;

			eligibleUsersSummary.push({
				uid,
				displayName: data.displayName || data.username || "Anonymous",
				email,
				score: calculatedScore,
				easy: easyCount,
				medium: mediumCount,
				hard: hardCount,
				status,
			});
		}

		if (opsCount >= BATCH_LIMIT) {
			await batch.commit();
			batch = db.batch();
			opsCount = 0;
		}
	}

	if (opsCount > 0) {
		await batch.commit();
	}

	console.log("==================================================");
	console.log(`Reconciliation Complete!`);
	console.log(`- Real Platform Members Reconciled: ${realUsersUpdated}`);
	console.log(`- Automated Test Fixtures Tagged:   ${testUsersTagged}`);
	console.log("==================================================\n");

	// Sort eligible users by score desc, displayName asc
	eligibleUsersSummary.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return (a.displayName || "").localeCompare(b.displayName || "");
	});

	console.log("ELIGIBLE RANKING MEMBERS:");
	eligibleUsersSummary.forEach((u, i) => {
		console.log(`  #${i + 1} [${u.uid}] ${u.displayName} (${u.email}) - ${u.score} pts (${u.easy}E / ${u.medium}M / ${u.hard}H) [${u.status}]`);
	});

	console.log("\nTAGGED TEST FIXTURES:");
	testFixturesSummary.forEach((u, i) => {
		console.log(`  ${i + 1}. [${u.uid}] ${u.displayName} (${u.email})`);
	});
}

reconcileRankings().catch(console.error);
