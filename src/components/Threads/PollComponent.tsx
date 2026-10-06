import React, { useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { FaCheckCircle } from "react-icons/fa";

interface PollOption {
	text: string;
	votes: string[];
}

interface Poll {
	question: string;
	options: PollOption[];
	expiresAt?: number;
}

interface PollComponentProps {
	threadId: string;
	poll: Poll;
	isReply?: boolean;
	replyId?: string;
	repliesList?: any[];
}

const PollComponent: React.FC<PollComponentProps> = ({
	threadId,
	poll,
	isReply = false,
	replyId,
	repliesList = [],
}) => {
	const [user] = useAuthState(auth);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const totalVotes = useMemo(() => {
		return poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
	}, [poll]);

	const hasVoted = useMemo(() => {
		if (!user) return false;
		return poll.options.some((opt) => opt.votes?.includes(user.uid));
	}, [poll, user]);

	const userVotedIndex = useMemo(() => {
		if (!user) return -1;
		return poll.options.findIndex((opt) => opt.votes?.includes(user.uid));
	}, [poll, user]);

	const handleVote = async (optionIndex: number) => {
		if (!user) {
			setErrorMsg("Please log in to vote.");
			setTimeout(() => setErrorMsg(null), 3000);
			return;
		}

		try {
			const threadRef = doc(firestore, "threads", threadId);

			const updatedOptions = poll.options.map((opt, idx) => {
				const votes = opt.votes ? [...opt.votes] : [];
				const userIndex = votes.indexOf(user.uid);

				if (userIndex > -1) {
					votes.splice(userIndex, 1);
				}

				if (idx === optionIndex) {
					if (userIndex === -1) {
						votes.push(user.uid);
					}
				} else {
					const otherIndex = votes.indexOf(user.uid);
					if (otherIndex > -1) {
						votes.splice(otherIndex, 1);
					}
				}

				return { ...opt, votes };
			});

			if (isReply && replyId) {
				const updatedReplies = repliesList.map((rep) => {
					if (rep.id === replyId) {
						return {
							...rep,
							submittedProblem: rep.submittedProblem || null,
							poll: { ...poll, options: updatedOptions },
						};
					}
					return rep;
				});

				await updateDoc(threadRef, {
					replies: updatedReplies,
				});
			} else {
				await updateDoc(threadRef, {
					poll: { ...poll, options: updatedOptions },
				});
			}
		} catch (error) {
			console.error("Error voting in poll:", error);
			setErrorMsg("Failed to vote. Try again.");
			setTimeout(() => setErrorMsg(null), 3000);
		}
	};

	return (
		<div className='bg-dark-layer-2 border border-gray-850/60 rounded-xl p-4 space-y-3 mt-2 max-w-md'>
			<h4 className='text-sm font-bold text-dark-gray-8 leading-snug'>{poll.question}</h4>
			<div className='space-y-2.5'>
				{poll.options.map((option, idx) => {
					const optVotes = option.votes?.length || 0;
					const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
					const isUserVote = idx === userVotedIndex;

					return (
						<div
							key={idx}
							onClick={() => handleVote(idx)}
							className={`relative overflow-hidden border rounded-xl py-2.5 px-4 cursor-pointer select-none transition duration-300 flex items-center justify-between group ${
								hasVoted
									? isUserVote
										? "border-brand-orange bg-brand-orange/5"
										: "border-gray-850 bg-dark-fill-3/50"
									: "border-gray-850 hover:border-brand-orange/40 bg-dark-fill-3 hover:bg-dark-fill-2"
							}`}
						>
							{hasVoted && (
								<div
									className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out ${
										isUserVote ? "bg-brand-orange/15" : "bg-dark-fill-3/20"
									}`}
									style={{ width: `${percentage}%` }}
								/>
							)}

							<span className='relative z-10 text-xs font-semibold text-dark-gray-8 group-hover:text-dark-gray-8 transition duration-150 flex items-center gap-2'>
								{option.text}
								{hasVoted && isUserVote && <FaCheckCircle className='text-brand-orange' size={12} />}
							</span>

							{hasVoted && (
								<span className='relative z-10 text-xs font-mono font-bold text-dark-gray-7 transition duration-150'>
									{percentage}% <span className='text-[10px] text-bc-muted font-normal'>({optVotes})</span>
								</span>
							)}
						</div>
					);
				})}
			</div>
			<div className='flex justify-between items-center text-[10px] text-dark-gray-7 font-semibold px-1 pt-1'>
				<span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
				{errorMsg ? (
					<span className='text-bc-error font-bold transition duration-300'>{errorMsg}</span>
				) : hasVoted ? (
					<span className='text-brand-orange font-bold'>Voted</span>
				) : null}
			</div>
		</div>
	);
};

export default PollComponent;
