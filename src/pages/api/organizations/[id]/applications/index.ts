import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

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

		// 1. POST request: candidates applying for jobs
		if (req.method === "POST") {
			const {
				jobId,
				coverLetter = "",
				portfolioUrl = "",
				githubUrl = "",
				linkedinUrl = "",
				websiteUrl = "",
				attachments = [],
				additionalAnswers = {},
			} = req.body;

			if (!jobId) {
				return res.status(400).json({ success: false, error: "Job ID is required" });
			}

			// Validate job posting exists
			const jobDoc = await db.collection("organizationJobs").doc(jobId).get();
			if (!jobDoc.exists) {
				return res.status(404).json({ success: false, error: "Job posting not found" });
			}

			const jobData = jobDoc.data() as any;

			// Check duplicate application
			const duplicateCheck = await db
				.collection("organizationApplications")
				.where("jobId", "==", jobId)
				.where("candidateUid", "==", uid)
				.get();

			if (!duplicateCheck.empty) {
				return res.status(409).json({ success: false, error: "You have already applied for this job" });
			}

			const applicationId = "app-" + Math.random().toString(36).slice(2, 10);

			const newApplication = {
				id: applicationId,
				jobId,
				organizationId: orgId,
				candidateUid: uid,
				coverLetter,
				portfolioUrl,
				githubUrl,
				linkedinUrl,
				websiteUrl,
				attachments,
				additionalAnswers,
				currentStage: "Applied",
				pipelineHistory: [
					{
						stage: "Applied",
						timestamp: Date.now(),
						updatedBy: uid,
						notes: "Initial application submitted online.",
					},
				],
				assessmentScore: null,
				assessmentAttemptId: null,
				interviewIds: [],
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.collection("organizationApplications").doc(applicationId).set(newApplication);

			// Emit application event which handles transactional notifications
			await emitOrgEvent(
				orgId,
				uid,
				"candidate.applied",
				uid,
				"organizationApplications",
				applicationId,
				{ jobTitle: jobData.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, application: newApplication });
		}

		// 2. GET request: recruiters listing candidate applications
		if (req.method === "GET") {
			const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const snap = await db
				.collection("organizationApplications")
				.where("organizationId", "==", org.id)
				.get();

			const applications = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, applications });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in applications index API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
