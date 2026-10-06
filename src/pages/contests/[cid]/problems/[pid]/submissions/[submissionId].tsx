import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { SubmissionDetails } from "@/components/Submissions/SubmissionDetails";
import React from "react";
import { problems as staticProblems } from "@/utils/problems";

type ContestSubmissionPageProps = {
	problem: {
		id: string;
		title: string;
		difficulty: string;
		examples: any[];
	};
	submission: any;
	contestId: string;
};

const ContestSubmissionPage: React.FC<ContestSubmissionPageProps> = ({ problem, submission, contestId }) => {
	return (
		<SubmissionDetails
			problem={problem}
			initialSubmission={submission}
			contestId={contestId}
		/>
	);
};

export default ContestSubmissionPage;

export async function getServerSideProps({ params }: any) {
	const { cid, pid, submissionId } = params;
	const db = getAdminFirestore();

	// Fetch problem doc
	const problemDoc = await db.collection("problems").doc(pid).get();

	// Fetch contest submission doc
	const subDoc = await db.collection("contest_submissions").doc(submissionId).get();
	if (!subDoc.exists) {
		return { notFound: true };
	}

	const subData = subDoc.data()!;
	const submission = {
		id: subDoc.id,
		uid: subData.uid || "",
		username: subData.username || "",
		problemId: subData.problemId || "",
		problemTitle: subData.problemTitle || "",
		code: subData.code || "",
		language: subData.language || "",
		status: subData.status || "",
		verdict: subData.verdict || "",
		score: subData.score || 0,
		timestamp: subData.timestamp || 0,
		testResults: subData.testResults || [],
		runtime: subData.runtime || 0,
		memory: subData.memory || 0,
		error: subData.error || null,
		message: subData.message || null,
	};

	let problem: any = null;
	if (problemDoc.exists) {
		const problemData = problemDoc.data()!;
		problem = {
			id: problemDoc.id,
			title: problemData.title || "",
			difficulty: problemData.difficulty || "Easy",
			examples: problemData.examples || [],
		};
	} else if (staticProblems[pid]) {
		const staticProb = staticProblems[pid];
		problem = {
			id: pid,
			title: staticProb.title || "",
			difficulty: staticProb.difficulty || "Easy",
			examples: staticProb.examples || [],
		};
	}

	if (!problem) {
		return { notFound: true };
	}

	return {
		props: {
			problem,
			submission,
			contestId: cid,
		}
	};
}
