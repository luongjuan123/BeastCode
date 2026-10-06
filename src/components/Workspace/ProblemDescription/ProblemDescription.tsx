import CircleSkeleton from "@/components/Skeletons/CircleSkeleton";
import RectangleSkeleton from "@/components/Skeletons/RectangleSkeleton";
import { auth, firestore } from "@/firebase/firebase";
import { DBProblem, Problem } from "@/utils/types/problem";
import { arrayRemove, arrayUnion, doc, getDoc, runTransaction, updateDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { AiFillLike, AiFillDislike, AiOutlineLoading3Quarters, AiFillStar } from "react-icons/ai";
import { BsCheck2Circle } from "react-icons/bs";
import { TiStarOutline } from "react-icons/ti";
import { FaCheck, FaGlobe } from "react-icons/fa";

type ProblemDescriptionProps = {
	problem: Problem;
	_solved: boolean;
	lightTheme?: boolean;
	activeLanguage: string;
	translating: boolean;
	handleTranslate: (langCode: string) => Promise<void>;
};

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({
	problem,
	_solved,
	lightTheme = false,
	activeLanguage,
	translating,
	handleTranslate,
}) => {
	const [user] = useAuthState(auth);
	const { currentProblem, loading, problemDifficultyClass, setCurrentProblem } = useGetCurrentProblem(problem.id);
	const { liked, disliked, solved, setData, starred } = useGetUsersDataOnProblem(problem.id);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const LANGUAGES = [
		{ code: "en", name: "English (Original)" },
		{ code: "vi", name: "Tiếng Việt (Vietnamese)" },
		{ code: "es", name: "Español (Spanish)" },
		{ code: "ja", name: "日本語 (Japanese)" },
		{ code: "zh-CN", name: "简体中文 (Chinese)" },
		{ code: "fr", name: "Français (French)" },
		{ code: "ko", name: "한국어 (Korean)" },
	];
	const [updating, setUpdating] = useState(false);
	const [loginTooltipTarget, setLoginTooltipTarget] = useState<"like" | "dislike" | "star" | null>(null);

	const returnUserDataAndProblemData = async (transaction: any) => {
		const userRef = doc(firestore, "users", user!.uid);
		const problemRef = doc(firestore, "problems", problem.id);
		const userDoc = await transaction.get(userRef);
		const problemDoc = await transaction.get(problemRef);
		return { userDoc, problemDoc, userRef, problemRef };
	};

	const handleLike = async () => {
		if (!user) {
			setLoginTooltipTarget("like");
			setTimeout(() => setLoginTooltipTarget(null), 2000);
			return;
		}
		if (updating) return;
		setUpdating(true);
		await runTransaction(firestore, async (transaction) => {
			const { problemDoc, userDoc, problemRef, userRef } = await returnUserDataAndProblemData(transaction);

			if (userDoc.exists() && problemDoc.exists()) {
				const userLikedProblems = userDoc.data().likedProblems || [];
				const userDislikedProblems = userDoc.data().dislikedProblems || [];
				const problemLikes = problemDoc.data().likes || 0;
				const problemDislikes = problemDoc.data().dislikes || 0;

				if (liked) {
					transaction.update(userRef, {
						likedProblems: userLikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						likes: problemLikes - 1,
					});

					setCurrentProblem((prev) => (prev ? { ...prev, likes: (prev.likes || 0) - 1 } : null));
					setData((prev) => ({ ...prev, liked: false }));
				} else if (disliked) {
					transaction.update(userRef, {
						likedProblems: [...userLikedProblems, problem.id],
						dislikedProblems: userDislikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						likes: problemLikes + 1,
						dislikes: problemDislikes - 1,
					});

					setCurrentProblem((prev) =>
						prev ? { ...prev, likes: (prev.likes || 0) + 1, dislikes: (prev.dislikes || 0) - 1 } : null
					);
					setData((prev) => ({ ...prev, liked: true, disliked: false }));
				} else {
					transaction.update(userRef, {
						likedProblems: [...userLikedProblems, problem.id],
					});
					transaction.update(problemRef, {
						likes: problemLikes + 1,
					});
					setCurrentProblem((prev) => (prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null));
					setData((prev) => ({ ...prev, liked: true }));
				}
			}
		});
		setUpdating(false);
	};

	const handleDislike = async () => {
		if (!user) {
			setLoginTooltipTarget("dislike");
			setTimeout(() => setLoginTooltipTarget(null), 2000);
			return;
		}
		if (updating) return;
		setUpdating(true);
		await runTransaction(firestore, async (transaction) => {
			const { problemDoc, userDoc, problemRef, userRef } = await returnUserDataAndProblemData(transaction);
			if (userDoc.exists() && problemDoc.exists()) {
				const userLikedProblems = userDoc.data().likedProblems || [];
				const userDislikedProblems = userDoc.data().dislikedProblems || [];
				const problemLikes = problemDoc.data().likes || 0;
				const problemDislikes = problemDoc.data().dislikes || 0;

				if (disliked) {
					transaction.update(userRef, {
						dislikedProblems: userDislikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						dislikes: problemDislikes - 1,
					});

					setCurrentProblem((prev) => (prev ? { ...prev, dislikes: (prev.dislikes || 0) - 1 } : null));
					setData((prev) => ({ ...prev, disliked: false }));
				} else if (liked) {
					transaction.update(userRef, {
						dislikedProblems: [...userDislikedProblems, problem.id],
						likedProblems: userLikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						dislikes: problemDislikes + 1,
						likes: problemLikes - 1,
					});

					setCurrentProblem((prev) =>
						prev ? { ...prev, dislikes: (prev.dislikes || 0) + 1, likes: (prev.likes || 0) - 1 } : null
					);
					setData((prev) => ({ ...prev, disliked: true, liked: false }));
				} else {
					transaction.update(userRef, {
						dislikedProblems: [...userDislikedProblems, problem.id],
					});
					transaction.update(problemRef, {
						dislikes: problemDislikes + 1,
					});
					setCurrentProblem((prev) => (prev ? { ...prev, dislikes: (prev.dislikes || 0) + 1 } : null));
					setData((prev) => ({ ...prev, disliked: true }));
				}
			}
		});
		setUpdating(false);
	};

	const handleStar = async () => {
		if (!user) {
			setLoginTooltipTarget("star");
			setTimeout(() => setLoginTooltipTarget(null), 2000);
			return;
		}
		if (updating) return;
		setUpdating(true);
		
		// Optimistic update
		const newStarred = !starred;
		setData((prev) => ({ ...prev, starred: newStarred }));

		try {
			const userRef = doc(firestore, "users", user.uid);
			if (!newStarred) {
				await updateDoc(userRef, {
					starredProblems: arrayRemove(problem.id),
				});
			} else {
				await updateDoc(userRef, {
					starredProblems: arrayUnion(problem.id),
				});
			}
		} catch (error) {
			console.error("Error starring problem:", error);
			// Revert if error
			setData((prev) => ({ ...prev, starred: !newStarred }));
		}
		setUpdating(false);
	};

	return (
		<div className="w-full text-text-primary" style={{ backgroundColor: "transparent" }}>
			<div className="w-full space-y-8">
				{/* Actions and Status Bar */}
				<div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border-default select-none">
					<div className="flex items-center gap-2.5">
						{/* Solved Indicator */}
						{(solved || _solved) && (
							<div
								className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold select-none text-accent bg-accent/10 border border-accent/25"
							>
								<BsCheck2Circle size={13} />
								<span>SOLVED</span>
							</div>
						)}

						{/* Translation Selector Dropdown */}
						<div className="relative">
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border-default bg-[var(--bg-elevated)] hover:border-border-strong text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer select-none"
							>
								{translating ? (
									<AiOutlineLoading3Quarters size={11} className="animate-spin text-accent" />
								) : (
									<FaGlobe size={11} className={activeLanguage !== "en" ? "text-accent" : "text-text-muted"} />
								)}
								<span>
									{LANGUAGES.find((l) => l.code === activeLanguage)?.name.split(" ")[0]}
								</span>
								<svg
									className={`w-3 h-3 transition-transform duration-150 text-text-muted ${dropdownOpen ? "rotate-180" : ""}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>

							{dropdownOpen && (
								<>
									{/* Click backdrop to close */}
									<div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
									<div
										className="absolute left-0 mt-1 w-52 rounded-md border border-border-default bg-[var(--bg-elevated)] shadow-lg z-50 overflow-hidden py-1 divide-y divide-border-subtle"
									>
										<div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-text-muted select-none">
											Translate Statement
										</div>
										<div className="py-0.5">
											{LANGUAGES.map((lang) => {
												const isSelected = activeLanguage === lang.code;
												return (
													<button
														key={lang.code}
														onClick={async () => {
															setDropdownOpen(false);
															await handleTranslate(lang.code);
														}}
														className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors duration-100 cursor-pointer ${
															isSelected
																? "text-accent bg-accent/10"
																: "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-hover)]"
														}`}
													>
														<span>{lang.name}</span>
														{isSelected && <FaCheck size={9} className="text-accent" />}
													</button>
												);
											})}
										</div>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Feedback Actions */}
					{!loading && currentProblem && (
						<div className="flex items-center gap-1.5">
							{/* Like Button */}
							<button
								onClick={handleLike}
								disabled={updating}
								className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors duration-150 ${
									liked
										? "text-accent bg-accent/10 border-accent/30"
										: "text-text-muted hover:text-text-primary bg-[var(--bg-elevated)] border-border-default hover:border-border-strong"
								}`}
							>
								{updating ? <AiOutlineLoading3Quarters size={11} className="animate-spin" /> : <AiFillLike size={12} />}
								<span>{currentProblem.likes}</span>
							</button>

							{/* Dislike Button */}
							<button
								onClick={handleDislike}
								disabled={updating}
								className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors duration-150 ${
									disliked
										? "text-red-400 bg-red-500/10 border-red-500/30"
										: "text-text-muted hover:text-text-primary bg-[var(--bg-elevated)] border-border-default hover:border-border-strong"
								}`}
							>
								{updating ? <AiOutlineLoading3Quarters size={11} className="animate-spin" /> : <AiFillDislike size={12} />}
								<span>{currentProblem.dislikes}</span>
							</button>

							{/* Star Button */}
							<button
								onClick={handleStar}
								disabled={updating}
								className={`flex items-center p-1.5 rounded-md border transition-colors duration-150 ${
									starred
										? "text-amber-400 bg-amber-500/10 border-amber-500/30"
										: "text-text-muted hover:text-text-primary bg-[var(--bg-elevated)] border-border-default hover:border-border-strong"
								}`}
								title="Bookmark Problem"
							>
								{starred ? <AiFillStar size={13} /> : <TiStarOutline size={14} />}
							</button>
						</div>
					)}
				</div>

				{/* Problem Statement Markdown */}
				<div className="prose prose-invert max-w-none prose-headings:text-text-primary prose-headings:font-semibold prose-headings:mt-10 prose-headings:mb-4 prose-p:text-text-secondary prose-p:leading-relaxed prose-p:text-base prose-strong:text-text-primary prose-strong:font-semibold select-text">
					<div dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.problemStatement, false) }} />
				</div>

				{/* Input Format */}
				{problem.inputFormat && (
					<div className="space-y-3 pt-6 border-t border-border-subtle" style={{ borderColor: "var(--border-subtle)" }}>
						<h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Input Format</h3>
						<div className="prose prose-invert max-w-none prose-p:text-text-secondary prose-p:leading-relaxed select-text">
							<div dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat, false) }} />
						</div>
					</div>
				)}

				{/* Constraints */}
				{problem.constraints && (
					<div className="space-y-3 pt-6 border-t border-border-subtle" style={{ borderColor: "var(--border-subtle)" }}>
						<h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Constraints</h3>
						<div className="prose prose-invert max-w-none prose-p:text-text-secondary prose-p:leading-relaxed select-text">
							<div dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.constraints, false) }} />
						</div>
					</div>
				)}

				{/* Output Format */}
				{problem.outputFormat && (
					<div className="space-y-3 pt-6 border-t border-border-subtle" style={{ borderColor: "var(--border-subtle)" }}>
						<h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Output Format</h3>
						<div className="prose prose-invert max-w-none prose-p:text-text-secondary prose-p:leading-relaxed select-text">
							<div dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat, false) }} />
						</div>
					</div>
				)}

				{/* Examples / Samples Section */}
				<div className="space-y-8 pt-8 border-t border-border-subtle" style={{ borderColor: "var(--border-subtle)" }}>
					{(() => {
						const sampleExamples = (problem.examples || []).filter(ex => !!ex.isSample);
						const displayExamples = sampleExamples.length > 0 ? sampleExamples : (problem.examples || []);
						return displayExamples.map((example, index) => (
							<ExampleBlock key={example.id || index} example={example} index={index} />
						));
					})()}
				</div>

				{/* Tags Badges */}
				{problem.tags && problem.tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mt-8 pt-6 border-t border-border-subtle select-none">
						{problem.tags.map((tag, idx) => (
							<span
								key={idx}
								className="px-2 py-0.5 rounded text-xs font-mono text-text-secondary bg-bg-surface-elevated border border-border-subtle"
							>
								{tag}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

// Sleek Copyable Example Block component
const ExampleBlock: React.FC<{ example: any; index: number }> = ({ example, index }) => {
	const [copiedInput, setCopiedInput] = useState(false);
	const [copiedOutput, setCopiedOutput] = useState(false);

	const handleCopy = async (text: string, type: "input" | "output") => {
		try {
			await navigator.clipboard.writeText(text);
			if (type === "input") {
				setCopiedInput(true);
				setTimeout(() => setCopiedInput(false), 2000);
			} else {
				setCopiedOutput(true);
				setTimeout(() => setCopiedOutput(false), 2000);
			}
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	};

	return (
		<div className="space-y-4">
			{/* Sample Input */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<p className="text-xs font-mono uppercase tracking-wider text-text-muted">
						Sample Input {index + 1}
					</p>
					<button
						onClick={() => handleCopy(example.inputText, "input")}
						className="px-2 py-0.5 rounded text-[11px] font-mono text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle transition-colors flex items-center gap-1"
					>
						{copiedInput ? (
							<>
								<FaCheck size={9} className="text-accent" />
								<span className="text-accent">Copied</span>
							</>
						) : (
							<span>Copy</span>
						)}
					</button>
				</div>
				<div className="rounded-md border border-border-subtle bg-bg-base overflow-hidden">
					<pre className="p-3 font-mono text-xs leading-5 whitespace-pre-wrap select-text text-text-primary">
						{example.inputText}
					</pre>
				</div>
			</div>

			{/* Sample Output */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<p className="text-xs font-mono uppercase tracking-wider text-text-muted">
						Sample Output {index + 1}
					</p>
					<button
						onClick={() => handleCopy(example.outputText, "output")}
						className="px-2 py-0.5 rounded text-[11px] font-mono text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle transition-colors flex items-center gap-1"
					>
						{copiedOutput ? (
							<>
								<FaCheck size={9} className="text-accent" />
								<span className="text-accent">Copied</span>
							</>
						) : (
							<span>Copy</span>
						)}
					</button>
				</div>
				<div className="rounded-md border border-border-subtle bg-bg-base overflow-hidden">
					<pre className="p-3 font-mono text-xs leading-5 whitespace-pre-wrap select-text text-text-primary">
						{example.outputText}
					</pre>
				</div>
			</div>

			{/* Explanation */}
			{example.explanation && (
				<div className="space-y-1.5 pt-1">
					<p className="text-xs font-mono uppercase tracking-wider text-text-muted">
						Explanation
					</p>
					<div
						className="text-xs text-text-secondary leading-relaxed p-2.5 rounded-md bg-bg-surface/50 border border-border-subtle"
						dangerouslySetInnerHTML={{ __html: renderMarkdown(example.explanation, false) }}
					/>
				</div>
			)}
		</div>
	);
};

// Simple Markdown to HTML parser
function renderMarkdown(text: string, lightTheme: boolean): string {
	if (!text) return "";
	let html = text;

	// Bold
	html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	// Italic
	html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
	// Inline Code
	const inlineClass = "bg-bg-surface-elevated text-accent px-1.5 py-0.5 rounded text-xs font-mono border border-border-subtle";
	html = html.replace(/`(.*?)`/g, `<code class='${inlineClass}'>$1</code>`);
	// Code Blocks
	const preClass = "bg-bg-base p-3 rounded-md font-mono text-xs border border-border-subtle overflow-auto my-2 whitespace-pre text-text-primary";
	html = html.replace(/```([\s\S]*?)```/g, `<pre class='${preClass}'>$1</pre>`);
	// Links
	html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' class='text-accent hover:underline transition'>$1</a>");
	// Convert list markers if there are no HTML list tags
	if (!html.includes("<li")) {
		html = html.replace(/^\s*\*\s+(.*)$/gm, "<li class='list-disc ml-5 text-text-secondary'>$1</li>");
		html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li class='list-decimal ml-5 text-text-secondary'>$1</li>");
	}

	return html;
}

export default ProblemDescription;

function useGetCurrentProblem(problemId: string) {
	const [currentProblem, setCurrentProblem] = useState<DBProblem | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [problemDifficultyClass, setProblemDifficultyClass] = useState<string>("");

	useEffect(() => {
		const getCurrentProblem = async () => {
			setLoading(true);
			const docRef = doc(firestore, "problems", problemId);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				const problem = docSnap.data();
				setCurrentProblem({ id: docSnap.id, ...problem } as DBProblem);
				setProblemDifficultyClass(
					problem.difficulty === "Easy"
						? "bg-bc-success/15 text-bc-success"
						: problem.difficulty === "Medium"
						? "bg-bc-warning/15 text-bc-warning"
						: "bg-bc-error/15 text-bc-error"
				);
			}
			setLoading(false);
		};
		getCurrentProblem();
	}, [problemId]);

	return { currentProblem, loading, problemDifficultyClass, setCurrentProblem };
}

function useGetUsersDataOnProblem(problemId: string) {
	const [data, setData] = useState({ liked: false, disliked: false, starred: false, solved: false });
	const [user] = useAuthState(auth);

	useEffect(() => {
		if (!user) {
			setData({ liked: false, disliked: false, starred: false, solved: false });
			return;
		}

		const userRef = doc(firestore, "users", user.uid);
		const unsubscribe = onSnapshot(userRef, (userSnap) => {
			if (userSnap.exists()) {
				const userData = userSnap.data();
				const solvedProblems = userData.solvedProblems || [];
				const likedProblems = userData.likedProblems || [];
				const dislikedProblems = userData.dislikedProblems || [];
				const starredProblems = userData.starredProblems || [];
				setData({
					liked: likedProblems.includes(problemId),
					disliked: dislikedProblems.includes(problemId),
					starred: starredProblems.includes(problemId),
					solved: solvedProblems.includes(problemId),
				});
			}
		}, (err) => {
			console.error("Error listening to user data on problem:", err);
		});

		return () => unsubscribe();
	}, [problemId, user]);

	return { ...data, setData };
}
