import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { Badge } from "@/components/UI/Badge";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import { auth } from "@/firebase/firebase";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import {
	FaUserShield,
	FaBan,
	FaUndo,
	FaTrash,
	FaSignOutAlt,
	FaChevronLeft,
	FaHistory,
	FaTerminal,
	FaInfoCircle,
	FaExclamationTriangle,
	FaSpinner,
	FaTimes,
	FaCheck,
	FaCopy
} from "react-icons/fa";

interface UserProfile {
	uid: string;
	email: string;
	displayName: string;
	role: string;
	status: "ACTIVE" | "BANNED";
	easyCount: number;
	mediumCount: number;
	hardCount: number;
	mlCount: number;
	score: number;
	createdAt: number;
	username: string;
	studentId?: string;
	school?: string;
	faculty?: string;
	class?: string;
	experienceLevel?: string;
}

interface ModerationDetails {
	status: "ACTIVE" | "BANNED";
	reason?: string;
	duration?: string;
	notes?: string;
	bannedAt?: number;
	expiresAt?: number | null;
	bannedBy?: string;
	warnings?: any[];
	banHistory?: Array<{
		action: "BAN" | "UNBAN";
		reason: string;
		duration?: string;
		timestamp: number;
		adminUid: string;
		notes?: string;
	}>;
}

interface AuditLogItem {
	id: string;
	adminUid: string;
	adminName: string;
	action: "BAN" | "UNBAN" | "DELETE" | "LOGOUT" | "WARN";
	timestamp: number;
	reason: string;
	duration: string;
	ip: string;
	oldState: string;
	newState: string;
	notes: string;
}

interface Submission {
	id: string;
	problemId: string;
	problemTitle: string;
	verdict: string;
	status: string;
	score: number;
	language: string;
	timestamp: number;
	runtime?: number;
	memory?: number;
}

export default function UserDetailPage() {
	const router = useRouter();
	const { uid } = router.query;
	const [isAdmin, loadingAdmin] = useAdmin();

	// Page Data
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [moderation, setModeration] = useState<ModerationDetails | null>(null);
	const [logs, setLogs] = useState<AuditLogItem[]>([]);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);

	const [activeSubTab, setActiveSubTab] = useState<"submissions" | "history" | "logs">("submissions");

	// Actions / Modals
	const [statusRibbon, setStatusRibbon] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
	const [showSuspendModal, setShowSuspendModal] = useState(false);
	const [suspendDuration, setSuspendDuration] = useState("1 day");
	const [suspendReason, setSuspendReason] = useState("Spam");
	const [suspendNotes, setSuspendNotes] = useState("");
	const [submittingSuspend, setSubmittingSuspend] = useState(false);

	const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
	const [unsuspendReason, setUnsuspendReason] = useState("Appeal accepted");
	const [unsuspendNotes, setUnsuspendNotes] = useState("");
	const [submittingUnsuspend, setSubmittingUnsuspend] = useState(false);

	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [deleteReason, setDeleteReason] = useState("Request by user");
	const [deleteNotes, setDeleteNotes] = useState("");
	const [submittingDelete, setSubmittingDelete] = useState(false);

	// Check Credentials
	useEffect(() => {
		if (!loadingAdmin && !isAdmin) {
			router.push("/");
		}
	}, [isAdmin, loadingAdmin, router]);

	const triggerStatusRibbon = (type: "success" | "error" | "info", message: string, duration = 4000) => {
		setStatusRibbon({ type, message });
		if (duration > 0) {
			setTimeout(() => {
				setStatusRibbon((prev) => prev?.message === message ? null : prev);
			}, duration);
		}
	};

	const fetchUserDetails = useCallback(async () => {
		if (!uid) return;
		setLoading(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch(`/api/admin/users/${uid}`, {
				headers: {
					"Authorization": `Bearer ${idToken}`
				}
			});

			if (!res.ok) {
				throw new Error("Failed to fetch user details");
			}

			const data = await res.json();
			setUserProfile(data.user);
			setModeration(data.moderation);
			setLogs(data.logs);
			setSubmissions(data.recentSubmissions);
		} catch (error: any) {
			console.error("Error fetching user details:", error);
			triggerStatusRibbon("error", getFriendlyErrorMessage(error, "Failed to load user information."));
		} finally {
			setLoading(false);
		}
	}, [uid]);

	useEffect(() => {
		if (isAdmin && uid) {
			fetchUserDetails();
		}
	}, [isAdmin, uid, fetchUserDetails]);

	const handleSuspend = async () => {
		if (!userProfile) return;
		setSubmittingSuspend(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/ban", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userProfile.uid,
					reason: suspendReason,
					duration: suspendDuration,
					notes: suspendNotes
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to suspend user");
			}

			triggerStatusRibbon("success", `Suspended user account successfully.`);
			setShowSuspendModal(false);
			setSuspendNotes("");
			fetchUserDetails();
		} catch (error: any) {
			console.error("Suspend error:", error);
			triggerStatusRibbon("error", error.message);
		} finally {
			setSubmittingSuspend(false);
		}
	};

	const handleUnsuspend = async () => {
		if (!userProfile) return;
		setSubmittingUnsuspend(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/unban", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userProfile.uid,
					reason: unsuspendReason,
					notes: unsuspendNotes
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to unsuspend user");
			}

			triggerStatusRibbon("success", `Unsuspended user account successfully.`);
			setShowUnsuspendModal(false);
			setUnsuspendNotes("");
			fetchUserDetails();
		} catch (error: any) {
			console.error("Unsuspend error:", error);
			triggerStatusRibbon("error", error.message);
		} finally {
			setSubmittingUnsuspend(false);
		}
	};

	const handleDeleteUser = async () => {
		if (!userProfile || deleteConfirmText !== "DELETE") return;
		setSubmittingDelete(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/delete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userProfile.uid,
					reason: deleteReason,
					notes: deleteNotes
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to delete user");
			}

			triggerStatusRibbon("success", `Permanently deleted user account.`);
			router.push("/admin/moderation");
		} catch (error: any) {
			console.error("Delete error:", error);
			triggerStatusRibbon("error", error.message);
		} finally {
			setSubmittingDelete(false);
		}
	};

	const handleForceLogout = async () => {
		if (!userProfile) return;
		triggerStatusRibbon("info", `Revoking active sessions for ${userProfile.displayName}...`, 0);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/ban", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userProfile.uid,
					reason: "Admin session revocation",
					duration: "1 day",
					notes: "Force logout request by admin"
				})
			});

			if (!res.ok) throw new Error("Failed to revoke session");

			await fetch("/api/admin/moderation/unban", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userProfile.uid,
					reason: "Session revoked, unbanning for fresh login"
				})
			});

			triggerStatusRibbon("success", `Successfully logged out user everywhere.`);
			fetchUserDetails();
		} catch (error: any) {
			console.error("Force logout error:", error);
			triggerStatusRibbon("error", "Failed to force logout user.");
		}
	};

	if (loadingAdmin || !isAdmin || loading) {
		return (
			<AppShell activeNav="Admin" maxWidth="wide">
				<div className="py-24">
					<LoadingState message="Loading user details..." />
				</div>
			</AppShell>
		);
	}

	const isBanned = moderation?.status === "BANNED";

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title={userProfile?.displayName ? `${userProfile.displayName}` : `User: ${uid}`}
				description={`UID: ${uid} · Member management, account standing, role elevation, and audit logs.`}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Moderation", href: "/admin?tab=moderation" },
					{ label: userProfile?.username ? `@${userProfile.username}` : (uid as string) },
				]}
				badge={
					<Badge
						variant={isBanned ? "error" : "success"}
						size="sm"
						className="font-mono uppercase"
					>
						{isBanned ? "SUSPENDED" : "ACTIVE"}
					</Badge>
				}
				actions={
					<Link
						href="/admin?tab=moderation"
						className="px-3 py-1.5 rounded-md text-xs font-medium transition bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default flex items-center gap-1.5"
					>
						<FaChevronLeft size={10} />
						Back to Moderation
					</Link>
				}
			/>

			{/* Status Ribbon */}
			{statusRibbon && (
				<div
					className={`mb-5 p-3 rounded-md border text-xs font-mono transition-all duration-300 ${
						statusRibbon.type === "success"
							? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
							: statusRibbon.type === "error"
							? "bg-rose-950/30 text-rose-400 border-rose-800/40"
							: "bg-blue-950/30 text-blue-400 border-blue-800/40"
					}`}
				>
					{statusRibbon.message}
				</div>
			)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Column: User Profile Summary card */}
					<div className="bg-bg-surface border border-border-default rounded-lg p-5 h-fit">
						<div className="flex flex-col items-center text-center">
							<div className="w-16 h-16 rounded-md bg-bg-elevated text-text-primary font-mono font-bold border border-border-default flex items-center justify-center text-xl mb-3">
								{userProfile?.displayName ? userProfile.displayName[0].toUpperCase() : "U"}
							</div>
							<h2 className="text-base font-bold text-text-primary leading-tight">
								{userProfile?.displayName || "Anonymous User"}
							</h2>
							<p className="text-xs text-text-muted mt-1 font-mono">@{userProfile?.username || "unset"}</p>
							
							<div className="mt-3 flex gap-2">
								<span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${
									userProfile?.role === "admin"
										? "bg-accent/10 text-accent border-accent/30"
										: "bg-bg-elevated text-text-muted border-border-subtle"
								}`}>
									{userProfile?.role}
								</span>
								<span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${
									isBanned
										? "bg-rose-950/30 text-rose-400 border-rose-800/40"
										: "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
								}`}>
									{isBanned ? "SUSPENDED" : "ACTIVE"}
								</span>
							</div>
						</div>

						{/* Quick Stats Grid */}
						<div className="grid grid-cols-2 gap-3 mt-6 border-y border-border-subtle py-4 font-mono text-center">
							<div>
								<div className="text-base font-bold text-amber-400">{userProfile?.score || 0}</div>
								<div className="text-[10px] text-text-muted uppercase tracking-wider">Score (XP)</div>
							</div>
							<div>
								<div className="text-base font-bold text-text-primary">
									{(userProfile?.easyCount || 0) + (userProfile?.mediumCount || 0) + (userProfile?.hardCount || 0) + (userProfile?.mlCount || 0)}
								</div>
								<div className="text-[10px] text-text-muted uppercase tracking-wider">Solved Problems</div>
							</div>
						</div>

						{/* Metadata List */}
						<div className="mt-5 space-y-2.5 text-xs">
							<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
								<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">UID</span>
								<div className="flex items-center gap-2">
									<span className="text-text-secondary font-mono select-all truncate max-w-[140px]" title={userProfile?.uid}>
										{userProfile?.uid}
									</span>
									<button
										onClick={() => {
											if (userProfile?.uid) {
												navigator.clipboard.writeText(userProfile.uid);
												triggerStatusRibbon("success", "UID copied to clipboard");
											}
										}}
										className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-hover rounded"
										title="Copy UID"
									>
										<FaCopy size={11} />
									</button>
								</div>
							</div>
							<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
								<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">Email</span>
								<div className="flex items-center gap-2">
									<span className="text-text-secondary truncate max-w-[140px]" title={userProfile?.email}>
										{userProfile?.email}
									</span>
									<button
										onClick={() => {
											if (userProfile?.email) {
												navigator.clipboard.writeText(userProfile.email);
												triggerStatusRibbon("success", "Email copied to clipboard");
											}
										}}
										className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-hover rounded"
										title="Copy Email"
									>
										<FaCopy size={11} />
									</button>
								</div>
							</div>
							<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
								<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">Username</span>
								<div className="flex items-center gap-2">
									<span className="text-text-secondary truncate max-w-[140px]" title={userProfile?.username}>
										@{userProfile?.username || "unset"}
									</span>
									<button
										onClick={() => {
											if (userProfile?.username) {
												navigator.clipboard.writeText(userProfile.username);
												triggerStatusRibbon("success", "Username copied to clipboard");
											}
										}}
										className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-hover rounded"
										title="Copy Username"
									>
										<FaCopy size={11} />
									</button>
								</div>
							</div>
							<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
								<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">Display Name</span>
								<div className="flex items-center gap-2">
									<span className="text-text-secondary truncate max-w-[140px]" title={userProfile?.displayName}>
										{userProfile?.displayName || "Anonymous"}
									</span>
									<button
										onClick={() => {
											if (userProfile?.displayName) {
												navigator.clipboard.writeText(userProfile.displayName);
												triggerStatusRibbon("success", "Display Name copied to clipboard");
											}
										}}
										className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-hover rounded"
										title="Copy Display Name"
									>
										<FaCopy size={11} />
									</button>
								</div>
							</div>
							{userProfile?.studentId && (
								<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
									<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">Student ID</span>
									<span className="text-text-secondary font-mono">{userProfile.studentId}</span>
								</div>
							)}
							{userProfile?.school && (
								<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
									<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">School</span>
									<span className="text-text-secondary truncate max-w-[160px]">{userProfile.school}</span>
								</div>
							)}
							<div className="flex justify-between items-center bg-bg-elevated/40 p-2 rounded-md border border-border-subtle">
								<span className="text-text-muted font-mono uppercase text-[10px] tracking-wider">Created At</span>
								<span className="text-text-secondary font-mono text-[11px]">
									{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleString() : "-"}
								</span>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="mt-6 pt-5 border-t border-border-subtle space-y-2">
							{isBanned ? (
								<button
									onClick={() => setShowUnsuspendModal(true)}
									className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-md text-xs font-medium transition"
								>
									<FaUndo size={11} />
									Lift Suspension
								</button>
							) : (
								<button
									onClick={() => setShowSuspendModal(true)}
									className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-md text-xs font-medium transition"
								>
									<FaBan size={11} />
									Suspend Account
								</button>
							)}

							<button
								onClick={handleForceLogout}
								className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-secondary hover:text-text-primary rounded-md text-xs font-medium transition"
							>
								<FaSignOutAlt size={11} />
								Force Logout
							</button>

							<button
								onClick={() => setShowDeleteModal(true)}
								className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 rounded-md text-xs font-medium transition"
							>
								<FaTrash size={11} />
								Delete Account
							</button>
						</div>
					</div>

					{/* Right Column: Tabbed Activity details */}
					<div className="lg:col-span-2 flex flex-col gap-4">
						{/* Tab Switcher */}
						<div className="bg-bg-surface border border-border-default rounded-lg p-1 flex gap-1">
							<button
								onClick={() => setActiveSubTab("submissions")}
								className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 ${
									activeSubTab === "submissions"
										? "bg-bg-elevated text-accent border border-border-default shadow-xs"
										: "text-text-muted hover:text-text-primary hover:bg-bg-hover/40"
								}`}
							>
								<FaTerminal size={11} />
								Submissions
							</button>
							<button
								onClick={() => setActiveSubTab("history")}
								className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 ${
									activeSubTab === "history"
										? "bg-bg-elevated text-accent border border-border-default shadow-xs"
										: "text-text-muted hover:text-text-primary hover:bg-bg-hover/40"
								}`}
							>
								<FaExclamationTriangle size={11} />
								Ban History
							</button>
							<button
								onClick={() => setActiveSubTab("logs")}
								className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 ${
									activeSubTab === "logs"
										? "bg-bg-elevated text-accent border border-border-default shadow-xs"
										: "text-text-muted hover:text-text-primary hover:bg-bg-hover/40"
								}`}
							>
								<FaHistory size={11} />
								Audit Log
							</button>
						</div>

						{/* Tab Body */}
						<div className="bg-bg-surface border border-border-default rounded-lg p-5 flex-1">
							{activeSubTab === "submissions" && (
								<div>
									<h3 className="text-xs font-mono font-medium text-text-muted mb-4 uppercase tracking-wider">Recent Submissions</h3>
									{submissions.length === 0 ? (
										<p className="text-text-muted text-xs font-mono py-6 text-center">No submissions recorded for this account.</p>
									) : (
										<div className="space-y-2.5">
											{submissions.map((sub) => (
												<div
													key={sub.id}
													className="bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
												>
													<div>
														<span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Problem</span>
														<div className="text-sm font-medium text-text-primary mt-0.5">{sub.problemTitle}</div>
														<div className="text-[10px] text-text-muted mt-1 font-mono">
															{sub.language.toUpperCase()} • {new Date(sub.timestamp).toLocaleString()}
														</div>
													</div>
													<div className="flex items-center gap-4 text-right">
														<div>
															<span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Verdict</span>
															<div className={`text-xs font-mono font-medium uppercase mt-0.5 ${
																sub.status === "passed" ? "text-accent" : "text-rose-400"
															}`}>
																{sub.verdict}
															</div>
														</div>
														<div>
															<span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Score</span>
															<div className="text-xs font-mono font-bold text-amber-400 mt-0.5">{sub.score} XP</div>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							)}

							{activeSubTab === "history" && (
								<div>
									<h3 className="text-xs font-mono font-medium text-text-muted mb-4 uppercase tracking-wider">Warnings & Suspension Records</h3>
									{!moderation || !moderation.banHistory || moderation.banHistory.length === 0 ? (
										<p className="text-text-muted text-xs font-mono py-6 text-center">No warning or ban history records exist.</p>
									) : (
										<div className="space-y-3">
											{moderation.banHistory.map((item, idx) => (
												<div
													key={idx}
													className="bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 text-xs space-y-2"
												>
													<div className="flex justify-between items-center">
														<span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${
															item.action === "BAN"
																? "bg-rose-950/40 text-rose-400 border-rose-800/40"
																: "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
														}`}>
															{item.action}
														</span>
														<span className="text-text-muted font-mono text-[10px]">
															{new Date(item.timestamp).toLocaleString()}
														</span>
													</div>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
														<div>
															<span className="text-text-muted font-mono text-[10px] block">Reason</span>
															<span className="text-text-primary font-medium">{item.reason}</span>
														</div>
														{item.duration && (
															<div>
																<span className="text-text-muted font-mono text-[10px] block">Duration</span>
																<span className="text-amber-400 font-mono font-bold">{item.duration}</span>
															</div>
														)}
													</div>
													{item.notes && (
														<div className="border-t border-border-subtle pt-2 text-text-secondary font-sans mt-1">
															<strong>Admin Note:</strong> {item.notes}
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							)}

							{activeSubTab === "logs" && (
								<div>
									<h3 className="text-xs font-mono font-medium text-text-muted mb-4 uppercase tracking-wider">Moderation Audit Logs</h3>
									{logs.length === 0 ? (
										<p className="text-text-muted text-xs font-mono py-6 text-center">No audit logs recorded for this user.</p>
									) : (
										<div className="space-y-2.5 font-mono text-xs">
											{logs.map((log) => (
												<div
													key={log.id}
													className="bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 space-y-2"
												>
													<div className="flex justify-between items-center text-text-muted text-[10px]">
														<span>{new Date(log.timestamp).toLocaleString()}</span>
														<span>IP: {log.ip}</span>
													</div>
													<div className="text-text-primary font-sans">
														Admin <strong>{log.adminName}</strong> executed a 
														<span className="text-rose-400 font-mono font-bold mx-1 uppercase">{log.action}</span> 
														operation on this user.
													</div>
													<div className="text-[11px] grid grid-cols-2 gap-y-1 font-sans">
														<div className="text-text-muted">Reason:</div>
														<div className="text-text-secondary">{log.reason} {log.duration !== "N/A" && `(${log.duration})`}</div>
														{log.notes && (
															<>
																<div className="text-text-muted">Notes:</div>
																<div className="text-text-secondary">{log.notes}</div>
															</>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

			{/* MODALS */}

			{/* Suspend Modal */}
			{showSuspendModal && userProfile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fadeIn">
					<div className="bg-bg-surface border border-border-default rounded-lg p-5 max-w-md w-full mx-4 shadow-xl relative">
						<button
							onClick={() => setShowSuspendModal(false)}
							className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition"
						>
							<FaTimes />
						</button>
						<h3 className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
							<FaBan />
							Suspend User Account
						</h3>
						<p className="text-text-muted text-xs mb-5">
							Suspend access for <span className="text-text-primary font-medium">{userProfile.displayName}</span>. The user will be logged out immediately.
						</p>

						<div className="space-y-3.5 mb-5">
							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Duration</label>
								<BeastCodeSelect
									options={[
										{ value: "1 day", label: "1 Day" },
										{ value: "7 days", label: "7 Days" },
										{ value: "30 days", label: "30 Days" },
										{ value: "Permanent", label: "Permanent" }
									]}
									value={suspendDuration}
									onChange={(val) => setSuspendDuration(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Reason</label>
								<BeastCodeSelect
									options={[
										{ value: "Spam", label: "Spam & Advertisement" },
										{ value: "Harassment", label: "Harassment / Abusive behavior" },
										{ value: "Plagiarism", label: "Plagiarism / Cheating" },
										{ value: "Terms Violation", label: "Violation of Terms of Service" },
										{ value: "Other", label: "Other (specify in notes)" }
									]}
									value={suspendReason}
									onChange={(val) => setSuspendReason(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Notes / Details</label>
								<textarea
									value={suspendNotes}
									onChange={(e) => setSuspendNotes(e.target.value)}
									rows={3}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-3 text-text-primary outline-none resize-none transition font-sans"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
							<button
								type="button"
								onClick={() => setShowSuspendModal(false)}
								className="px-3.5 py-1.5 bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-default rounded-md text-xs font-medium transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSuspend}
								disabled={submittingSuspend}
								className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black rounded-md text-xs font-medium transition flex items-center gap-1.5"
							>
								{submittingSuspend ? <FaSpinner className="animate-spin" /> : <FaBan />}
								Confirm Suspension
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Unsuspend Modal */}
			{showUnsuspendModal && userProfile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fadeIn">
					<div className="bg-bg-surface border border-border-default rounded-lg p-5 max-w-md w-full mx-4 shadow-xl relative">
						<button
							onClick={() => setShowUnsuspendModal(false)}
							className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition"
						>
							<FaTimes />
						</button>
						<h3 className="text-sm font-bold text-accent mb-1 flex items-center gap-2">
							<FaUndo />
							Lift Account Suspension
						</h3>
						<p className="text-text-muted text-xs mb-5">
							Reinstate access for <span className="text-text-primary font-medium">{userProfile.displayName}</span>.
						</p>

						<div className="space-y-3.5 mb-5">
							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Unban Reason</label>
								<BeastCodeSelect
									options={[
										{ value: "Appeal accepted", label: "Appeal accepted" },
										{ value: "Suspension duration complete", label: "Suspension duration complete" },
										{ value: "False positive check", label: "False positive correction" },
										{ value: "Other", label: "Other (specify in notes)" }
									]}
									value={unsuspendReason}
									onChange={(val) => setUnsuspendReason(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Audit Notes</label>
								<textarea
									value={unsuspendNotes}
									onChange={(e) => setUnsuspendNotes(e.target.value)}
									rows={3}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-3 text-text-primary outline-none resize-none transition font-sans"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
							<button
								type="button"
								onClick={() => setShowUnsuspendModal(false)}
								className="px-3.5 py-1.5 bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-default rounded-md text-xs font-medium transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleUnsuspend}
								disabled={submittingUnsuspend}
								className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black rounded-md text-xs font-medium transition flex items-center gap-1.5"
							>
								{submittingUnsuspend ? <FaSpinner className="animate-spin" /> : <FaCheck />}
								Confirm Unban
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && userProfile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fadeIn">
					<div className="bg-bg-surface border border-rose-800/40 rounded-lg p-5 max-w-md w-full mx-4 shadow-xl relative">
						<button
							onClick={() => {
								setShowDeleteModal(false);
								setDeleteConfirmText("");
							}}
							className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition"
						>
							<FaTimes />
						</button>
						<h3 className="text-sm font-bold text-rose-400 mb-1 flex items-center gap-2">
							<FaTrash />
							Delete Account Permanently
						</h3>
						<p className="text-text-muted text-xs mb-3">
							This will <span className="text-rose-400 font-mono font-medium uppercase">permanently delete</span> the account for <span className="text-text-primary font-medium">{userProfile.displayName}</span>.
						</p>
						<div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-md mb-4 text-[11px] text-rose-400 leading-relaxed font-mono">
							CRITICAL WARNING: This wipes their user profile document and Firebase Authentication login record. This action is irreversible. The user&apos;s email address will be immediately freed for registration.
						</div>

						<div className="space-y-3.5 mb-5">
							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Reason for Deletion</label>
								<BeastCodeSelect
									options={[
										{ value: "Request by user", label: "Requested by user (Right to be Forgotten)" },
										{ value: "Terms Violation", label: "Severe / Repeated platform abuse" },
										{ value: "Duplicate Account", label: "Cleanup of duplicate account" },
										{ value: "Other", label: "Other (specify in notes)" }
									]}
									value={deleteReason}
									onChange={(val) => setDeleteReason(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-mono font-medium block mb-1 text-text-muted uppercase tracking-wider">Audit Notes</label>
								<textarea
									value={deleteNotes}
									onChange={(e) => setDeleteNotes(e.target.value)}
									rows={2}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-3 text-text-primary outline-none resize-none transition font-sans"
								/>
							</div>

							<div>
								<label className="text-xs text-text-muted block mb-1">
									Type <span className="text-rose-400 font-bold font-mono">DELETE</span> to confirm:
								</label>
								<input
									type="text"
									value={deleteConfirmText}
									onChange={(e) => setDeleteConfirmText(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default focus:border-rose-500 text-xs rounded-md px-3 py-2 text-text-primary outline-none font-mono text-center tracking-widest"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
							<button
								type="button"
								onClick={() => {
									setShowDeleteModal(false);
									setDeleteConfirmText("");
								}}
								className="px-3.5 py-1.5 bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-default rounded-md text-xs font-medium transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeleteUser}
								disabled={deleteConfirmText !== "DELETE" || submittingDelete}
								className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-md text-xs font-medium transition flex items-center gap-1.5"
							>
								{submittingDelete ? <FaSpinner className="animate-spin" /> : <FaTrash />}
								Delete Account
							</button>
						</div>
					</div>
				</div>
			)}
		</AppShell>
	);
}

export async function getServerSideProps() {
	return {
		props: {},
	};
}
