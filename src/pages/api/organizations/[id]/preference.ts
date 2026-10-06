import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { resolveOrgAndMembership } from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const { org, member } = await resolveOrgAndMembership(orgIdentifier, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
		}

		if (!member) {
			return res.status(403).json({ success: false, error: "Forbidden: You are not a member of this organization" });
		}

		const { isFavorite, isHidden } = req.body;
		const memberRef = db.collection("organizationMembers").doc(`${org.id}_${uid}`);

		const updateData: Record<string, any> = {};
		if (typeof isFavorite === "boolean") {
			updateData.isFavorite = isFavorite;
		}
		if (typeof isHidden === "boolean") {
			updateData.isHidden = isHidden;
		}

		if (Object.keys(updateData).length > 0) {
			await memberRef.update(updateData);
		}

		return res.status(200).json({ success: true, message: "Workspace preferences updated successfully" });
	} catch (error: any) {
		console.error("POST /api/organizations/:id/preference error:", error);
		return res.status(500).json({ success: false, error: "Internal Error" });
	}
}

export default withApiErrorHandler(withAuthAndModeration(handler));
