import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { calculateExperience } from "@/utils/experienceConfig";
import { getCountryCode } from "@/utils/countryData";
import { slugify } from "@/utils/slugify";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const db = getAdminFirestore();

		// --- DATABASE SELF-HEAL MIGRATION ---
		const problemsCollection = db.collection("problems");
		const allProblemsSnap = await problemsCollection.get();
		
		const remappedIds: Record<string, string> = {};
		const existingSlugs = new Set<string>();

		// Helper to find a unique slug if there is a collision
		const getUniqueSlug = (baseSlug: string, currentDocId: string) => {
			let uniqueSlug = baseSlug;
			let counter = 1;
			while (existingSlugs.has(uniqueSlug) && uniqueSlug !== currentDocId) {
				uniqueSlug = `${baseSlug}-${counter}`;
				counter++;
			}
			return uniqueSlug;
		};

		// A. Audit and migrate each problem
		for (const docSnap of allProblemsSnap.docs) {
			const data = docSnap.data();
			const originalId = docSnap.id;

			// Validate if the document ID is already a valid slug format
			const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
			const isIdValidSlug = slugRegex.test(originalId);

			const titleVal = (data.title || originalId).trim();
			const baseSlug = slugify(titleVal);

			let canonicalSlug = originalId;
			if (!isIdValidSlug) {
				canonicalSlug = getUniqueSlug(baseSlug, originalId);
			}

			existingSlugs.add(canonicalSlug);

			const dbTags = data.tags && Array.isArray(data.tags)
				? data.tags
				: [];

			const cleanedData = {
				...data,
				id: canonicalSlug,
				slug: canonicalSlug,
				title: titleVal,
				createdAt: data.createdAt || Date.now(),
				updatedAt: data.updatedAt || Date.now(),
				difficulty: data.difficulty || "Medium",
				tags: dbTags,
			};

			if (canonicalSlug !== originalId) {
				// Move problem to new ID
				await problemsCollection.doc(canonicalSlug).set(cleanedData);
				await problemsCollection.doc(originalId).delete();
				remappedIds[originalId] = canonicalSlug;
				console.log(`[Migration] Migrated problem "${originalId}" to "${canonicalSlug}"`);

				// Update contest_problems
				const cpSnap = await db.collection("contest_problems").where("problemId", "==", originalId).get();
				for (const cpDoc of cpSnap.docs) {
					const cpData = cpDoc.data();
					const newCpId = `${cpData.contestId}_${canonicalSlug}`;
					await db.collection("contest_problems").doc(newCpId).set({
						...cpData,
						problemId: canonicalSlug,
					});
					await db.collection("contest_problems").doc(cpDoc.id).delete();
				}

				// Update submissions
				const subSnap = await db.collection("submissions").where("problemId", "==", originalId).get();
				const subBatch = db.batch();
				subSnap.forEach((subDoc) => {
					subBatch.update(subDoc.ref, { problemId: canonicalSlug });
				});
				if (!subSnap.empty) {
					await subBatch.commit();
				}

				// Update contest_submissions
				const csubSnap = await db.collection("contest_submissions").where("problemId", "==", originalId).get();
				const csubBatch = db.batch();
				csubSnap.forEach((csubDoc) => {
					csubBatch.update(csubDoc.ref, { problemId: canonicalSlug });
				});
				if (!csubSnap.empty) {
					await csubBatch.commit();
				}
			} else {
				// Self-heal fields in-place if data is incomplete
				const needsSelfHeal = 
					data.id !== originalId ||
					data.slug !== originalId ||
					!data.createdAt ||
					!data.updatedAt ||
					!data.difficulty ||
					!data.tags;

				if (needsSelfHeal) {
					await problemsCollection.doc(originalId).set(cleanedData);
					console.log(`[Migration] Self-healed problem fields in-place for "${originalId}"`);
				}
			}
		}

		// Helper to capitalize slug words for nice title
		const slugToTitle = (slug: string) => {
			return slug
				.split("-")
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");
		};

		// B. Audit contest_problems to restore missing referenced problems as placeholders
		const allContestProblemsSnap = await db.collection("contest_problems").get();
		for (const cpDoc of allContestProblemsSnap.docs) {
			const cpData = cpDoc.data();
			const problemId = cpData.problemId;

			// Verify if problem document exists in DB
			const probSnap = await problemsCollection.doc(problemId).get();
			if (!probSnap.exists) {
				// Recreate placeholder problem
				const title = slugToTitle(problemId);
				const placeholderData = {
					id: problemId,
					slug: problemId,
					title,
					difficulty: cpData.difficulty || "Medium",
					tags: [],
					problemStatement: `This challenge description for ${title} is pending.`,
					description: "",
					language: "English",
					inputFormat: "",
					outputFormat: "",
					constraints: "",
					moderators: [],
					starterCode: "function solve() {\n  // Write your code here\n}",
					starterFunctionName: "solve",
					handlerFunction: "() => true",
					executionProfile: "javascript",
					customTimeoutMs: 5000,
					customMemoryLimitMb: 256,
					customMaxOutputSizeChars: 65536,
					customCpuCount: 1,
					customDiskLimitMb: 50,
					customProcessLimit: 15,
					examples: [],
					likes: 0,
					dislikes: 0,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};
				await problemsCollection.doc(problemId).set(placeholderData);
				existingSlugs.add(problemId);
				console.log(`[Migration] Restored placeholder problem for orphaned contest problem ID: "${problemId}"`);
			}
		}

		// 2. Collect all valid problem IDs and difficulties from Firestore (post-migration)
		const problemsSnap = await db.collection("problems").get();
		const difficultyMap: Record<string, string> = {};
		problemsSnap.forEach((doc) => {
			const data = doc.data();
			if (data.difficulty) {
				difficultyMap[doc.id] = data.difficulty.toLowerCase();
			}
		});

		// 3. Fetch all users
		const usersSnap = await db.collection("users").get();
		const countries = ["US", "CA", "GB", "VN", "SG", "AU", "DE", "FR", "JP"];

		// 4. Batch-write cleaned stats
		const BATCH_SIZE = 400;
		let batch = db.batch();
		let opsInBatch = 0;
		let usersUpdated = 0;

		const allUids = usersSnap.docs.map(doc => doc.id);

		for (const userDoc of usersSnap.docs) {
			const data = userDoc.data();
			const stored: string[] = data.solvedProblems || [];
			
			// Remap old IDs to new IDs if present in remappedIds
			const remappedStored = stored.map((id) => remappedIds[id] || id);
			const cleaned = remappedStored.filter((id) => id in difficultyMap);

			let easyCount = 0;
			let mediumCount = 0;
			let hardCount = 0;
			let mlCount = data.mlCount || 0;

			cleaned.forEach((probId) => {
				const diff = difficultyMap[probId];
				if (diff === "easy") easyCount++;
				else if (diff === "medium") mediumCount++;
				else if (diff === "hard") hardCount++;
				else if (diff === "ml") mlCount++;
			});

			const contestParticipation = data.contestParticipation || 0;
			const contestWins = data.contestWins || 0;

			// Calculate experience automatically using config
			const expInfo = calculateExperience({
				easySolved: easyCount,
				mediumSolved: mediumCount,
				hardSolved: hardCount,
				mlSolved: mlCount,
				contestParticipation,
				contestWins
			});

			const xp = expInfo.score;
			const experienceLevel = expInfo.currentTier.name;

			const rating = data.rating !== undefined ? data.rating : 1500;
			const contestRating = data.contestRating !== undefined ? data.contestRating : 1500;
			const mlRating = data.mlRating !== undefined ? data.mlRating : 1000;
			const problemSolvingRating = data.problemSolvingRating !== undefined ? data.problemSolvingRating : 1000;

			// Seed an ISO country code based on user's display name or index
			const seededCountryCode = countries[Math.abs(userDoc.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % countries.length];
			// Migrate old country string to safe Alpha-2 ISO country code
			const country = getCountryCode(data.country || seededCountryCode);
			const school = data.school || "BeastCode University";

			// Deterministically select up to 3 friends from other users
			const friends = allUids.filter(uid => uid !== userDoc.id).slice(0, 3);

			batch.set(userDoc.ref, {
				solvedProblems: cleaned,
				score: xp, // update score to align with xp
				easyCount,
				mediumCount,
				hardCount,
				mlCount,
				xp,
				experienceLevel,
				rating,
				contestRating,
				mlRating,
				problemSolvingRating,
				country,
				school,
				friends
			}, { merge: true });

			usersUpdated++;
			opsInBatch++;

			if (opsInBatch >= BATCH_SIZE) {
				await batch.commit();
				batch = db.batch();
				opsInBatch = 0;
			}
		}

		if (opsInBatch > 0) {
			await batch.commit();
		}

		return res.status(200).json({
			success: true,
			validProblemCount: Object.keys(difficultyMap).length,
			usersUpdated,
		});
	} catch (err: any) {
		console.error("recount-solved error:", err);
		return res.status(500).json({ error: err.message || "Internal server error" });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
