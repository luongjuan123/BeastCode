import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent } from "@/utils/orgEngine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const problemId = req.query.problemId as string;
	const authorization = req.headers.authorization;

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		// 1. Check permissions
		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.editProblem");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		const problemRef = db.collection("organizationPrivateProblems").doc(problemId);
		const problemDoc = await problemRef.get();

		if (!problemDoc.exists) {
			return res.status(404).json({ success: false, error: "Private problem not found" });
		}

		const currentProblem = problemDoc.data() as any;
		if (currentProblem.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Private problem not found in this organization" });
		}

		if (req.method === "GET") {
			return res.status(200).json({ success: true, problem: currentProblem });
		}

		if (req.method === "PATCH") {
			const { action, versionNumber, summary = "", ...updatePayload } = req.body;

			// Handle version rollbacks
			if (action === "rollback") {
				if (!versionNumber) {
					return res.status(400).json({ success: false, error: "Version number is required for rollback" });
				}

				// Find version log history element
				const targetVersion = currentProblem.versions.find((v: any) => v.version === versionNumber);
				if (!targetVersion) {
					return res.status(404).json({ success: false, error: "Target version snapshot not found" });
				}

				// Fetch database snapshot matching that specific version
				const snapshotDoc = await db
					.collection("organizationProblemVersions")
					.doc(`${org.id}_${problemId}_v${versionNumber}`)
					.get();

				if (!snapshotDoc.exists) {
					return res.status(404).json({ success: false, error: "Problem state snapshot data not found" });
				}

				const rolledBackData = snapshotDoc.data()?.problemSnapshot;

				const nextVersionNum = currentProblem.version + 1;
				const rollbackAudit = {
					version: nextVersionNum,
					editorUid: uid,
					editorName: decodedToken.name || "Editor",
					timestamp: Date.now(),
					summary: `Rolled back to version v${versionNumber}`,
				};

				const updatedProblem = {
					...currentProblem,
					...rolledBackData,
					version: nextVersionNum,
					versions: [...currentProblem.versions, rollbackAudit],
					updatedAt: Date.now(),
				};

				await problemRef.set(updatedProblem);

				await emitOrgEvent(
					org.id,
					uid,
					"private_problem.rollback",
					null,
					"private_problem",
					problemId,
					{ targetVersion: versionNumber, newVersion: nextVersionNum },
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, problem: updatedProblem });
			}

			// Normal edits
			const nextVersion = currentProblem.version + 1;
			const editSummary = summary || "Updated problem configuration metadata";

			// Save previous snapshot in historic version backups collection
			const prevSnapshotRef = db.collection("organizationProblemVersions").doc(`${org.id}_${problemId}_v${currentProblem.version}`);
			await prevSnapshotRef.set({
				problemId,
				organizationId: org.id,
				version: currentProblem.version,
				editorUid: uid,
				editorName: decodedToken.name || "Editor",
				timestamp: Date.now(),
				summary: editSummary,
				problemSnapshot: {
					title: currentProblem.title,
					description: currentProblem.description,
					inputFormat: currentProblem.inputFormat,
					outputFormat: currentProblem.outputFormat,
					difficulty: currentProblem.difficulty,
					tags: currentProblem.tags,
					source: currentProblem.source,
					visibility: currentProblem.visibility,
					reviewStatus: currentProblem.reviewStatus,
					timeLimit: currentProblem.timeLimit,
					memoryLimit: currentProblem.memoryLimit,
				},
			});

			const nextVersions = [
				...currentProblem.versions,
				{
					version: nextVersion,
					editorUid: uid,
					editorName: decodedToken.name || "Editor",
					timestamp: Date.now(),
					summary: editSummary,
				},
			];

			const mergedData = {
				...currentProblem,
				...updatePayload,
				version: nextVersion,
				versions: nextVersions,
				updatedAt: Date.now(),
			};

			await problemRef.set(mergedData);

			await emitOrgEvent(
				org.id,
				uid,
				"private_problem.updated",
				null,
				"private_problem",
				problemId,
				{ summary: editSummary },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, problem: mergedData });
		}

		if (req.method === "DELETE") {
			const { allowed: canDelete } = await checkOrgPermission(orgId, uid, "organization.deleteProblem");
			if (!canDelete) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions to delete problem" });
			}

			// Delete problem statement and version logs
			await problemRef.delete();

			await emitOrgEvent(
				org.id,
				uid,
				"private_problem.deleted",
				null,
				"private_problem",
				problemId,
				{ title: currentProblem.title },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Problem deleted successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in private-problem details API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
