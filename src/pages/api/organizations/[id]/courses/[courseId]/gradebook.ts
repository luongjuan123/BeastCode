import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission } from "@/utils/orgEngine";

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

		// Verify role/permissions
		const { allowed: isInstructor } = await checkOrgPermission(orgId, uid, "organization.viewInstructorMetrics");

		// Fetch course details to verify student list
		const courseDoc = await db.collection("organizationCourses").doc(courseId).get();
		if (!courseDoc.exists) {
			return res.status(404).json({ success: false, error: "Course not found" });
		}

		const courseData = courseDoc.data() as any;
		if (courseData.organizationId !== orgId) {
			return res.status(404).json({ success: false, error: "Course not found in this organization" });
		}

		// 1. GET Request: View gradebook
		if (req.method === "GET") {
			const { exportFormat } = req.query;

			if (!isInstructor) {
				// Student viewing their own grades
				const isStudent = courseData.studentUids?.includes(uid);
				if (!isStudent) {
					return res.status(403).json({ success: false, error: "Access Denied: You are not enrolled in this course" });
				}

				const gradeDoc = await db.collection("organizationGradebook").doc(`${courseId}_${uid}`).get();
				if (!gradeDoc.exists) {
					return res.status(200).json({ success: true, grades: {} });
				}
				return res.status(200).json({ success: true, grades: gradeDoc.data() });
			}

			// Instructor viewing full gradebook
			const gradesSnap = await db
				.collection("organizationGradebook")
				.where("courseId", "==", courseId)
				.get();

			const gradeRecords = gradesSnap.docs.map((doc) => doc.data());

			// Resolve usernames/emails for CSV/JSON presentation
			const usersList = [];
			const studentUids = courseData.studentUids || [];

			for (const suid of studentUids) {
				const udoc = await db.collection("users").doc(suid).get();
				const udata = udoc.exists ? udoc.data() : {};
				const record = gradeRecords.find((r) => r.studentUid === suid) || {
					grades: {},
					finalGrade: "N/A",
					attendanceCount: 0,
				};

				usersList.push({
					uid: suid,
					displayName: udata?.displayName || udata?.username || "Student",
					email: udata?.email || "",
					finalGrade: record.finalGrade || "N/A",
					attendanceCount: record.attendanceCount || 0,
					grades: record.grades || {},
				});
			}

			// Check if CSV export is requested
			if (exportFormat === "csv") {
				let csvContent = "Student UID,Display Name,Email,Final Grade,Attendance Count\n";
				for (const item of usersList) {
					csvContent += `"${item.uid}","${item.displayName}","${item.email}","${item.finalGrade}",${item.attendanceCount}\n`;
				}
				res.setHeader("Content-Type", "text/csv");
				res.setHeader("Content-Disposition", `attachment; filename=gradebook-${courseId}.csv`);
				return res.status(200).send(csvContent);
			}

			return res.status(200).json({ success: true, gradebook: usersList });
		}

		// 2. POST/PATCH Request: Update grades
		if (req.method === "POST" || req.method === "PATCH") {
			if (!isInstructor) {
				return res.status(403).json({ success: false, error: "Access Denied: Only instructors can update gradebook records" });
			}

			const { studentUid, grades = {}, finalGrade = "N/A", attendanceCount = 0 } = req.body;

			if (!studentUid) {
				return res.status(400).json({ success: false, error: "Student UID is required" });
			}

			const entryId = `${courseId}_${studentUid}`;

			const gradePayload = {
				id: entryId,
				courseId,
				organizationId: orgId,
				studentUid,
				grades,
				finalGrade,
				attendanceCount,
				updatedAt: Date.now(),
			};

			await db.collection("organizationGradebook").doc(entryId).set(gradePayload, { merge: true });

			return res.status(200).json({ success: true, gradebookEntry: gradePayload });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in gradebook API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
