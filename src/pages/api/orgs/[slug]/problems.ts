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
				.collection("organizationProblems")
				.where("orgSlug", "==", orgSlug)
				.get();

			const problemIds: string[] = [];
			snapshot.forEach((doc) => {
				problemIds.push(doc.data().problemId);
			});

			const list: any[] = [];
			if (problemIds.length > 0) {
				// Fetch details from main problems collection in chunks of 30
				const chunks = [];
				for (let i = 0; i < problemIds.length; i += 30) {
					chunks.push(problemIds.slice(i, i + 30));
				}

				const detailsPromises = chunks.map((chunk) =>
					db.collection("problems").where("__name__", "in", chunk).get()
				);
				const snaps = await Promise.all(detailsPromises);
				snaps.forEach((snap) => {
					snap.forEach((doc) => {
						const data = doc.data();
						list.push({
							id: doc.id,
							title: data.title || doc.id,
							difficulty: data.difficulty || "Easy",
							category: data.category || "",
						});
					});
				});
			}

			return res.status(200).json({ success: true, problems: list });
		} catch (error: any) {
			console.error("GET org problems error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "POST") {
		// Link a problem
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_PROBLEMS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to manage problems." });
			}

			const { problemId } = req.body;
			if (!problemId) {
				return res.status(400).json({ success: false, error: "Problem ID is required." });
			}

			const problemDoc = await db.collection("problems").doc(problemId).get();
			if (!problemDoc.exists) {
				return res.status(404).json({ success: false, error: "Problem not found in global database." });
			}

			const linkId = `${orgSlug}_${problemId}`;
			const linkRef = db.collection("organizationProblems").doc(linkId);
			const linkDoc = await linkRef.get();
			if (linkDoc.exists) {
				return res.status(400).json({ success: false, error: "Problem is already linked to this organization." });
			}

			await linkRef.set({
				orgSlug,
				problemId,
				linkedAt: Date.now(),
				linkedBy: uid,
			});

			// Increment problemCount in organization
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.problemCount || 0;
					transaction.update(orgRef, { problemCount: currentCount + 1 });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"PROBLEM_LINKED",
				problemId,
				{ title: problemDoc.data()?.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, message: "Problem linked successfully." });
		} catch (error: any) {
			console.error("Link org problem error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "DELETE") {
		// Unlink a problem
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "MANAGE_PROBLEMS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied. You do not have permission to manage problems." });
			}

			const { problemId } = req.body;
			if (!problemId) {
				return res.status(400).json({ success: false, error: "Problem ID is required." });
			}

			const linkId = `${orgSlug}_${problemId}`;
			const linkRef = db.collection("organizationProblems").doc(linkId);
			const linkDoc = await linkRef.get();
			if (!linkDoc.exists) {
				return res.status(404).json({ success: false, error: "Problem is not linked to this organization." });
			}

			await linkRef.delete();

			// Decrement problemCount in organization
			const orgRef = db.collection("organizations").doc(orgSlug);
			await db.runTransaction(async (transaction) => {
				const orgDoc = await transaction.get(orgRef);
				if (orgDoc.exists) {
					const currentCount = orgDoc.data()?.problemCount || 1;
					transaction.update(orgRef, { problemCount: Math.max(0, currentCount - 1) });
				}
			});

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "Admin",
				"PROBLEM_UNLINKED",
				problemId,
				{},
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Problem unlinked successfully." });
		} catch (error: any) {
			console.error("Unlink org problem error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
