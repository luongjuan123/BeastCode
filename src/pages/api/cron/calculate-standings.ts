import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { getRedisClient } from "@/utils/redis";
import { calculateStandingsRaw } from "@/utils/leaderboardCalc";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	// 1. Authorize: via valid CRON_SECRET or Platform Admin Bearer token
	let isAuthorized = false;
	const cronSecret = process.env.CRON_SECRET;
	const reqSecret = req.query.secret || req.headers["x-cron-secret"];
	if (cronSecret && reqSecret === cronSecret) {
		isAuthorized = true;
	} else {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			const token = authHeader.split("Bearer ")[1];
			try {
				const decoded = await getAdminAuth().verifyIdToken(token, true);
				const adminCheck = await verifyPlatformAdmin(decoded.uid, decoded);
				if (adminCheck.isPlatformAdmin) {
					isAuthorized = true;
				}
			} catch {
				// unauthorized
			}
		}
	}

	if (!isAuthorized) {
		return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing authorization" });
	}

	const redis = getRedisClient();
	if (!redis) {
		return res.status(503).json({ success: false, error: "Redis cache is offline or not configured." });
	}

	try {
		const db = getAdminFirestore();
		const now = Date.now();

		// Fetch contests starting before now and not ended more than 5 minutes ago
		const contestsSnap = await db.collection("contests")
			.where("startTime", "<=", now)
			.get();

		const activeOrRecentContests = contestsSnap.docs
			.map(doc => ({ id: doc.id, ...(doc.data() as any) }))
			.filter(c => c.endTime >= now - 300000); // ended within last 5 minutes

		const processed: string[] = [];

		for (const contest of activeOrRecentContests) {
			const dirtyKey = `contest:${contest.id}:dirty`;
			const standingsKey = `contest:${contest.id}:standings`;
			const frozenKey = `contest:${contest.id}:standings:frozen`;

			const isDirty = await redis.get(dirtyKey);
			const hasStandings = await redis.exists(standingsKey);

			// Recalculate if dirty flag is set OR cache is completely missing
			if (isDirty === "true" || !hasStandings) {
				// Clear dirty flag immediately to prevent duplicate runs
				await redis.del(dirtyKey);

				// Compute live standings
				const liveData = await calculateStandingsRaw(contest.id);
				if (liveData) {
					await redis.set(standingsKey, JSON.stringify(liveData.standings), "EX", 600);
					processed.push(`${contest.id} (live)`);
				}
			}

			// Freeze window check
			if (contest.leaderboardFreeze > 0) {
				const freezeTime = contest.endTime - (contest.leaderboardFreeze * 60000);
				if (now >= freezeTime) {
					const hasFrozen = await redis.exists(frozenKey);
					if (!hasFrozen) {
						// Lock the frozen standings
						const frozenData = await calculateStandingsRaw(contest.id, freezeTime);
						if (frozenData) {
							const freezeTTL = Math.max(600, Math.ceil((contest.endTime - now) / 1000) + 86400); // expire 24h after contest
							await redis.set(frozenKey, JSON.stringify(frozenData.standings), "EX", freezeTTL);
							processed.push(`${contest.id} (frozen locked)`);
						}
					}
				}
			}
		}

		return res.status(200).json({ success: true, processed });
	} catch (error: any) {
		console.error("Cron calculate-standings failed:", error);
		return res.status(500).json({ success: false, error: error.message });
	}
}

export default withApiErrorHandler(handler);
