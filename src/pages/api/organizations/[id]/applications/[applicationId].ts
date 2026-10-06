import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const applicationId = req.query.applicationId as string;
	const authorization = req.headers.authorization;

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		const appRef = db.collection("organizationApplications").doc(applicationId);
		const appDoc = await appRef.get();

		if (!appDoc.exists) {
			return res.status(404).json({ success: false, error: "Application record not found" });
		}

		const appData = appDoc.data() as any;
		if (appData.organizationId !== orgId) {
			return res.status(404).json({ success: false, error: "Application record not found in this organization" });
		}

		// Security check: Candidate can view their own, Recruiter can view any
		const isOwner = appData.candidateUid === uid;
		const { allowed: isRecruiter } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");

		if (!isOwner && !isRecruiter) {
			return res.status(403).json({ success: false, error: "Access Denied: You are not authorized to access this application" });
		}

		if (req.method === "GET") {
			return res.status(200).json({ success: true, application: appData });
		}

		if (req.method === "PATCH") {
			if (!isRecruiter) {
				return res.status(403).json({ success: false, error: "Access Denied: Candidates cannot modify applications" });
			}

			const { stage, notes = "", assessmentScore, assessmentAttemptId, action } = req.body;

			const updatePayload: any = {
				updatedAt: Date.now(),
			};

			if (stage) {
				updatePayload.currentStage = stage;
				updatePayload.pipelineHistory = [
					...appData.pipelineHistory,
					{
						stage,
						timestamp: Date.now(),
						updatedBy: uid,
						notes,
					},
				];
			}

			if (assessmentScore !== undefined) updatePayload.assessmentScore = assessmentScore;
			if (assessmentAttemptId !== undefined) updatePayload.assessmentAttemptId = assessmentAttemptId;

			await appRef.update(updatePayload);

			// Emit stage update events to send notifications
			if (stage) {
				let eventType = "candidate.stage_updated";
				if (stage === "Offer") eventType = "candidate.offer_sent";
				else if (stage === "Accepted") eventType = "candidate.accepted";
				else if (stage === "Rejected") eventType = "candidate.rejected";
				else if (stage === "Online Assessment") eventType = "candidate.assessment_assigned";

				await emitOrgEvent(
					orgId,
					uid,
					eventType,
					appData.candidateUid,
					"organizationApplications",
					applicationId,
					{ stage, notes },
					req.socket.remoteAddress || "127.0.0.1"
				);
			}

			return res.status(200).json({ success: true, application: { ...appData, ...updatePayload } });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in application details API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
