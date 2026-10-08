import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAdminGuard } from "@/utils/withAdminGuard";
import { AuthenticatedRequest } from "@/utils/authMiddleware";
import { FieldPath } from "firebase-admin/firestore";

interface FormattedUser {
	uid: string;
	email: string;
	displayName: string;
	role: string;
	status: string;
	bannedReason?: string;
	bannedDuration?: string;
	bannedAt?: number | null;
	expiresAt?: number | null;
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	mlCount: number;
	solvedCount: number;
	score: number;
	createdAt: number;
	username: string;
}

function formatUserDoc(uid: string, data: any, modData?: any): FormattedUser {
	const mod = modData || { status: "ACTIVE" };
	const easy = data?.easyCount || 0;
	const medium = data?.mediumCount || 0;
	const hard = data?.hardCount || 0;
	const ml = data?.mlCount || 0;

	return {
		uid,
		email: data?.email || "",
		displayName: data?.displayName || "Anonymous",
		role: data?.role || (data?.isAdmin ? "admin" : "user"),
		status: mod.status || "ACTIVE",
		bannedReason: mod.reason || "",
		bannedDuration: mod.duration || "",
		bannedAt: mod.bannedAt || null,
		expiresAt: mod.expiresAt || null,
		easyCount: easy,
		mediumCount: medium,
		hardCount: hard,
		mlCount: ml,
		solvedCount: easy + medium + hard + ml,
		score: data?.score || 0,
		createdAt: data?.createdAt || 0,
		username: data?.username || "",
	};
}

function formatAuthUser(authUser: any, modData?: any): FormattedUser {
	const mod = modData || (authUser.disabled ? { status: "BANNED" } : { status: "ACTIVE" });
	return {
		uid: authUser.uid,
		email: authUser.email || "",
		displayName: authUser.displayName || "Anonymous",
		role: authUser.customClaims && authUser.customClaims.admin ? "admin" : "user",
		status: mod.status || (authUser.disabled ? "BANNED" : "ACTIVE"),
		bannedReason: mod.reason || "",
		bannedDuration: mod.duration || "",
		bannedAt: mod.bannedAt || null,
		expiresAt: mod.expiresAt || null,
		easyCount: 0,
		mediumCount: 0,
		hardCount: 0,
		mlCount: 0,
		solvedCount: 0,
		score: 0,
		createdAt: authUser.metadata?.creationTime ? new Date(authUser.metadata.creationTime).getTime() : 0,
		username: authUser.email ? authUser.email.split("@")[0] : "",
	};
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		const db = getAdminFirestore();
		const auth = getAdminAuth();
		const { search, role, status, sortBy, sortOrder } = req.query;

		const rawSearch = typeof search === "string" ? search.trim() : "";
		const userMap = new Map<string, FormattedUser>();

		if (rawSearch) {
			// 1. Direct UID Document Lookup (O(1) exact match, case-sensitive)
			const exactDoc = await db.collection("users").doc(rawSearch).get();
			if (exactDoc.exists) {
				userMap.set(exactDoc.id, formatUserDoc(exactDoc.id, exactDoc.data()));
			}

			// 2. Direct uid field query (case-sensitive)
			if (userMap.size === 0) {
				const uidSnap = await db.collection("users").where("uid", "==", rawSearch).limit(10).get();
				uidSnap.forEach((d) => {
					userMap.set(d.id, formatUserDoc(d.id, d.data()));
				});
			}

			// 3. Firebase Auth direct UID lookup (handles Auth-only users and accounts)
			if (userMap.size === 0 && rawSearch.length >= 10 && !rawSearch.includes(" ")) {
				try {
					const authUser = await auth.getUser(rawSearch);
					if (authUser) {
						userMap.set(authUser.uid, formatAuthUser(authUser));
					}
				} catch (authErr) {
					// Not found in Auth or invalid UID format
				}
			}

			// 4. Email Lookup (exact match in Firestore + Firebase Auth)
			if (rawSearch.includes("@")) {
				const lowerEmail = rawSearch.toLowerCase();
				const emailSnap = await db.collection("users").where("email", "==", lowerEmail).limit(10).get();
				emailSnap.forEach((d) => {
					userMap.set(d.id, formatUserDoc(d.id, d.data()));
				});
				if (rawSearch !== lowerEmail) {
					const origEmailSnap = await db.collection("users").where("email", "==", rawSearch).limit(10).get();
					origEmailSnap.forEach((d) => {
						userMap.set(d.id, formatUserDoc(d.id, d.data()));
					});
				}
				if (userMap.size === 0) {
					try {
						const authUser = await auth.getUserByEmail(lowerEmail);
						if (authUser) {
							userMap.set(authUser.uid, formatAuthUser(authUser));
						}
					} catch (e) {}
				}
			}

			// 5. Username Lookup (exact match in Firestore)
			if (userMap.size === 0) {
				const unSnap = await db.collection("users").where("username", "==", rawSearch).limit(10).get();
				unSnap.forEach((d) => {
					userMap.set(d.id, formatUserDoc(d.id, d.data()));
				});
				const lowerSearch = rawSearch.toLowerCase();
				if (unSnap.size === 0 && rawSearch !== lowerSearch) {
					const unLowerSnap = await db.collection("users").where("username", "==", lowerSearch).limit(10).get();
					unLowerSnap.forEach((d) => {
						userMap.set(d.id, formatUserDoc(d.id, d.data()));
					});
				}
			}

			// 6. Display Name Lookup (exact match in Firestore)
			if (userMap.size === 0) {
				const dnSnap = await db.collection("users").where("displayName", "==", rawSearch).limit(10).get();
				dnSnap.forEach((d) => {
					userMap.set(d.id, formatUserDoc(d.id, d.data()));
				});
			}

			// 7. Prefix Search on displayName, username, and email (bounded to 20 each)
			if (userMap.size === 0) {
				const capitalSearch = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
				const lowerSearch = rawSearch.toLowerCase();

				const queries = [
					db.collection("users").where("displayName", ">=", rawSearch).where("displayName", "<=", rawSearch + "\uf8ff").limit(20).get(),
					db.collection("users").where("username", ">=", rawSearch).where("username", "<=", rawSearch + "\uf8ff").limit(20).get(),
					db.collection("users").where("email", ">=", lowerSearch).where("email", "<=", lowerSearch + "\uf8ff").limit(20).get(),
				];

				if (capitalSearch !== rawSearch) {
					queries.push(
						db.collection("users").where("displayName", ">=", capitalSearch).where("displayName", "<=", capitalSearch + "\uf8ff").limit(20).get()
					);
				}
				if (lowerSearch !== rawSearch) {
					queries.push(
						db.collection("users").where("username", ">=", lowerSearch).where("username", "<=", lowerSearch + "\uf8ff").limit(20).get()
					);
				}

				const results = await Promise.all(queries);
				results.forEach((snap) => {
					snap.forEach((d) => {
						userMap.set(d.id, formatUserDoc(d.id, d.data()));
					});
				});
			}
		} else {
			// No search: query default list with bounded limit (100)
			let queryRef: any = db.collection("users");
			if (role) {
				queryRef = queryRef.where("role", "==", role);
			}
			const defaultSnap = await queryRef.limit(500).get();
			defaultSnap.forEach((d: any) => {
				userMap.set(d.id, formatUserDoc(d.id, d.data()));
			});
		}

		// Fetch moderation records ONLY for matching users (targeted, no full scan)
		const uids = Array.from(userMap.keys());
		if (uids.length > 0) {
			const chunkSize = 30;
			for (let i = 0; i < uids.length; i += chunkSize) {
				const chunk = uids.slice(i, i + chunkSize);
				const modSnap = await db.collection("userModeration").where(FieldPath.documentId(), "in", chunk).get();
				modSnap.forEach((d) => {
					const existing = userMap.get(d.id);
					if (existing) {
						const modData = d.data();
						existing.status = modData.status || existing.status;
						existing.bannedReason = modData.reason || "";
						existing.bannedDuration = modData.duration || "";
						existing.bannedAt = modData.bannedAt || null;
						existing.expiresAt = modData.expiresAt || null;
					}
				});
			}
		}

		let list = Array.from(userMap.values());

		if (role) {
			list = list.filter((u) => u.role === role);
		}

		if (status) {
			list = list.filter((u) => u.status === status);
		}

		// Sorting
		const field = (sortBy as string) || "createdAt";
		const direction = (sortOrder as string) || "desc";

		list.sort((a, b) => {
			let valA: any = (a as any)[field];
			let valB: any = (b as any)[field];

			if (field === "solved") {
				valA = a.solvedCount;
				valB = b.solvedCount;
			}

			if (valA < valB) return direction === "asc" ? -1 : 1;
			if (valA > valB) return direction === "asc" ? 1 : -1;
			return 0;
		});

		const totalCount = list.length;
		const rawPage = parseInt(req.query.page as string, 10);
		const rawPageSize = parseInt(req.query.pageSize as string, 10);
		const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
		const pageSize = isNaN(rawPageSize) || rawPageSize < 1 ? 25 : Math.min(rawPageSize, 100);
		const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

		const paginatedUsers =
			req.query.page !== undefined || req.query.pageSize !== undefined
				? list.slice((page - 1) * pageSize, page * pageSize)
				: list;

		return res.status(200).json({
			success: true,
			users: paginatedUsers,
			totalCount,
			page,
			pageSize,
			totalPages,
		});
	} catch (error: any) {
		console.error("GET admin users error:", error);
		return res.status(500).json({ success: false, error: error.message });
	}
}

export default withApiErrorHandler(withAdminGuard(handler));
