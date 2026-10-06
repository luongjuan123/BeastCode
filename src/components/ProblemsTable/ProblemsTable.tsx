import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { BsCheckCircle } from "react-icons/bs";
import { AiFillYoutube } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import YouTube from "react-youtube";
import { collection, doc, getDoc, getDocs, orderBy, query, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import { DBProblem } from "@/utils/types/problem";
import { useAuthState } from "react-firebase-hooks/auth";
import { problems as mockProblems } from "@/mockProblems/problems";

type ProblemsTableProps = {
	setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>;
	searchQuery?: string;
	sortBy?: string;
	currentPage: number;
	pageSize: number;
	setTotalItems: (total: number) => void;
};

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

const ProblemsTable: React.FC<ProblemsTableProps> = ({
	setLoadingProblems,
	searchQuery = "",
	sortBy = "default",
	currentPage,
	pageSize,
	setTotalItems,
}) => {
	const [youtubePlayer, setYoutubePlayer] = useState({
		isOpen: false,
		videoId: "",
	});
	const problems = useGetProblems(setLoadingProblems);
	const solvedProblems = useGetSolvedProblems();

	const filteredAndSortedProblems = useMemo(() => {
		let result = [...problems];

		// Filter by search query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					(p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
			);
		}

		// Sort
		switch (sortBy) {
			case "a-z":
				result.sort((a, b) => a.title.localeCompare(b.title));
				break;
			case "z-a":
				result.sort((a, b) => b.title.localeCompare(a.title));
				break;
			case "easiest":
				result.sort(
					(a, b) =>
						(DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0)
				);
				break;
			case "hardest":
				result.sort(
					(a, b) =>
						(DIFFICULTY_ORDER[b.difficulty] ?? 0) - (DIFFICULTY_ORDER[a.difficulty] ?? 0)
				);
				break;
			case "likes":
				result.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
				break;
			case "dislikes":
				result.sort((a, b) => (b.dislikes ?? 0) - (a.dislikes ?? 0));
				break;
			default:
				result.sort((a, b) => a.title.localeCompare(b.title));
		}

		return result;
	}, [problems, searchQuery, sortBy]);

	// Update total items count in parent when filters/problems change
	useEffect(() => {
		setTotalItems(filteredAndSortedProblems.length);
	}, [filteredAndSortedProblems, setTotalItems]);

	const paginatedProblems = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredAndSortedProblems.slice(start, start + pageSize);
	}, [filteredAndSortedProblems, currentPage, pageSize]);

	const closeModal = () => {
		setYoutubePlayer({ isOpen: false, videoId: "" });
	};

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeModal();
		};
		window.addEventListener("keydown", handleEsc);

		return () => window.removeEventListener("keydown", handleEsc);
	}, []);

	return (
		<>
			<tbody>
				{problems.length > 0 && filteredAndSortedProblems.length === 0 && (
					<tr>
						<td colSpan={6} className="px-6 py-14 text-center" style={{ color: "var(--text-muted)" }}>
							<div className="flex flex-col items-center gap-3">
								<FiSearch size={28} className="text-gray-500" />
								<p className="text-sm font-semibold">No problems match &ldquo;{searchQuery}&rdquo;</p>
								<p className="text-xs" style={{ color: "var(--text-muted)" }}>Try a different keyword or clear your search.</p>
							</div>
						</td>
					</tr>
				)}

				{paginatedProblems.map((problem, idx) => {
					const isSolved = solvedProblems?.includes(problem.id);
					const diffStyles =
						problem.difficulty === "Easy"   ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
						problem.difficulty === "Medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
						                                  "text-red-400 bg-red-500/10 border-red-500/20";
					return (
						<tr
							key={problem.id}
							className="group transition-colors duration-100 hover:bg-[var(--bg-hover)]"
							style={{
								borderTop: idx > 0 ? "1px solid var(--border-subtle)" : "none",
							}}
						>
							{/* Solved indicator */}
							<td className="pl-4 pr-2 py-3 w-8">
								{isSolved ? (
									<span title="Solved" className="text-accent">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
											<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
											<polyline points="22 4 12 14.01 9 11.01"/>
										</svg>
									</span>
								) : (
									<span className="w-3.5 h-3.5 block rounded-full border border-border-default" />
								)}
							</td>

							{/* Title */}
							<td className="px-4 py-3">
								{problem.link ? (
									<a
										href={problem.link}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-xs md:text-sm text-text-primary transition-colors duration-150 hover:text-accent"
									>
										{problem.title}
									</a>
								) : (
									<Link
										href={`/problems/${problem.id}`}
										className="font-medium text-xs md:text-sm text-text-primary transition-colors duration-150 hover:text-accent"
									>
										{problem.title}
									</Link>
								)}
							</td>

							{/* Difficulty badge */}
							<td className="px-4 py-3">
								<span
									className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium border select-none ${diffStyles}`}
								>
									{problem.difficulty}
								</span>
							</td>

							{/* Tags */}
							<td className="px-4 py-3 hidden sm:table-cell">
								<div className="flex flex-wrap gap-1 max-w-[240px]">
									{problem.tags.map((tag) => (
										<Link
											key={tag}
											href={`/tags/${encodeURIComponent(tag.toLowerCase())}`}
											className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-text-muted hover:text-text-primary bg-[var(--bg-elevated)] border border-border-subtle hover:border-border-default transition-colors duration-100"
										>
											{tag}
										</Link>
									))}
								</div>
							</td>

							{/* Success Rate */}
							<td className="px-4 py-3 hidden md:table-cell">
								{problem.attempts && problem.attempts > 0 ? (
									<span className="font-mono text-xs text-text-secondary">
										{Math.round(((problem.solved ?? 0) / problem.attempts) * 100)}%
									</span>
								) : (
									<span className="text-xs text-text-muted">—</span>
								)}
							</td>

							{/* Solution / Video */}
							<td className="px-4 py-3 hidden md:table-cell">
								{problem.videoId ? (
									<button
										onClick={() => setYoutubePlayer({ isOpen: true, videoId: problem.videoId as string })}
										className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors duration-150 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400"
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
										<span>Watch</span>
									</button>
								) : (
									<span className="text-xs text-text-muted">—</span>
								)}
							</td>
						</tr>
					);
				})}
			</tbody>

			{/* ── YOUTUBE MODAL ── */}
			{youtubePlayer.isOpen && (
				<tfoot>
					<tr>
						<td>
							<div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
								{/* Backdrop */}
								<div
									className="absolute inset-0 bg-black/80 backdrop-blur-sm"
									onClick={closeModal}
								/>
								{/* Modal */}
								<div
									className="relative z-10 w-full max-w-3xl rounded-lg overflow-hidden shadow-2xl animate-fade-in"
									style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
								>
									<div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
										<span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Video Solution</span>
										<button
											onClick={closeModal}
											className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 bg-dark-fill-3 hover:bg-dark-fill-2 text-text-secondary"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
												<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
											</svg>
										</button>
									</div>
									<div className="relative aspect-video w-full">
										<iframe
											src={`https://www.youtube.com/embed/${youtubePlayer.videoId}?autoplay=1`}
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											className="w-full h-full"
											title="Video Solution"
										/>
									</div>
								</div>
							</div>
						</td>
					</tr>
				</tfoot>
			)}
		</>
	);
};
export default ProblemsTable;

function useGetProblems(setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>) {
	const [problems, setProblems] = useState<DBProblem[]>([]);

	useEffect(() => {
		const getProblems = async () => {
			setLoadingProblems(true);
			try {
				const q = query(collection(firestore, "problems"));
				const querySnapshot = await getDocs(q);
				const tmp: DBProblem[] = [];
				querySnapshot.forEach((doc) => {
					const data = doc.data();
					const dbTags = data.tags && Array.isArray(data.tags)
						? data.tags
						: [];
					tmp.push({ id: doc.id, ...data, tags: dbTags } as DBProblem);
				});
				setProblems(tmp);
			} catch (error) {
				console.error("Error fetching problems from firestore, falling back to mock problems:", error);
				const tmp: DBProblem[] = mockProblems.map(p => ({
					id: p.id,
					title: p.title,
					difficulty: p.difficulty,
					tags: p.category ? [p.category.toLowerCase().replace(/\s+/g, "-")] : [],
					videoId: p.videoId,
					likes: 0,
					dislikes: 0,
					attempts: 0,
					solved: 0,
					version: 1,
				} as DBProblem));
				setProblems(tmp);
			} finally {
				setLoadingProblems(false);
			}
		};

		getProblems();
	}, [setLoadingProblems]);
	return problems;
}

function useGetSolvedProblems() {
	const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
	const [user] = useAuthState(auth);

	useEffect(() => {
		if (!user) {
			setSolvedProblems([]);
			return;
		}

		const userRef = doc(firestore, "users", user.uid);
		const unsubscribe = onSnapshot(userRef, (userDoc) => {
			if (userDoc.exists()) {
				setSolvedProblems(userDoc.data().solvedProblems || []);
			}
		}, (err) => {
			console.error("Error listening to solved problems:", err);
		});

		return () => unsubscribe();
	}, [user]);

	return solvedProblems;
}
