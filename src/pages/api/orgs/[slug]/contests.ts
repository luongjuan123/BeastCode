import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission, logOrgAction } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "GET") {
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "VIEW_ORG");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			const snapshot = await db
				.collection("organizationContests")
				.where("orgSlug", "==", orgSlug)
				.get();

			const contestIds: string[] = [];
			snapshot.forEach((doc) => {
				contestIds.push(doc.data().contestId);
			});

			const list: any[] = [];
			if (contestIds.length > 0) {
				// Fetch details from main contests collection in chunks of 30
				const chunks = [];
				for (let i = 0; i < contestIds.length; i += 30) {
					chunks.push(contestIds.slice(i, i + 30));
				}

				const detailsPromises = chunks.map((chunk) =>
					db.collection("contests").where("__name__", "in", chunk).get()
				);
				const snaps = await Promise.all(detailsPromises);
				snaps.forEach((snap) => {
					snap.forEach((doc) => {
						const data = doc.data();
						list.push({
							id: doc.id,
							title: data.title || doc.id,
							description: data.description || "",
							startTime: data.startTime || 0,
							endTime: data.endTime || 0,
							duration: data.duration || 120,
							status: data.status || "draft",
							visibility: data.visibility || "public",
						});
					});
				});
			}

			list.sort((a, b) => b.startTime - a.startTime);

			return res.status(200).json({ success: true, contests: list });
		} catch (error: any) {
			console.error("GET org contests error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		// Link an existing contest
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_CONTESTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to manage contests." });
			}

			const { contestId } = req.body;
			if (!contestId) {
				return res.status(400).json({ success: false, error: "Contest ID is required." });
			}

			const contestDoc = await db.collection("contests").doc(contestId).get();
			if (!contestDoc.exists) {
				return res.status(404).json({ success: false, error: "Contest not found in the global database." });
			}

			const linkId = `${orgSlug}_${contestId}`;
			const linkRef = db.collection("organizationContests").doc(linkId);
			const linkDoc = await linkRef.get();
			if (linkDoc.exists) {
				return res.status(400).json({ success: false, error: "Contest is already linked to this organization." });
			}

			await linkRef.set({
				orgSlug,
				contestId,
				linkedAt: Date.now(),
				linkedBy: uid,
			});

			// Increment contestCount in organization
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.contestCount || 0;
					transaction.update(orgRef, { contestCount: currentCount + 1 });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"CONTEST_LINKED",
				contestId,
				{ title: contestDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, message: "Contest linked successfully." });
		} catch (error: any) {
			console.error("Link org contest error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		// Unlink a contest
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_CONTESTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to manage contests." });
			}

			const { contestId } = req.body;
			if (!contestId) {
				return res.status(400).json({ success: false, error: "Contest ID is required." });
			}

			const linkId = `${orgSlug}_${contestId}`;
			const linkRef = db.collection("organizationContests").doc(linkId);
			const linkDoc = await linkRef.get();
			if (!linkDoc.exists) {
				return res.status(404).json({ success: false, error: "Contest is not linked to this organization." });
			}

			await linkRef.delete();

			// Decrement contestCount in organization
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.contestCount || 1;
					transaction.update(orgRef, { contestCount: Math.max(0, currentCount - 1) });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"CONTEST_UNLINKED",
				contestId,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Contest unlinked successfully." });
		} catch (error: any) {
			console.error("Unlink org contest error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
