import { auth, firestore } from "@/firebase/firebase";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import Logout from "../Buttons/Logout";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import Image from "next/image";
import Logo from "../Logo/Logo";
import {
	FaChevronLeft, FaChevronRight, FaUser, FaCog,
	FaShieldAlt, FaBell, FaSearch, FaTrophy,
	FaCode, FaStream, FaBars, FaTimes,
	FaCalendarAlt, FaUsers, FaComments,
} from "react-icons/fa";
import { BsList } from "react-icons/bs";
import Timer from "../Timer/Timer";
import { useRouter } from "next/router";
import { problems } from "@/utils/problems";
import { useAdmin } from "@/hooks/useAdmin";
import { doc, onSnapshot, collection, query, getDocs, orderBy } from "firebase/firestore";
import { useNotifications } from "@/context/RealtimeNotificationProvider";
import { useConversations } from "@/hooks/chat/useConversations";

type TopbarProps = {
	problemPage?: boolean;
};

// Primary nav tabs
const NAV_TABS = [
	{ name: "Problems",      path: "/",          icon: <FaCode size={13} />, exact: true  },
	{ name: "Rankings",      path: "/rankings",  icon: <FaTrophy size={13} />, exact: false },
	{ name: "Contests",      path: "/contests",  icon: <FaCalendarAlt size={13} />, exact: false },
	{ name: "Threads",       path: "/threads",   icon: <FaStream size={13} />, exact: false },
	{ name: "Organizations", path: "/orgs",      icon: <FaUsers size={13} />, exact: false },
];

interface RankInfo {
	name: string;
	color: string;
	minScore: number;
}

const RANK_TIERS: RankInfo[] = [
	{ name: "Newbie", color: "#6f766f", minScore: 0 },
	{ name: "Beginner", color: "#22c55e", minScore: 5 },
	{ name: "Apprentice", color: "#14b8a6", minScore: 15 },
	{ name: "Intermediate", color: "#3b82f6", minScore: 30 },
	{ name: "Advanced", color: "#6366f1", minScore: 50 },
	{ name: "Expert", color: "#a855f7", minScore: 85 },
	{ name: "Master", color: "#ec4899", minScore: 130 },
	{ name: "Grandmaster", color: "#ef4444", minScore: 190 },
	{ name: "Legend", color: "#f59e0b", minScore: 270 },
	{ name: "Mythic", color: "#d946ef", minScore: 370 },
];

const getRankAndXP = (score: number) => {
	let currentRank = RANK_TIERS[0];
	for (let i = 0; i < RANK_TIERS.length; i++) {
		if (score >= RANK_TIERS[i].minScore) {
			currentRank = RANK_TIERS[i];
		}
	}
	const level = Math.floor(score / 10) + 1;
	const currentXP = score % 10;
	const xpPercent = currentXP * 10;
	return { currentRank, level, xpPercent };
};

const Topbar: React.FC<TopbarProps> = ({ problemPage }) => {
	const [user, loading] = useAuthState(auth);
	const setAuthModal = useSetRecoilState(authModalState);
	const router = useRouter();
	const [isAdmin, loadingAdmin] = useAdmin();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const mobileRef = useRef<HTMLDivElement>(null);
	const [userData, setUserData] = useState<{ displayName: string | null; avatarUrl: string | null; score: number } | null>(null);
	const [dbProblemIds, setDbProblemIds] = useState<string[]>([]);
	const { currentRank, level, xpPercent } = getRankAndXP(userData?.score || 0);

	// Notification dropdown states
	const { notifications, markAllAsRead, markAsRead } = useNotifications();
	const isMessagesPage = router.pathname.startsWith("/messages");
	const { totalUnreadCount: unreadChatCount } = useConversations({ enabled: isMessagesPage });
	const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
	const notifDropdownRef = useRef<HTMLDivElement>(null);

	/* ── user subscription ── */
	useEffect(() => {
		if (!user) { setUserData(null); return; }
		const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				setUserData({
					displayName: data.displayName || null,
					avatarUrl: data.avatarUrl || null,
					score: data.score || 0,
				});
			}
		});
		return () => unsub();
	}, [user]);

	/* ── database problems sync for nav (one-time fetch) ── */
	useEffect(() => {
		if (!problemPage) return;
		let isCancelled = false;
		const fetchProblemIds = async () => {
			try {
				const q = query(collection(firestore, "problems"), orderBy("title"));
				const snap = await getDocs(q);
				if (isCancelled) return;
				const list: string[] = [];
				snap.forEach((d) => list.push(d.id));
				if (list.length > 0) setDbProblemIds(list);
			} catch (err) {
				console.error("Error fetching db problems for nav:", err);
				if (!isCancelled) setDbProblemIds(Object.keys(problems));
			}
		};
		fetchProblemIds();
		return () => { isCancelled = true; };
	}, [problemPage]);

	/* ── close dropdown on outside click ── */
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
				setDropdownOpen(false);
			if (mobileRef.current && !mobileRef.current.contains(e.target as Node))
				setMobileOpen(false);
			if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node))
				setNotifDropdownOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	/* ── close menus on route change ── */
	useEffect(() => {
		setMobileOpen(false);
		setNotifDropdownOpen(false);
		setDropdownOpen(false);
	}, [router.pathname]);

	const markAllNotifsRead = async () => {
		await markAllAsRead();
	};

	const handleProblemChange = (isForward: boolean) => {
		const keys = dbProblemIds.length > 0 ? dbProblemIds : Object.keys(problems);
		if (keys.length === 0) return;
		const currentPid = router.query.pid as string;
		const currentIndex = keys.indexOf(currentPid);
		if (currentIndex === -1) {
			router.push(`/problems/${keys[0]}`);
			return;
		}
		let nextIndex = currentIndex + (isForward ? 1 : -1);
		if (nextIndex >= keys.length) {
			nextIndex = 0;
		} else if (nextIndex < 0) {
			nextIndex = keys.length - 1;
		}
		router.push(`/problems/${keys[nextIndex]}`);
	};

	const isTabActive = (tab: typeof NAV_TABS[number]) =>
		tab.exact
			? router.pathname === "/" || router.pathname === "/problems"
			: router.pathname.startsWith(tab.path);

	const notifActive = router.pathname === "/notifications";
	const searchActive = router.pathname === "/search";

	return (
		<>
			{/* ════════════════════════════════ TOPBAR ════════════════════════════════ */}
			<header
				className="sticky top-0 z-50 h-14 w-full flex shrink-0 items-center px-4 md:px-6 bg-[#080909] border-b border-border-default select-none"
				aria-label="Main navigation"
			>
				<div className={`flex w-full items-center justify-between gap-3 ${!problemPage ? "max-w-[1300px] mx-auto" : ""}`}>

					{/* ── LEFT: BRAND & PRIMARY NAVIGATION ── */}
					<div className="flex items-center gap-6">
						<Link href="/" prefetch={false} className="flex items-center shrink-0" aria-label="BeastCode home">
							<Logo size={24} />
						</Link>

						{/* Primary Tabs (desktop, non-problem pages) */}
						{!problemPage && (
							<nav className="hidden md:flex items-center gap-1">
								{NAV_TABS.map((tab) => {
									const active = isTabActive(tab);
									return (
										<Link
											key={tab.name}
											href={tab.path}
											prefetch={false}
											className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
												active
													? "text-text-primary bg-[var(--bg-elevated)] border border-border-default text-accent"
													: "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-elevated)] border border-transparent"
											}`}
											aria-current={active ? "page" : undefined}
										>
											{tab.icon && (
												<span className={active ? "text-accent" : "text-text-muted"}>
													{tab.icon}
												</span>
											)}
											<span>{tab.name}</span>
										</Link>
									);
								})}
							</nav>
						)}
					</div>

					{/* ── CENTER: PROBLEM NAVIGATION (problem page only) ── */}
					{problemPage && (
						<div className="flex items-center gap-2">
							<button
								onClick={() => handleProblemChange(false)}
								className="w-8 h-8 rounded-md flex items-center justify-center border border-border-default bg-[var(--bg-elevated)] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
								aria-label="Previous problem"
								title="Previous problem"
							>
								<FaChevronLeft size={10} />
							</button>

							<Link
								href="/"
								prefetch={false}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border-default bg-[var(--bg-surface)] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
							>
								<BsList size={14} />
								<span>Problems</span>
							</Link>

							<button
								onClick={() => handleProblemChange(true)}
								className="w-8 h-8 rounded-md flex items-center justify-center border border-border-default bg-[var(--bg-elevated)] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
								aria-label="Next problem"
								title="Next problem"
							>
								<FaChevronRight size={10} />
							</button>

							<div className="ml-2 hidden sm:block">
								<Timer />
							</div>
						</div>
					)}

					{/* ── RIGHT: SEARCH & USER ACTIONS ── */}
					<div className="flex items-center gap-2">
						{/* Quick Search */}
						{!problemPage && (
							<Link
								href="/search"
								prefetch={false}
								className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border transition-colors duration-150 ${
									searchActive
										? "border-accent text-accent bg-accent/5"
										: "border-border-default bg-[var(--bg-surface)] text-text-muted hover:border-border-strong hover:text-text-secondary"
								}`}
								aria-label="Search"
							>
								<FaSearch size={11} />
								<span className="pr-4">Search...</span>
								<kbd className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-elevated)] border border-border-subtle text-text-muted font-mono">
									/
								</kbd>
							</Link>
						)}

						{/* Messages Link */}
						{user && !problemPage && (
							<Link
								href="/messages"
								prefetch={false}
								className={`relative w-8 h-8 rounded-md flex items-center justify-center border transition-colors duration-150 ${
									router.pathname.startsWith("/messages")
										? "border-accent text-accent bg-accent/5"
										: "border-border-default bg-[var(--bg-surface)] text-text-secondary hover:text-text-primary hover:border-border-strong"
								}`}
								aria-label="Messages"
								title="Messages"
							>
								<FaComments size={13} />
								{unreadChatCount > 0 && (
									<span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 rounded-full bg-accent text-[#080909] text-[9px] font-bold items-center justify-center">
										{unreadChatCount > 9 ? "9+" : unreadChatCount}
									</span>
								)}
							</Link>
						)}

						{/* Notifications Dropdown */}
						{user && !problemPage && (
							<div className="relative" ref={notifDropdownRef}>
								<button
									onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
									className={`relative w-8 h-8 rounded-md flex items-center justify-center border transition-colors duration-150 ${
										notifDropdownOpen || notifActive
											? "border-accent text-accent bg-accent/5"
											: "border-border-default bg-[var(--bg-surface)] text-text-secondary hover:text-text-primary hover:border-border-strong"
									}`}
									aria-label="Notifications"
									aria-expanded={notifDropdownOpen}
								>
									<FaBell size={12} />
									{notifications.filter((n) => !n.read).length > 0 && (
										<span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 rounded-full bg-accent text-[#080909] text-[9px] font-bold items-center justify-center">
											{notifications.filter((n) => !n.read).length}
										</span>
									)}
								</button>

								{/* Notifications Panel */}
								{notifDropdownOpen && (
									<div
										className="absolute top-[calc(100%+6px)] right-0 w-80 rounded-lg overflow-hidden z-[100] bg-[var(--bg-surface)] border border-border-default shadow-lg"
										role="menu"
									>
										<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-default bg-[#0b0d0c]">
											<div className="flex items-center gap-2">
												<span className="text-xs font-semibold text-text-primary">
													Notifications
												</span>
												{notifications.filter((n) => !n.read).length > 0 && (
													<span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-accent/15 text-accent border border-accent/20">
														{notifications.filter((n) => !n.read).length} new
													</span>
												)}
											</div>
											{notifications.some((n) => !n.read) && (
												<button
													onClick={markAllNotifsRead}
													className="text-[11px] font-medium text-accent hover:underline"
												>
													Mark all read
												</button>
											)}
										</div>

										<div className="max-h-64 overflow-y-auto divide-y divide-border-subtle">
											{notifications.length === 0 ? (
												<div className="px-4 py-8 text-center text-xs text-text-muted">
													No new notifications
												</div>
											) : (
												notifications.slice(0, 5).map((n) => {
													const hasUnread = !n.read;
													const handleNotifClick = async () => {
														if (hasUnread) {
															await markAsRead(n.id);
														}
														setNotifDropdownOpen(false);
														let target = n.ctaUrl || "";
														if (!target) {
															if (n.contestId) target = `/contests/${n.contestId}`;
															else if (n.problemId) target = `/problems/${n.problemId}`;
															else if (n.threadId) target = `/threads?threadId=${n.threadId}`;
														}
														if (target) {
															router.push(target);
														}
													};

													return (
														<div
															key={n.id}
															onClick={handleNotifClick}
															className={`px-3.5 py-2.5 text-xs transition-colors duration-100 cursor-pointer hover:bg-[var(--bg-hover)] ${
																hasUnread ? "bg-accent/5" : ""
															}`}
														>
															<div className="flex items-center justify-between gap-2 mb-1">
																<span className="font-semibold text-text-primary truncate">
																	{n.title}
																</span>
																<span className="text-[10px] text-text-muted shrink-0">
																	{new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																</span>
															</div>
															<p className="text-[11px] text-text-secondary line-clamp-2">
																{n.body}
															</p>
														</div>
													);
												})
											)}
										</div>

										<div className="p-2 border-t border-border-default bg-[#0b0d0c] text-center">
											<Link
												href="/notifications"
												onClick={() => setNotifDropdownOpen(false)}
												className="text-xs font-medium text-accent hover:underline"
											>
												View all notifications →
											</Link>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Auth / Profile Area */}
						{!user ? (
							<button
								type="button"
								onClick={() => setAuthModal({ isOpen: true, type: "login" })}
								className="h-8 px-3.5 rounded-md text-xs font-semibold bg-accent text-[#080909] hover:bg-accent-hover transition-colors duration-150"
							>
								Sign In
							</button>
						) : (
							<div className="relative" ref={dropdownRef}>
								<button
									onClick={() => setDropdownOpen(!dropdownOpen)}
									className="flex items-center gap-2 p-1 rounded-md hover:bg-[var(--bg-elevated)] border border-transparent hover:border-border-default transition-colors duration-150"
									aria-label="User menu"
									aria-expanded={dropdownOpen}
								>
									{userData?.avatarUrl ? (
										<Image
											src={userData.avatarUrl}
											alt="Avatar"
											width={26}
											height={26}
											className="w-6 h-6 rounded-md object-cover border border-border-default"
										/>
									) : (
										<div className="w-6 h-6 rounded-md bg-[var(--bg-elevated)] border border-border-default flex items-center justify-center text-text-secondary text-xs font-semibold">
											{userData?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
										</div>
									)}
									<span className="hidden lg:block text-xs font-medium text-text-primary max-w-[100px] truncate">
										{userData?.displayName || user.displayName || user.email?.split("@")[0]}
									</span>
								</button>

								{/* User Profile Dropdown */}
								{dropdownOpen && (
									<div
										className="absolute top-[calc(100%+6px)] right-0 w-56 rounded-lg overflow-hidden z-[100] bg-[var(--bg-surface)] border border-border-default shadow-lg py-1 divide-y divide-border-subtle"
										role="menu"
									>
										{/* Account details */}
										<div className="px-3.5 py-2.5">
											<p className="text-xs font-semibold text-text-primary truncate">
												{userData?.displayName || user.displayName || "Developer"}
											</p>
											<p className="text-[10px] text-text-muted truncate mt-0.5">
												{user.email}
											</p>
											<div className="flex items-center gap-1.5 mt-2">
												<span className="text-[10px] font-semibold text-accent">
													{currentRank.name}
												</span>
												<span className="text-[10px] text-text-muted">• Level {level}</span>
											</div>
										</div>

										{/* Links */}
										<div className="py-1">
											<Link
												href="/profile"
												prefetch={false}
												onClick={() => setDropdownOpen(false)}
												className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-[var(--bg-hover)] transition-colors duration-100"
												role="menuitem"
											>
												<FaUser size={11} className="text-text-muted" />
												<span>Profile</span>
											</Link>
											<Link
												href="/settings"
												prefetch={false}
												onClick={() => setDropdownOpen(false)}
												className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-[var(--bg-hover)] transition-colors duration-100"
												role="menuitem"
											>
												<FaCog size={11} className="text-text-muted" />
												<span>Settings</span>
											</Link>
											{!loadingAdmin && isAdmin && (
												<Link
													href="/admin"
													prefetch={false}
													onClick={() => setDropdownOpen(false)}
													className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-accent hover:bg-[var(--bg-hover)] transition-colors duration-100"
													role="menuitem"
												>
													<FaShieldAlt size={11} className="text-accent" />
													<span>Admin Console</span>
												</Link>
											)}
										</div>

										{/* Sign out */}
										<div className="px-3.5 py-2 flex items-center justify-between">
											<span className="text-xs text-text-muted">Session</span>
											<Logout />
										</div>
									</div>
								)}
							</div>
						)}

						{/* Mobile Hamburger Toggle */}
						{!problemPage && (
							<button
								onClick={() => setMobileOpen(!mobileOpen)}
								className="md:hidden w-8 h-8 rounded-md flex items-center justify-center border border-border-default bg-[var(--bg-surface)] text-text-secondary hover:text-text-primary transition-colors duration-150"
								aria-label={mobileOpen ? "Close menu" : "Open menu"}
							>
								{mobileOpen ? <FaTimes size={13} /> : <FaBars size={13} />}
							</button>
						)}
					</div>
				</div>
			</header>

			{/* ════════════════════════════════ MOBILE DRAWER ════════════════════════════════ */}
			{!problemPage && mobileOpen && (
				<nav
					ref={mobileRef}
					className="md:hidden fixed top-14 left-0 right-0 z-40 bg-[#080909] border-b border-border-default shadow-lg py-3 px-4 flex flex-col gap-1.5"
					aria-label="Mobile navigation drawer"
				>
					{NAV_TABS.map((tab) => {
						const active = isTabActive(tab);
						return (
							<Link
								key={tab.name}
								href={tab.path}
								prefetch={false}
								onClick={() => setMobileOpen(false)}
								className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150 ${
									active
										? "text-accent bg-[var(--bg-elevated)] border border-border-default"
										: "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-elevated)] border border-transparent"
								}`}
							>
								{tab.icon && <span>{tab.icon}</span>}
								<span>{tab.name}</span>
							</Link>
						);
					})}
					<div className="pt-2 border-t border-border-default mt-1">
						<Link
							href="/search"
							prefetch={false}
							onClick={() => setMobileOpen(false)}
							className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-[var(--bg-elevated)]"
						>
							<FaSearch size={11} />
							<span>Search BeastCode</span>
						</Link>
					</div>
				</nav>
			)}
		</>
	);
};

export default Topbar;