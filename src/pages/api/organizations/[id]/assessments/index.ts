import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const authorization = req.headers.authorization;

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		if (req.method === "GET") {
			const snap = await db
				.collection("organizationAssessments")
				.where("organizationId", "==", org.id)
				.get();

			const assessments = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, assessments });
		}

		if (req.method === "POST") {
			const {
				title,
				privateProblemIds = [],
				timeLimitMinutes = 60,
				plagiarismCheck = true,
				antiCheatSettings = { webcamRequired: false, browserLockRequired: false },
			} = req.body;

			if (!title) {
				return res.status(400).json({ success: false, error: "Title is required" });
			}

			const assessmentId = "assess-" + Math.random().toString(36).slice(2, 10);

			const newAssessment = {
				id: assessmentId,
				organizationId: org.id,
				title,
				privateProblemIds,
				timeLimitMinutes,
				plagiarismCheck,
				antiCheatSettings,
				createdAt: Date.now(),
				createdBy: uid,
			};

			await db.collection("organizationAssessments").doc(assessmentId).set(newAssessment);

			return res.status(201).json({ success: true, assessment: newAssessment });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in assessments index API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
