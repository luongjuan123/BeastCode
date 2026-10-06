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

		// 1. GET Request: List interviews
		if (req.method === "GET") {
			const { allowed: isRecruiter } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
			
			let query = db.collection("organizationInterviews").where("organizationId", "==", orgId);
			
			if (!isRecruiter) {
				// Candidate can only view their own interviews (resolve applications first)
				const appSnap = await db
					.collection("organizationApplications")
					.where("organizationId", "==", orgId)
					.where("candidateUid", "==", uid)
					.get();

				if (appSnap.empty) {
					return res.status(200).json({ success: true, interviews: [] });
				}

				const appIds = appSnap.docs.map((doc) => doc.id);
				
				// Fetch interviews matching candidate applications
				const interviewsSnap = await db
					.collection("organizationInterviews")
					.where("applicationId", "in", appIds)
					.get();

				const interviews = interviewsSnap.docs.map((doc) => doc.data());
				return res.status(200).json({ success: true, interviews });
			}

			// Recruiter gets all interviews
			const snap = await query.get();
			const interviews = snap.docs.map((doc) => doc.data());
			return res.status(200).json({ success: true, interviews });
		}

		// 2. POST Request: Schedule interview
		if (req.method === "POST") {
			const { allowed } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { applicationId, date, time, interviewerUid, meetingLink } = req.body;

			if (!applicationId || !date || !time || !interviewerUid) {
				return res.status(400).json({ success: false, error: "Missing required fields for scheduling" });
			}

			const appDoc = await db.collection("organizationApplications").doc(applicationId).get();
			if (!appDoc.exists) {
				return res.status(404).json({ success: false, error: "Candidate application not found" });
			}

			const appData = appDoc.data() as any;
			if (appData.organizationId !== orgId) {
				return res.status(404).json({ success: false, error: "Candidate application not found in this organization" });
			}
			const interviewId = "int-" + Math.random().toString(36).slice(2, 10);

			const newInterview = {
				id: interviewId,
				applicationId,
				organizationId: orgId,
				date,
				time,
				interviewerUid,
				meetingLink: meetingLink || "",
				notes: "",
				evaluation: null,
				status: "scheduled",
				createdAt: Date.now(),
			};

			await db.collection("organizationInterviews").doc(interviewId).set(newInterview);

			// Link interview to application
			const currentInterviews = appData.interviewIds || [];
			await db.collection("organizationApplications").doc(applicationId).update({
				interviewIds: [...currentInterviews, interviewId],
			});

			// Trigger notification
			await emitOrgEvent(
				orgId,
				uid,
				"candidate.interview_scheduled",
				appData.candidateUid,
				"organizationInterviews",
				interviewId,
				{ date, time, meetingLink },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, interview: newInterview });
		}

		// 3. PATCH Request: Complete interview evaluation
		if (req.method === "PATCH") {
			const { interviewId, notes, evaluation, status } = req.body;

			if (!interviewId) {
				return res.status(400).json({ success: false, error: "Interview ID is required" });
			}

			const intRef = db.collection("organizationInterviews").doc(interviewId);
			const intDoc = await intRef.get();
			if (!intDoc.exists) {
				return res.status(404).json({ success: false, error: "Interview not found" });
			}

			const intData = intDoc.data() as any;
			if (intData.organizationId !== orgId) {
				return res.status(404).json({ success: false, error: "Interview not found in this organization" });
			}

			// Verify recruiter or assigned interviewer permissions
			const { allowed: isRecruiter } = await checkOrgPermission(orgId, uid, "organization.manageRecruitment");
			const isAssignedInterviewer = intData.interviewerUid === uid;

			if (!isRecruiter && !isAssignedInterviewer) {
				return res.status(403).json({ success: false, error: "Access Denied: Only recruiters or assigned interviewers can write evaluations" });
			}

			const updatePayload: any = {};
			if (notes !== undefined) updatePayload.notes = notes;
			if (evaluation !== undefined) updatePayload.evaluation = evaluation;
			if (status !== undefined) updatePayload.status = status;

			await intRef.update(updatePayload);

			return res.status(200).json({ success: true, message: "Interview record updated successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in interviews API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
