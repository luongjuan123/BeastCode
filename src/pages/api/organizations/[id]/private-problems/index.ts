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

		// 1. Resolve permission
		const { allowed, org, member } = await checkOrgPermission(orgId, uid, "organization.createProblem");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		if (req.method === "GET") {
			// Fetch private problems list
			const snap = await db
				.collection("organizationPrivateProblems")
				.where("organizationId", "==", org.id)
				.get();

			const privateProblems = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, privateProblems });
		}

		if (req.method === "POST") {
			const {
				title,
				description,
				inputFormat,
				outputFormat,
				difficulty,
				tags = [],
				source = "",
				visibility = "organization",
				timeLimit = 1000,
				memoryLimit = 256,
			} = req.body;

			if (!title || !description) {
				return res.status(400).json({ success: false, error: "Title and description are required" });
			}

			const problemId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);

			const newProblem = {
				id: problemId,
				organizationId: org.id,
				authorUid: uid,
				editors: [uid],
				reviewers: [],
				title,
				description,
				inputFormat: inputFormat || "",
				outputFormat: outputFormat || "",
				difficulty: difficulty || "Medium",
				tags,
				source,
				visibility,
				reviewStatus: "draft",
				timeLimit,
				memoryLimit,
				version: 1,
				versions: [
					{
						version: 1,
						editorUid: uid,
						editorName: decodedToken.name || "Author",
						timestamp: Date.now(),
						summary: "Initial draft problem creation",
					},
				],
				examples: [],
				hiddenTests: [],
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.collection("organizationPrivateProblems").doc(problemId).set(newProblem);

			// Emit event log
			await emitOrgEvent(
				org.id,
				uid,
				"private_problem.created",
				null,
				"private_problem",
				problemId,
				{ title, visibility },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, problem: newProblem });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in private-problems API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
