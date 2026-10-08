import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { isEligibleRankingUser, formatRankingUser, LeaderboardUser } from "@/utils/rankingEligibility";
import { FieldPath } from "firebase-admin/firestore";

const PAGE_SIZE = 100;

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
		// Helper function to build query with filters on top of base query
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
					q = q.where(FieldPath.documentId(), "in", friendsList);
				}
			}
			return q;
		};

		// 1. Authoritative Base Filter: Only genuine platform members (exclude test fixtures)
		let baseEligibleQuery: any = db.collection("users").where("isTest", "==", false);
		baseEligibleQuery = buildFilteredQuery(baseEligibleQuery);

		// 2. Authoritative Count Calculation
		let totalItems = 0;
		try {
			const countSnap = await baseEligibleQuery.count().get();
			totalItems = countSnap.data().count;
		} catch (countErr: any) {
			console.warn("Fast count aggregation failed, fallback to counting eligible docs:", countErr.message);
			const fallbackSnap = await baseEligibleQuery.get();
			totalItems = fallbackSnap.size;
		}

		// 3. Resolve Target User UID if Search or Jump-to is active
		let targetUid = jumpToUid;
		if (searchQuery && !targetUid) {
			const searchLower = searchQuery.toLowerCase().trim();
			// Query eligible users snapshot to find case-insensitive match on displayName or username
			const searchEligibleSnap = await baseEligibleQuery.limit(500).get();
			for (const d of searchEligibleSnap.docs) {
				const uData = d.data();
				const dName = (uData.displayName || "").toLowerCase();
				const uName = (uData.username || "").toLowerCase();
				if (dName.includes(searchLower) || uName.includes(searchLower) || d.id === searchQuery) {
					targetUid = d.id;
					break;
				}
			}
		}

		// 4. If we have a target user, compute their exact rank and target page
		if (targetUid) {
			const targetSnap = await db.collection("users").doc(targetUid).get();
			const targetData = targetSnap.data() || {};
			if (targetSnap.exists && isEligibleRankingUser({ uid: targetSnap.id, ...targetData })) {
				const targetVal = typeof targetData[sortField] === "number" ? targetData[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
				const targetName = targetData.displayName || targetData.username || "";

				// Count eligible users with strictly greater value, or equal value with smaller displayName (tie-breaker)
				try {
					const allEligibleSnap = await baseEligibleQuery.get();
					let rank = 1;
					allEligibleSnap.docs.forEach((d: any) => {
						if (d.id === targetUid) return;
						const dData = d.data();
						const dVal = typeof dData[sortField] === "number" ? dData[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
						const dName = dData.displayName || dData.username || "";

						if (dVal > targetVal) {
							rank++;
						} else if (dVal === targetVal && dName.localeCompare(targetName) < 0) {
							rank++;
						}
					});

					page = Math.max(1, Math.ceil(rank / PAGE_SIZE));
				} catch (rankErr: any) {
					console.warn("Target user rank calculation fallback:", rankErr.message);
				}
			}
		}

		const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
		if (page > totalPages) {
			page = totalPages;
		}

		const offset = (page - 1) * PAGE_SIZE;

		// 5. Fetch Page Users
		let users: LeaderboardUser[] = [];
		let isLoaded = false;

		// Attempt Tier 1: Optimal Firestore Composite Query
		try {
			let optimalQuery = baseEligibleQuery
				.orderBy(sortField, "desc")
				.orderBy("displayName", "asc")
				.offset(offset)
				.limit(PAGE_SIZE);

			const querySnap = await optimalQuery.get();
			querySnap.docs.forEach((docSnap: any, idx: number) => {
				const rank = offset + idx + 1;
				users.push(formatRankingUser(docSnap.id, docSnap.data(), rank));
			});
			isLoaded = true;
		} catch (error: any) {
			if (error.message && error.message.includes("index")) {
				indexCreationUrl = extractIndexUrl(error.message);
				console.warn(`[LEADERBOARD INDEX NOTICE] Composite index needed for tier 1: ${indexCreationUrl}`);
			}

			// Fallback: Fetch eligible matching users, sort in-memory with authoritative tie-breakers
			try {
				const allSnap = await baseEligibleQuery.limit(500).get();
				const allEligible: any[] = [];

				allSnap.docs.forEach((d: any) => {
					const data = d.data();
					if (isEligibleRankingUser({ uid: d.id, ...data })) {
						allEligible.push({ id: d.id, ...data });
					}
				});

				// Update totalItems to exactly reflect verified eligible population
				totalItems = allEligible.length;

				// In-memory sort: metric desc, displayName asc
				allEligible.sort((a, b) => {
					const valA = typeof a[sortField] === "number" ? a[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
					const valB = typeof b[sortField] === "number" ? b[sortField] : (sortField.endsWith("Rating") ? 1500 : 0);
					if (valA !== valB) return valB - valA;
					const nameA = a.displayName || a.username || "";
					const nameB = b.displayName || b.username || "";
					return nameA.localeCompare(nameB);
				});

				// Slice page
				const sliced = allEligible.slice(offset, offset + PAGE_SIZE);
				users = sliced.map((item, idx) => formatRankingUser(item.id, item, offset + idx + 1));
				isLoaded = true;
			} catch (fallbackErr: any) {
				console.error("[LEADERBOARD FATAL] Failed both indexed and in-memory queries:", fallbackErr.message);
				throw fallbackErr;
			}
		}

		return res.status(200).json({
			users,
			page,
			totalPages: Math.max(1, Math.ceil(totalItems / PAGE_SIZE)),
			totalItems,
			pageSize: PAGE_SIZE,
			highlightedUid: targetUid || null,
			highlightedIndex: targetUid ? users.findIndex((u) => u.uid === targetUid) : -1,
			warning: warning || undefined,
			indexCreationUrl: indexCreationUrl || undefined,
		});
	} catch (error: any) {
		console.error("Leaderboard API error:", error);
		return res.status(500).json({
			error: "Failed to load rankings. Please check server logs.",
			details: error.message,
		});
	}
}

export default withApiErrorHandler(handler);
