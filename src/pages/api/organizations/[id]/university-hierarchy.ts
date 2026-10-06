import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const authorization = req.headers.authorization;

	const db = getAdminFirestore();

	if (req.method === "GET") {
		try {
			const snap = await db
				.collection("organizationUniversityNodes")
				.where("organizationId", "==", orgId)
				.get();

			const nodes = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, nodes });
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

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageCourses");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		if (req.method === "POST") {
			const { name, type, parentId = null, managerUids = [], studentUids = [], graduationYears = {} } = req.body;

			if (!name || !type) {
				return res.status(400).json({ success: false, error: "Name and Type are required" });
			}

			const nodeId = "node-" + Math.random().toString(36).slice(2, 10);

			const newNode = {
				id: nodeId,
				organizationId: org.id,
				parentId,
				name,
				type, // faculty, department, course, class, semester
				managerUids,
				studentUids,
				graduationYears,
				createdAt: Date.now(),
			};

			await db.collection("organizationUniversityNodes").doc(nodeId).set(newNode);

			await emitOrgEvent(
				org.id,
				uid,
				"university.node_created",
				null,
				"organizationUniversityNodes",
				nodeId,
				{ name, type },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, node: newNode });
		}

		if (req.method === "PATCH") {
			const { nodeId, name, managerUids, studentUids, graduationYears } = req.body;

			if (!nodeId) {
				return res.status(400).json({ success: false, error: "Node ID is required for updates" });
			}

			const nodeRef = db.collection("organizationUniversityNodes").doc(nodeId);
			const nodeDoc = await nodeRef.get();
			if (!nodeDoc.exists) {
				return res.status(404).json({ success: false, error: "University hierarchy node not found" });
			}

			const nodeData = nodeDoc.data() as any;
			if (nodeData?.organizationId !== org.id) {
				return res.status(404).json({ success: false, error: "University hierarchy node not found in this organization" });
			}

			const updatePayload: any = {};
			if (name !== undefined) updatePayload.name = name;
			if (managerUids !== undefined) updatePayload.managerUids = managerUids;
			if (studentUids !== undefined) updatePayload.studentUids = studentUids;
			if (graduationYears !== undefined) updatePayload.graduationYears = graduationYears;

			await nodeRef.update(updatePayload);

			return res.status(200).json({ success: true, message: "Node updated successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in university-hierarchy API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
