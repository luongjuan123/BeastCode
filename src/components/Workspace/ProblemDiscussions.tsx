import React from "react";
import ThreadsBoard from "@/components/Threads/Threads";

interface ProblemDiscussionsProps {
	problemId: string;
	problemTitle: string;
	lightTheme?: boolean;
}

const ProblemDiscussions: React.FC<ProblemDiscussionsProps> = ({ problemId, problemTitle, lightTheme = false }) => {
	return (
		<div className='w-full'>
			<ThreadsBoard problemId={problemId} problemTitle={problemTitle} />
		</div>
	);
};

export default ProblemDiscussions;
