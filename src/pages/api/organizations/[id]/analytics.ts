import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.viewAnalytics");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		// Fetch all active members in workspace
		const membersSnap = await db
			.collection("organizationMembers")
			.where("organizationId", "==", org.id)
			.where("status", "==", "active")
			.get();

		const memberUids: string[] = [];
		membersSnap.forEach((doc) => {
			memberUids.push(doc.data().uid);
		});

		if (memberUids.length === 0) {
			return res.status(200).json({
				success: true,
				analytics: {
					totalMembersCount: 0,
					averageRating: 0,
					totalSolved: 0,
					averageSolved: 0,
				},
			});
		}

		// Batch fetch user profile statistics (problemsSolved, contestRating)
		const chunks = [];
		for (let i = 0; i < memberUids.length; i += 30) {
			chunks.push(memberUids.slice(i, i + 30));
		}

		let totalSolvedCount = 0;
		let totalRatingSum = 0;
		let ratedMembersCount = 0;
		let totalUsersFound = 0;

		const profilePromises = chunks.map((chunk) =>
			db.collection("users").where("__name__", "in", chunk).get()
		);
		const snaps = await Promise.all(profilePromises);

		snaps.forEach((snap) => {
			snap.forEach((doc) => {
				const data = doc.data() || {};
				const solved = (data.solvedProblems || []).length;
				totalSolvedCount += solved;
				const rating = data.contestRating !== undefined ? data.contestRating : 1500;
				totalRatingSum += rating;
				ratedMembersCount++;
				totalUsersFound++;
			});
		});

		const analytics = {
			totalMembersCount: memberUids.length,
			averageRating: ratedMembersCount > 0 ? Math.round(totalRatingSum / ratedMembersCount) : 1500,
			totalSolved: totalSolvedCount,
			averageSolved: totalUsersFound > 0 ? Math.round(totalSolvedCount / totalUsersFound) : 0,
		};

		return res.status(200).json({ success: true, analytics });
	} catch (error: any) {
		console.error("GET /api/organizations/:id/analytics error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
