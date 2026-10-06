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

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.createRoadmap");

		if (req.method === "GET") {
			// Baseline check: active members can view roadmaps
			const { member } = await checkOrgPermission(orgId, uid, "organization.uploadFile");
			if (!member && org.visibility === "private") {
				return res.status(403).json({ success: false, error: "Access Denied" });
			}

			const snap = await db
				.collection("organizationTrainingRoadmaps")
				.where("organizationId", "==", org.id)
				.get();

			const roadmaps = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, roadmaps });
		}

		if (req.method === "POST") {
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { title, description = "", modules = [] } = req.body;

			if (!title) {
				return res.status(400).json({ success: false, error: "Roadmap title is required" });
			}

			const roadmapId = "roadmap-" + Math.random().toString(36).slice(2, 10);

			const newRoadmap = {
				id: roadmapId,
				organizationId: org.id,
				title,
				description,
				modules, // array of training camp weeks details
				createdBy: uid,
				createdAt: Date.now(),
			};

			await db.collection("organizationTrainingRoadmaps").doc(roadmapId).set(newRoadmap);

			await emitOrgEvent(
				org.id,
				uid,
				"roadmap.created",
				null,
				"roadmap",
				roadmapId,
				{ title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, roadmap: newRoadmap });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in roadmaps API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
