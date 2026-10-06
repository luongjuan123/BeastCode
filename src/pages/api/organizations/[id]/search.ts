import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	resolveOrgAndMembership,
	checkOrgPermission,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, type = "members", q = "", limit = "10", offset = "0", sort = "createdAt", order = "desc" } = req.query;
	const orgIdentifier = id as string;

	// Resolve organization
	const { org, member: callerMember } = await resolveOrgAndMembership(orgIdentifier, uid || null);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// Security Check: Non-members cannot search private/secret workspace registries
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
	const parsedOffset = Math.max(0, parseInt(offset as string, 10));
	const searchStr = (q as string).toLowerCase().trim();

	try {
		// --- 6. SEARCH CANDIDATES ---
		if (type === "candidates") {
			const { allowed: isRecruiter } = await checkOrgPermission(org.id, uid || "", "organization.manageRecruitment");
			if (!isRecruiter) {
				return res.status(403).json({ success: false, error: "Access Denied: Only recruiters can search candidates" });
			}

			const resumesSnap = await db.collection("resumes").get();
			const resumesList = resumesSnap.docs.map(doc => doc.data());

			const usersSnap = await db.collection("users").get();
			const usersList = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[];

			let detailedCandidates = usersList.map((u: any) => {
				const resume = resumesList.find(r => r.uid === u.uid) || null;
				return {
					uid: u.uid,
					displayName: u.displayName || u.username || "Candidate",
					username: u.username || "",
					avatarUrl: u.avatarUrl || "",
					email: u.email || "",
					country: u.country || "",
					school: u.school || "",
					solvedProblems: u.solvedProblems?.length || 0,
					contestRating: u.contestRating || 0,
					experienceLevel: u.experienceLevel || "",
					resume,
				};
			});

			if (searchStr) {
				detailedCandidates = detailedCandidates.filter(c => 
					c.displayName.toLowerCase().includes(searchStr) ||
					c.username.toLowerCase().includes(searchStr) ||
					c.uid === searchStr ||
					c.school.toLowerCase().includes(searchStr)
				);
			}

			const { rating, solved, experienceLevel, skills } = req.query;
			if (rating) {
				const minRating = parseInt(rating as string, 10);
				detailedCandidates = detailedCandidates.filter(c => c.contestRating >= minRating);
			}
			if (solved) {
				const minSolved = parseInt(solved as string, 10);
				detailedCandidates = detailedCandidates.filter(c => c.solvedProblems >= minSolved);
			}
			if (experienceLevel) {
				detailedCandidates = detailedCandidates.filter(c => c.experienceLevel === experienceLevel);
			}
			if (skills) {
				const skillsArr = (skills as string).toLowerCase().split(",").map(s => s.trim());
				detailedCandidates = detailedCandidates.filter(c => {
					const candidateSkills = (c.resume?.skills || []).map((s: string) => s.toLowerCase());
					return skillsArr.every(s => candidateSkills.includes(s));
				});
			}

			detailedCandidates.sort((a, b) => b.contestRating - a.contestRating);

			const paginated = detailedCandidates.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: detailedCandidates.length, results: paginated });
		}

		// --- 1. SEARCH MEMBERS ---
		if (type === "members") {
			const membersSnap = await db
				.collection("organizationMembers")
				.where("organizationId", "==", org.id)
				.where("status", "==", "active")
				.get();

			const membersList: any[] = [];
			membersSnap.forEach((doc) => {
				membersList.push(doc.data());
			});

			if (membersList.length === 0) {
				return res.status(200).json({ success: true, total: 0, results: [] });
			}

			// Batch resolve user profiles
			const userIds = membersList.map((m) => m.uid);
			const chunks = [];
			for (let i = 0; i < userIds.length; i += 30) {
				chunks.push(userIds.slice(i, i + 30));
			}

			const userProfiles: Record<string, any> = {};
			const profilesPromises = chunks.map((chunk) =>
				db.collection("users").where("__name__", "in", chunk).get()
			);
			const profilesSnaps = await Promise.all(profilesPromises);
			profilesSnaps.forEach((snap) => {
				snap.forEach((doc) => {
					userProfiles[doc.id] = doc.data();
				});
			});

			const canViewEmails = !!callerMember && (
				org.ownerUid === uid ||
				callerMember.roleId === "owner" ||
				callerMember.roleId === "admin"
			);

			let detailedMembers = membersList.map((m) => {
				const profile = userProfiles[m.uid] || {};
				return {
					...m,
					displayName: profile.displayName || "Anonymous",
					username: profile.username || "",
					avatarUrl: profile.avatarUrl || "",
					email: (canViewEmails || m.uid === uid) ? (profile.email || "") : undefined,
				};
			});

			if (searchStr) {
				detailedMembers = detailedMembers.filter(
					(m) =>
						m.nickname.toLowerCase().includes(searchStr) ||
						m.displayName.toLowerCase().includes(searchStr) ||
						m.username.toLowerCase().includes(searchStr) ||
						m.department.toLowerCase().includes(searchStr)
				);
			}

			// Sort
			detailedMembers.sort((a, b) => {
				const valA = a[sort as string] || a.joinedAt || 0;
				const valB = b[sort as string] || b.joinedAt || 0;
				if (typeof valA === "string") {
					return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
				}
				return order === "asc" ? valA - valB : valB - valA;
			});

			const paginated = detailedMembers.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: detailedMembers.length, results: paginated });
		}

		// --- 2. SEARCH PROBLEMS ---
		if (type === "problems") {
			const snapshot = await db
				.collection("organizationProblems")
				.where("organizationId", "==", org.id)
				.get();

			const problemIds: string[] = [];
			snapshot.forEach((doc) => {
				problemIds.push(doc.data().problemId);
			});

			if (problemIds.length === 0) {
				return res.status(200).json({ success: true, total: 0, results: [] });
			}

			// Batch fetch problem documents
			const chunks = [];
			for (let i = 0; i < problemIds.length; i += 30) {
				chunks.push(problemIds.slice(i, i + 30));
			}

			let problemsList: any[] = [];
			const detailsPromises = chunks.map((chunk) =>
				db.collection("problems").where("__name__", "in", chunk).get()
			);

			const snaps = await Promise.all(detailsPromises);
			snaps.forEach((snap) => {
				snap.forEach((doc) => {
					const data = doc.data();
					problemsList.push({
						id: doc.id,
						title: data.title || doc.id,
						difficulty: data.difficulty || "Easy",
						category: data.category || "",
					});
				});
			});

			if (searchStr) {
				problemsList = problemsList.filter(
					(p) =>
						p.title.toLowerCase().includes(searchStr) ||
						p.id.toLowerCase().includes(searchStr) ||
						p.category.toLowerCase().includes(searchStr)
				);
			}

			const paginated = problemsList.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: problemsList.length, results: paginated });
		}

		// --- 3. SEARCH CONTESTS ---
		if (type === "contests") {
			const snapshot = await db
				.collection("organizationContests")
				.where("organizationId", "==", org.id)
				.get();

			const contestIds: string[] = [];
			snapshot.forEach((doc) => {
				contestIds.push(doc.data().contestId);
			});

			if (contestIds.length === 0) {
				return res.status(200).json({ success: true, total: 0, results: [] });
			}

			const chunks = [];
			for (let i = 0; i < contestIds.length; i += 30) {
				chunks.push(contestIds.slice(i, i + 30));
			}

			let contestsList: any[] = [];
			const detailsPromises = chunks.map((chunk) =>
				db.collection("contests").where("__name__", "in", chunk).get()
			);

			const snaps = await Promise.all(detailsPromises);
			snaps.forEach((snap) => {
				snap.forEach((doc) => {
					const data = doc.data();
					contestsList.push({
						id: doc.id,
						title: data.title || doc.id,
						startTime: data.startTime || 0,
						endTime: data.endTime || 0,
						visibility: data.visibility || "public",
					});
				});
			});

			if (searchStr) {
				contestsList = contestsList.filter((c) => c.title.toLowerCase().includes(searchStr));
			}

			const paginated = contestsList.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: contestsList.length, results: paginated });
		}

		// --- 4. SEARCH ANNOUNCEMENTS ---
		if (type === "announcements") {
			const snapshot = await db
				.collection("organizationAnnouncements")
				.where("organizationId", "==", org.id)
				.where("deletedAt", "==", null)
				.get();

			let list: any[] = [];
			snapshot.forEach((doc) => {
				list.push({ id: doc.id, ...doc.data() });
			});

			const userRole = callerMember ? callerMember.roleId : null;
			if (userRole !== "owner" && userRole !== "admin" && userRole !== "moderator") {
				list = list.filter((a) => a.visibility === "all" || (callerMember && a.visibility === "members"));
			}

			if (searchStr) {
				list = list.filter(
					(a) =>
						a.title.toLowerCase().includes(searchStr) ||
						a.content.toLowerCase().includes(searchStr)
				);
			}

			list.sort((a, b) => b.publishedAt - a.publishedAt);
			const paginated = list.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: list.length, results: paginated });
		}

		// --- 5. SEARCH FILES ---
		if (type === "files") {
			const snapshot = await db
				.collection("organizationFiles")
				.where("organizationId", "==", org.id)
				.get();

			let list: any[] = [];
			snapshot.forEach((doc) => {
				list.push({ id: doc.id, ...doc.data() });
			});

			const userRole = callerMember ? callerMember.roleId : null;
			if (userRole !== "owner" && userRole !== "admin" && userRole !== "moderator") {
				list = list.filter((f) => f.visibility === "public" || (callerMember && f.visibility === "members"));
			}

			if (searchStr) {
				list = list.filter((f) => f.filename.toLowerCase().includes(searchStr));
			}

			list.sort((a, b) => b.createdAt - a.createdAt);
			const paginated = list.slice(parsedOffset, parsedOffset + parsedLimit);
			return res.status(200).json({ success: true, total: list.length, results: paginated });
		}

		return res.status(400).json({ success: false, error: "Validation Error: Invalid search type parameter" });
	} catch (error: any) {
		console.error("GET /api/organizations/:id/search error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
