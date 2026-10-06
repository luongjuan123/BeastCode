const admin = require("firebase-admin");

// Initialize Admin SDK
admin.initializeApp({
	projectId: "beastcode-7555e",
});

const db = admin.firestore();

function sanitizeAutofilledEmail(email) {
	const trimmed = email.trim();
	const atIndex = trimmed.indexOf("@");
	if (atIndex === -1) return trimmed;

	const username = trimmed.substring(0, atIndex);
	const domainPart = trimmed.substring(atIndex + 1);

	const match = domainPart.match(/^([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,6})(.*)$/);
	if (match) {
		const domainAndSub = match[1];
		const tld = match[2];
		const suffix = match[3];

		if (suffix) {
			const lowerUsername = username.toLowerCase();
			const lowerSuffix = suffix.toLowerCase();

			if (
				lowerUsername.startsWith(lowerSuffix) ||
				lowerUsername.endsWith(lowerSuffix) ||
				lowerSuffix.startsWith(lowerUsername)
			) {
				return `${username}@${domainAndSub}.${tld}`;
			}
		}
	}
	return trimmed;
}

async function testResolveRecipients(eventType, contestId, options = {}) {
	const senderEmail = (process.env.SMTP_USER || "bomemebo6996@gmail.com").toLowerCase().trim();
	const blacklist = ["dungpubgame@gmail.com", senderEmail];
	let resolved = [];

	console.log(`\n--- Resolving Recipients for Event: ${eventType}, Contest: ${contestId || "None"} ---`);

	// 1. Resolve Raw User Candidates
	if (options.targetUid) {
		const doc = await db.collection("users").doc(options.targetUid).get();
		if (doc.exists) {
			resolved.push({
				uid: doc.id,
				email: sanitizeAutofilledEmail(doc.data().email || "").toLowerCase().trim(),
				displayName: doc.data().displayName || doc.data().username || "User"
			});
		}
	} else if (
		contestId &&
		[
			"CONTEST_SOON",
			"CONTEST_STARTED",
			"CONTEST_ENDED"
		].includes(eventType)
	) {
		const partSnap = await db.collection("contest_participants")
			.where("contestId", "==", contestId)
			.get();

		const participantUids = partSnap.docs
			.map(doc => doc.data()?.uid)
			.filter(Boolean);

		console.log(`- Found ${participantUids.length} registered participant UIDs in Firestore.`);

		if (participantUids.length > 0) {
			const chunks = [];
			for (let i = 0; i < participantUids.length; i += 30) {
				chunks.push(participantUids.slice(i, i + 30));
			}

			for (const chunk of chunks) {
				const usersSnap = await db.collection("users")
					.where("__name__", "in", chunk)
					.get();

				usersSnap.forEach(doc => {
					const data = doc.data();
					resolved.push({
						uid: doc.id,
						email: sanitizeAutofilledEmail(data.email || "").toLowerCase().trim(),
						displayName: data.displayName || data.username || "User"
					});
				});
			}
		}
	} else {
		const usersSnap = await db.collection("users").get();
		usersSnap.forEach(doc => {
			const data = doc.data();
			console.log(`[DEBUG RAW] id: ${doc.id}, email: "${data.email}"`);
			resolved.push({
				uid: doc.id,
				email: sanitizeAutofilledEmail(data.email || "").toLowerCase().trim(),
				displayName: data.displayName || data.username || "User"
			});
		});
		console.log(`- Loaded ${resolved.length} global users from Firestore.`);
	}

	// 2. Format / Blacklist Filters
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	let eligible = resolved.filter(user => {
		if (!user.email || !emailRegex.test(user.email)) {
			console.log(`  * Filtered invalid email: "${user.email}" for uid ${user.uid}`);
			return false;
		}
		if (blacklist.includes(user.email)) {
			console.log(`  * Filtered blacklisted/sender email: "${user.email}"`);
			return false;
		}
		if (options.visibility === "university" && options.university) {
			const uni = options.university.toLowerCase().trim();
			if (!user.email.endsWith(`@${uni}`) && !user.email.endsWith(`.${uni}`)) {
				console.log(`  * Filtered non-university email: "${user.email}"`);
				return false;
			}
		}
		return true;
	});

	// 3. Category Preferences Check
	let category = null;
	if (["CONTEST_PUBLISHED", "VIRTUAL_MODE"].includes(eventType)) {
		category = "announcements";
	} else if (["CONTEST_SOON", "CONTEST_STARTED"].includes(eventType)) {
		category = "reminders";
	}

	if (category && eligible.length > 0) {
		const uids = eligible.map(u => u.uid);
		const prefMap = {};

		const chunks = [];
		for (let i = 0; i < uids.length; i += 30) {
			chunks.push(uids.slice(i, i + 30));
		}

		for (const chunk of chunks) {
			const snaps = await db.collection("users")
				.where("__name__", "in", chunk)
				.get();

			snaps.forEach(doc => {
				const data = doc.data() || {};
				const prefs = data.notificationPreferences || {};
				const val = prefs[category];
				let enabled = true;
				if (val !== undefined) {
					if (typeof val === "boolean") enabled = val;
					else if (typeof val === "object") enabled = val.email !== false;
				}
				prefMap[doc.id] = enabled;
			});
		}

		eligible = eligible.filter(user => {
			const allowed = prefMap[user.uid] !== false;
			if (!allowed) {
				console.log(`  * Filtered out user ${user.uid} (${user.email}) due to opt-out for ${category}`);
			}
			return allowed;
		});
	}

	// 4. Deduplicate
	const seen = new Set();
	eligible = eligible.filter(user => {
		if (seen.has(user.email)) return false;
		seen.add(user.email);
		return true;
	});

	// 5. Admin Test Mode Simulation
	if (options.testMode) {
		console.log(`- [Test Mode] Original recipient count: ${eligible.length}`);
		const testEmails = ["admin@leetcode.com", "juan@test.com", "admin@test.com"];
		eligible = testEmails.map((email, idx) => ({
			uid: `test_mode_user_${idx}`,
			email,
			displayName: `Test Recipient ${idx + 1}`
		}));
	}

	console.log(`- Final Eligible Recipients (${eligible.length}):`);
	eligible.forEach(u => console.log(`  * UID: ${u.uid}, Email: ${u.email}, Name: ${u.displayName}`));
	return eligible;
}

async function runTests() {
	try {
		// Test case 1: Contest Announcement (Global check)
		await testResolveRecipients("CONTEST_PUBLISHED", null);

		// Test case 2: Contest Reminder (Targeted check)
		await testResolveRecipients("CONTEST_SOON", "test-contest-slug-1781123366240");

		// Test case 3: Admin Test Mode Simulator
		await testResolveRecipients("CONTEST_PUBLISHED", null, { testMode: true });

	} catch (error) {
		console.error("Test execution failed:", error);
	}
}

runTests();
