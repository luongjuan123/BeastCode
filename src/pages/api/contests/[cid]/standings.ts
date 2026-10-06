import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { getRedisClient } from "@/utils/redis";
import { calculateStandingsRaw } from "@/utils/leaderboardCalc";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { ContestParticipantStanding } from "@/utils/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { cid } = req.query;
	const contestId = cid as string;

	// 1. Soft authentication to identify the caller (if logged in)
	let user: { uid: string; isAdmin: boolean; username?: string } | null = null;
	let idToken = "";
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		idToken = authHeader.substring(7);
	} else if (req.query.idToken) {
		idToken = req.query.idToken as string;
	}

	const db = getAdminFirestore();

	if (idToken) {
		try {
			const adminAuth = getAdminAuth();
			const decodedToken = await adminAuth.verifyIdToken(idToken);
			const uid = decodedToken.uid;
			const userDoc = await db.collection("users").doc(uid).get();
			if (userDoc.exists) {
				const userData = userDoc.data() || {};
				user = {
					uid,
					isAdmin: userData.isAdmin === true || userData.role === "admin",
					username: userData.username || userData.displayName || "Anonymous"
				};
			}
		} catch (err) {
			console.warn("Standings API: soft auth token verification failed:", err);
		}
	}

	// 2. Fetch contest config (needed to compute freeze time and check end time)
	const contestDoc = await db.collection("contests").doc(contestId).get();
	if (!contestDoc.exists) {
		return res.status(404).json({ success: false, error: "Contest not found." });
	}
	const contest = contestDoc.data() as any;
	const now = Date.now();

	const isEnded = now >= contest.endTime;
	const freezeDurationMs = (contest.leaderboardFreeze || 0) * 60000;
	const freezeTime = contest.endTime - freezeDurationMs;
	const isFrozenWindow = contest.leaderboardFreeze > 0 && now >= freezeTime && now < contest.endTime;

	// Check Condition B: admin or contest ended -> return live standings
	const serveLive = (user && user.isAdmin) || isEnded;

	const redis = getRedisClient();

	let standings: ContestParticipantStanding[] = [];

	if (redis) {
		try {
			// Check if standings are marked dirty in Redis
			const isDirty = await redis.get(`contest:${contestId}:dirty`);
			if (isDirty === "true") {
				await redis.del(`contest:${contestId}:standings`);
				await redis.del(`contest:${contestId}:standings:frozen`);
				await redis.del(`contest:${contestId}:dirty`);
			}

			if (serveLive) {
				// Condition B: get live standings
				const liveStandingsStr = await redis.get(`contest:${contestId}:standings`);
				if (liveStandingsStr) {
					standings = JSON.parse(liveStandingsStr);
				} else {
					// Cache miss fallback
					const liveData = await calculateStandingsRaw(contestId);
					if (liveData) {
						standings = liveData.standings;
						await redis.set(`contest:${contestId}:standings`, JSON.stringify(standings), "EX", 600);
					}
				}
			} else {
				// Condition A: get frozen standings
				const frozenStandingsStr = await redis.get(`contest:${contestId}:standings:frozen`);
				if (frozenStandingsStr) {
					standings = JSON.parse(frozenStandingsStr);
				} else {
					// Cache miss fallback
					const frozenData = await calculateStandingsRaw(contestId, isFrozenWindow ? freezeTime : undefined);
					if (frozenData) {
						standings = frozenData.standings;
						if (isFrozenWindow) {
							const freezeTTL = Math.max(600, Math.ceil((contest.endTime - now) / 1000) + 86400);
							await redis.set(`contest:${contestId}:standings:frozen`, JSON.stringify(standings), "EX", freezeTTL);
						}
					}
				}
			}
		} catch (redisErr) {
			console.error("Redis standings read failed, falling back to Firestore:", redisErr);
			// Fallback on Redis failure
			const fallbackResult = await calculateStandingsRaw(contestId, serveLive ? undefined : (isFrozenWindow ? freezeTime : undefined));
			if (fallbackResult) {
				standings = fallbackResult.standings;
			}
		}
	} else {
		// Fallback if Redis is offline / not configured
		const fallbackResult = await calculateStandingsRaw(contestId, serveLive ? undefined : (isFrozenWindow ? freezeTime : undefined));
		if (fallbackResult) {
			standings = fallbackResult.standings;
		}
	}

	// 3. If in frozen window, and requesting user is a standard logged-in participant:
	// Overlay the user's own live submissions dynamically
	if (isFrozenWindow && !serveLive && user) {
		try {
			const participantDoc = await db.collection("contest_participants")
				.doc(`${contestId}_${user.uid}`)
				.get();

			if (participantDoc.exists && participantDoc.data()?.status !== "terminated") {
				const pData = participantDoc.data() || {};
				const isVirtual = pData.isVirtual === true;
				const participantStartTime = isVirtual && pData.virtualStartTime ? pData.virtualStartTime : contest.startTime;
				const participantEndTime = isVirtual && pData.virtualStartTime
					? pData.virtualStartTime + contest.duration * 60000
					: contest.endTime;
				const penaltyK = contest.penaltyRules?.minutesPerIncorrect ?? 20;

				const userSubsSnap = await db.collection("contest_submissions")
					.where("contestId", "==", contestId)
					.where("uid", "==", user.uid)
					.orderBy("timestamp", "asc")
					.get();

				const liveUserStanding: ContestParticipantStanding = {
					uid: user.uid,
					username: pData.username || user.username || "Anonymous",
					totalScore: 0,
					totalPenalty: 0,
					problemResults: {}
				};

				for (const subDoc of userSubsSnap.docs) {
					const sub = subDoc.data();
					const isWithinWindow = sub.timestamp >= participantStartTime && sub.timestamp < participantEndTime;
					if (!isWithinWindow) continue;

					const pid = sub.problemId;
					if (!liveUserStanding.problemResults[pid]) {
						liveUserStanding.problemResults[pid] = {
							solved: false,
							score: 0,
							penalty: 0,
							incorrectAttempts: 0
						};
					}

					const state = liveUserStanding.problemResults[pid];
					if (!state.solved) {
						if (sub.status === "passed") {
							state.solved = true;
							state.score = sub.score || 0;
							const elapsedMinutes = Math.max(0, Math.floor((sub.timestamp - participantStartTime) / 60000));
							state.solvedTime = sub.timestamp;
							state.penalty = elapsedMinutes + (state.incorrectAttempts * penaltyK);

							liveUserStanding.totalScore += state.score;
							liveUserStanding.totalPenalty += state.penalty;
						} else {
							state.incorrectAttempts++;
						}
					}
				}

				// Overlay user row onto the standings array
				const userIndex = standings.findIndex(s => s.uid === user?.uid);
				if (userIndex !== -1) {
					standings[userIndex] = liveUserStanding;
				} else {
					standings.push(liveUserStanding);
				}

				// Re-sort standings
				standings.sort((a, b) => {
					if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
					if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty;
					return a.username.localeCompare(b.username);
				});
			}
		} catch (overlayErr) {
			console.error("Failed to overlay live participant stats during freeze:", overlayErr);
		}
	}

	// 4. Assign ranks based on the final array
	const rankedStandings = standings.map((row, index) => ({
		...row,
		rank: index + 1
	}));

	return res.status(200).json({
		success: true,
		standings: rankedStandings,
		isFrozen: isFrozenWindow && !serveLive
	});
}

export default withApiErrorHandler(handler);
