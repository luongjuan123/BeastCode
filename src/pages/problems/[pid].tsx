import Topbar from "@/components/Topbar/Topbar";
import Workspace from "@/components/Workspace/Workspace";
import useHasMounted from "@/hooks/useHasMounted";
import { Problem } from "@/utils/types/problem";
import React from "react";
import { problems as staticProblems } from "@/utils/problems";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { SubmissionProvider } from "@/context/SubmissionContext";
import ErrorDisplay from "@/components/UI/ErrorDisplay";
import { getPublicProblem } from "@/utils/problemLoader";

type ProblemPageProps = {
	problem: Problem | null;
	errorType?: string;
};

const ProblemPage: React.FC<ProblemPageProps> = ({ problem, errorType }) => {
	const hasMounted = useHasMounted();

	if (!hasMounted) return null;

	if (errorType === "problem_not_found" || !problem) {
		return <ErrorDisplay type="problem_not_found" />;
	}

	return (
		<div>
			<Topbar problemPage />
			<SubmissionProvider problemId={problem.id}>
				<Workspace problem={problem} />
			</SubmissionProvider>
		</div>
	);
};
export default ProblemPage;

// fetch the local data
//  SSG
// getStaticPaths => it create the dynamic routes
export async function getStaticPaths() {
	return {
		paths: [],
		fallback: "blocking",
	};
}

export async function getStaticProps({ params }: { params: { pid: string } }) {
	const { pid } = params;
	const problem = await getPublicProblem(pid);

	if (!problem) {
		return {
			notFound: true,
			revalidate: 1,
		};
	}

	return {
		props: {
			problem,
		},
		revalidate: 1,
	};
}
