import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, resolveOrgAndMembership } from "@/utils/orgEngine";

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

		const { org, member } = await resolveOrgAndMembership(orgId, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Organization not found" });
		}

		if (req.method === "GET") {
			if (org.visibility !== "public" && !member && org.ownerUid !== uid) {
				return res.status(403).json({ success: false, error: "Access Denied: Private organization" });
			}

			const snap = await db
				.collection("organizationCourses")
				.where("organizationId", "==", org.id)
				.get();

			const courses = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, courses });
		}

		if (req.method === "POST") {
			const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageCourses");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { code, title, semester, syllabus = "", instructorUids = [uid], taUids = [], studentUids = [] } = req.body;

			if (!code || !title || !semester) {
				return res.status(400).json({ success: false, error: "Code, title and semester are required" });
			}

			const courseId = "course-" + Math.random().toString(36).slice(2, 10);

			const newCourse = {
				id: courseId,
				organizationId: org.id,
				code,
				title,
				semester,
				syllabus,
				instructorUids,
				taUids,
				studentUids,
				createdAt: Date.now(),
			};

			await db.collection("organizationCourses").doc(courseId).set(newCourse);

			return res.status(201).json({ success: true, course: newCourse });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in courses API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
