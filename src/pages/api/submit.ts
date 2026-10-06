import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { runCode } from "./run";
import { calculateExperience } from "@/utils/experienceConfig";
import { withAuthAndModeration } from "@/utils/authMiddleware";
import { getRedisClient } from "@/utils/redis";
import { getProblemForGrading } from "@/utils/problemLoader";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const {
		uid,
		username,
		problemId,
		problemTitle,
		userCode,
		language,
		contestId,
		submissionId
	} = req.body;

	if (!uid || !problemId || !userCode || !language) {
		return res.status(400).json({ success: false, error: "Missing required fields" });
	}

	try {
		const db = getAdminFirestore();

		// Check moderation status: banned users cannot submit
		const modDoc = await db.collection("userModeration").doc(uid).get();
		if (modDoc.exists) {
			const modData = modDoc.data() || {};
			if (modData.status === "BANNED") {
				return res.status(403).json({ success: false, error: "Your account is currently suspended from submitting code." });
			}
		}

		// If this is a contest submission, validate participant standing
		if (contestId) {
			const partDoc = await db.collection("contest_participants").doc(`${contestId}_${uid}`).get();
			if (!partDoc.exists) {
				return res.status(403).json({ success: false, error: "You are not registered for this contest." });
			}
			const partData = partDoc.data() || {};
			if (partData.status === "terminated") {
				return res.status(403).json({ success: false, error: "Your participation in this contest has been terminated due to proctoring violations." });
			}
			if (partData.status !== "active") {
				return res.status(403).json({ success: false, error: "You must enter and join the contest before submitting solutions." });
			}
		}

		let finalVerdict = "Pending";
		let finalStatus = "pending";
		let finalScore = 0;
		let finalRuntime = 0;
		let finalMemory = 0;
		let finalResults: any[] = [];

		// 1. Create or use pre-created submission document with status
		const submissionCollection = contestId ? "contest_submissions" : "submissions";
		let docRef: any;
		if (submissionId) {
			docRef = db.collection(submissionCollection).doc(submissionId);
			await docRef.set({
				uid,
				username: username || "User",
				problemId,
				problemTitle: problemTitle || "",
				code: userCode,
				language,
				status: "queued",
				verdict: "Pending",
				score: 0,
				timestamp: Date.now(),
				testResults: [],
				...(contestId ? { contestId } : {})
			}, { merge: true });
		} else {
			docRef = await db.collection(submissionCollection).add({
				uid,
				username: username || "User",
				problemId,
				problemTitle: problemTitle || "",
				code: userCode,
				language,
				status: "pending",
				verdict: "Pending",
				score: 0,
				timestamp: Date.now(),
				testResults: [],
				...(contestId ? { contestId } : {})
			});
		}

		// 2. Process the submission inline so serverless environments don't kill the thread
		try {
			// Fetch problem details and authoritative grading suite
			const { problem, testcases, totalCount: gradingCount, error: problemError } = await getProblemForGrading(problemId);
			if (problemError === "PROBLEM_NOT_FOUND" || !problem) {
				console.error(`Problem ${problemId} not found in submission grading.`);
				await docRef.update({
					status: "failed",
					verdict: "Problem Not Found",
					timestamp: Date.now(),
					isTerminal: true
				});
				return res.status(404).json({ success: false, error: "Problem not found" });
			}

			if (problemError === "NO_GRADING_TESTCASES" || !testcases || testcases.length === 0) {
				console.error(`[GRADER ERROR] Problem ${problemId} has 0 grading testcases.`);
				await docRef.update({
					status: "failed",
					verdict: "Configuration Error",
					error: "Problem configuration error: no test cases configured for grading.",
					score: 0,
					timestamp: Date.now(),
					isTerminal: true
				});
				return res.status(400).json({
					success: false,
					error: "Problem configuration error: no test cases configured for grading."
				});
			}

			console.log(`[GRADER] problem=${problemId} loaded ${testcases.length} grading testcases`);
			
			// Determine points
			let points = problem.points || 100;
			if (contestId) {
				const cpSnap = await db.collection("contest_problems").doc(`${contestId}_${problemId}`).get();
				if (cpSnap.exists) {
					points = cpSnap.data()!.points || 100;
				}
			}

			let isFinished = false;

			// Run code execution with progress updates
			const executionResult = await runCode(problemId, userCode, language, testcases, false, async (stage, progress) => {
				if (isFinished) return;
				
				// Throttle progress updates to Firestore
				if (progress) {
					const isFirstOrLast = progress.current === 1 || progress.current === progress.total;
					const isMultipleOfTen = progress.current % 10 === 0;
					if (!isFirstOrLast && !isMultipleOfTen) {
						return; // skip write
					}
				}

				try {
					await db.runTransaction(async (tx) => {
						const subSnap = await tx.get(docRef) as any;
						if (subSnap.exists && subSnap.data()?.isTerminal) {
							return;
						}
						tx.update(docRef, {
							status: stage,
							...(progress ? { progress } : {})
						});
					});
				} catch (e: any) {
					console.error("Error updating progress:", e);
				}
			});

			isFinished = true;

			let score = 0;
			let status = "failed";
			let verdictStr = "";

			const pCount = executionResult.passedCount ?? 0;
			const tCount = executionResult.totalCount ?? testcases.length;
			const results = (executionResult.testResults || []).map((r, idx) => {
				const isSample = Boolean(testcases[idx]?.isSample);
				const cleanResult: any = {
					passed: r.passed,
					runtime: r.runtime || 0,
					memory: r.memory || 0
				};
				if (r.error) {
					cleanResult.error = r.error;
				}
				if (isSample) {
					cleanResult.input = r.input;
					cleanResult.expected = r.expected;
					cleanResult.actual = r.actual;
				} else {
					cleanResult.isSecret = true;
				}
				return cleanResult;
			});

			if (executionResult.success) {
				status = "passed";
				score = points;
				verdictStr = "Accepted";
			} else {
				status = "failed";
				score = Math.round((pCount / (tCount || 1)) * points);
				verdictStr = executionResult.isCompileError ? "Compilation Error" : (executionResult.error || "Wrong Answer");
			}

			// Update database records inside a single atomic transaction
			await db.runTransaction(async (transaction) => {
				const userRef = db.collection("users").doc(uid);
				const problemRef = db.collection("problems").doc(problemId);

				const userSnap = await transaction.get(userRef);
				const problemSnap = await transaction.get(problemRef);

				const userData = userSnap.exists ? (userSnap.data() || {}) : {};
				const problemDataFromDb = problemSnap.exists ? (problemSnap.data() || {}) : {};

				const solvedList: string[] = userData.solvedProblems || [];
				let easyCount = userData.easyCount || 0;
				let mediumCount = userData.mediumCount || 0;
				let hardCount = userData.hardCount || 0;
				let mlCount = userData.mlCount || 0;

				const difficulty = (problemDataFromDb.difficulty || "Easy").toLowerCase();
				let userUpdatePayload: any = null;

				if (executionResult.success) {
					if (!solvedList.includes(problemId)) {
						if (difficulty === "easy") {
							easyCount++;
						} else if (difficulty === "medium") {
							mediumCount++;
						} else if (difficulty === "hard") {
							hardCount++;
						} else if (difficulty === "ml") {
							mlCount++;
						}

						const contestParticipation = userData.contestParticipation || 0;
						const contestWins = userData.contestWins || 0;

						// Recalculate experience using config
						const expInfo = calculateExperience({
							easySolved: easyCount,
							mediumSolved: mediumCount,
							hardSolved: hardCount,
							mlSolved: mlCount,
							contestParticipation,
							contestWins,
						});

						const xp = expInfo.score;
						const experienceLevel = expInfo.currentTier.name;

						userUpdatePayload = {
							solvedProblems: FieldValue.arrayUnion(problemId),
							easyCount,
							mediumCount,
							hardCount,
							mlCount,
							score: xp,
							xp,
							experienceLevel,
						};
					}
				}

				if (!userSnap.exists) {
					const initialPayload = {
						uid,
						username: username || "User",
						solvedProblems: executionResult.success ? [problemId] : [],
						easyCount,
						mediumCount,
						hardCount,
						mlCount,
						score: userUpdatePayload ? userUpdatePayload.score : 0,
						xp: userUpdatePayload ? userUpdatePayload.xp : 0,
						experienceLevel: userUpdatePayload ? userUpdatePayload.experienceLevel : "Newbie",
						createdAt: Date.now()
					};
					transaction.set(userRef, initialPayload);
				} else if (userUpdatePayload) {
					transaction.update(userRef, userUpdatePayload);
				}

				if (!contestId) {
					const incrementSolved = (executionResult.success && !solvedList.includes(problemId)) ? 1 : 0;
					transaction.update(problemRef, {
						attempts: FieldValue.increment(1),
						...(incrementSolved > 0 ? { solved: FieldValue.increment(1) } : {})
					});
				}

				transaction.update(docRef, {
					status,
					score,
					verdict: verdictStr,
					testResults: results,
					timestamp: Date.now(),
					runtime: executionResult.runtime || 0,
					memory: executionResult.memory || 0,
					isTerminal: true
				});

				finalStatus = status;
				finalScore = score;
				finalVerdict = verdictStr;
				finalResults = results;
				finalRuntime = executionResult.runtime || 0;
				finalMemory = executionResult.memory || 0;
			});

			if (contestId) {
				try {
					const redis = getRedisClient();
					if (redis) {
						await redis.del(`contest:${contestId}:standings`);
						await redis.del(`contest:${contestId}:standings:frozen`);
						await redis.set(`contest:${contestId}:dirty`, "true", "EX", 15);
					}
				} catch (redisErr) {
					console.error("Error invalidating contest cache in Redis:", redisErr);
				}
			}
		} catch (backgroundErr) {
			console.error("Error running submission execution:", backgroundErr);
			finalStatus = "failed";
			finalVerdict = "Internal Error";
			await docRef.update({
				status: "failed",
				verdict: "Internal Error",
				timestamp: Date.now()
			});
		}

		// 3. Return the response to the client
		res.status(200).json({
			success: true,
			submissionId: docRef.id,
			verdict: finalVerdict,
			status: finalStatus,
			score: finalScore,
			runtime: finalRuntime,
			memory: finalMemory,
			testResults: finalResults,
			timestamp: Date.now()
		});

	} catch (err: any) {
		console.error("Submission trigger error:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
