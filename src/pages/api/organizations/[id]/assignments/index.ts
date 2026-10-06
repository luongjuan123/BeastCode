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

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.assignHomework");

		if (req.method === "GET") {
			const { member } = await checkOrgPermission(orgId, uid, "organization.uploadFile");
			if (!member && org.visibility === "private") {
				return res.status(403).json({ success: false, error: "Access Denied" });
			}

			const snap = await db
				.collection("organizationAssignments")
				.where("organizationId", "==", org.id)
				.get();

			const assignments = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, assignments });
		}

		if (req.method === "POST") {
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const {
				title,
				description = "",
				problemIds = [],
				assigneeType = "all",
				assigneeIds = [],
				openDate,
				closeDate,
				lateSubmissionAllowed = false,
				latePenaltyPercentage = 10,
				autoLock = false,
			} = req.body;

			if (!title || problemIds.length === 0) {
				return res.status(400).json({ success: false, error: "Title and problem IDs are required" });
			}

			const assignmentId = "assignment-" + Math.random().toString(36).slice(2, 10);

			const newAssignment = {
				id: assignmentId,
				organizationId: org.id,
				title,
				description,
				problemIds,
				assigneeType,
				assigneeIds,
				openDate: openDate || Date.now(),
				closeDate: closeDate || (Date.now() + 7 * 24 * 3600 * 1000), // 7 days fallback
				lateSubmissionAllowed,
				latePenaltyPercentage,
				autoLock,
				createdBy: uid,
				createdAt: Date.now(),
			};

			await db.collection("organizationAssignments").doc(assignmentId).set(newAssignment);

			await emitOrgEvent(
				org.id,
				uid,
				"assignment.created",
				null,
				"assignment",
				assignmentId,
				{ title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			// Trigger transactional mail dispatch to notify users
			// Fetch active members list
			const membersSnap = await db
				.collection("organizationMembers")
				.where("organizationId", "==", org.id)
				.where("status", "==", "active")
				.get();

			for (const memberDoc of membersSnap.docs) {
				const memberData = memberDoc.data();
				if (memberData.uid && memberData.uid !== uid) {
					await emitOrgEvent(
						org.id,
						uid,
						"assignment.notified",
						memberData.uid,
						"assignment",
						assignmentId,
						{ title },
						"127.0.0.1"
					);
				}
			}

			return res.status(201).json({ success: true, assignment: newAssignment });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in assignments API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
