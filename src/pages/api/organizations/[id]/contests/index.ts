import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
	checkRateLimit,
	OrganizationContest,
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

	// Security: check visibility access
	if (org.visibility !== "public" && !callerMember) {
		return res.status(403).json({ success: false, error: "Forbidden: Access Denied" });
	}

	// GET /api/organizations/:id/contests - List linked contests
	if (req.method === "GET") {
		try {
			const snapshot = await db
				.collection("organizationContests")
				.where("organizationId", "==", org.id)
				.get();

			const contestIds: string[] = [];
			snapshot.forEach((doc) => {
				contestIds.push(doc.data().contestId);
			});

			if (contestIds.length === 0) {
				return res.status(200).json({ success: true, contests: [] });
			}

			// Batch resolve contest details from main 'contests' collection
			const chunks = [];
			for (let i = 0; i < contestIds.length; i += 30) {
				chunks.push(contestIds.slice(i, i + 30));
			}

			const contestsList: any[] = [];
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

			return res.status(200).json({ success: true, contests: contestsList });
		} catch (error: any) {
			console.error("GET /api/organizations/:id/contests error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// POST /api/organizations/:id/contests - Link a global contest
	if (req.method === "POST") {
		if (!uid) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		try {
			const { allowed } = await checkOrgPermission(org.id, uid, "organization.createContest");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
			}

			// Cooldown rate-limit: 10 contests per day
			const passedLimit = await checkRateLimit(uid, "org.link_contest", 10, 86400);
			if (!passedLimit) {
				return res.status(429).json({ success: false, error: "Rate Limited: Maximum 10 contests per day." });
			}

			const { contestId } = req.body;
			if (!contestId) {
				return res.status(400).json({ success: false, error: "Validation Error: Missing contestId" });
			}

			// Verify global contest exists
			const contestDoc = await db.collection("contests").doc(contestId).get();
			if (!contestDoc.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Global contest not found" });
			}

			const linkDocId = `${org.id}_${contestId}`;
			const linkRef = db.collection("organizationContests").doc(linkDocId);
			const linkSnap = await linkRef.get();
			if (linkSnap.exists) {
				return res.status(409).json({ success: false, error: "Conflict: Contest already linked to this organization" });
			}

			const newLink: OrganizationContest = {
				organizationId: org.id,
				contestId,
				visibility: "public",
				registrationMode: "open",
				contestType: "official",
				published: true,
				assignedBy: uid,
				assignedAt: Date.now(),
			};

			const orgRef = db.collection("organizations").doc(org.id);

			// Transaction: Save link and increment contestCount
			await db.runTransaction(async (transaction) => {
				const orgSnap = await transaction.get(orgRef);
				if (!orgSnap.exists) throw new Error("Organization not found");
				const currentCount = orgSnap.data()?.contestCount || 0;

				transaction.set(linkRef, newLink);
				transaction.update(orgRef, { contestCount: currentCount + 1 });
			});

			await emitOrgEvent(
				org.id,
				uid,
				"contest.published",
				null,
				"organizationContests",
				linkDocId,
				{ contestId, title: contestDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, message: "Contest linked successfully", contest: newLink });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/contests error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
