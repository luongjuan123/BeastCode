import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { problems as staticProblems } from "@/utils/problems";
import { Problem, Example } from "@/utils/types/problem";

export interface GradingProblemResult {
	problem: Problem | null;
	testcases: Example[];
	totalCount: number;
	error?: string;
}

/**
 * Server-only loader that retrieves the complete grading testcase suite.
 * Used exclusively by /api/submit and judge grading pipelines.
 * NEVER returns or exposes hidden testcases to the client.
 */
export async function getProblemForGrading(problemId: string): Promise<GradingProblemResult> {
	if (!problemId) {
		return { problem: null, testcases: [], totalCount: 0, error: "MISSING_PROBLEM_ID" };
	}

	try {
		const db = getAdminFirestore();
		const docSnap = await db.collection("problems").doc(problemId).get();

		if (docSnap.exists) {
			const data = docSnap.data() || {};
			const rawExamples: Example[] = Array.isArray(data.examples) ? data.examples : [];

			// Validate and normalize testcases
			const validTestcases = rawExamples.filter(
				(tc) => tc && typeof tc.inputText === "string" && typeof tc.outputText === "string"
			);

			if (validTestcases.length === 0) {
				return {
					problem: { id: docSnap.id, ...data } as Problem,
					testcases: [],
					totalCount: 0,
					error: "NO_GRADING_TESTCASES",
				};
			}

			// Ensure stable, deterministic ordering
			const sortedTestcases = [...validTestcases].sort((a, b) => {
				const idA = typeof a.id === "number" ? a.id : 0;
				const idB = typeof b.id === "number" ? b.id : 0;
				return idA - idB;
			});

			const problem: Problem = {
				id: docSnap.id,
				title: data.title || "",
				problemStatement: data.problemStatement || "",
				examples: sortedTestcases,
				constraints: data.constraints || "",
				starterCode: data.starterCode || "",
				handlerFunction: data.handlerFunction || "",
				starterFunctionName: data.starterFunctionName || "",
				inputFormat: data.inputFormat || "",
				outputFormat: data.outputFormat || "",
				tags: Array.isArray(data.tags) ? data.tags : [],
				description: data.description || "",
				language: data.language || "English",
				difficulty: data.difficulty || "Medium",
				points: data.points || data.maxScore || 100,
				executionProfile: data.executionProfile || "normal",
				customTimeoutMs: data.customTimeoutMs,
				customMemoryLimitMb: data.customMemoryLimitMb,
				customMaxOutputSizeChars: data.customMaxOutputSizeChars,
				customCpuCount: data.customCpuCount,
				customDiskLimitMb: data.customDiskLimitMb,
				customProcessLimit: data.customProcessLimit,
				customChecker: data.customChecker,
			};

			return {
				problem,
				testcases: sortedTestcases,
				totalCount: sortedTestcases.length,
			};
		}

		// Fallback to static problems for development / local testing
		if (staticProblems[problemId]) {
			const deletedSnap = await db.collection("deleted_problems").doc(problemId).get();
			if (!deletedSnap.exists) {
				const staticProb = staticProblems[problemId];
				const rawExamples: Example[] = Array.isArray(staticProb.examples) ? staticProb.examples : [];
				const validTestcases = rawExamples.filter(
					(tc) => tc && typeof tc.inputText === "string" && typeof tc.outputText === "string"
				);

				if (validTestcases.length === 0) {
					return {
						problem: staticProb,
						testcases: [],
						totalCount: 0,
						error: "NO_GRADING_TESTCASES",
					};
				}

				return {
					problem: staticProb,
					testcases: validTestcases,
					totalCount: validTestcases.length,
				};
			}
		}

		return { problem: null, testcases: [], totalCount: 0, error: "PROBLEM_NOT_FOUND" };
	} catch (err: any) {
		console.error(`[getProblemForGrading] Error loading problem ${problemId}:`, err);
		return { problem: null, testcases: [], totalCount: 0, error: err.message };
	}
}

/**
 * Public problem DTO loader for client pages (getStaticProps, getServerSideProps).
 * Strips all hidden grading testcases so confidential inputs and outputs are never
 * leaked into __NEXT_DATA__, page props, or the browser bundle.
 */
export async function getPublicProblem(problemId: string): Promise<Problem | null> {
	if (!problemId) return null;

	try {
		const db = getAdminFirestore();
		const docSnap = await db.collection("problems").doc(problemId).get();

		let rawProblem: any = null;

		if (docSnap.exists) {
			rawProblem = { id: docSnap.id, ...docSnap.data() };
		} else if (staticProblems[problemId]) {
			const deletedSnap = await db.collection("deleted_problems").doc(problemId).get();
			if (!deletedSnap.exists) {
				const staticProb = staticProblems[problemId];
				rawProblem = {
					...staticProb,
					handlerFunction:
						typeof staticProb.handlerFunction === "function"
							? staticProb.handlerFunction.toString()
							: staticProb.handlerFunction,
				};
			}
		}

		if (!rawProblem) return null;

		const rawExamples: Example[] = Array.isArray(rawProblem.examples) ? rawProblem.examples : [];

		// Filter for explicitly marked public samples
		let publicSamples = rawExamples.filter((ex) => Boolean(ex && ex.isSample));

		// If none are marked with isSample (e.g. legacy or static problems), take the first 1-3 as samples
		if (publicSamples.length === 0 && rawExamples.length > 0) {
			publicSamples = rawExamples.slice(0, 3).map((ex, idx) => ({
				...ex,
				isSample: true,
				id: ex.id || idx + 1,
			}));
		}

		// Ensure public samples contain only client-safe fields
		const sanitizedSamples: Example[] = publicSamples.map((s, idx) => ({
			id: s.id || idx + 1,
			inputText: s.inputText || "",
			outputText: s.outputText || "",
			explanation: s.explanation || "",
			img: s.img || "",
			isSample: true,
		}));

		const publicDto: Problem = {
			id: rawProblem.id,
			title: rawProblem.title || "",
			problemStatement: rawProblem.problemStatement || "",
			examples: sanitizedSamples,
			constraints: rawProblem.constraints || "",
			starterCode: rawProblem.starterCode || "",
			handlerFunction: rawProblem.handlerFunction || "",
			starterFunctionName: rawProblem.starterFunctionName || "",
			inputFormat: rawProblem.inputFormat || "",
			outputFormat: rawProblem.outputFormat || "",
			tags: Array.isArray(rawProblem.tags) ? rawProblem.tags : [],
			description: rawProblem.description || "",
			language: rawProblem.language || "English",
			difficulty: rawProblem.difficulty || "Medium",
			points: rawProblem.points || rawProblem.maxScore || 100,
			customChecker: rawProblem.customChecker || null,
			editorial: rawProblem.editorial || null,
			executionProfile: rawProblem.executionProfile || "normal",
		};

		return publicDto;
	} catch (err) {
		console.error(`[getPublicProblem] Error loading problem ${problemId}:`, err);
		return null;
	}
}
