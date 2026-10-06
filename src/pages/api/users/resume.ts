import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { computeUserProfileScore, checkOrgPermission } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const authorization = req.headers.authorization;
	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const tokenUid = decodedToken.uid;

		if (req.method === "GET") {
			const { uid, orgId } = req.query;
			const targetUid = (uid as string) || tokenUid;

			// If looking at another user's resume, check if caller is an authorized recruiter/admin in the org
			if (targetUid !== tokenUid) {
				if (!orgId) {
					return res.status(400).json({ success: false, error: "orgId parameter is required to view candidate resumes" });
				}
				const { allowed } = await checkOrgPermission(orgId as string, tokenUid, "organization.manageRecruitment");
				if (!allowed) {
					return res.status(403).json({ success: false, error: "Access Denied: You are not authorized to view this candidate resume" });
				}
			}

			const resumeDoc = await db.collection("resumes").doc(targetUid).get();
			if (!resumeDoc.exists) {
				return res.status(200).json({ success: true, resume: null });
			}

			return res.status(200).json({ success: true, resume: resumeDoc.data() });
		}

		if (req.method === "POST" || req.method === "PATCH") {
			const {
				education = [],
				experience = [],
				projects = [],
				awards = [],
				certifications = [],
				languages = [],
				skills = [],
				programmingLanguages = [],
				cpAchievements = [],
				openSourceContributions = [],
			} = req.body;

			// Retrieve main user record for solver counts / contest rating
			const userDoc = await db.collection("users").doc(tokenUid).get();
			const userData = userDoc.exists ? userDoc.data() : {};

			const resumePayload = {
				uid: tokenUid,
				education,
				experience,
				projects,
				awards,
				certifications,
				languages,
				skills,
				programmingLanguages,
				cpAchievements,
				openSourceContributions,
				contestRating: userData?.contestRating || 0,
				solvedProblems: userData?.solvedProblems?.length || 0,
				updatedAt: Date.now(),
			};

			// Run Auto Profile Score calculation
			const autoProfileScore = computeUserProfileScore(userData, resumePayload);

			const finalResume = {
				...resumePayload,
				autoProfileScore,
			};

			await db.collection("resumes").doc(tokenUid).set(finalResume);

			// Optionally sync overall score to user details profile
			await db.collection("users").doc(tokenUid).update({
				resumeProfileScore: autoProfileScore,
			}).catch(() => {});

			return res.status(200).json({ success: true, resume: finalResume });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in resume API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
