import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { resolveOrgAndMembership } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const assessmentId = req.query.assessmentId as string;
	const authorization = req.headers.authorization;

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		// Verify organization accessibility
		const { org, member } = await resolveOrgAndMembership(orgId, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Organization not found" });
		}

		// Fetch the assessment details
		const assessmentDoc = await db.collection("organizationAssessments").doc(assessmentId).get();
		if (!assessmentDoc.exists) {
			return res.status(404).json({ success: false, error: "Assessment template not found" });
		}

		const assessmentData = assessmentDoc.data() as any;
		if (assessmentData.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Assessment template not found in this organization" });
		}

		// Verify caller is member or candidate of the organization
		if (!member && org.ownerUid !== uid) {
			const appSnap = await db
				.collection("organizationApplications")
				.where("organizationId", "==", org.id)
				.where("candidateUid", "==", uid)
				.limit(1)
				.get();
			if (appSnap.empty) {
				return res.status(403).json({ success: false, error: "Access Denied: You are not authorized to access this assessment" });
			}
		}

		// 1. GET request: Fetch assessment detail + candidate session details
		if (req.method === "GET") {
			// Find existing attempt for the candidate
			const attemptSnap = await db
				.collection("organizationAssessmentAttempts")
				.where("assessmentId", "==", assessmentId)
				.where("candidateUid", "==", uid)
				.limit(1)
				.get();

			const attempt = attemptSnap.empty ? null : attemptSnap.docs[0].data();

			// For security, if the candidate has not started, do not leak actual problems yet (or return titles only)
			const responseData = {
				id: assessmentData.id,
				title: assessmentData.title,
				timeLimitMinutes: assessmentData.timeLimitMinutes,
				antiCheatSettings: assessmentData.antiCheatSettings,
				attempt,
				problems: [] as any[],
			};

			if (attempt) {
				// Fetch the problems details because they started/submitted
				const problemIds = assessmentData.privateProblemIds || [];
				for (const pid of problemIds) {
					const pdoc = await db.collection("organizationPrivateProblems").doc(pid).get();
					if (pdoc.exists) {
						const pdata = pdoc.data() as any;
						responseData.problems.push({
							id: pdoc.id,
							title: pdata.title,
							description: pdata.description,
							difficulty: pdata.difficulty,
							timeLimit: pdata.timeLimit,
							memoryLimit: pdata.memoryLimit,
						});
					}
				}
			}

			return res.status(200).json({ success: true, assessment: responseData });
		}

		// 2. POST request: Start or Submit the assessment
		if (req.method === "POST") {
			const { action, submissions = {} } = req.body;

			const attemptRef = db.collection("organizationAssessmentAttempts").doc(`${assessmentId}_${uid}`);
			const attemptDoc = await attemptRef.get();

			if (action === "start") {
				if (attemptDoc.exists) {
					return res.status(400).json({ success: false, error: "Assessment already started" });
				}

				const newAttempt = {
					id: `${assessmentId}_${uid}`,
					assessmentId,
					candidateUid: uid,
					startTime: Date.now(),
					endTime: null,
					status: "started",
					submissions: {},
					finalScore: 0,
				};

				await attemptRef.set(newAttempt);

				return res.status(201).json({ success: true, attempt: newAttempt });
			}

			if (action === "submit") {
				if (!attemptDoc.exists) {
					return res.status(400).json({ success: false, error: "No active assessment attempt found" });
				}

				const attemptData = attemptDoc.data() as any;
				if (attemptData.status !== "started") {
					return res.status(400).json({ success: false, error: "Assessment has already been completed" });
				}

				// Compute score
				// Submissions is a map problemId -> { code, language, score, passedCount, totalCount, verdict }
				let totalScore = 0;
				const problemIds = assessmentData.privateProblemIds || [];
				const finalSubmissions: Record<string, any> = {};

				for (const pid of problemIds) {
					const sub = submissions[pid] || { score: 0, verdict: "No Submission" };
					finalSubmissions[pid] = sub;
					totalScore += sub.score || 0;
				}

				const averageScore = problemIds.length > 0 ? Math.round(totalScore / problemIds.length) : 0;

				await attemptRef.update({
					status: "completed",
					endTime: Date.now(),
					submissions: finalSubmissions,
					finalScore: averageScore,
				});

				// Update corresponding application score if applicable
				const appSnap = await db
					.collection("organizationApplications")
					.where("organizationId", "==", orgId)
					.where("candidateUid", "==", uid)
					.limit(1)
					.get();

				if (!appSnap.empty) {
					const appDocRef = appSnap.docs[0].ref;
					await appDocRef.update({
						assessmentScore: averageScore,
						assessmentAttemptId: `${assessmentId}_${uid}`,
					});
				}

				return res.status(200).json({ success: true, score: averageScore });
			}
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in assessment details API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
