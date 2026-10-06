import React, { useState, useMemo } from "react";
import { useNotifications, RawNotification } from "@/context/RealtimeNotificationProvider";
import Link from "next/link";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";
import { auth } from "@/firebase/firebase";
import {
	FaBell,
	FaCheckDouble,
	FaRegTrashAlt,
	FaSearch,
	FaCalendarAlt,
	FaCode,
	FaComment,
	FaShieldAlt,
	FaTrophy,
	FaUserCog,
	FaArrowRight,
	FaCircle,
	FaCheck,
	FaTimes,
	FaInfoCircle,
	FaCrown,
	FaUsers
} from "react-icons/fa";

interface GroupedNotification {
	id: string;
	ids: string[];
	type: string;
	category: string;
	title: string;
	body: string;
	createdAt: number;
	read: boolean;
	priority: string;
	ctaText?: string;
	ctaUrl?: string;
	threadId?: string;
	contestId?: string;
	problemId?: string;
	rawNotifications: RawNotification[];
}

export default function NotificationCenter() {
	const {
		notifications: rawNotifications,
		loading,
		markAllAsRead,
		markAsRead,
		deleteNotification
	} = useNotifications();

	// Search & Filter State
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [visibleCount, setVisibleCount] = useState(15);

	// Track invitation response actions locally for instant state transitions
	const [respondingInvites, setRespondingInvites] = useState<Record<string, string>>({});

	// Modal State
	const [selectedInvite, setSelectedInvite] = useState<any>(null);

	// Get Icon based on category / type
	const getNotifIcon = (category: string, type: string) => {
		switch (category) {
			case "social":
			case "thread":
				return <FaComment className="text-blue-400" size={16} />;
			case "contest":
			case "announcements":
			case "reminders":
				return <FaCalendarAlt className="text-amber-400" size={16} />;
			case "problem":
			case "editorials":
			case "submission":
				return <FaCode className="text-emerald-400" size={16} />;
			case "achievements":
				return <FaTrophy className="text-purple-400" size={16} />;
			case "security":
				return <FaShieldAlt className="text-red-400" size={16} />;
			case "account":
				return <FaUserCog className="text-cyan-400" size={16} />;
			default:
				return <FaBell className="text-gray-400" size={16} />;
		}
	};

	// Format relative timestamp
	const formatRelativeTime = (timestamp: number) => {
		const diff = Date.now() - timestamp;
		const secs = Math.floor(diff / 1000);
		const mins = Math.floor(secs / 60);
		const hours = Math.floor(mins / 60);
		const days = Math.floor(hours / 24);

		if (secs < 60) return "Just now";
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${days}d ago`;
	};

	// Grouping & Filtering Logic
	const filteredAndGroupedNotifications = useMemo(() => {
		// A. Filter by Category
		let filtered = rawNotifications;
		if (activeCategory !== "all") {
			if (activeCategory === "thread") {
				filtered = rawNotifications.filter((n) => n.category === "thread" || n.category === "social");
			} else if (activeCategory === "contest") {
				filtered = rawNotifications.filter((n) => n.category === "contest" || n.category === "announcements" || n.category === "reminders");
			} else if (activeCategory === "problem") {
				filtered = rawNotifications.filter((n) => n.category === "problem" || n.category === "editorials");
			} else {
				filtered = rawNotifications.filter((n) => n.category === activeCategory);
			}
		}

		// B. Filter by Search Query
		if (searchQuery.trim()) {
			const queryLower = searchQuery.toLowerCase().trim();
			filtered = filtered.filter(
				(n) =>
					(n.title && n.title.toLowerCase().includes(queryLower)) ||
					(n.body && n.body.toLowerCase().includes(queryLower)) ||
					(n.fromDisplayName && n.fromDisplayName.toLowerCase().includes(queryLower))
			);
		}

		// C. Intelligent Grouping
		const grouped: GroupedNotification[] = [];
		const threadGroupMap: Record<string, GroupedNotification> = {};

		filtered.forEach((notif) => {
			if ((notif.category === "thread" || notif.category === "social") && notif.threadId && (notif.type === "THREAD_REPLY" || notif.type === "like" || notif.type === "reply")) {
				const groupKey = `${notif.type}-${notif.threadId}`;
				if (threadGroupMap[groupKey]) {
					const existingGroup = threadGroupMap[groupKey];
					existingGroup.ids.push(notif.id);
					existingGroup.rawNotifications.push(notif);
					if (notif.createdAt > existingGroup.createdAt) {
						existingGroup.createdAt = notif.createdAt;
					}
					if (!notif.read) {
						existingGroup.read = false;
					}
				} else {
					const newGroup: GroupedNotification = {
						id: notif.id,
						ids: [notif.id],
						type: notif.type,
						category: notif.category,
						title: notif.title,
						body: notif.body,
						createdAt: notif.createdAt,
						read: notif.read,
						priority: notif.priority || "normal",
						ctaText: notif.ctaText,
						ctaUrl: notif.ctaUrl,
						threadId: notif.threadId,
						rawNotifications: [notif]
					};
					threadGroupMap[groupKey] = newGroup;
					grouped.push(newGroup);
				}
			} else {
				grouped.push({
					id: notif.id,
					ids: [notif.id],
					type: notif.type,
					category: notif.category,
					title: notif.title || "Notification Update",
					body: notif.body || "",
					createdAt: notif.createdAt,
					read: notif.read,
					priority: notif.priority || "normal",
					ctaText: notif.ctaText,
					ctaUrl: notif.ctaUrl,
					contestId: notif.contestId || (notif.metadata?.contestId) || undefined,
					problemId: notif.problemId || (notif.metadata?.problemId) || undefined,
					threadId: notif.threadId || (notif.metadata?.threadId) || undefined,
					rawNotifications: [notif]
				});
			}
		});

		// D. Process Grouped details
		grouped.forEach((g) => {
			if (g.ids.length > 1) {
				const count = g.ids.length;
				const names = Array.from(
					new Set(
						g.rawNotifications
							.map((rn) => rn.fromDisplayName || "Someone")
							.filter(Boolean)
					)
				);

				let nameStr = "Several people";
				if (names.length === 1) {
					nameStr = `${names[0]} and ${count - 1} other${count > 2 ? "s" : ""}`;
				} else if (names.length > 1) {
					nameStr = `${names.slice(0, 2).join(", ")} and ${count - 2} other${count > 3 ? "s" : ""}`;
				}

				if (g.type === "THREAD_REPLY" || g.type === "reply") {
					g.title = `${nameStr} replied to your thread`;
				} else if (g.type === "like") {
					g.title = `${nameStr} liked your comments`;
				}
				g.body = `You have ${count} new social updates on this discussion thread.`;
			}
		});

		return grouped.sort((a, b) => b.createdAt - a.createdAt);
	}, [rawNotifications, activeCategory, searchQuery]);

	const visibleNotifications = useMemo(() => {
		return filteredAndGroupedNotifications.slice(0, visibleCount);
	}, [filteredAndGroupedNotifications, visibleCount]);

	// Handle Organization invitation response
	const handleOrgInviteRespond = async (notifId: string, inviteId: string, action: "accept" | "decline") => {
		setRespondingInvites((prev) => ({ ...prev, [inviteId]: action === "accept" ? "accepting" : "declining" }));
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Unauthenticated");

			const res = await fetch(`/api/users/invitations/${inviteId}/respond`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ action }),
			});

			const data = await res.json();
			if (data.success) {
				setRespondingInvites((prev) => ({ ...prev, [inviteId]: action === "accept" ? "Accepted" : "Declined" }));
				// Mark notification as read
				await markAsRead(notifId);
				// Dispatch custom event to notify orgs list page to refresh in real-time
				window.dispatchEvent(new Event("org-joined"));

				// Update selected invite modal state if open
				if (selectedInvite && selectedInvite.inviteId === inviteId) {
					setSelectedInvite((prev: any) => prev ? { ...prev, status: action === "accept" ? "Accepted" : "Declined" } : null);
				}
			} else {
				alert(data.error || `Failed to ${action} invitation.`);
				setRespondingInvites((prev) => {
					const next = { ...prev };
					delete next[inviteId];
					return next;
				});
			}
		} catch (err: any) {
			alert(err.message || "An error occurred.");
			setRespondingInvites((prev) => {
				const next = { ...prev };
				delete next[inviteId];
				return next;
			});
		}
	};

	return (
		<div className="max-w-[760px] mx-auto px-4 mt-8 space-y-6">
			{/* Top Controls Bar */}
			<div
				className="p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
				style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
			>
				<div className="space-y-1">
					<h1 className="text-xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
						<FaBell className="text-emerald-500 animate-pulse" size={18} />
						Notification Center
					</h1>
					<p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
						Manage your real-time alerts, contest updates, and social interaction feed.
					</p>
				</div>
				{rawNotifications.some((n) => !n.read) && (
					<button
						onClick={markAllAsRead}
						className="px-4 py-2 text-xs font-bold rounded-lg border border-border-subtle hover:border-border-accent bg-dark-fill-3 flex items-center gap-2 hover:text-emerald-500 transition-all"
						style={{ color: "var(--text-secondary)" }}
					>
						<FaCheckDouble size={12} />
						Mark All Read
					</button>
				)}
			</div>

			{/* Search & Filter Pills */}
			<div className="space-y-4">
				<div className="relative">
					<FaSearch className="absolute left-4 top-3.5 text-text-muted" size={14} />
					<input
						type="text"
						placeholder="Search by keyword, topic, or sender..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-11 pr-4 py-3 text-xs rounded-md bg-dark-fill-3 border border-border-subtle text-text-primary focus:outline-none focus:border-emerald-500 transition-all placeholder:text-text-muted"
						style={{ color: "var(--text-primary)", background: "var(--bg-dark-fill-3)", border: "1px solid var(--border-subtle)" }}
					/>
				</div>

				<div className="flex flex-wrap gap-1.5 border-b border-border-subtle pb-3" style={{ borderBottomColor: "var(--border-subtle)" }}>
					{[
						{ id: "all", label: "All Updates" },
						{ id: "contest", label: "Contests" },
						{ id: "problem", label: "Problems" },
						{ id: "thread", label: "Social Feed" },
						{ id: "submission", label: "Submissions" },
						{ id: "achievements", label: "Achievements" },
						{ id: "account", label: "Account" },
						{ id: "admin", label: "Admin" },
						{ id: "university", label: "University" },
						{ id: "system", label: "System" },
						{ id: "security", label: "Security" },
						{ id: "marketing", label: "Marketing" }
					].map((tab) => {
						const isActive = activeCategory === tab.id;
						
						const getCategoryCount = (catId: string) => {
							if (catId === "all") return rawNotifications.filter((n) => !n.read).length;
							if (catId === "thread") return rawNotifications.filter((n) => (n.category === "thread" || n.category === "social") && !n.read).length;
							if (catId === "contest") return rawNotifications.filter((n) => (n.category === "contest" || n.category === "announcements" || n.category === "reminders") && !n.read).length;
							if (catId === "problem") return rawNotifications.filter((n) => (n.category === "problem" || n.category === "editorials") && !n.read).length;
							return rawNotifications.filter((n) => n.category === catId && !n.read).length;
						};
						const count = getCategoryCount(tab.id);

						return (
							<button
								key={tab.id}
								onClick={() => {
									setActiveCategory(tab.id);
									setVisibleCount(15);
								}}
								className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
									isActive
										? "bg-emerald-500 text-white shadow-md shadow-sm"
										: "bg-dark-fill-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-accent"
								}`}
							>
								{tab.label}
								{count > 0 && (
									<span
										className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
											isActive ? "bg-white text-emerald-500" : "bg-emerald-500 text-white"
										}`}
									>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Notifications List */}
			<div className="space-y-3">
				{loading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((idx) => (
							<div
								key={idx}
								className="flex items-center gap-4 p-5 rounded-lg animate-pulse bg-dark-fill-3"
								style={{ border: "1px solid var(--border-subtle)" }}
							>
								<div className="w-10 h-10 rounded-md bg-dark-layer-1" />
								<div className="flex-1 space-y-2">
									<div className="h-3 rounded-md w-1/3 bg-dark-layer-1" />
									<div className="h-2 rounded-md w-1/2 bg-dark-layer-1" />
								</div>
							</div>
						))}
					</div>
				) : visibleNotifications.length === 0 ? (
					<div
						className="text-center py-20 rounded-lg p-6 space-y-3"
						style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
					>
						<FaBell className="mx-auto text-text-muted opacity-25" size={40} />
						<h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>No Notifications Found</h3>
						<p className="text-xs max-w-sm mx-auto" style={{ color: "var(--text-muted)", lineHeight: "1.6" }}>
							Any updates, announcements, or replies will show up here as soon as they are triggered.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{visibleNotifications.map((notif) => {
							const hasUnread = !notif.read;
							let ctaUrl = notif.ctaUrl || "";
							let ctaText = notif.ctaText || "";
							if (!ctaUrl) {
								if (notif.contestId) {
									if (notif.type === "CONTEST_EDITORIAL_RELEASED") {
										ctaUrl = `/contests/${notif.contestId}?tab=editorial`;
										ctaText = "View Editorial";
									} else if (notif.type === "CONTEST_RESULTS_PUBLISHED" || notif.type === "CONTEST_ENDED" || notif.type === "CONTEST_WINNER") {
										ctaUrl = `/contests/${notif.contestId}?tab=leaderboard`;
										ctaText = "View Standings";
									} else {
										ctaUrl = `/contests/${notif.contestId}`;
										ctaText = "View Contest Preview";
									}
								} else if (notif.problemId) {
									ctaUrl = `/problems/${notif.problemId}`;
									ctaText = "Solve Problem";
								} else if (notif.threadId) {
									ctaUrl = `/threads?threadId=${notif.threadId}`;
									ctaText = "View Discussion";
								}
							}

							const firstRaw = notif.rawNotifications[0];
							const isOrgInvite = notif.type === "ORGANIZATION_EVENT" && firstRaw?.metadata?.action === "member.invited";

							if (isOrgInvite) {
								const inviteMeta = firstRaw?.metadata || {};
								const inviteId = inviteMeta.inviteId;
								const orgName = inviteMeta.orgName || notif.title || "Workspace";
								const orgLogo = inviteMeta.orgLogo || firstRaw?.fromAvatarUrl || "";
								const orgType = inviteMeta.orgType || "Organization";
								const orgVisibility = inviteMeta.orgVisibility || "public";
								const invitedRole = inviteMeta.roleId || "member";
								const inviterName = inviteMeta.inviterName || firstRaw?.fromDisplayName || "Admin";
								
								// Status priority: local state responding, then database metadata status, then default pending
								const currentStatus = respondingInvites[inviteId] || inviteMeta.status || "Pending";

								return (
									<div
										key={notif.id}
										onClick={() => {
											if (hasUnread) {
												notif.ids.forEach((id) => markAsRead(id));
											}
										}}
										className={`group flex flex-col md:flex-row gap-5 p-6 rounded-lg transition-all duration-300 animate-fade-in ${
											hasUnread
												? "border border-border-accent bg-emerald-500/10 shadow-sm"
												: "border border-border-subtle bg-dark-layer-1 hover:border-border-accent"
										}`}
										style={{
											backgroundImage: hasUnread
												? "radial-gradient(circle at top right, rgba(34, 197, 94, 0.1), transparent 60%)"
												: "none",
										}}
									>
										{/* Left: Organization Logo / Initial */}
										<div className="flex-shrink-0 flex items-start gap-4">
											{/* Unread Status Dot */}
											<div className="pt-3 w-2">
												{hasUnread && (
													<FaCircle className="text-emerald-500 animate-pulse" size={8} />
												)}
											</div>

											<OrganizationAvatar
												src={orgLogo}
												name={orgName}
												size="lg"
												className="border border-border-subtle shadow-md shrink-0"
											/>
										</div>

										{/* Middle: Invite details */}
										<div className="flex-1 min-w-0 space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-[10px] text-emerald-500 uppercase font-black tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
													Workspace Invitation
												</span>
												<span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
													currentStatus === "Pending" || currentStatus === "accepting" || currentStatus === "declining"
														? "bg-amber-500/10 text-amber-400 border-amber-500/20"
														: currentStatus === "Accepted"
														? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
														: "bg-red-500/10 text-red-400 border-red-500/20"
												}`}>
													{currentStatus === "accepting" ? "Accepting..." : currentStatus === "declining" ? "Declining..." : currentStatus}
												</span>
												<span className="text-[9px] text-text-muted font-mono ml-auto">
													{formatRelativeTime(notif.createdAt)}
												</span>
											</div>

											<h3 className="text-sm font-black text-text-primary">
												Join {orgName}
											</h3>

											<p className="text-xs text-text-muted leading-relaxed">
												<span className="font-bold text-text-secondary">@{inviterName}</span> invited you to join this workspace as a <span className="font-bold text-emerald-500 uppercase tracking-wider text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{invitedRole}</span>.
											</p>

											{/* Organization Meta Row */}
											<div className="flex flex-wrap gap-2.5 pt-1.5">
												<span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-dark-fill-3 border border-border-subtle text-text-muted">
													Type: {orgType}
												</span>
												<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
													orgVisibility === "public"
														? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
														: orgVisibility === "private"
														? "bg-amber-500/10 text-amber-400 border-amber-500/20"
														: "bg-red-500/10 text-red-400 border-red-500/20"
												}`}>
													Visibility: {orgVisibility}
												</span>
											</div>
										</div>

										{/* Right: Actions */}
										<div className="flex flex-row md:flex-col justify-end md:justify-center items-stretch gap-2.5 min-w-[130px] shrink-0 pt-2 md:pt-0">
											{(currentStatus === "Pending" || currentStatus === "accepting" || currentStatus === "declining") ? (
												<>
													<button
														disabled={currentStatus !== "Pending"}
														onClick={(e) => {
															e.stopPropagation();
															handleOrgInviteRespond(notif.id, inviteId, "accept");
														}}
														className="flex-1 md:flex-initial bg-emerald-500 hover:bg-emerald-600 text-dark-layer-1 font-black text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
													>
														<FaCheck size={9} /> Accept
													</button>
													<button
														disabled={currentStatus !== "Pending"}
														onClick={(e) => {
															e.stopPropagation();
															handleOrgInviteRespond(notif.id, inviteId, "decline");
														}}
														className="flex-1 md:flex-initial bg-dark-fill-3 hover:bg-red-950/20 border border-border-subtle hover:border-red-900/50 text-text-secondary hover:text-red-400 font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
													>
														<FaTimes size={9} /> Decline
													</button>
												</>
											) : null}

											<button
												onClick={(e) => {
													e.stopPropagation();
													setSelectedInvite({
														notifId: notif.id,
														inviteId,
														orgId: inviteMeta.orgId,
														orgName,
														orgLogo,
														orgType,
														orgVisibility,
														invitedRole,
														inviterName,
														status: currentStatus,
														orgDescription: inviteMeta.orgDescription,
														orgMemberCount: inviteMeta.orgMemberCount,
														orgOwnerUid: inviteMeta.orgOwnerUid,
														createdAt: notif.createdAt
													});
												}}
												className="flex-1 md:flex-initial bg-dark-fill-3 hover:bg-dark-fill-2 border border-border-subtle hover:border-border-accent text-text-secondary hover:text-text-primary font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
											>
												<FaInfoCircle size={9} /> Details
											</button>
										</div>
									</div>
								);
							}

							return (
								<div
									key={notif.id}
									onClick={() => {
										if (hasUnread) {
											notif.ids.forEach((id) => markAsRead(id));
										}
									}}
									className={`group flex items-start gap-4 p-5 rounded-lg transition-all duration-200 cursor-pointer animate-fade-in ${
										hasUnread
											? "border border-border-accent bg-emerald-500/10 shadow-sm"
											: "border border-border-subtle bg-dark-layer-1 hover:border-border-accent"
									}`}
								>
									{/* Unread Status Dot */}
									<div className="flex-shrink-0 pt-1.5 w-3">
										{hasUnread && (
											<FaCircle className="text-emerald-500 animate-pulse" size={8} />
										)}
									</div>

									{/* Avatar or Icon Badge */}
									{notif.rawNotifications[0]?.fromAvatarUrl ? (
										<img
											src={notif.rawNotifications[0].fromAvatarUrl}
											alt={notif.rawNotifications[0].fromDisplayName || "User"}
											className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-border-subtle"
										/>
									) : (
										<div
											className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
											style={{
												background: "var(--bg-dark-fill-3)",
												border: "1px solid var(--border-subtle)"
											}}
										>
											{getNotifIcon(notif.category, notif.type)}
										</div>
									)}

									{/* Content */}
									<div className="flex-1 min-w-0 space-y-1.5">
										<div className="flex items-start justify-between gap-2">
											<div className="flex flex-col gap-1 min-w-0">
												<h3
													className={`text-xs font-bold truncate ${
														hasUnread ? "text-text-primary" : "text-text-secondary"
													}`}
												>
													{notif.title}
												</h3>
												<div className="flex items-center gap-1.5 flex-wrap">
													{notif.priority && notif.priority !== "normal" && notif.priority !== "silent" && (
														<span
															className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
																notif.priority === "critical"
																	? "bg-red-500/10 text-red-400 border border-red-500/20"
																	: "bg-orange-500/10 text-orange-400 border border-orange-500/20"
															}`}
														>
															{notif.priority}
														</span>
													)}
													{notif.rawNotifications[0]?.metadata?.contestStatus && (
														<span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
															{notif.rawNotifications[0].metadata.contestStatus}
														</span>
													)}
												</div>
											</div>
											<span className="text-[9px] text-text-muted font-mono whitespace-nowrap pt-0.5">
												{formatRelativeTime(notif.createdAt)}
											</span>
										</div>

										<p className="text-[11px] leading-relaxed text-text-muted pr-4" style={{ wordBreak: "break-word" }}>
											{notif.body}
										</p>

										{/* Contextual Action Buttons */}
										<div className="pt-2 flex flex-wrap gap-2 items-center select-none" onClick={(e) => e.stopPropagation()}>
											{ctaUrl && (
												<Link href={ctaUrl}>
													<span className="px-3.5 py-1.5 text-[10px] font-black rounded-lg bg-emerald-500 hover:bg-opacity-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-sm">
														{ctaText || notif.ctaText || (notif.type === "THREAD_REPLY" || notif.type === "reply" ? "View Reply" : "Open Thread")}
														<FaArrowRight size={8} />
													</span>
												</Link>
											)}

											{/* Reply Back Option for Social/Reply Thread notifications */}
											{notif.threadId && (notif.type === "THREAD_REPLY" || notif.type === "reply" || notif.category === "thread" || notif.category === "social") && (
												<Link href={`/threads?threadId=${notif.threadId}&reply=true`}>
													<span className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg border border-border-subtle hover:border-[#22c55e] bg-[var(--bg-dark-fill-3)] text-[var(--text-secondary)] hover:text-[#22c55e] flex items-center gap-1.5 transition-all">
														Reply Back
													</span>
												</Link>
											)}

											{hasUnread && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														notif.ids.forEach((id) => markAsRead(id));
													}}
													className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-border-subtle hover:border-[#22c55e] bg-[var(--bg-dark-fill-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
												>
													<FaCheckDouble size={10} />
													Mark Read
												</button>
											)}

											<button
												onClick={(e) => {
													e.stopPropagation();
													deleteNotification(notif.ids);
												}}
												className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-border-subtle hover:border-red-500 bg-dark-fill-3 text-text-muted hover:text-red-400 transition-all flex items-center gap-1.5"
												title="Dismiss notification"
											>
												<FaRegTrashAlt size={10} />
												Dismiss
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Load More Button */}
			{filteredAndGroupedNotifications.length > visibleCount && (
				<button
					onClick={() => setVisibleCount((prev) => prev + 15)}
					className="w-full py-3 rounded-md border border-border-subtle hover:border-border-accent bg-dark-fill-3 text-xs font-bold transition-all text-text-secondary hover:text-text-primary"
				>
					Load Older Notifications
				</button>
			)}

			{/* ── DETAIL MODAL OVERLAY ── */}
			{selectedInvite && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
						onClick={() => setSelectedInvite(null)}
					/>

					{/* Modal Card */}
					<div
						className="relative w-full max-w-md rounded-lg overflow-hidden shadow-2xl border border-border-subtle z-10 animate-scale-up"
						style={{
							background: "var(--bg-elevated)",
						}}
					>
						{/* Header banner glow */}
						<div className="h-16 bg-gradient-to-r from-emerald-500/20 via-amber-500/10 to-emerald-500/20 border-b border-border-subtle/50" />

						{/* Close button */}
						<button
							onClick={() => setSelectedInvite(null)}
							className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition"
						>
							<FaTimes size={16} />
						</button>

						<div className="p-6 -mt-10 flex flex-col items-center text-center">
							{/* Logo */}
							<OrganizationAvatar
								src={selectedInvite.orgLogo}
								name={selectedInvite.orgName}
								size={80}
								className="border-4 border-[var(--bg-elevated)] shadow-xl mb-4 shrink-0"
							/>

							<span className="text-[9px] text-emerald-500 uppercase font-black tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mb-2">
								Invitation details
							</span>

							<h2 className="text-lg font-black text-text-primary leading-tight">
								{selectedInvite.orgName}
							</h2>

							{/* Badges */}
							<div className="flex gap-2 mt-2">
								<span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-dark-fill-3 border border-border-subtle text-text-muted">
									Type: {selectedInvite.orgType}
								</span>
								<span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
									selectedInvite.orgVisibility === "public"
										? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
										: selectedInvite.orgVisibility === "private"
										? "bg-amber-500/10 text-amber-400 border-amber-500/20"
										: "bg-red-500/10 text-red-400 border-red-500/20"
								}`}>
									{selectedInvite.orgVisibility}
								</span>
							</div>

							{/* Stats */}
							<div className="flex gap-4 items-center justify-center mt-4 mb-5 text-[11px] text-text-muted font-bold bg-dark-fill-3/50 border border-border-subtle/60 rounded-lg px-3 py-1.5">
								<span className="flex items-center gap-1">
									<FaUsers className="text-emerald-500" size={11} />
									{selectedInvite.orgMemberCount || 0} members
								</span>
								<span className="w-1 h-1 rounded-full bg-border-subtle" />
								<span className="flex items-center gap-1">
									<FaCrown className="text-amber-400" size={11} />
									Invited By: @{selectedInvite.inviterName}
								</span>
							</div>

							{/* Invited Role box */}
							<div className="w-full bg-dark-fill-3 border border-border-subtle rounded-md p-4 text-left mb-6">
								<span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-1">Invited Role</span>
								<div className="flex items-center gap-1.5">
									<FaShieldAlt className="text-emerald-500" size={12} />
									<span className="text-xs font-black text-text-primary uppercase tracking-wider">
										{selectedInvite.invitedRole}
									</span>
								</div>
								<p className="text-[11px] text-text-muted mt-2 leading-relaxed">
									{selectedInvite.orgDescription || "You will gain standard workspace access, allowing you to view and solve internal problem sets, join contests, and coordinate announcements."}
								</p>
							</div>

							{/* Action buttons inside Modal */}
							<div className="w-full flex gap-3">
								{(selectedInvite.status === "Pending" || selectedInvite.status === "accepting" || selectedInvite.status === "declining") ? (
									<>
										<button
											disabled={selectedInvite.status !== "Pending"}
											onClick={() => {
												handleOrgInviteRespond(selectedInvite.notifId, selectedInvite.inviteId, "decline");
											}}
											className="flex-1 bg-dark-fill-3 hover:bg-red-950/20 border border-border-subtle hover:border-red-900/50 text-text-secondary hover:text-red-400 font-bold text-xs uppercase tracking-wider py-2.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
										>
											<FaTimes size={10} /> Decline
										</button>
										<button
											disabled={selectedInvite.status !== "Pending"}
											onClick={() => {
												handleOrgInviteRespond(selectedInvite.notifId, selectedInvite.inviteId, "accept");
											}}
											className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-dark-layer-1 font-black text-xs uppercase tracking-wider py-2.5 rounded-md transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
										>
											<FaCheck size={10} /> Accept & Join
										</button>
									</>
								) : (
									<div className="w-full text-center py-2">
										<p className={`text-xs font-bold ${
											selectedInvite.status === "Accepted" ? "text-emerald-400" : "text-red-400"
										}`}>
											Invitation has been {selectedInvite.status}
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
