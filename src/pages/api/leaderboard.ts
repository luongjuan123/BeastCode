import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

const PAGE_SIZE = 100;

interface LeaderboardUser {
	uid: string;
	displayName: string;
	avatarUrl?: string;
	school: string;
	country: string;
	score: number;
	xp: number;
	rating: number;
	contestRating: number;
	mlRating: number;
	problemSolvingRating: number;
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	rank?: number;
}

function extractIndexUrl(msg: string): string {
	const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s']+/);
	return match ? match[0] : "";
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const db = getAdminFirestore();

	// Parse inputs
	const queryData = req.method === "POST" ? req.body : req.query;
	const sortField = (queryData.sortField as string) || "score";
	const countryFilter = (queryData.country as string) || "";
	const schoolFilter = (queryData.school as string) || "";
	const searchQuery = (queryData.search as string) || "";
	const jumpToUid = (queryData.jumpToUid as string) || "";
	
	let friendsList: string[] = [];
	if (queryData.friends) {
		if (Array.isArray(queryData.friends)) {
			friendsList = queryData.friends;
		} else if (typeof queryData.friends === "string") {
			friendsList = queryData.friends.split(",").map((f: string) => f.trim()).filter(Boolean);
		}
	}

	let page = parseInt(queryData.page as string) || 1;
	if (page < 1) page = 1;

	// Validate sort field
	const validSortFields = ["score", "xp", "rating", "contestRating", "mlRating", "problemSolvingRating"];
	if (!validSortFields.includes(sortField)) {
		return res.status(400).json({ error: "Invalid sortField" });
	}

	let warning = "";
	let indexCreationUrl = "";

	try {
		// Helper function to build query with filters
		const buildFilteredQuery = (baseRef: any) => {
			let q = baseRef;
			if (countryFilter) {
				q = q.where("country", "==", countryFilter);
			}
			if (schoolFilter) {
				q = q.where("school", "==", schoolFilter);
			}
			if (friendsList.length > 0) {
				if (friendsList.length <= 30) {
					q = q.where("__name__", "in", friendsList);
				}
			}
			return q;
		};

		// 1. Resolve Target User UID if Search or Jump-to is active
		let targetUid = jumpToUid;
		if (searchQuery && !targetUid) {
			// Search for user starting with or matching search text
			const searchSnap = await db.collection("users")
				.where("displayName", ">=", searchQuery)
				.where("displayName", "<=", searchQuery + "\uf8ff")
				.limit(1)
				.get();

			if (!searchSnap.empty) {
				targetUid = searchSnap.docs[0].id;
			}
		}

		// 2. If we have a target user, compute their rank and page
		let targetPage = page;
		let targetUserIndexOnPage = -1;

		if (targetUid) {
			const targetSnap = await db.collection("users").doc(targetUid).get();
			if (targetSnap.exists) {
				const targetData = targetSnap.data() || {};
				const targetVal = targetData[sortField] !== undefined ? targetData[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
				const targetName = targetData.displayName || "";

				// Compute rank within current filters
				let countMoreQuery = db.collection("users").where(sortField, ">", targetVal);
				let countEqualQuery = db.collection("users").where(sortField, "==", targetVal).where("displayName", "<", targetName);

				countMoreQuery = buildFilteredQuery(countMoreQuery);
				countEqualQuery = buildFilteredQuery(countEqualQuery);

				let countMore = 0;
				let countEqual = 0;

				try {
					const moreSnap = await countMoreQuery.count().get();
					countMore = moreSnap.data().count;
				} catch (err: any) {
					console.warn("Failed countMoreQuery:", err.message);
				}

				try {
					const equalSnap = await countEqualQuery.count().get();
					countEqual = equalSnap.data().count;
				} catch (err: any) {
					if (err.message && err.message.includes("index")) {
						warning = "Missing index for tie-breaker rank calculation.";
						indexCreationUrl = extractIndexUrl(err.message);
						console.warn(`[LEADERBOARD INDEX WARNING] Rank tie-breaker index missing. You can create it here: ${indexCreationUrl}`);
					}
				}

				const calculatedRank = countMore + countEqual + 1;
				targetPage = Math.ceil(calculatedRank / PAGE_SIZE);
				targetUserIndexOnPage = (calculatedRank - 1) % PAGE_SIZE;
				page = targetPage; // Force jump to this page
			}
		}

		// 3. Get total filtered count
		let totalItems = 0;
		try {
			let totalCountQuery = db.collection("users");
			totalCountQuery = buildFilteredQuery(totalCountQuery);
			const totalCountSnap = await totalCountQuery.count().get();
			totalItems = totalCountSnap.data().count;
		} catch (err: any) {
			console.warn("Failed totalItems count query:", err.message);
			totalItems = 1000;
		}

		const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

		if (page > totalPages) {
			page = totalPages;
		}

		const offset = (page - 1) * PAGE_SIZE;

		// 4. Fetch the target page users with fallbacks
		let docs: any[] = [];
		const users: LeaderboardUser[] = [];
		let isInMemorySorted = false;

		try {
			// Tier 1: Optimal Query (with both score sort and displayName tie-breaker)
			let leaderboardQuery = db.collection("users")
				.orderBy(sortField, "desc")
				.orderBy("displayName", "asc");

			leaderboardQuery = buildFilteredQuery(leaderboardQuery);
			const querySnap = await leaderboardQuery
				.offset(offset)
				.limit(PAGE_SIZE)
				.get();
			docs = querySnap.docs;
		} catch (error: any) {
			if (error.message && error.message.includes("index")) {
				indexCreationUrl = indexCreationUrl || extractIndexUrl(error.message);
				console.warn(`[LEADERBOARD INDEX WARNING] Primary query failed. Missing composite index: ${indexCreationUrl}`);

				try {
					// Tier 2: Fallback to single orderBy field (requires 0 indexes if no filters)
					let fallbackQuery = db.collection("users")
						.orderBy(sortField, "desc");

					fallbackQuery = buildFilteredQuery(fallbackQuery);
					const querySnap = await fallbackQuery
						.offset(offset)
						.limit(PAGE_SIZE)
						.get();
					docs = querySnap.docs;
					warning = "Sorting tie-breakers are currently simplified.";
				} catch (err2: any) {
					console.warn("[LEADERBOARD INDEX WARNING] Tier 2 fallback failed. Running in-memory sorting fallback.");

					try {
						// Tier 3: Fetch filter matches without orderBy, sort in memory (caps at 500 records)
						let fallbackQuery = db.collection("users");
						fallbackQuery = buildFilteredQuery(fallbackQuery);
						const tempSnap = await fallbackQuery.limit(500).get();

						const allUsers = tempSnap.docs.map((docSnap) => ({
							id: docSnap.id,
							...docSnap.data()
						}));

						// Sort in-memory
						allUsers.sort((a: any, b: any) => {
							const valA = a[sortField] !== undefined ? a[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
							const valB = b[sortField] !== undefined ? b[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
							if (valA !== valB) return valB - valA;
							const nameA = a.displayName || "";
							const nameB = b.displayName || "";
							return nameA.localeCompare(nameB);
						});

						// Paginate sliced list
						const sliced = allUsers.slice(offset, offset + PAGE_SIZE);
						sliced.forEach((data: any, idx) => {
							users.push({
								uid: data.id,
								displayName: data.displayName || "Anonymous User",
								avatarUrl: data.avatarUrl || undefined,
								school: data.school || "BeastCode University",
								country: data.country || "United States",
								score: data.score || 0,
								xp: data.xp || 0,
								rating: data.rating !== undefined ? data.rating : 1500,
								contestRating: data.contestRating !== undefined ? data.contestRating : 1500,
								mlRating: data.mlRating !== undefined ? data.mlRating : 1000,
								problemSolvingRating: data.problemSolvingRating !== undefined ? data.problemSolvingRating : 1000,
								easyCount: data.easyCount || 0,
								mediumCount: data.mediumCount || 0,
								hardCount: data.hardCount || 0,
								rank: offset + idx + 1
							});
						});

						isInMemorySorted = true;
						warning = "Filters are running in compatibility mode.";
					} catch (err3: any) {
						console.error("[LEADERBOARD INDEX ERROR] All query fallbacks failed:", err3.message);
						
						// Tier 4: Global fallback (unfiltered, sorted by metric only, zero indexes needed)
						const globalSnap = await db.collection("users")
							.orderBy(sortField, "desc")
							.offset(offset)
							.limit(PAGE_SIZE)
							.get();
						docs = globalSnap.docs;
						warning = "Filters are currently unavailable. Showing global rankings.";
					}
				}
			} else {
				throw error; // Rethrow other unexpected errors
			}
		}

		if (!isInMemorySorted) {
			let currentRank = offset + 1;
			docs.forEach((docSnap) => {
				const data = docSnap.data();
				users.push({
					uid: docSnap.id,
					displayName: data.displayName || "Anonymous User",
					avatarUrl: data.avatarUrl || undefined,
					school: data.school || "BeastCode University",
					country: data.country || "United States",
					score: data.score || 0,
					xp: data.xp || 0,
					rating: data.rating !== undefined ? data.rating : 1500,
					contestRating: data.contestRating !== undefined ? data.contestRating : 1500,
					mlRating: data.mlRating !== undefined ? data.mlRating : 1000,
					problemSolvingRating: data.problemSolvingRating !== undefined ? data.problemSolvingRating : 1000,
					easyCount: data.easyCount || 0,
					mediumCount: data.mediumCount || 0,
					hardCount: data.hardCount || 0,
					rank: currentRank++
				});
			});
		}

		return res.status(200).json({
			users,
			page,
			totalPages,
			totalItems,
			pageSize: PAGE_SIZE,
			highlightedUid: targetUid,
			highlightedIndex: targetUid ? users.findIndex(u => u.uid === targetUid) : -1,
			warning: warning || undefined,
			indexCreationUrl: indexCreationUrl || undefined
		});

	} catch (error: any) {
		console.error("Leaderboard API error:", error);
		return res.status(500).json({
			error: "Failed to load leaderboard. Please make sure database indexes are created.",
			details: error.message
		});
	}
}

export default withApiErrorHandler(handler);
