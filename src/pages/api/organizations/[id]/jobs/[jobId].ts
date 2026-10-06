import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const jobId = req.query.jobId as string;
	const authorization = req.headers.authorization;

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const doc = await db.collection("organizationJobs").doc(jobId).get();
			if (!doc.exists) {
				return res.status(404).json({ success: false, error: "Job posting not found" });
			}
			const jobData = doc.data() as any;
			if (jobData?.organizationId !== orgId) {
				return res.status(404).json({ success: false, error: "Job posting not found in this organization" });
			}
			return res.status(200).json({ success: true, job: jobData });
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

		const jobRef = db.collection("organizationJobs").doc(jobId);
		const jobDoc = await jobRef.get();
		if (!jobDoc.exists) {
			return res.status(404).json({ success: false, error: "Job posting not found" });
		}
		const jobData = jobDoc.data() as any;
		if (jobData?.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Job posting not found in this organization" });
		}

		if (req.method === "PATCH") {
			const updateFields = req.body;
			const cleanPayload = {
				...updateFields,
				updatedAt: Date.now(),
			};

			await jobRef.update(cleanPayload);

			return res.status(200).json({ success: true, message: "Job updated successfully" });
		}

		if (req.method === "DELETE") {
			await jobRef.delete();

			await emitOrgEvent(
				org.id,
				uid,
				"job.deleted",
				null,
				"organizationJobs",
				jobId,
				{ title: jobDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Job deleted successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in job detail API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
