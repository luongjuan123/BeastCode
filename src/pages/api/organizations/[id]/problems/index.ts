import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	checkRateLimit,
	OrganizationProblem,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	// Resolve organization
	const { org, member: callerMember } = await resolveOrgAndMembership(orgIdentifier, uid || null);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// Security Check
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	// GET /api/organizations/:id/problems - List linked problems
	if (req.method === "GET") {
		try {
			const snapshot = await db
				.collection("organizationProblems")
				.where("organizationId", "==", org.id)
				.get();

			const problemIds: string[] = [];
			snapshot.forEach((doc) => {
				problemIds.push(doc.data().problemId);
			});

			if (problemIds.length === 0) {
				return res.status(200).json({ success: true, problems: [] });
			}

			// Batch fetch problem documents from main 'problems' collection
			const chunks = [];
			for (let i = 0; i < problemIds.length; i += 30) {
				chunks.push(problemIds.slice(i, i + 30));
			}

			const problemsList: any[] = [];
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

			return res.status(200).json({ success: true, problems: problemsList });
		} catch (error: any) {
			console.error("GET /api/organizations/:id/problems error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/problems - Link a global problem
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.createProblem");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			// Cooldown rate-limit: 15 problems per day
			const passedLimit = await checkRateLimit(uid, "org.link_problem", 15, 86400);
			if (!passedLimit) {
				return res.status(429).json({ success: false, error: "Rate Limited: Maximum 15 problems per day." });
			}

			const { problemId, tags = [], difficultyOverride = "" } = req.body;
			if (!problemId) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing problemId" });
			}

			// Verify global problem exists
			const problemDoc = await db.collection("problems").doc(problemId).get();
			if (!problemDoc.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Global problem not found" });
			}

			const linkDocId = `${org.id}_${problemId}`;
			const linkRef = db.collection("organizationProblems").doc(linkDocId);
			const linkSnap = await linkRef.get();
			if (linkSnap.exists) {
				return res.status(409).json({ success: false, error: "Conflict: Problem already linked to this organization" });
			}

			const newLink: OrganizationProblem = {
				organizationId: org.id,
				problemId,
				visibility: "public",
				assignedBy: uid,
				assignedAt: Date.now(),
				tags,
				difficultyOverride,
			};

			const orgRef = db.collection("organizations").doc(org.id);

			// Transaction: Save link and increment problemCount
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.problemCount || 0;

				transaction.set(linkRef, newLink);
				transaction.update(orgRef, { problemCount: currentCount + 1 });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"problem.linked",
				null,
				"organizationProblems",
				linkDocId,
				{ problemId, title: problemDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, message: "Problem linked successfully", problem: newLink });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/problems error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
