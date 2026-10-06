import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { SubmissionDetails } from "@/components/Submissions/SubmissionDetails";
import React from "react";
import { getPublicProblem } from "@/utils/problemLoader";

type SubmissionPageProps = {
	problem: {
		id: string;
		title: string;
		difficulty: string;
		examples: any[];
	};
	submission: any;
};

const SubmissionPage: React.FC<SubmissionPageProps> = ({ problem, submission }) => {
	return (
		<SubmissionDetails
			problem={problem}
			initialSubmission={submission}
		/>
	);
};

export default SubmissionPage;

export async function getServerSideProps({ params }: any) {
	const { pid, submissionId } = params;
	const db = getAdminFirestore();

	const problem = await getPublicProblem(pid);

	if (!problem) {
		return { notFound: true };
	}

	let submission: any = null;
	if (submissionId) {
		const subDoc = await db.collection("submissions").doc(submissionId).get();
		if (subDoc.exists) {
			submission = { id: subDoc.id, ...subDoc.data() };
		}
	}

	return {
		props: {
			problem: {
				id: problem.id,
				title: problem.title,
				difficulty: problem.difficulty,
				examples: problem.examples,
			},
			submission,
		}
	};
}
