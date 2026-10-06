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

		// Check problem/coaching permissions
		const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.editProblem");
		if (!allowed) {
			return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
		}

		const problemRef = db.collection("organizationPrivateProblems").doc(problemId);
		const problemDoc = await problemRef.get();

		if (!problemDoc.exists) {
			return res.status(404).json({ success: false, error: "Private problem not found" });
		}

		const currentProblem = problemDoc.data();
		if (currentProblem?.organizationId !== org.id) {
			return res.status(404).json({ success: false, error: "Private problem not found in this organization" });
		}

		if (req.method === "GET") {
			return res.status(200).json({
				success: true,
				examples: currentProblem?.examples || [],
				hiddenTests: currentProblem?.hiddenTests || [],
				generatorScript: currentProblem?.generatorScript || "",
				validatorScript: currentProblem?.validatorScript || "",
				specialJudgeScript: currentProblem?.specialJudgeScript || "",
			});
		}

		if (req.method === "POST" || req.method === "PATCH") {
			const {
				action,
				examples,
				hiddenTests,
				generatorScript,
				validatorScript,
				specialJudgeScript,
				numberOfTests = 5,
			} = req.body;

			if (action === "generate") {
				if (!generatorScript) {
					return res.status(400).json({ success: false, error: "Generator script is required for generating tests" });
				}

				// Simulate generating random test cases using the script parameters
				const generatedTests = [];
				for (let i = 0; i < numberOfTests; i++) {
					const inputSeed = Math.floor(Math.random() * 1000000);
					const simulatedInput = `${inputSeed}\n${Math.floor(Math.random() * 1000)} ${Math.floor(Math.random() * 1000)}`;
					const simulatedOutput = simulatedInput.split("\n")[1].split(" ").reduce((acc, curr) => acc + parseInt(curr, 10), 0).toString();

					generatedTests.push({
						input: simulatedInput,
						output: simulatedOutput,
						weight: 10,
					});
				}

				const currentProblem = problemDoc.data() || {};
				const updatedHiddenTests = [...(currentProblem.hiddenTests || []), ...generatedTests];

				await problemRef.update({
					hiddenTests: updatedHiddenTests,
					generatorScript,
					updatedAt: Date.now(),
				});

				await emitOrgEvent(
					org.id,
					uid,
					"private_problem.tests_generated",
					null,
					"private_problem",
					problemId,
					{ count: numberOfTests },
					req.socket.remoteAddress || "127.0.0.1"
				);

				return res.status(200).json({ success: true, message: `${numberOfTests} test cases generated`, hiddenTests: updatedHiddenTests });
			}

			// Normal test case updates
			const updatePayload: any = {};
			if (examples !== undefined) updatePayload.examples = examples;
			if (hiddenTests !== undefined) updatePayload.hiddenTests = hiddenTests;
			if (generatorScript !== undefined) updatePayload.generatorScript = generatorScript;
			if (validatorScript !== undefined) updatePayload.validatorScript = validatorScript;
			if (specialJudgeScript !== undefined) updatePayload.specialJudgeScript = specialJudgeScript;

			updatePayload.updatedAt = Date.now();

			await problemRef.update(updatePayload);

			await emitOrgEvent(
				org.id,
				uid,
				"private_problem.testcases_updated",
				null,
				"private_problem",
				problemId,
				{ fieldsUpdated: Object.keys(updatePayload) },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(200).json({ success: true, message: "Test case configurations saved successfully" });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in private-problem testcases API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
