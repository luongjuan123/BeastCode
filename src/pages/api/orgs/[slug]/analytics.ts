import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "GET") {
		try {
			const { allowed, org } = await verifyUserPermission(orgSlug, uid, "VIEW_ANALYTICS");
			if (!allowed || !org) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			// Fetch members to aggregate statistics
			const snapshot = await db
				.collection("organizationMembers")
				.where("orgSlug", "==", orgSlug)
				.get();

			let totalMembers = 0;
			let totalProblemsSolved = 0;
			let totalContestRating = 0;
			const membersList: any[] = [];

			snapshot.forEach((doc) => {
				const data = doc.data();
				totalMembers++;
				totalProblemsSolved += data.problemsSolved || 0;
				totalContestRating += data.contestRating || 0;

				membersList.push({
					uid: data.uid,
					displayName: data.displayName || "Anonymous",
					username: data.username || "",
					problemsSolved: data.problemsSolved || 0,
					contestRating: data.contestRating || 0,
				});
			});

			const avgProblemsSolved = totalMembers > 0 ? parseFloat((totalProblemsSolved / totalMembers).toFixed(2)) : 0;
			const avgContestRating = totalMembers > 0 ? parseFloat((totalContestRating / totalMembers).toFixed(2)) : 0;

			// Sort by rating to get top performers
			membersList.sort((a, b) => b.contestRating - a.contestRating);
			const topPerformersByRating = membersList.slice(0, 5);

			// Sort by problems solved
			membersList.sort((a, b) => b.problemsSolved - a.problemsSolved);
			const topPerformersBySolved = membersList.slice(0, 5);

			return res.status(200).json({
				success: true,
				analytics: {
					totalMembers,
					totalProblemsSolved,
					avgProblemsSolved,
					avgContestRating,
					topPerformersByRating,
					topPerformersBySolved,
					contestCount: org.contestCount || 0,
					problemCount: org.problemCount || 0,
				},
			});
		} catch (error: any) {
			console.error("GET org analytics error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
