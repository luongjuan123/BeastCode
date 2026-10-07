import React, { useState, useEffect, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import AppShell from "@/components/UI/AppShell";
import PageHeader from "@/components/UI/PageHeader";

import ThreadCard from "@/components/Threads/ThreadCard";
import { FaSearch, FaUser, FaHashtag, FaComments, FaCheckCircle, FaSpinner, FaTag } from "react-icons/fa";
import Link from "next/link";
import Avatar from "@/components/Threads/Avatar";
import { problems as staticProblems } from "@/utils/problems";

interface SearchUser {
	uid: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	email?: string;
	username?: string;
	followerCount?: number;
}

interface SearchThread {
	id: string;
	uid: string;
	displayName: string;
	avatarUrl?: string;
	content: string;
	createdAt: number;
	likes: string[];
	replies: any[];
	tags?: string[];
}

interface SearchProblem {
	id: string;
	title: string;
	difficulty: string;
	tags: string[];
	attempts?: number;
	solved?: number;
}

export default function SearchPage() {
	const [user] = useAuthState(auth);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<"problems" | "users" | "threads" | "hashtags">("problems");

	// DB state
	const [usersList, setUsersList] = useState<SearchUser[]>([]);
	const [threadsList, setThreadsList] = useState<SearchThread[]>([]);
	const [problemsList, setProblemsList] = useState<SearchProblem[]>([]);
	const [problemTagsMap, setProblemTagsMap] = useState<Record<string, string>>({});
	const [threadTagsMap, setThreadTagsMap] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	// Follow state for current user
	const [followingUids, setFollowingUids] = useState<string[]>([]);

	// Fetch data for client-side search
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				const usersSnap = await getDocs(collection(firestore, "users"));
				const uList: SearchUser[] = [];
				usersSnap.forEach((d) => {
					uList.push({ uid: d.id, ...d.data() } as SearchUser);
				});
				setUsersList(uList);

				// Query threads
				const threadsSnap = await getDocs(collection(firestore, "threads"));
				const tList: SearchThread[] = [];
				threadsSnap.forEach((d) => {
					const data = d.data();
					if (!data.parentThreadId) {
						tList.push({ id: d.id, ...data } as SearchThread);
					}
				});
				tList.sort((a, b) => b.createdAt - a.createdAt);
				setThreadsList(tList);

				// Query problems
				const problemsSnap = await getDocs(collection(firestore, "problems"));
				const pList: SearchProblem[] = [];
				problemsSnap.forEach((d) => {
					const data = d.data();
					const dbTags = data.tags && Array.isArray(data.tags)
						? data.tags
						: [];
					pList.push({ id: d.id, ...data, tags: dbTags } as SearchProblem);
				});

				// Fetch deleted problems
				const deletedSnap = await getDocs(collection(firestore, "deleted_problems"));
				const deletedIds = new Set<string>();
				deletedSnap.forEach((d) => deletedIds.add(d.id));

				const staticList = Object.values(staticProblems).map(p => ({
					id: p.id,
					title: p.title,
					difficulty: p.difficulty || "Easy",
					tags: p.tags && Array.isArray(p.tags) ? p.tags : [],
					attempts: 0,
					solved: 0,
				}));
				
				staticList.forEach((staticProb) => {
					if (!deletedIds.has(staticProb.id) && !pList.some((p) => p.id === staticProb.id)) {
						pList.push(staticProb);
					}
				});

				setProblemsList(pList);

				// Query tags maps
				const problemTagsSnap = await getDocs(collection(firestore, "problemTags"));
				const pTagsMap: Record<string, string> = {};
				problemTagsSnap.forEach((d) => {
					pTagsMap[d.id] = d.data().name || d.id;
				});
				setProblemTagsMap(pTagsMap);

				const threadTagsSnap = await getDocs(collection(firestore, "threadTags"));
				const tTagsMap: Record<string, string> = {};
				threadTagsSnap.forEach((d) => {
					tTagsMap[d.id] = d.data().name || d.id;
				});
				setThreadTagsMap(tTagsMap);
			} catch (e) {
				console.error("Search data load error:", e);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// Subscribe to follows list
	useEffect(() => {
		if (!user) {
			setFollowingUids([]);
			return;
		}
		const q = query(
			collection(firestore, "follows"),
			where("followerId", "==", user.uid)
		);
		const unsub = onSnapshot(q, (snap) => {
			const list: string[] = [];
			snap.forEach((d) => {
				list.push(d.data().followingId);
			});
			setFollowingUids(list);
		});
		return () => unsub();
	}, [user]);

	// Simple typo-tolerant edit distance score helper
	const checkMatch = (source: string, query: string) => {
		if (!source) return 0;
		const s = source.toLowerCase();
		const q = query.toLowerCase();

		if (s.includes(q)) return 10; // direct substring match

		let score = 0;
		const words = s.split(/\s+/);
		for (const word of words) {
			if (word.startsWith(q)) score += 5;
			else if (q.includes(word)) score += 2;
		}
		return score;
	};

	// Filter and rank search results
	const filteredResults = useMemo(() => {
		const qTrim = searchQuery.trim();
		if (!qTrim) {
			return { users: [], threads: [], hashtags: [], problems: [] };
		}

		// 1. Filter Users
		const users = usersList
			.map((u) => {
				const isExactUid = u.uid === qTrim;
				const uidScore = isExactUid ? 100 : (u.uid && u.uid.toLowerCase().includes(qTrim.toLowerCase()) ? 10 : 0);
				const nameScore = checkMatch(u.displayName, qTrim);
				const usernameScore = checkMatch(u.username || "", qTrim);
				const emailScore = checkMatch(u.email || "", qTrim);
				const bioScore = checkMatch(u.bio || "", qTrim);
				const totalScore = uidScore + nameScore + usernameScore + emailScore + bioScore;
				return { user: u, score: totalScore };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.user);

		// 2. Filter Threads
		const threads = threadsList
			.map((t) => {
				const contentScore = checkMatch(t.content, qTrim);
				const authorScore = checkMatch(t.displayName, qTrim);
				const tagsScore = t.tags ? t.tags.reduce((acc, tag) => {
					const tagName = threadTagsMap[tag] || tag;
					return acc + checkMatch(tagName, qTrim);
				}, 0) : 0;
				const totalScore = contentScore + authorScore + tagsScore;
				return { thread: t, score: totalScore };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.thread);

		// 3. Filter Hashtags
		const tagsMap: Record<string, number> = {};
		threadsList.forEach((t) => {
			const matches = t.content.match(/#(\w+)/g);
			if (matches) {
				matches.forEach((m) => {
					const tag = m.substring(1).toLowerCase();
					if (tag.includes(qTrim.toLowerCase().replace("#", ""))) {
						tagsMap[tag] = (tagsMap[tag] || 0) + 1;
					}
				});
			}
		});
		const hashtags = Object.entries(tagsMap)
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count);

		// 4. Filter Problems by title and tags
		const problems = problemsList
			.map((p) => {
				const titleScore = checkMatch(p.title, qTrim);
				const tagsScore = p.tags ? p.tags.reduce((acc, tag) => {
					const tagName = problemTagsMap[tag] || tag;
					return acc + checkMatch(tagName, qTrim);
				}, 0) : 0;
				const totalScore = titleScore + tagsScore;
				return { problem: p, score: totalScore };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.problem);

		return { users, threads, hashtags, problems };
	}, [searchQuery, usersList, threadsList, problemsList, problemTagsMap, threadTagsMap]);

	// Follow Toggle
	const handleFollowUser = async (targetUser: SearchUser, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!user) return;

		const isFollowing = followingUids.includes(targetUser.uid);
		const followId = `${user.uid}_${targetUser.uid}`;
		const followRef = doc(firestore, "follows", followId);

		try {
			if (isFollowing) {
				await deleteDoc(followRef);
			} else {
				await setDoc(followRef, {
					followerId: user.uid,
					followingId: targetUser.uid,
					createdAt: Date.now(),
				});
			}
		} catch (error) {
			console.error("Follow error:", error);
		}
	};

	return (
		<AppShell activeNav="Problems" maxWidth="normal">
			<div className="space-y-6">
				<PageHeader
					title="Search"
					description="Search problems, topics, users, and community threads across BeastCode."
				/>

				{/* Search Input Box */}
				<div className="space-y-3 rounded-lg p-4 bg-bg-surface border border-border-subtle">
					<div className="relative flex items-center rounded-md px-3.5 py-2 transition duration-150 bg-bg-dark-fill-3 border border-border-subtle focus-within:border-emerald-500">
						<FaSearch className="text-text-muted mr-3 shrink-0" size={13} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search problems, tags, threads, or creators..."
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="bg-transparent text-xs text-text-primary outline-none flex-1 placeholder:text-text-muted"
						/>
						{loading && <FaSpinner className="animate-spin text-emerald-500 shrink-0" size={13} />}
					</div>
				</div>

				{/* Tabs Switcher */}
				{searchQuery.trim() !== "" && (
					<div className="flex flex-wrap gap-2 select-none">
						<button
							onClick={() => setActiveCategory("problems")}
							className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition duration-150 flex items-center gap-1.5 ${
								activeCategory === "problems"
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-450"
									: "text-text-muted hover:text-text-primary border-border-subtle bg-bg-surface"
							}`}
						>
							<FaTag size={10} /> Problems
						</button>
						<button
							onClick={() => setActiveCategory("users")}
							className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition duration-150 flex items-center gap-1.5 ${
								activeCategory === "users"
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-450"
									: "text-text-muted hover:text-text-primary border-border-subtle bg-bg-surface"
							}`}
						>
							<FaUser size={10} /> Users
						</button>
						<button
							onClick={() => setActiveCategory("threads")}
							className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition duration-150 flex items-center gap-1.5 ${
								activeCategory === "threads"
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-450"
									: "text-text-muted hover:text-text-primary border-border-subtle bg-bg-surface"
							}`}
						>
							<FaComments size={10} /> Threads
						</button>
						<button
							onClick={() => setActiveCategory("hashtags")}
							className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition duration-150 flex items-center gap-1.5 ${
								activeCategory === "hashtags"
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-450"
									: "text-text-muted hover:text-text-primary border-border-subtle bg-bg-surface"
							}`}
						>
							<FaHashtag size={10} /> Hashtags
						</button>
					</div>
				)}

				{/* Search Results Display Area */}
				<div className="space-y-4">
					{searchQuery.trim() === "" ? (
						<div className="text-center py-16 text-text-muted select-none rounded-lg border border-border-subtle bg-bg-surface">
							<FaSearch className="mx-auto mb-3 text-text-muted" size={20} />
							<p className="text-xs font-semibold text-text-secondary">Search anything on BeastCode</p>
							<p className="text-[11px] text-text-muted mt-1 max-w-xs mx-auto">
								Type problem names, tags, developer names, or community thread keywords.
							</p>
						</div>
					) : (
						<>
							{/* Coding Problems Results */}
							{activeCategory === "problems" && (
								<div className="space-y-2.5">
									{filteredResults.problems.map((problem) => {
										const diffColor =
											problem.difficulty === "Easy" ? { color: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "color-mix(in srgb, var(--color-success) 25%, transparent)" } :
											problem.difficulty === "Medium" ? { color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "color-mix(in srgb, var(--color-warning) 25%, transparent)" } :
											{ color: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "color-mix(in srgb, var(--color-error) 25%, transparent)" };

										return (
											<div
												key={problem.id}
												className="flex items-center justify-between gap-4 p-3.5 rounded-lg transition duration-150 cursor-pointer bg-bg-surface border border-border-subtle hover:border-border-accent"
											>
												<Link href={`/problems/${problem.id}`} className="flex-1 min-w-0">
													<div>
														<div className="flex items-center gap-2.5">
															<span className="font-semibold text-xs text-text-primary hover:text-emerald-400 truncate max-w-[250px]">
																{problem.title}
															</span>
															<span
																className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
																style={{
																	color: diffColor.color,
																	background: diffColor.bg,
																	border: `1px solid ${diffColor.border}`,
																}}
															>
																{problem.difficulty}
															</span>
															{problem.attempts !== undefined && problem.attempts > 0 && (
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono text-text-secondary bg-bg-dark-fill-3 border border-border-subtle">
																	{Math.round(((problem.solved ?? 0) / problem.attempts) * 100)}% success
																</span>
															)}
														</div>
														<div className="flex flex-wrap gap-1.5 mt-2">
															{problem.tags.map((t) => (
																<span
																	key={t}
																	className="text-[9px] px-1.5 py-0.5 rounded-md font-mono text-text-secondary bg-bg-dark-fill-3 border border-border-subtle"
																>
																	{t}
																</span>
															))}
														</div>
													</div>
												</Link>
											</div>
										);
									})}
									{filteredResults.problems.length === 0 && (
										<p className="text-center text-xs italic py-8 text-text-muted">
											No coding problems found matching &quot;{searchQuery}&quot;.
										</p>
									)}
								</div>
							)}

							{/* Users Category Results */}
							{activeCategory === "users" && (
								<div className="space-y-2.5">
									{filteredResults.users.map((targetUser) => {
										const isSelf = user?.uid === targetUser.uid;
										const isFollowing = followingUids.includes(targetUser.uid);

										return (
											<div
												key={targetUser.uid}
												className="flex items-center justify-between gap-4 p-3.5 rounded-lg transition duration-150 cursor-pointer bg-bg-surface border border-border-subtle hover:border-border-accent"
											>
												<Link href={`/profile?uid=${targetUser.uid}`} className="flex items-center gap-3.5 min-w-0">
													<Avatar
														src={targetUser.avatarUrl}
														displayName={targetUser.displayName}
														size={36}
													/>
													<div className="min-w-0">
														<div className="flex items-center gap-1.5">
															<span className="font-semibold text-xs text-text-primary hover:text-emerald-400 truncate max-w-[150px]">
																{targetUser.displayName}
															</span>
															<FaCheckCircle className="text-emerald-450 shrink-0" size={11} />
														</div>
														<p className="text-[11px] truncate max-w-[200px] mt-0.5 text-text-muted">
															{targetUser.bio || "No biography details."}
														</p>
													</div>
												</Link>

												{!isSelf && user && (
													<button
														onClick={(e) => handleFollowUser(targetUser, e)}
														className={`px-3.5 py-1 rounded-md text-xs font-semibold transition shrink-0 ${
															isFollowing
																? "bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
																: "bg-accent hover:bg-accent-hover text-[#080909] border border-transparent"
														}`}
													>
														{isFollowing ? "Following" : "Follow"}
													</button>
												)}
											</div>
										);
									})}
									{filteredResults.users.length === 0 && (
										<p className="text-center text-xs italic py-8 text-text-muted">
											No users found matching &quot;{searchQuery}&quot;.
										</p>
									)}
								</div>
							)}

							{/* Threads Category Results */}
							{activeCategory === "threads" && (
								<div className="space-y-3">
									{filteredResults.threads.map((thread) => (
										<Link key={thread.id} href={`/threads?threadId=${thread.id}`}>
											<div className="cursor-pointer">
												<ThreadCard thread={thread} />
											</div>
										</Link>
									))}
									{filteredResults.threads.length === 0 && (
										<p className="text-center text-xs italic py-8 text-text-muted">
											No threads found matching &quot;{searchQuery}&quot;.
										</p>
									)}
								</div>
							)}

							{/* Hashtags Category Results */}
							{activeCategory === "hashtags" && (
								<div className="space-y-2 max-w-md mx-auto">
									{filteredResults.hashtags.map(({ tag, count }) => (
										<Link key={tag} href={`/tags/${tag}`}>
											<div className="flex items-center justify-between p-3 rounded-lg transition duration-150 cursor-pointer select-none border border-border-subtle hover:border-border-accent bg-bg-surface">
												<div className="flex items-center gap-3 text-xs font-semibold">
													<div className="bg-emerald-500/10 p-2 rounded-md text-emerald-450">
														<FaHashtag size={11} />
													</div>
													<span className="text-text-primary">#{tag}</span>
												</div>
												<span className="text-[10px] font-mono text-text-muted">
													{count} {count === 1 ? "post" : "posts"}
												</span>
											</div>
										</Link>
									))}
									{filteredResults.hashtags.length === 0 && (
										<p className="text-center text-xs italic py-8 text-text-muted">
											No hashtags found matching &quot;{searchQuery}&quot;.
										</p>
									)}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</AppShell>
	);
}
