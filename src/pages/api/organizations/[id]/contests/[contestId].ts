import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id, contestId } = req.query;

	const orgIdentifier = id as string;
	const targetContestId = contestId as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method !== "DELETE") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	try {
		// Resolve organization
		const { org } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		// Security Check
		const { allowed } = await checkOrgPermission(org.id, uid, "organization.deleteContest");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Forbidden: Insufficient Permissions" });
		}

		const linkDocId = `${org.id}_${targetContestId}`;
		const linkRef = db.collection("organizationContests").doc(linkDocId);
		const linkSnap = await linkRef.get();
		if (!linkSnap.exists) {
			return res.status(404).json({ success: false, error: "Not Found: Contest is not linked to this organization" });
		}

		const orgRef = db.collection("organizations").doc(org.id);

		// Transactional delete link: decrement contestCount
		await db.runTransaction(async (transaction) => {
			const orgSnap = await transaction.get(orgRef);
			if (!orgSnap.exists) throw new Error("Organization not found");
			const currentCount = orgSnap.data()?.contestCount || 1;

			transaction.delete(linkRef);
			transaction.update(orgRef, { contestCount: Math.max(0, currentCount - 1) });
		});

		await emitOrgEvent(
			org.id,
			uid,
			"contest.unlinked",
			null,
			"organizationContests",
			linkDocId,
			{ contestId: targetContestId },
			req.socket.remoteAddress || "127.0.0.1"
		);

		return res.status(200).json({ success: true, message: "Contest unlinked successfully" });
	} catch (error: any) {
		console.error("DELETE /api/organizations/:id/contests/:contestId error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
