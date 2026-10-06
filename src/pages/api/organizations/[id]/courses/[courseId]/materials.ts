import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, resolveOrgAndMembership } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const courseId = req.query.courseId as string;
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

		// Verify course exists and belongs to this organization
		const courseDoc = await db.collection("organizationCourses").doc(courseId).get();
		if (!courseDoc.exists) {
			return res.status(404).json({ success: false, error: "Course not found" });
		}
		const courseData = courseDoc.data() as any;
		if (courseData.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Course not found in this organization" });
		}

		if (req.method === "GET") {
			if (org.visibility !== "public" && !member && org.ownerUid !== uid) {
				return res.status(403).json({ success: false, error: "Access Denied: Private organization" });
			}

			const snap = await db
				.collection("organizationCourseMaterials")
				.where("courseId", "==", courseId)
				.get();

			const materials = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, materials });
		}

		if (req.method === "POST") {
			const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageCourses");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { title, type, url } = req.body;

			if (!title || !type || !url) {
				return res.status(400).json({ success: false, error: "Title, type and URL are required" });
			}

			const materialId = "mat-" + Math.random().toString(36).slice(2, 10);

			const newMaterial = {
				id: materialId,
				courseId,
				organizationId: org.id,
				title,
				type, // pdf, video, slides, lecture
				url,
				uploadedBy: uid,
				createdAt: Date.now(),
			};

			await db.collection("organizationCourseMaterials").doc(materialId).set(newMaterial);

			return res.status(201).json({ success: true, material: newMaterial });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in course materials API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
