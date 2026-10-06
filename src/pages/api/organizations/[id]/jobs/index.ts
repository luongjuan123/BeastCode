import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const authorization = req.headers.authorization;

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			// Query jobs
			const snap = await db
				.collection("organizationJobs")
				.where("organizationId", "==", orgId)
				.get();

			const jobs = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, jobs });
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

		if (req.method === "POST") {
			const {
				title,
				description,
				responsibilities = [],
				requirements = [],
				preferredSkills = [],
				salaryRange = "Confidential",
				location = "Remote",
				remoteStatus = "remote",
				employmentType = "Full-time",
				applicationDeadline = Date.now() + 30 * 24 * 3600 * 1000,
				requiredAssessmentId = null,
				requiredOrgMembership = false,
				status = "active",
			} = req.body;

			if (!title || !description) {
				return res.status(400).json({ success: false, error: "Title and description are required" });
			}

			const jobId = "job-" + Math.random().toString(36).slice(2, 10);

			const newJob = {
				id: jobId,
				organizationId: org.id,
				title,
				description,
				responsibilities,
				requirements,
				preferredSkills,
				salaryRange,
				location,
				remoteStatus,
				employmentType,
				applicationDeadline,
				recruiterUid: uid,
				hiringTeam: [uid],
				requiredAssessmentId,
				requiredOrgMembership,
				status,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.collection("organizationJobs").doc(jobId).set(newJob);

			await emitOrgEvent(
				org.id,
				uid,
				"job.created",
				null,
				"organizationJobs",
				jobId,
				{ title, employmentType },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, job: newJob });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in jobs API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
