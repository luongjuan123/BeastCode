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

		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.manageTeams");

		if (req.method === "GET") {
			// All active members can view teams
			const { member } = await checkOrgPermission(orgId, uid, "organization.uploadFile"); // baseline check
			if (!member && org.visibility === "private") {
				return res.status(403).json({ success: false, error: "Access Denied" });
			}

			const snap = await db
				.collection("organizationTeams")
				.where("organizationId", "==", org.id)
				.get();

			const teams = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, teams });
		}

		if (req.method === "POST") {
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { name, members = [], logoUrl = "", country = "Vietnam" } = req.body;

			if (!name) {
				return res.status(400).json({ success: false, error: "Team name is required" });
			}

			const teamId = "team-" + Math.random().toString(36).slice(2, 10);

			const newTeam = {
				id: teamId,
				organizationId: org.id,
				name,
				captainUid: uid,
				members: Array.from(new Set([uid, ...members])),
				logoUrl,
				country,
				rating: 1500,
				createdAt: Date.now(),
			};

			await db.collection("organizationTeams").doc(teamId).set(newTeam);

			await emitOrgEvent(
				org.id,
				uid,
				"team.created",
				null,
				"team",
				teamId,
				{ name },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, team: newTeam });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in teams API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
