import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const authorization = req.headers.authorization;

	const db = getAdminFirestore();

	// GET request is public (or accessible to members depending on visibility)
	if (req.method === "GET") {
		try {
			const doc = await db.collection("organizationCompanyDetails").doc(orgId).get();
			if (!doc.exists) {
				return res.status(200).json({ success: true, details: null });
			}
			return res.status(200).json({ success: true, details: doc.data() });
		} catch (err: any) {
			return res.status(500).json({ success: false, error: err.message });
		}
	}

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		if (req.method === "POST" || req.method === "PATCH") {
			const {
				industry = "",
				headquarters = "",
				website = "",
				careersPage = "",
				description = "",
				technologies = [],
				employeeCount = 0,
				hiringStatus = "selective",
				recruiterUids = [],
				socialLinks = {},
				cultureSections = [],
			} = req.body;

			const updateData = {
				organizationId: org.id,
				industry,
				headquarters,
				website,
				careersPage,
				description,
				technologies,
				employeeCount,
				hiringStatus,
				recruiterUids,
				socialLinks,
				cultureSections,
				updatedAt: Date.now(),
			};

			await db.collection("organizationCompanyDetails").doc(org.id).set(updateData, { merge: true });

			// Sync verified state or custom stats in organizations if needed
			await emitOrgEvent(
				org.id,
				uid,
				"company.details_updated",
				null,
				"organizationCompanyDetails",
				org.id,
				{ hiringStatus },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, details: updateData });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in company-details API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
