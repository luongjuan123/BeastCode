import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const teamId = req.query.teamId as string;
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

		const teamRef = db.collection("organizationTeams").doc(teamId);
		const teamDoc = await teamRef.get();

		if (!teamDoc.exists) {
			return res.status(404).json({ success: false, error: "Team not found" });
		}

		const currentTeam = teamDoc.data() as any;
		if (currentTeam.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Team not found in this organization" });
		}

		// Verify if editor is either the Team Captain or an Org Manager/Coach
		const isCaptain = currentTeam.captainUid === uid;
		if (!allowed && !isCaptain) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		if (req.method === "PATCH") {
			const { action, targetUid, name, logoUrl } = req.body;

			if (action === "add_member") {
				if (!targetUid) {
					return res.status(400).json({ success: false, error: "Target member UID is required" });
				}
				const updatedMembers = Array.from(new Set([...currentTeam.members, targetUid]));
				await teamRef.update({ members: updatedMembers });

				await emitOrgEvent(
					org.id,
					uid,
					"team.member_added",
					targetUid,
					"team",
					teamId,
					{},
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, team: { ...currentTeam, members: updatedMembers } });
			}

			if (action === "kick_member") {
				if (!targetUid) {
					return res.status(400).json({ success: false, error: "Target member UID is required" });
				}
				if (targetUid === currentTeam.captainUid) {
					return res.status(400).json({ success: false, error: "Cannot kick the team captain. Transfer captaincy first." });
				}
				const updatedMembers = currentTeam.members.filter((m: string) => m !== targetUid);
				await teamRef.update({ members: updatedMembers });

				await emitOrgEvent(
					org.id,
					uid,
					"team.member_kicked",
					targetUid,
					"team",
					teamId,
					{},
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, team: { ...currentTeam, members: updatedMembers } });
			}

			if (action === "transfer_captain") {
				if (!targetUid) {
					return res.status(400).json({ success: false, error: "Target captain UID is required" });
				}
				if (!currentTeam.members.includes(targetUid)) {
					return res.status(400).json({ success: false, error: "Target captain must be an active member of this team" });
				}
				await teamRef.update({ captainUid: targetUid });

				await emitOrgEvent(
					org.id,
					uid,
					"team.captain_transferred",
					targetUid,
					"team",
					teamId,
					{},
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, team: { ...currentTeam, captainUid: targetUid } });
			}

			// Edit team metadata
			const updatePayload: any = {};
			if (name) updatePayload.name = name;
			if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl;

			await teamRef.update(updatePayload);

			return res.status(200).json({ success: true, team: { ...currentTeam, ...updatePayload } });
		}

		if (req.method === "DELETE") {
			await teamRef.delete();

			await emitOrgEvent(
				org.id,
				uid,
				"team.deleted",
				null,
				"team",
				teamId,
				{ name: currentTeam.name },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Team deleted successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in team detail API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
