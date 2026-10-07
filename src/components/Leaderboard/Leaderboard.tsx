import React, { useEffect, useState, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import BeastCodeSelect from "../UI/BeastCodeSelect";
import Link from "next/link";
import CountrySelector from "../UI/CountrySelector";
import PageHeader from "../UI/PageHeader";
import { getCountryName } from "@/utils/countryData";
import {
	FaTrophy,
	FaUser,
	FaMedal,
	FaCrown,
	FaMapMarkerAlt,
	FaSearch,
	FaChevronLeft,
	FaChevronRight,
	FaAngleDoubleLeft,
	FaAngleDoubleRight,
	FaGlobe,
	FaUserFriends,
	FaStar,
	FaCode,
	FaExclamationTriangle
} from "react-icons/fa";

interface LeaderboardUser {
	uid: string;
	displayName: string;
	avatarUrl?: string;
	school: string;
	country: string;
	score: number;
	xp: number;
	rating: number;
	contestRating: number;
	mlRating: number;
	problemSolvingRating: number;
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	rank: number;
}

const PAGE_SIZE = 100;

const sortOptions = [
	{ value: "score", label: "Total Score" },
	{ value: "xp", label: "Experience Points (XP)" },
	{ value: "rating", label: "Overall Rating" },
	{ value: "contestRating", label: "Contest Rating" },
	{ value: "mlRating", label: "Machine Learning Rating" },
	{ value: "problemSolvingRating", label: "Problem Solving Rating" },
];

const Leaderboard: React.FC = () => {
	const [user] = useAuthState(auth);

	// Cache references to avoid duplicate fetch queries
	const leaderboardCache = useRef<Record<string, any>>({});

	// Filter states
	const [sortField, setSortField] = useState("score");
	const [country, setCountry] = useState("");
	const [school, setSchool] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [searchActiveQuery, setSearchActiveQuery] = useState("");
	const [friendsOnly, setFriendsOnly] = useState(false);

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const [usersList, setUsersList] = useState<LeaderboardUser[]>([]);
	const [highlightedUid, setHighlightedUid] = useState<string | null>(null);

	const [loading, setLoading] = useState(true);
	const [directPage, setDirectPage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [warning, setWarning] = useState<string | null>(null);

	// Load user friends
	const [friends, setFriends] = useState<string[]>([]);
	useEffect(() => {
		if (!user) {
			setFriends([]);
			return;
		}
		const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
			if (snap.exists()) {
				setFriends(snap.data().friends || []);
			}
		});
		return () => unsub();
	}, [user]);

	// Fetch function
	const fetchPage = async (pageToFetch: number, jumpToUserUid = "", forceActiveSearch = searchActiveQuery) => {
		setLoading(true);
		setError(null);
		setWarning(null);
		try {
			const cacheKey = JSON.stringify({
				page: pageToFetch,
				sortField,
				country,
				school,
				search: forceActiveSearch,
				jumpToUid: jumpToUserUid,
				friendsOnly
			});

			// If cache matches, load instantly
			if (leaderboardCache.current[cacheKey]) {
				const cached = leaderboardCache.current[cacheKey];
				setUsersList(cached.users || []);
				setCurrentPage(cached.page || 1);
				setTotalPages(cached.totalPages || 1);
				setTotalItems(cached.totalItems || 0);
				setHighlightedUid(cached.highlightedUid || null);
				setWarning(cached.warning || null);
				setLoading(false);
				return;
			}

			const params = new URLSearchParams();
			params.append("page", String(pageToFetch));
			params.append("sortField", sortField);
			if (country) params.append("country", country);
			if (school) params.append("school", school);
			if (forceActiveSearch) params.append("search", forceActiveSearch);
			if (jumpToUserUid) params.append("jumpToUid", jumpToUserUid);

			if (friendsOnly && user) {
				const friendsQueryList = [user.uid, ...friends];
				params.append("friends", friendsQueryList.join(","));
			}

			const res = await fetch(`/api/leaderboard?${params.toString()}`);
			if (!res.ok) throw new Error("Failed to load rankings");
			const data = await res.json();

			setUsersList(data.users || []);
			setCurrentPage(data.page || 1);
			setTotalPages(data.totalPages || 1);
			setTotalItems(data.totalItems || 0);
			setHighlightedUid(data.highlightedUid || null);
			setWarning(data.warning || null);

			// Save to cache
			leaderboardCache.current[cacheKey] = data;
		} catch (err) {
			console.error("Leaderboard fetch error:", err);
			setError("Unable to load rankings at this moment.");
		} finally {
			setLoading(false);
		}
	};

	// Prefetch helper
	const prefetchNextPage = async (nextPage: number, activeSearch: string) => {
		const prefetchKey = JSON.stringify({
			page: nextPage,
			sortField,
			country,
			school,
			search: activeSearch,
			jumpToUid: "",
			friendsOnly
		});

		if (leaderboardCache.current[prefetchKey]) return;

		try {
			const params = new URLSearchParams();
			params.append("page", String(nextPage));
			params.append("sortField", sortField);
			if (country) params.append("country", country);
			if (school) params.append("school", school);
			if (activeSearch) params.append("search", activeSearch);

			if (friendsOnly && user) {
				const friendsQueryList = [user.uid, ...friends];
				params.append("friends", friendsQueryList.join(","));
			}

			const res = await fetch(`/api/leaderboard?${params.toString()}`);
			if (res.ok) {
				const data = await res.json();
				leaderboardCache.current[prefetchKey] = data;
			}
		} catch (e) {
			console.warn("Background prefetch failed:", e);
		}
	};

	// Trigger fetch on filter changes
	useEffect(() => {
		// Reset page cursor when filters change
		setCurrentPage(1);
		fetchPage(1);
	}, [sortField, country, school, searchActiveQuery, friendsOnly]);


	// Scroll highlighted row into view
	useEffect(() => {
		if (highlightedUid) {
			const timer = setTimeout(() => {
				const row = document.getElementById(`row-${highlightedUid}`);
				if (row) {
					row.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [highlightedUid, usersList]);

	// Keyboard arrow navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
				return;
			}
			if (e.key === "ArrowLeft") {
				if (currentPage > 1) {
					setCurrentPage((p) => p - 1);
					fetchPage(currentPage - 1);
				}
			} else if (e.key === "ArrowRight") {
				if (currentPage < totalPages) {
					setCurrentPage((p) => p + 1);
					fetchPage(currentPage + 1);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentPage, totalPages]);

	// Search handler
	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchActiveQuery(searchInput.trim());
	};

	// Jump to current logged-in user
	const handleJumpToMe = () => {
		if (!user) return;
		fetchPage(1, user.uid);
	};

	// Direct page input
	const handleDirectPageSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const p = parseInt(directPage);
		if (!isNaN(p) && p >= 1 && p <= totalPages) {
			setCurrentPage(p);
			fetchPage(p);
		}
		setDirectPage("");
	};

	// Render metric value based on active sorting
	const renderMetric = (u: LeaderboardUser): React.ReactNode => {
		if (sortField === "xp") return `${u.xp.toLocaleString()} XP`;
		if (sortField === "rating") return <span className="inline-flex items-center gap-1"><FaStar className="text-yellow-500" size={12} /> {u.rating}</span>;
		if (sortField === "contestRating") return <span className="inline-flex items-center gap-1"><FaTrophy className="text-brand-orange" size={12} /> {u.contestRating}</span>;
		if (sortField === "mlRating") return <span className="inline-flex items-center gap-1"><FaCode className="text-cyan-400" size={12} /> {u.mlRating}</span>;
		if (sortField === "problemSolvingRating") return <span className="inline-flex items-center gap-1"><FaTrophy className="text-emerald-400" size={12} /> {u.problemSolvingRating}</span>;
		return `${u.score.toLocaleString()} pts`;
	};

	return (
		<div className="w-full space-y-5">
			<PageHeader
				title="Global Rankings"
				description="Real-time engineering and algorithmic proficiency rankings across the global developer network."
				breadcrumbs={[{ label: "Rankings" }]}
				metrics={[
					{ label: "Easy", value: "1 pt" },
					{ label: "Medium", value: "3 pts" },
					{ label: "Hard", value: "5 pts" },
					{ label: "Total Members", value: totalItems > 0 ? totalItems.toLocaleString() : "..." },
				]}
				actions={
					user ? (
						<button
							onClick={handleJumpToMe}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border border-border-default bg-bg-surface-elevated hover:bg-bg-surface text-text-primary transition-colors"
						>
							<FaMapMarkerAlt className="text-accent-brand" size={11} /> Jump to My Rank
						</button>
					) : undefined
				}
			/>

			{/* Top 3 Performers Summary (Page 1) */}
			{!loading && currentPage === 1 && usersList.length >= 3 && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{[
						{ user: usersList[0], rank: 1, label: "Top Rank", badgeCls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
						{ user: usersList[1], rank: 2, label: "Second Place", badgeCls: "text-slate-300 bg-slate-400/10 border-slate-400/20" },
						{ user: usersList[2], rank: 3, label: "Third Place", badgeCls: "text-amber-600 bg-amber-600/10 border-amber-600/20" },
					].map(({ user: itemUser, rank, label, badgeCls }) => (
						<div
							key={itemUser.uid}
							className="bg-bg-surface border border-border-default rounded-lg p-3.5 flex items-center justify-between gap-3"
						>
							<div className="flex items-center gap-3 min-w-0">
								<span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold border ${badgeCls}`}>
									#{rank}
								</span>
								<div className="min-w-0">
									<Link
										href={`/profile?uid=${itemUser.uid}`}
										className="text-xs font-semibold text-text-primary hover:text-accent-brand transition-colors truncate block"
									>
										{itemUser.displayName}
									</Link>
									<p className="text-[11px] text-text-muted truncate">
										{itemUser.school || "Independent Engineer"}
									</p>
								</div>
							</div>
							<div className="text-right shrink-0 font-mono text-xs font-medium text-accent-brand">
								{renderMetric(itemUser)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Filters Control Panel */}
			<div className="bg-bg-surface border border-border-default rounded-lg p-3.5 space-y-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{/* Search input form */}
					<form onSubmit={handleSearchSubmit} className="flex gap-2">
						<div className="relative flex-1">
							<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={11} />
							<input
								type="text"
								placeholder="Search handle..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary outline-none focus:border-accent-brand transition-colors"
							/>
						</div>
						<button
							type="submit"
							className="px-3 py-1.5 rounded-md text-xs font-mono bg-accent-brand hover:bg-accent-hover text-bg-base font-medium transition-colors"
						>
							Search
						</button>
					</form>

					{/* Sort field select */}
					<div>
						<BeastCodeSelect
							options={sortOptions}
							value={sortField}
							onChange={setSortField}
							placeholder="Sort Rank By..."
						/>
					</div>

					{/* Country selector */}
					<div>
						<CountrySelector
							value={country}
							onChange={setCountry}
							placeholder="Global (All Countries)"
							showGlobal={true}
						/>
					</div>

					{/* School input */}
					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Filter school/org..."
							value={school}
							onChange={(e) => setSchool(e.target.value)}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary outline-none focus:border-accent-brand transition-colors"
						/>
					</div>
				</div>

				{/* Secondary filters */}
				<div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-border-subtle gap-3">
					<div className="flex items-center gap-3">
						{user && (
							<button
								onClick={() => setFriendsOnly(!friendsOnly)}
								className={`px-2.5 py-1 rounded text-xs font-mono border flex items-center gap-1.5 transition-colors ${
									friendsOnly
										? "border-accent-brand bg-accent-brand/10 text-accent-brand"
										: "border-border-default bg-bg-base text-text-secondary hover:text-text-primary"
								}`}
							>
								<FaUserFriends size={11} />
								Friends Only
							</button>
						)}

						{(country || school || searchActiveQuery || friendsOnly) && (
							<button
								onClick={() => {
									setCountry("");
									setSchool("");
									setSearchInput("");
									setSearchActiveQuery("");
									setFriendsOnly(false);
								}}
								className="text-xs font-mono text-red-400 hover:text-red-300 transition-colors"
							>
								Reset Filters
							</button>
						)}
					</div>

					<div className="text-xs font-mono text-text-muted">
						Page size: <span className="text-text-secondary">100 records</span>
					</div>
				</div>
			</div>

			{warning && (
				<div className="p-3 rounded-md border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-center gap-2 font-mono">
					<FaExclamationTriangle className="text-amber-400 shrink-0" size={13} />
					<div>{warning}</div>
				</div>
			)}

			{/* Main Technical Ranking Table */}
			<div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
				<div className="overflow-x-auto w-full">
					<table className="w-full text-xs text-left">
						<thead className="text-[11px] font-mono uppercase tracking-wider border-b border-border-default bg-bg-base text-text-muted">
							<tr>
								<th scope="col" className="px-4 py-2.5 w-16 text-center">Rank</th>
								<th scope="col" className="px-4 py-2.5 min-w-[200px]">Developer</th>
								<th scope="col" className="px-4 py-2.5 hidden md:table-cell min-w-[180px]">Organization / School</th>
								<th scope="col" className="px-4 py-2.5 hidden lg:table-cell w-36 text-center">Region</th>
								<th scope="col" className="px-4 py-2.5 hidden sm:table-cell w-48 text-center">Solved</th>
								<th scope="col" className="px-4 py-2.5 w-36 text-right pr-6">Standing</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-subtle">
							{loading ? (
								[...Array(10)].map((_, idx) => (
									<tr key={idx} className="animate-pulse">
										<td className="px-4 py-2.5 text-center">
											<div className="w-5 h-4 rounded bg-bg-surface-elevated mx-auto" />
										</td>
										<td className="px-4 py-2.5">
											<div className="flex items-center gap-2.5">
												<div className="w-6 h-6 rounded-full bg-bg-surface-elevated" />
												<div className="h-3.5 w-24 rounded bg-bg-surface-elevated" />
											</div>
										</td>
										<td className="px-4 py-2.5 hidden md:table-cell">
											<div className="h-3.5 w-28 rounded bg-bg-surface-elevated" />
										</td>
										<td className="px-4 py-2.5 hidden lg:table-cell">
											<div className="h-3.5 w-16 rounded bg-bg-surface-elevated mx-auto" />
										</td>
										<td className="px-4 py-2.5 hidden sm:table-cell">
											<div className="h-3.5 w-28 rounded bg-bg-surface-elevated mx-auto" />
										</td>
										<td className="px-4 py-2.5 text-right pr-6">
											<div className="h-3.5 w-14 rounded bg-bg-surface-elevated ml-auto" />
										</td>
									</tr>
								))
							) : error ? (
								<tr>
									<td colSpan={6} className="px-4 py-10 text-center">
										<div className="flex flex-col items-center justify-center gap-3">
											<FaExclamationTriangle className="text-red-400" size={22} />
											<p className="text-xs text-text-secondary">{error}</p>
											<button
												onClick={() => fetchPage(currentPage)}
												className="px-3 py-1.5 rounded-md text-xs font-mono bg-bg-surface-elevated hover:bg-bg-surface border border-border-default text-text-primary transition-colors"
											>
												Retry Request
											</button>
										</div>
									</td>
								</tr>
							) : usersList.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-10 text-center text-xs text-text-muted font-mono">
										No ranking records matching current filters.
									</td>
								</tr>
							) : (
								usersList.map((rankingUser) => {
									const isCurrentUser = user && rankingUser.uid === user.uid;
									const isHighlighted = highlightedUid === rankingUser.uid;
									const rank = rankingUser.rank;

									return (
										<tr
											key={rankingUser.uid}
											id={`row-${rankingUser.uid}`}
											className={`hover:bg-bg-surface-elevated/40 transition-colors ${
												isCurrentUser ? "bg-accent-brand/5 border-l-2 border-l-accent-brand" : ""
											} ${
												isHighlighted ? "bg-accent-brand/10" : ""
											}`}
										>
											{/* Rank */}
											<td className="px-4 py-2.5 text-center font-mono font-medium text-xs">
												{rank === 1 ? (
													<span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
														<FaCrown size={11} /> 1
													</span>
												) : rank === 2 ? (
													<span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
														<FaMedal size={11} /> 2
													</span>
												) : rank === 3 ? (
													<span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
														<FaMedal size={11} /> 3
													</span>
												) : (
													<span className="text-text-muted">#{rank}</span>
												)}
											</td>

											{/* User */}
											<td className="px-4 py-2.5 font-medium">
												<Link
													href={`/profile?uid=${rankingUser.uid}`}
													className="inline-flex items-center gap-2 hover:text-accent-brand transition-colors text-text-primary"
												>
													{rankingUser.avatarUrl ? (
														<img
															src={rankingUser.avatarUrl}
															alt=""
															className="w-6 h-6 rounded-full object-cover border border-border-default"
														/>
													) : (
														<div className="w-6 h-6 rounded-full flex items-center justify-center bg-bg-base border border-border-default text-text-muted">
															<FaUser size={10} />
														</div>
													)}
													<span className="truncate max-w-[160px]">
														{rankingUser.displayName}
													</span>
													{isCurrentUser && (
														<span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-accent-brand/15 text-accent-brand border border-accent-brand/30">
															You
														</span>
													)}
												</Link>
											</td>

											{/* University */}
											<td className="px-4 py-2.5 hidden md:table-cell text-text-secondary truncate max-w-[200px]">
												{rankingUser.school || <span className="text-text-muted">—</span>}
											</td>

											{/* Region / Country */}
											<td className="px-4 py-2.5 hidden lg:table-cell text-center text-text-secondary">
												<span className="inline-flex items-center gap-1.5 text-xs">
													{rankingUser.country ? (
														<>
															<img
																src={`https://flagcdn.com/16x12/${rankingUser.country.toLowerCase()}.png`}
																width="16"
																height="12"
																alt={rankingUser.country}
																className="rounded-sm object-cover shrink-0"
																onError={(e) => {
																	e.currentTarget.style.display = "none";
																}}
															/>
															<span className="truncate max-w-[100px]">{getCountryName(rankingUser.country)}</span>
														</>
													) : (
														<>
															<FaGlobe size={10} className="text-text-muted" />
															<span className="text-text-muted">Global</span>
														</>
													)}
												</span>
											</td>

											{/* Solve Stats */}
											<td className="px-4 py-2.5 hidden sm:table-cell text-center">
												<div className="inline-flex items-center gap-1 font-mono text-[10px]">
													<span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
														{rankingUser.easyCount} E
													</span>
													<span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
														{rankingUser.mediumCount} M
													</span>
													<span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
														{rankingUser.hardCount} H
													</span>
												</div>
											</td>

											{/* Score / Metric */}
											<td className="px-4 py-2.5 text-right pr-6 font-mono text-xs font-semibold text-accent-brand">
												{renderMetric(rankingUser)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{/* Technical Pagination Bar */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-border-default bg-bg-base text-xs font-mono text-text-muted">
					<div>
						Showing <span className="text-text-primary font-medium">{totalItems > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}</span> to{" "}
						<span className="text-text-primary font-medium">{Math.min(totalItems, currentPage * PAGE_SIZE)}</span> of{" "}
						<span className="text-text-primary font-medium">{totalItems.toLocaleString()}</span> members
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => {
								setCurrentPage(1);
								fetchPage(1);
							}}
							disabled={currentPage === 1 || loading}
							className="p-1.5 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-elevated text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							title="First Page"
						>
							<FaAngleDoubleLeft size={10} />
						</button>

						<button
							onClick={() => {
								const prev = currentPage - 1;
								setCurrentPage(prev);
								fetchPage(prev);
							}}
							disabled={currentPage === 1 || loading}
							className="px-2.5 py-1 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-elevated text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
						>
							<FaChevronLeft size={8} /> Prev
						</button>

						<span className="px-2 text-text-primary font-medium">
							{currentPage} / {totalPages}
						</span>

						<button
							onClick={() => {
								const next = currentPage + 1;
								setCurrentPage(next);
								fetchPage(next);
							}}
							disabled={currentPage === totalPages || loading}
							className="px-2.5 py-1 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-elevated text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
						>
							Next <FaChevronRight size={8} />
						</button>

						<button
							onClick={() => {
								setCurrentPage(totalPages);
								fetchPage(totalPages);
							}}
							disabled={currentPage === totalPages || loading}
							className="p-1.5 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-elevated text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							title="Last Page"
						>
							<FaAngleDoubleRight size={10} />
						</button>

						<form onSubmit={handleDirectPageSubmit} className="flex items-center gap-1.5 ml-2">
							<span className="text-text-muted">Go:</span>
							<input
								type="number"
								min="1"
								max={totalPages}
								placeholder="#"
								value={directPage}
								onChange={(e) => setDirectPage(e.target.value)}
								autoComplete="off"
								className="w-12 px-1.5 py-0.5 text-center text-xs rounded border border-border-default bg-bg-surface text-text-primary outline-none focus:border-accent-brand"
							/>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Leaderboard;
