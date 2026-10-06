import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { auth } from "@/firebase/firebase";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import AttachmentGrid from "@/components/AttachmentViewer/AttachmentGrid";
import BeastCodeSelect from "../UI/BeastCodeSelect";
import {
	FaUserShield,
	FaBan,
	FaUndo,
	FaTrash,
	FaSignOutAlt,
	FaHistory,
	FaSearch,
	FaFilter,
	FaEllipsisV,
	FaChevronLeft,
	FaTimes,
	FaSpinner,
	FaCheck,
	FaExclamationTriangle,
	FaFileAlt
} from "react-icons/fa";

interface UserListItem {
	uid: string;
	email: string;
	displayName: string;
	role: string;
	status: "ACTIVE" | "BANNED" | "DELETED" | "PENDING_DELETION" | "APPEALED";
	bannedReason?: string;
	bannedDuration?: string;
	bannedAt?: number;
	expiresAt?: number | null;
	deleteAfter?: number;
	appealDeadline?: number;
	solvedCount: number;
	score: number;
	createdAt: number;
	username: string;
	warningCount?: number;
}

interface AuditLogItem {
	id: string;
	adminUid: string;
	adminName: string;
	targetUid: string;
	targetName: string;
	action: string;
	timestamp: number;
	reason: string;
	duration: string;
	ip: string;
	oldState: string;
	newState: string;
	notes: string;
}

interface UserReport {
	id: string;
	reporterUid: string;
	reporterName: string;
	targetUid: string;
	targetName: string;
	reason: string;
	description: string;
	evidenceUrls: string[];
	status: "OPEN" | "REVIEWING" | "MERGED" | "DISMISSED" | "RESOLVED";
	assignedModerator: string | null;
	priority: "LOW" | "MEDIUM" | "HIGH";
	timestamp: number;
	notes: string;
	resolution: string;
}

interface ModerationAppeal {
	id: string;
	targetUid: string;
	targetName: string;
	referenceId: string;
	appealMessage: string;
	evidenceUrls: string[];
	status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
	timestamp: number;
	adminUid: string | null;
	adminNotes: string;
}

interface ModerationTabProps {
	triggerStatusMessage: (type: "success" | "error" | "info", msg: string) => void;
}

export const ModerationTab: React.FC<ModerationTabProps> = ({ triggerStatusMessage }) => {
	const [activeTab, setActiveTab] = useState<"users" | "reports" | "appeals" | "logs">("users");

	// Users Tab States
	const [users, setUsers] = useState<UserListItem[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const searchReqIdRef = useRef(0);
	const [roleFilter, setRoleFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState("desc");

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search.trim());
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	// Reports Tab States
	const [reports, setReports] = useState<UserReport[]>([]);
	const [loadingReports, setLoadingReports] = useState(false);
	const [reportStatusFilter, setReportStatusFilter] = useState("");
	const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
	const [reportActionNotes, setReportActionNotes] = useState("");
	const [mergeTargetReportId, setMergeTargetReportId] = useState("");

	// Appeals Tab States
	const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
	const [loadingAppeals, setLoadingAppeals] = useState(false);
	const [appealStatusFilter, setAppealStatusFilter] = useState("PENDING");
	const [selectedAppeal, setSelectedAppeal] = useState<ModerationAppeal | null>(null);
	const [appealActionNotes, setAppealActionNotes] = useState("");

	// Logs Tab States
	const [logs, setLogs] = useState<AuditLogItem[]>([]);
	const [loadingLogs, setLoadingLogs] = useState(false);

	const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Modal States
	const [modalUser, setModalUser] = useState<UserListItem | null>(null);
	
	// Suspend Modal
	const [showSuspendModal, setShowSuspendModal] = useState(false);
	const [suspendDuration, setSuspendDuration] = useState("1 day");
	const [suspendReason, setSuspendReason] = useState("Spam");
	const [suspendNotes, setSuspendNotes] = useState("");
	const [submittingSuspend, setSubmittingSuspend] = useState(false);

	// Unsuspend Modal
	const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
	const [unsuspendReason, setUnsuspendReason] = useState("Appeal accepted");
	const [unsuspendNotes, setUnsuspendNotes] = useState("");
	const [submittingUnsuspend, setSubmittingUnsuspend] = useState(false);

	// Delete Modal
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [deleteReason, setDeleteReason] = useState("Request by user");
	const [deleteNotes, setDeleteNotes] = useState("");
	const [forceImmediate, setForceImmediate] = useState(false);
	const [submittingDelete, setSubmittingDelete] = useState(false);

	// Cancel Deletion Modal
	const [showCancelDeleteModal, setShowCancelDeleteModal] = useState(false);
	const [cancelDeleteReason, setCancelDeleteReason] = useState("User submitted valid appeal");
	const [submittingCancelDelete, setSubmittingCancelDelete] = useState(false);

	// Warn Modal
	const [showWarnModal, setShowWarnModal] = useState(false);
	const [warnReason, setWarnReason] = useState("Cheating");
	const [warnDesc, setWarnDesc] = useState("");
	const [warnSeverity, setWarnSeverity] = useState("LOW");
	const [submittingWarn, setSubmittingWarn] = useState(false);

	// Close context menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setActiveMenuUserId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Run background deletions sweep silently
	useEffect(() => {
		const triggerSweep = async () => {
			try {
				const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
				await fetch("/api/admin/moderation/process-deletions", {
					method: "POST",
					headers: {
						"Authorization": `Bearer ${idToken}`
					}
				});
			} catch (e) {}
		};
		triggerSweep();
	}, []);

	// Fetch lists
	const fetchUsers = useCallback(async () => {
		setLoadingUsers(true);
		const reqId = ++searchReqIdRef.current;
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const params = new URLSearchParams({
				search: debouncedSearch,
				role: roleFilter,
				status: statusFilter,
				sortBy,
				sortOrder
			});
			const res = await fetch(`/api/admin/users?${params.toString()}`, {
				headers: { "Authorization": `Bearer ${idToken}` }
			});
			if (!res.ok) throw new Error("Failed to fetch users");
			const data = await res.json();
			if (reqId === searchReqIdRef.current) {
				setUsers(data.users || []);
			}
		} catch (error: any) {
			if (reqId === searchReqIdRef.current) {
				triggerStatusMessage("error", getFriendlyErrorMessage(error, "Failed to load users."));
			}
		} finally {
			if (reqId === searchReqIdRef.current) {
				setLoadingUsers(false);
			}
		}
	}, [debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder, triggerStatusMessage]);

	const fetchReports = useCallback(async () => {
		setLoadingReports(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const params = new URLSearchParams();
			if (reportStatusFilter) params.append("status", reportStatusFilter);
			
			const res = await fetch(`/api/admin/moderation/reports?${params.toString()}`, {
				headers: { "Authorization": `Bearer ${idToken}` }
			});
			if (!res.ok) throw new Error("Failed to fetch reports");
			const data = await res.json();
			setReports(data.reports || []);
		} catch (error: any) {
			triggerStatusMessage("error", "Failed to load reports.");
		} finally {
			setLoadingReports(false);
		}
	}, [reportStatusFilter, triggerStatusMessage]);

	const fetchAppeals = useCallback(async () => {
		setLoadingAppeals(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/appeals", {
				headers: { "Authorization": `Bearer ${idToken}` }
			});
			if (!res.ok) throw new Error("Failed to fetch appeals");
			const data = await res.json();
			setAppeals(data.appeals || []);
		} catch (error: any) {
			triggerStatusMessage("error", "Failed to load appeals.");
		} finally {
			setLoadingAppeals(false);
		}
	}, [triggerStatusMessage]);

	const fetchLogs = useCallback(async () => {
		setLoadingLogs(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/logs", {
				headers: { "Authorization": `Bearer ${idToken}` }
			});
			if (!res.ok) throw new Error("Failed to fetch logs");
			const data = await res.json();
			setLogs(data.logs || []);
		} catch (error: any) {
			triggerStatusMessage("error", getFriendlyErrorMessage(error, "Failed to load logs."));
		} finally {
			setLoadingLogs(false);
		}
	}, [triggerStatusMessage]);

	useEffect(() => {
		if (activeTab === "users") fetchUsers();
		else if (activeTab === "reports") fetchReports();
		else if (activeTab === "appeals") fetchAppeals();
		else if (activeTab === "logs") fetchLogs();
	}, [activeTab, fetchUsers, fetchReports, fetchAppeals, fetchLogs]);

	// Suspend handler
	const handleSuspend = async () => {
		if (!modalUser) return;
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
					targetUid: modalUser.uid,
					reason: suspendReason,
					duration: suspendDuration,
					notes: suspendNotes
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to suspend user");

			triggerStatusMessage("success", `Suspended ${modalUser.displayName || modalUser.email} successfully.`);
			const suspendedUid = modalUser.uid;
			setUsers((prev) =>
				prev.map((u) =>
					u.uid === suspendedUid
						? {
								...u,
								status: "BANNED",
								bannedReason: suspendReason,
								bannedDuration: suspendDuration,
						  }
						: u
				)
			);
			setShowSuspendModal(false);
			setModalUser(null);
			setSuspendNotes("");
		} catch (error: any) {
			triggerStatusMessage("error", error.message);
		} finally {
			setSubmittingSuspend(false);
		}
	};

	// Unsuspend handler
	const handleUnsuspend = async () => {
		if (!modalUser) return;
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
					targetUid: modalUser.uid,
					reason: unsuspendReason,
					notes: unsuspendNotes
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to lift suspension");

			triggerStatusMessage("success", `Unsuspended ${modalUser.displayName || modalUser.email} successfully.`);
			const unsuspendedUid = modalUser.uid;
			setUsers((prev) =>
				prev.map((u) =>
					u.uid === unsuspendedUid
						? {
								...u,
								status: "ACTIVE",
								bannedReason: undefined,
								bannedDuration: undefined,
						  }
						: u
				)
			);
			setShowUnsuspendModal(false);
			setModalUser(null);
			setUnsuspendNotes("");
		} catch (error: any) {
			triggerStatusMessage("error", error.message);
		} finally {
			setSubmittingUnsuspend(false);
		}
	};

	// Warn handler
	const handleWarnSubmit = async () => {
		if (!modalUser || !warnDesc.trim()) return;
		setSubmittingWarn(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/warn", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: modalUser.uid,
					reason: warnReason,
					description: warnDesc,
					severity: warnSeverity
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to warn user");

			triggerStatusMessage("success", `Warning issued. Active count: ${data.totalCount || 1}`);
			const warnedUid = modalUser.uid;
			setUsers((prev) =>
				prev.map((u) =>
					u.uid === warnedUid
						? {
								...u,
								warningCount: data.totalCount || (u.warningCount || 0) + 1,
						  }
						: u
				)
			);
			setShowWarnModal(false);
			setModalUser(null);
			setWarnDesc("");
		} catch (error: any) {
			triggerStatusMessage("error", error.message);
		} finally {
			setSubmittingWarn(false);
		}
	};

	// Deletion handler
	const handleDeleteUser = async () => {
		if (!modalUser || deleteConfirmText !== "DELETE") return;
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
					targetUid: modalUser.uid,
					reason: deleteReason,
					notes: deleteNotes,
					forceImmediate
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to schedule/delete user");

			triggerStatusMessage("success", forceImmediate ? `Permanently deleted user account.` : `Account scheduled for deletion.`);
			const deletedUid = modalUser.uid;
			setUsers((prev) =>
				forceImmediate
					? prev.filter((u) => u.uid !== deletedUid)
					: prev.map((u) =>
							u.uid === deletedUid
								? {
										...u,
										status: "PENDING_DELETION" as const,
										deleteAfter: Date.now() + 30 * 24 * 60 * 60 * 1000,
								  }
								: u
					  )
			);
			setShowDeleteModal(false);
			setModalUser(null);
			setDeleteConfirmText("");
			setDeleteNotes("");
			setForceImmediate(false);
		} catch (error: any) {
			triggerStatusMessage("error", error.message);
		} finally {
			setSubmittingDelete(false);
		}
	};

	// Cancel scheduled deletion handler
	const handleCancelDelete = async () => {
		if (!modalUser) return;
		setSubmittingCancelDelete(true);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/cancel-delete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: modalUser.uid,
					reason: cancelDeleteReason
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to cancel scheduled deletion");

			triggerStatusMessage("success", `Scheduled deletion cancelled. Account reinstated to ACTIVE.`);
			const restoredUid = modalUser.uid;
			setUsers((prev) =>
				prev.map((u) =>
					u.uid === restoredUid
						? {
								...u,
								status: "ACTIVE" as const,
								deleteAfter: undefined,
						  }
						: u
				)
			);
			setShowCancelDeleteModal(false);
			setModalUser(null);
		} catch (error: any) {
			triggerStatusMessage("error", error.message);
		} finally {
			setSubmittingCancelDelete(false);
		}
	};

	// Force Logout
	const handleForceLogout = async (userItem: UserListItem) => {
		setActiveMenuUserId(null);
		triggerStatusMessage("info", `Revoking sessions for ${userItem.displayName || userItem.email}...`);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/ban", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: userItem.uid,
					reason: "Admin session revocation",
					duration: "1 day",
					notes: "Force logout session request"
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
					targetUid: userItem.uid,
					reason: "Session revoked, lifting lock for fresh login"
				})
			});

			triggerStatusMessage("success", `Logged out user everywhere.`);
		} catch (error: any) {
			triggerStatusMessage("error", "Failed to force logout user.");
		}
	};

	// Report Action Processing
	const handleReportAction = async (action: "assign" | "escalate" | "merge" | "dismiss") => {
		if (!selectedReport) return;
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const payload: any = {
				reportId: selectedReport.id,
				action,
				notes: reportActionNotes
			};

			if (action === "assign") {
				payload.moderatorUid = auth.currentUser?.uid;
			}
			if (action === "merge") {
				payload.targetReportId = mergeTargetReportId;
			}

			const res = await fetch("/api/admin/moderation/reports", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Action failed");

			triggerStatusMessage("success", `Action ${action} completed successfully.`);
			const targetReportId = selectedReport.id;
			setReports((prev) =>
				prev.map((r) => {
					if (r.id !== targetReportId) return r;
					let newStatus: any = r.status;
					if (action === "assign" || action === "escalate") newStatus = "REVIEWING";
					else if (action === "merge") newStatus = "MERGED";
					else if (action === "dismiss") newStatus = "DISMISSED";
					return {
						...r,
						status: newStatus,
						assignedModerator: action === "assign" ? (auth.currentUser?.email || "You") : r.assignedModerator,
						notes: reportActionNotes || r.notes,
					};
				})
			);
			setSelectedReport(null);
			setReportActionNotes("");
			setMergeTargetReportId("");
		} catch (err: any) {
			triggerStatusMessage("error", err.message);
		}
	};

	// Appeal Action Processing
	const handleAppealAction = async (action: "approve" | "reject" | "request_info") => {
		if (!selectedAppeal) return;
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/admin/moderation/appeals", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					appealId: selectedAppeal.id,
					action,
					notes: appealActionNotes
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to process appeal action");

			triggerStatusMessage("success", `Appeal status updated to: ${action}`);
			const targetAppealId = selectedAppeal.id;
			setAppeals((prev) =>
				prev.map((a) => {
					if (a.id !== targetAppealId) return a;
					const newStatus =
						action === "approve"
							? "APPROVED"
							: action === "reject"
							? "REJECTED"
							: "UNDER_REVIEW";
					return {
						...a,
						status: newStatus as any,
						adminNotes: appealActionNotes || a.adminNotes,
					};
				})
			);
			setSelectedAppeal(null);
			setAppealActionNotes("");
		} catch (err: any) {
			triggerStatusMessage("error", err.message);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Top Panel Header */}
			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
				<div>
					<h2 className="text-base font-bold text-[var(--text-primary)]">Trust & Safety Panel</h2>
					<p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
						Process platform reports, user warnings, security logs, appeals, and scheduled accounts deletion lifecycles.
					</p>
				</div>

				{/* Navigation tabs */}
				<div className="bg-[var(--bg-dark-fill-3)] p-1 rounded-xl border border-[var(--border-subtle)] flex shadow-inner flex-wrap gap-1">
					{[
						{ id: "users", label: "User Directory" },
						{ id: "reports", label: `Reports Queue (${reports.filter((r) => r.status === "OPEN").length})` },
						{ id: "appeals", label: `Appeals Queue (${appeals.filter((a) => a.status === "PENDING").length})` },
						{ id: "logs", label: "Security Logs" }
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => {
								setActiveTab(tab.id as any);
								setSelectedReport(null);
								setSelectedAppeal(null);
							}}
							className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition duration-250 ${
								activeTab === tab.id
									? "bg-[var(--brand-orange)] text-white shadow"
									: "text-[var(--text-muted)] hover:text-white"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Contents */}
			{activeTab === "users" && (
				<div className="space-y-4">
					{/* Search Filters */}
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm select-none">
						<div className="relative md:col-span-2">
							<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)] pointer-events-none">
								<FaSearch size={11} />
							</span>
							<input
								type="text"
								placeholder="Search accounts by displayName, username, email or UID..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-[var(--brand-orange)] text-xs rounded-xl pl-9 pr-4 py-2 text-[var(--text-primary)] outline-none transition"
							/>
						</div>

						<div className="flex items-center gap-2">
							<span className="text-[var(--text-muted)] text-[10px] font-bold uppercase shrink-0"><FaFilter size={8} /> Role:</span>
							<BeastCodeSelect
								options={[
									{ value: "", label: "All Roles" },
									{ value: "admin", label: "Admin" },
									{ value: "user", label: "User" }
								]}
								value={roleFilter}
								onChange={(val) => setRoleFilter(val)}
								size="sm"
								className="flex-1 min-w-[120px]"
							/>
						</div>

						<div className="flex items-center gap-2">
							<span className="text-[var(--text-muted)] text-[10px] font-bold uppercase shrink-0"><FaFilter size={8} /> Status:</span>
							<BeastCodeSelect
								options={[
									{ value: "", label: "All States" },
									{ value: "ACTIVE", label: "Active" },
									{ value: "BANNED", label: "Banned" },
									{ value: "PENDING_DELETION", label: "Pending Deletion" },
									{ value: "APPEALED", label: "Appealed" }
								]}
								value={statusFilter}
								onChange={(val) => setStatusFilter(val)}
								size="sm"
								className="flex-1 min-w-[140px]"
							/>
						</div>
					</div>

					{/* Table container */}
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-sm">
						{loadingUsers ? (
							<div className="flex flex-col justify-center items-center py-20 gap-3">
								<FaSpinner className="animate-spin text-[var(--brand-orange)]" size={24} />
								<p className="text-[10px] text-[var(--text-muted)] font-mono">Syncing accounts...</p>
							</div>
						) : users.length === 0 ? (
							<div className="text-center py-16 text-[var(--text-muted)] text-xs select-none">
								No user profiles match the active filter criteria.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs text-[var(--text-secondary)]">
									<thead className="bg-[var(--bg-dark-fill-3)]/50 border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider select-none">
										<tr>
											<th className="px-6 py-3.5">User Profile</th>
											<th className="px-6 py-3.5 w-24">Role</th>
											<th className="px-6 py-3.5 w-36">Status</th>
											<th className="px-6 py-3.5 w-24">XP Score</th>
											<th className="px-6 py-3.5 w-28">Registered</th>
											<th className="px-6 py-3.5 w-16 text-right">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--border-subtle)]">
										{users.map((userItem) => (
											<tr key={userItem.uid} className="hover:bg-[var(--bg-hover)] transition">
												<td className="px-6 py-3.5">
													<div className="flex items-center gap-3">
														<div className="w-7 h-7 rounded-full bg-[var(--brand-glow)] text-[var(--brand-orange)] font-black border border-[var(--brand-orange)]/15 flex items-center justify-center text-xs shrink-0 select-none">
															{(userItem.displayName || userItem.email || "A")[0].toUpperCase()}
														</div>
														<div className="select-text">
															<div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
																{userItem.displayName || "Anonymous"}
																<span className="text-[9px] text-[var(--text-muted)] font-mono">@{userItem.username || "unset"}</span>
															</div>
															<div className="text-[10px] text-[var(--text-muted)]">{userItem.email}</div>
															<div className="text-[8px] text-[var(--text-muted)] font-mono mt-0.5">UID: {userItem.uid}</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-3.5">
													<span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border capitalize select-none ${
														userItem.role === "admin"
															? "bg-indigo-950/20 text-indigo-400 border-indigo-900/35"
															: "bg-[var(--bg-dark-fill-3)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
													}`}>
														{userItem.role}
													</span>
												</td>
												<td className="px-6 py-3.5">
													<span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border select-none ${
														userItem.status === "ACTIVE"
															? "bg-emerald-950/20 text-emerald-400 border-emerald-900/35"
															: userItem.status === "PENDING_DELETION"
															? "bg-amber-950/20 text-amber-500 border-amber-900/35 animate-pulse"
															: userItem.status === "APPEALED"
															? "bg-blue-950/20 text-blue-400 border-blue-900/35"
															: "bg-red-950/20 text-red-400 border-red-900/35"
													}`}>
														{userItem.status}
													</span>
													{userItem.status === "PENDING_DELETION" && userItem.deleteAfter && (
														<div className="text-[8px] text-[var(--text-muted)] mt-1 font-mono">
															Holds until: {new Date(userItem.deleteAfter).toLocaleDateString()}
														</div>
													)}
												</td>
												<td className="px-6 py-3.5 font-mono font-bold text-[var(--brand-orange)] select-text">
													{userItem.score} XP
												</td>
												<td className="px-6 py-3.5 text-[10px] text-[var(--text-muted)] select-none">
													{new Date(userItem.createdAt).toLocaleDateString()}
												</td>
												<td className="px-6 py-3.5 text-right relative select-none">
													<button
														onClick={() => setActiveMenuUserId(activeMenuUserId === userItem.uid ? null : userItem.uid)}
														className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] hover:text-white transition"
													>
														<FaEllipsisV size={11} />
													</button>

													{activeMenuUserId === userItem.uid && (
														<div
															ref={menuRef}
															className="absolute right-6 top-11 w-48 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl z-40 p-1.5 divide-y divide-[var(--border-subtle)] text-[10px] text-left"
														>
															<div className="pb-1.5 space-y-0.5">
																<Link
																	href={`/admin/users/${userItem.uid}`}
																	className="flex items-center gap-2 px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"
																>
																	<FaHistory size={10} />
																	<span>Audit Account details</span>
																</Link>
															</div>
															<div className="py-1.5 space-y-0.5">
																{userItem.status === "BANNED" ? (
																	<button
																		onClick={() => {
																			setActiveMenuUserId(null);
																			setModalUser(userItem);
																			setShowUnsuspendModal(true);
																		}}
																		className="w-full flex items-center gap-2 px-2.5 py-1.5 text-emerald-400 hover:bg-[var(--bg-hover)] rounded-lg transition text-left"
																	>
																		<FaUndo size={10} />
																		<span>Lift Suspension</span>
																	</button>
																) : (
																	<button
																		onClick={() => {
																			setActiveMenuUserId(null);
																			setModalUser(userItem);
																			setShowSuspendModal(true);
																		}}
																		className="w-full flex items-center gap-2 px-2.5 py-1.5 text-amber-500 hover:bg-[var(--bg-hover)] rounded-lg transition text-left"
																	>
																		<FaBan size={10} />
																		<span>Suspend Account</span>
																	</button>
																)}

																<button
																	onClick={() => {
																		setActiveMenuUserId(null);
																		setModalUser(userItem);
																		setShowWarnModal(true);
																	}}
																	className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition text-left"
																>
																	<FaExclamationTriangle className="text-yellow-500" size={10} />
																	<span>Issue Warning</span>
																</button>

																{userItem.status === "PENDING_DELETION" && (
																	<button
																		onClick={() => {
																			setActiveMenuUserId(null);
																			setModalUser(userItem);
																			setShowCancelDeleteModal(true);
																		}}
																		className="w-full flex items-center gap-2 px-2.5 py-1.5 text-emerald-400 hover:bg-[var(--bg-hover)] rounded-lg transition text-left font-bold"
																	>
																		<FaCheck size={10} />
																		<span>Restore (Cancel Deletion)</span>
																	</button>
																)}

																<button
																	onClick={() => handleForceLogout(userItem)}
																	className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition text-left"
																>
																	<FaSignOutAlt size={10} />
																	<span>Force Logout</span>
																</button>
															</div>
															<div className="pt-1.5">
																<button
																	onClick={() => {
																		setActiveMenuUserId(null);
																		setModalUser(userItem);
																		setShowDeleteModal(true);
																	}}
																	className="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition text-left font-bold"
																>
																	<FaTrash size={10} />
																	<span>Delete Account</span>
																</button>
															</div>
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === "reports" && (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Left Reports Queue List */}
					<div className="lg:col-span-6 space-y-4">
						<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex justify-between items-center gap-3 shadow-sm select-none">
							<span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Filter Status:</span>
							<BeastCodeSelect
								options={[
									{ value: "", label: "All Reports" },
									{ value: "OPEN", label: "Open" },
									{ value: "REVIEWING", label: "Reviewing" },
									{ value: "MERGED", label: "Merged" },
									{ value: "DISMISSED", label: "Dismissed" }
								]}
								value={reportStatusFilter}
								onChange={(val) => setReportStatusFilter(val)}
								size="sm"
								className="w-48"
							/>
						</div>

						{loadingReports ? (
							<div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
								<FaSpinner className="animate-spin text-[var(--brand-orange)] inline mr-2" />
								<span className="text-xs text-[var(--text-muted)]">Loading reports...</span>
							</div>
						) : reports.length === 0 ? (
							<div className="text-center py-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-muted)] text-xs">
								No reports logged in queue.
							</div>
						) : (
							reports.map((report) => (
								<div
									key={report.id}
									onClick={() => setSelectedReport(report)}
									className={`p-4 border rounded-xl cursor-pointer hover:border-[var(--border-accent)] transition shadow-sm ${
										selectedReport?.id === report.id
											? "bg-[var(--bg-dark-fill-3)] border-[var(--brand-orange)]/40"
											: "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
									}`}
								>
									<div className="flex justify-between items-start mb-2 select-none">
										<span className={`px-2 py-0.5 rounded text-[8px] font-black border ${
											report.priority === "HIGH" ? "bg-red-950/20 text-red-400 border-red-900/35" : "bg-[var(--bg-dark-fill-3)] text-[var(--text-muted)] border-[var(--border-subtle)]"
										}`}>
											{report.priority} PRIORITY
										</span>
										<span className="text-[9px] text-[var(--text-muted)] font-mono">
											{new Date(report.timestamp).toLocaleDateString()}
										</span>
									</div>
									<h4 className="font-bold text-xs text-[var(--text-primary)]">
										Report against: @{report.targetName}
									</h4>
									<p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-1 select-text">
										Reason: {report.reason} · {report.description}
									</p>
									<div className="flex justify-between items-center mt-3 pt-2 border-t border-[var(--border-subtle)] text-[9px] text-[var(--text-muted)] select-none">
										<span>Reporter: {report.reporterName}</span>
										<span className={`font-bold uppercase ${report.status === "OPEN" ? "text-yellow-500" : ""}`}>
											{report.status}
										</span>
									</div>
								</div>
							))
						)}
					</div>

					{/* Right Report Detail View */}
					<div className="lg:col-span-6">
						{selectedReport ? (
							<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6 shadow-sm animate-fade-in">
								<div className="border-b border-[var(--border-subtle)] pb-4 select-none">
									<h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
										<span>🚨</span> Report Case detail
									</h3>
									<p className="text-[9px] text-[var(--text-muted)] font-mono mt-1">ID: {selectedReport.id}</p>
								</div>

								<div className="grid grid-cols-2 gap-4 text-xs">
									<div>
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold select-none">Reporter</span>
										<span className="text-[var(--text-secondary)] font-bold select-text">{selectedReport.reporterName}</span>
										<span className="text-[9px] text-[var(--text-muted)] block font-mono select-text">UID: {selectedReport.reporterUid}</span>
									</div>
									<div>
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold select-none">Reported Target</span>
										<span className="text-[var(--text-secondary)] font-bold select-text">@{selectedReport.targetName}</span>
										<span className="text-[9px] text-[var(--text-muted)] block font-mono select-text">UID: {selectedReport.targetUid}</span>
									</div>
									<div className="col-span-2">
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold select-none">Violation Reason</span>
										<span className="text-red-400 font-black text-xs select-text">{selectedReport.reason}</span>
									</div>
									<div className="col-span-2">
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold mb-1 select-none">Details & Evidence Description</span>
										<p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] p-3 rounded-xl leading-relaxed select-text">
											{selectedReport.description}
										</p>
									</div>

									{selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
										<div className="col-span-2">
											<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold mb-2 select-none">Evidence Files</span>
											<AttachmentGrid
												files={selectedReport.evidenceUrls.map((url) => {
													let name = "Evidence File";
													if (url.includes("path=")) {
														const param = url.split("path=")[1]?.split("&")[0];
														name = param.split("/").pop() || "Evidence File";
													} else {
														name = url.split("/").pop() || "Evidence File";
													}
													return {
														url,
														name,
														uploadedBy: selectedReport.reporterName || "Reporter",
														uploadDate: selectedReport.timestamp,
													};
												})}
											/>
										</div>
									)}
								</div>

								{/* Action Processing Panel */}
								<div className="border-t border-[var(--border-subtle)] pt-5 space-y-4">
									<h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold select-none">Take Action</h4>
									
									<textarea
										value={reportActionNotes}
										onChange={(e) => setReportActionNotes(e.target.value)}
										placeholder="Write notes, dismissal explanations or merge details..."
										rows={2}
										className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-[var(--brand-orange)] text-xs rounded-xl p-3 text-[var(--text-primary)] outline-none resize-none transition"
									/>

									<div className="flex flex-wrap gap-2 select-none">
										<button
											onClick={() => handleReportAction("assign")}
											className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
										>
											Assign to Me
										</button>
										<button
											onClick={() => handleReportAction("escalate")}
											className="px-3.5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition"
										>
											Escalate Priority
										</button>
										<button
											onClick={() => handleReportAction("dismiss")}
											className="px-3.5 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-bold rounded-lg transition"
										>
											Dismiss Report
										</button>
									</div>

									{/* Merge Section */}
									<div className="bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-xl p-3 flex gap-2 items-center">
										<input
											type="text"
											placeholder="Target Report ID to merge into..."
											value={mergeTargetReportId}
											onChange={(e) => setMergeTargetReportId(e.target.value)}
											className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs rounded-lg px-2 py-1.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-orange)]"
										/>
										<button
											onClick={() => handleReportAction("merge")}
											disabled={!mergeTargetReportId.trim()}
											className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition"
										>
											Merge
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-8 text-center text-[var(--text-muted)] text-xs select-none">
								Select a report from the queue to view details and process.
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === "appeals" && (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Left Appeals Queue List */}
					<div className="lg:col-span-6 space-y-4">
						<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex justify-between items-center gap-3 shadow-sm select-none">
							<span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Filter Status:</span>
							<BeastCodeSelect
								options={[
									{ value: "PENDING", label: "Pending (Active)" },
									{ value: "APPROVED", label: "Approved" },
									{ value: "REJECTED", label: "Rejected" },
									{ value: "ALL", label: "All Appeals" }
								]}
								value={appealStatusFilter}
								onChange={(val) => setAppealStatusFilter(val)}
								size="sm"
								className="w-48"
							/>
						</div>

						{loadingAppeals ? (
							<div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
								<FaSpinner className="animate-spin text-[var(--brand-orange)] inline mr-2" />
								<span className="text-xs text-[var(--text-muted)]">Loading appeals...</span>
							</div>
						) : appeals.length === 0 ? (
							<div className="text-center py-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-muted)] text-xs">
								No appeals submitted in queue.
							</div>
						) : (
							(() => {
								const filtered = appeals.filter((a) => {
									if (appealStatusFilter === "ALL") return true;
									return a.status === appealStatusFilter;
								});
								if (filtered.length === 0) {
									return (
										<div className="text-center py-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-muted)] text-xs">
											No appeals match this filter.
										</div>
									);
								}
								return filtered.map((appeal) => (
									<div
										key={appeal.id}
										onClick={() => setSelectedAppeal(appeal)}
										className={`p-4 border rounded-xl cursor-pointer hover:border-[var(--border-accent)] transition shadow-sm ${
											selectedAppeal?.id === appeal.id
												? "bg-[var(--bg-dark-fill-3)] border-[var(--brand-orange)]/40"
												: "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
										}`}
									>
										<div className="flex justify-between items-start mb-2 select-none">
											<span className="text-[9px] text-[var(--text-muted)] font-mono">Ref ID: {appeal.referenceId}</span>
											<span className="text-[9px] text-[var(--text-muted)] font-mono">
												{new Date(appeal.timestamp).toLocaleDateString()}
											</span>
										</div>
										<h4 className="font-bold text-xs text-[var(--text-primary)]">
											User: {appeal.targetName}
										</h4>
										<p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 select-text">
											{appeal.appealMessage}
										</p>
										<div className={`flex justify-end items-center mt-3 pt-2 border-t border-[var(--border-subtle)] text-[9px] font-bold select-none ${
											appeal.status === "APPROVED" ? "text-emerald-500" :
											appeal.status === "REJECTED" ? "text-red-500" : "text-yellow-500"
										}`}>
											{appeal.status}
										</div>
									</div>
								));
							})()
						)}
					</div>

					{/* Right Appeal Detail View */}
					<div className="lg:col-span-6">
						{selectedAppeal ? (
							<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6 shadow-sm animate-fade-in">
								<div className="border-b border-[var(--border-subtle)] pb-4 select-none">
									<h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
										<span>📥</span> Appeal Review Case
									</h3>
									<p className="text-[9px] text-[var(--text-muted)] font-mono mt-1">Appeal ID: {selectedAppeal.id}</p>
								</div>

								<div className="grid grid-cols-2 gap-4 text-xs">
									<div>
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold select-none">Appellant</span>
										<span className="text-[var(--text-secondary)] font-bold select-text">{selectedAppeal.targetName}</span>
										<span className="text-[9px] text-[var(--text-muted)] block font-mono select-text">UID: {selectedAppeal.targetUid}</span>
									</div>
									<div>
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold select-none">Reference Case ID</span>
										<span className="text-[var(--brand-orange)] font-bold text-xs font-mono select-text">{selectedAppeal.referenceId}</span>
									</div>
									<div className="col-span-2">
										<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold mb-1 select-none">Appellant Message</span>
										<p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] p-3 rounded-xl leading-relaxed select-text">
											{selectedAppeal.appealMessage}
										</p>
									</div>

									{selectedAppeal.evidenceUrls && selectedAppeal.evidenceUrls.length > 0 && (
										<div className="col-span-2">
											<span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold mb-2 select-none">Appeal Attachments</span>
											<AttachmentGrid
												files={selectedAppeal.evidenceUrls.map((url) => {
													let name = "Attachment";
													if (url.includes("path=")) {
														const param = url.split("path=")[1]?.split("&")[0];
														name = param.split("/").pop() || "Attachment";
													} else {
														name = url.split("/").pop() || "Attachment";
													}
													return {
														url,
														name,
														uploadedBy: selectedAppeal.targetName || "Appellant",
														uploadDate: selectedAppeal.timestamp,
													};
												})}
											/>
										</div>
									)}
								</div>

								{/* Action Processing Panel */}
								{selectedAppeal.status === "PENDING" ? (
									<div className="border-t border-[var(--border-subtle)] pt-5 space-y-4">
										<h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold select-none">Decision Details</h4>
										
										<textarea
											value={appealActionNotes}
											onChange={(e) => setAppealActionNotes(e.target.value)}
											placeholder="Write reasons for approval, rejection or requesting details..."
											rows={3}
											className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-[var(--brand-orange)] text-xs rounded-xl p-3 text-[var(--text-primary)] outline-none resize-none transition"
										/>

										<div className="flex flex-wrap gap-2 select-none">
											<button
												onClick={() => handleAppealAction("approve")}
												className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
											>
												Approve & Restore User
											</button>
											<button
												onClick={() => handleAppealAction("reject")}
												className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
											>
												Reject Appeal
											</button>
											<button
												onClick={() => handleAppealAction("request_info")}
												className="px-4 py-2.5 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-bold rounded-lg transition"
											>
												Request Info
											</button>
										</div>
									</div>
								) : (
									<div className="border-t border-[var(--border-subtle)] pt-5 space-y-3">
										<h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold select-none">Case Status</h4>
										<div className={`p-4 rounded-xl border text-xs leading-relaxed ${
											selectedAppeal.status === "APPROVED"
												? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
												: "bg-red-950/20 border-red-500/30 text-red-400"
										}`}>
											<span className="font-bold block uppercase mb-1">
												Appeal Resolved: {selectedAppeal.status}
											</span>
											{selectedAppeal.adminNotes && (
												<p className="text-[var(--text-secondary)] mt-1.5 font-normal select-text">
													<strong>Resolution Notes:</strong> {selectedAppeal.adminNotes}
												</p>
											)}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-8 text-center text-[var(--text-muted)] text-xs select-none">
								Select an appeal from the queue to process.
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === "logs" && (
				<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-sm">
					{loadingLogs ? (
						<div className="flex flex-col justify-center items-center py-20 gap-3">
							<FaSpinner className="animate-spin text-[var(--brand-orange)]" size={24} />
							<p className="text-[10px] text-[var(--text-muted)] font-mono">Retrieving logs...</p>
						</div>
					) : logs.length === 0 ? (
						<div className="text-center py-20 text-[var(--text-muted)] text-xs select-none">
							No security logs recorded yet.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left font-mono text-[10px] text-[var(--text-secondary)]">
								<thead className="bg-[var(--bg-dark-fill-3)]/50 border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider select-none">
									<tr>
										<th className="px-6 py-4 w-44">Timestamp</th>
										<th className="px-6 py-4 w-40">Admin User</th>
										<th className="px-6 py-4 w-28">Action</th>
										<th className="px-6 py-4 w-52">Target Account</th>
										<th className="px-6 py-4">Reason / Notes</th>
										<th className="px-6 py-4 w-28">IP Address</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--border-subtle)]">
									{logs.map((log) => (
										<tr key={log.id} className="hover:bg-[var(--bg-hover)] transition">
											<td className="px-6 py-4 text-[var(--text-muted)] whitespace-nowrap">
												{new Date(log.timestamp).toLocaleString()}
											</td>
											<td className="px-6 py-4 text-[var(--text-primary)] font-sans font-bold whitespace-nowrap">
												{log.adminName || log.adminUid}
											</td>
											<td className="px-6 py-4">
												<span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
													log.action.includes("BAN")
														? "bg-red-950/20 text-red-405 border-red-900/35"
														: log.action.includes("UNBAN")
														? "bg-emerald-950/20 text-emerald-450 border-emerald-900/35"
														: log.action === "DELETE"
														? "bg-rose-950/20 text-rose-450 border-rose-900/35"
														: "bg-blue-950/20 text-blue-400 border-blue-900/35"
												}`}>
													{log.action}
												</span>
											</td>
											<td className="px-6 py-4 text-[var(--text-primary)] font-sans">
												<div>{log.targetName}</div>
												<div className="text-[9px] text-[var(--text-muted)] font-mono">UID: {log.targetUid}</div>
											</td>
											<td className="px-6 py-4 text-[var(--text-secondary)] font-sans max-w-[300px] break-words">
												<div>{log.reason} {log.duration && log.duration !== "N/A" && `(${log.duration})`}</div>
												{log.notes && <div className="text-[9px] text-[var(--text-muted)] italic mt-1 font-mono">{log.notes}</div>}
											</td>
											<td className="px-6 py-4 text-[var(--text-muted)] whitespace-nowrap">
												{log.ip}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* ==================== DRAWER MODALS SYSTEM ==================== */}

			{/* Suspend Modal */}
			{showSuspendModal && modalUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in select-none">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative">
						<button
							onClick={() => {
								setShowSuspendModal(false);
								setModalUser(null);
							}}
							className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition"
						>
							<FaTimes size={12} />
						</button>
						<h3 className="text-base font-black text-amber-500 mb-2 flex items-center gap-2">
							<FaBan /> Suspend User Account
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mb-6">
							Suspend access for <strong className="text-[var(--text-primary)]">@{modalUser.username}</strong> ({modalUser.email}).
						</p>

						<div className="space-y-4 mb-6 text-xs">
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Duration</label>
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
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Reason</label>
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
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Notes / Details</label>
								<textarea
									value={suspendNotes}
									onChange={(e) => setSuspendNotes(e.target.value)}
									placeholder="Provide additional details or audit notes..."
									rows={3}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-xs rounded-xl p-3 text-[var(--text-primary)] outline-none resize-none focus:border-[var(--brand-orange)]"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								onClick={() => {
									setShowSuspendModal(false);
									setModalUser(null);
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								onClick={handleSuspend}
								disabled={submittingSuspend}
								className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
							>
								{submittingSuspend ? <FaSpinner className="animate-spin" /> : <FaBan />}
								Confirm Suspension
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Unsuspend Modal */}
			{showUnsuspendModal && modalUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in select-none">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative">
						<button
							onClick={() => {
								setShowUnsuspendModal(false);
								setModalUser(null);
							}}
							className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition"
						>
							<FaTimes size={12} />
						</button>
						<h3 className="text-base font-black text-emerald-500 mb-2 flex items-center gap-2">
							<FaUndo /> Lift Account Suspension
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mb-6">
							Reinstate access for <strong className="text-[var(--text-primary)]">@{modalUser.username}</strong> ({modalUser.email}).
						</p>

						<div className="space-y-4 mb-6 text-xs">
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Unban Reason</label>
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
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Audit Notes</label>
								<textarea
									value={unsuspendNotes}
									onChange={(e) => setUnsuspendNotes(e.target.value)}
									placeholder="Provide additional details or audit notes..."
									rows={3}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-xs rounded-xl p-3 text-[var(--text-primary)] outline-none resize-none focus:border-[var(--brand-orange)]"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								onClick={() => {
									setShowUnsuspendModal(false);
									setModalUser(null);
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								onClick={handleUnsuspend}
								disabled={submittingUnsuspend}
								className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
							>
								{submittingUnsuspend ? <FaSpinner className="animate-spin" /> : <FaCheck />}
								Confirm Unban
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Warn User Modal */}
			{showWarnModal && modalUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in select-none">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative">
						<button
							onClick={() => {
								setShowWarnModal(false);
								setModalUser(null);
								setWarnDesc("");
							}}
							className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition"
						>
							<FaTimes size={12} />
						</button>
						<h3 className="text-base font-black text-yellow-500 mb-2 flex items-center gap-2">
							<FaExclamationTriangle /> Issue User Warning
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mb-6">
							Issue an official warnings strike to <strong className="text-[var(--text-primary)]">@{modalUser.username}</strong>.
						</p>

						<div className="space-y-4 mb-6 text-xs">
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Warning Reason</label>
								<BeastCodeSelect
									options={[
										{ value: "Cheating", label: "Cheating / Plagiarism (solutions copy)" },
										{ value: "Inappropriate Content", label: "Inappropriate profile/content details" },
										{ value: "Abusive Language", label: "Abusive or toxic posts/comments" },
										{ value: "Spamming", label: "Spamming / Flooding channels" }
									]}
									value={warnReason}
									onChange={(val) => setWarnReason(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Severity Tier</label>
								<BeastCodeSelect
									options={[
										{ value: "LOW", label: "Low (Reminder of community standards)" },
										{ value: "MEDIUM", label: "Medium (Formal warnings record)" },
										{ value: "SEVERE", label: "Severe (Triggers ban recommendations)" }
									]}
									value={warnSeverity}
									onChange={(val) => setWarnSeverity(val)}
									size="md"
								/>
							</div>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Description</label>
								<textarea
									value={warnDesc}
									onChange={(e) => setWarnDesc(e.target.value)}
									placeholder="Describe the violation in detail..."
									rows={3}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-xs rounded-xl p-3 text-[var(--text-primary)] outline-none resize-none focus:border-[var(--brand-orange)]"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								onClick={() => {
									setShowWarnModal(false);
									setModalUser(null);
									setWarnDesc("");
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								onClick={handleWarnSubmit}
								disabled={submittingWarn || !warnDesc.trim()}
								className="px-4 py-2 bg-yellow-600 hover:bg-yellow-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
							>
								{submittingWarn ? <FaSpinner className="animate-spin" /> : <FaExclamationTriangle />}
								Issue Warning
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete User Modal */}
			{showDeleteModal && modalUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
					<div className="bg-[var(--bg-surface)] border border-red-900/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative select-none">
						<button
							onClick={() => {
								setShowDeleteModal(false);
								setModalUser(null);
								setDeleteConfirmText("");
								setForceImmediate(false);
							}}
							className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition"
						>
							<FaTimes size={12} />
						</button>
						<h3 className="text-base font-black text-red-500 mb-2 flex items-center gap-2">
							<FaTrash /> Delete Account
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mb-4">
							Process account deletion for <strong className="text-[var(--text-primary)]">@{modalUser.username}</strong> ({modalUser.email}).
						</p>

						<div className="p-3 bg-red-950/20 border border-red-900/35 rounded-xl mb-4 text-[10px] text-red-400 leading-relaxed space-y-1">
							<p>⚠️ <strong>PENDING DELETION RULES:</strong> By default, this schedules the account for deletion in <strong>14 days</strong>. The user can file an appeal during this window. </p>
						</div>

						<div className="space-y-4 mb-6 text-xs">
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Reason for Deletion</label>
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
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Audit Notes</label>
								<textarea
									value={deleteNotes}
									onChange={(e) => setDeleteNotes(e.target.value)}
									placeholder="Provide additional details or audit notes..."
									rows={2}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-xs rounded-md p-3 text-[var(--text-primary)] outline-none resize-none focus:border-emerald-500"
								/>
							</div>

							<label className="flex gap-2.5 items-center cursor-pointer select-none border border-red-950/40 p-2.5 rounded bg-red-950/10">
								<input
									type="checkbox"
									checked={forceImmediate}
									onChange={(e) => setForceImmediate(e.target.checked)}
									className="accent-red-500"
								/>
								<span className="text-[9px] text-red-400 leading-tight font-bold">
									FORCE IMMEDIATE DELETION (Bypasses 14-day appeal hold)
								</span>
							</label>

							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)]">
									Type <strong className="text-red-500 font-mono">DELETE</strong> to confirm:
								</label>
								<input
									type="text"
									value={deleteConfirmText}
									onChange={(e) => setDeleteConfirmText(e.target.value)}
									placeholder="DELETE"
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] focus:border-emerald-500 text-xs rounded-md px-3 py-2 text-[var(--text-primary)] outline-none font-mono text-center tracking-widest"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								onClick={() => {
									setShowDeleteModal(false);
									setModalUser(null);
									setDeleteConfirmText("");
									setForceImmediate(false);
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-md text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteUser}
								disabled={deleteConfirmText !== "DELETE" || submittingDelete}
								className="px-4 py-2 bg-red-650 hover:bg-red-700 disabled:opacity-40 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5"
							>
								{submittingDelete ? <FaSpinner className="animate-spin" /> : <FaTrash />}
								Delete Account
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Cancel Deletion Modal */}
			{showCancelDeleteModal && modalUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in select-none">
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative">
						<button
							onClick={() => {
								setShowCancelDeleteModal(false);
								setModalUser(null);
							}}
							className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition"
						>
							<FaTimes size={12} />
						</button>
						<h3 className="text-base font-black text-emerald-500 mb-2 flex items-center gap-2">
							<FaCheck /> Cancel Scheduled Deletion
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mb-6">
							Cancel scheduled deletion of <strong className="text-[var(--text-primary)]">@{modalUser.username}</strong> and restore status to ACTIVE.
						</p>

						<div className="space-y-4 mb-6 text-xs">
							<div>
								<label className="text-[10px] font-bold block mb-1 text-[var(--text-muted)] uppercase tracking-wider">Cancellation Reason</label>
								<textarea
									value={cancelDeleteReason}
									onChange={(e) => setCancelDeleteReason(e.target.value)}
									placeholder="Provide reasoning for cancelling deletion..."
									rows={3}
									className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] text-xs rounded-md p-3 text-[var(--text-primary)] outline-none resize-none focus:border-emerald-500"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
							<button
								onClick={() => {
									setShowCancelDeleteModal(false);
									setModalUser(null);
								}}
								className="px-4 py-2 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-md text-xs font-bold transition"
							>
								Cancel
							</button>
							<button
								onClick={handleCancelDelete}
								disabled={submittingCancelDelete || !cancelDeleteReason.trim()}
								className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
							>
								{submittingCancelDelete ? <FaSpinner className="animate-spin" /> : <FaCheck />}
								Cancel Deletion & Restore
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
