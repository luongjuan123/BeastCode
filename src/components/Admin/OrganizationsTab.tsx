import React, { useEffect, useState, useMemo } from "react";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";
import {
	FaUsers,
	FaShieldAlt,
	FaGlobe,
	FaLock,
	FaEyeSlash,
	FaBan,
	FaExclamationTriangle,
	FaInfoCircle,
	FaCrown,
	FaChartBar,
	FaTrash,
	FaUndo,
	FaVolumeMute,
	FaPlus,
	FaTimes,
	FaEdit,
	FaChevronRight,
	FaSearch,
	FaSort,
	FaArrowRight,
	FaCheckCircle,
	FaFileAlt,
	FaTrophy,
	FaCode,
	FaBullhorn
} from "react-icons/fa";
import { FiX, FiCheck, FiSearch } from "react-icons/fi";
import { auth } from "@/firebase/firebase";
import BeastCodeSelect from "../UI/BeastCodeSelect";

function AppealCard({ appeal, resolveAppeal }: { appeal: any; resolveAppeal: (appealId: string, status: "Approved" | "Rejected", notes: string) => void }) {
	const [notes, setNotes] = useState("");
	return (
		<div className="bg-dark-surface border border-gray-850 rounded-lg p-5 space-y-4">
			<div className="flex justify-between items-start">
				<div>
					<h4 className="text-sm font-black text-white">
						{appeal.organizationName}
					</h4>
					<span className="text-[10px] text-gray-500 font-mono block">
						id: {appeal.organizationId}
					</span>
				</div>

				<span
					className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
						appeal.status === "Pending"
							? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
							: appeal.status === "Approved"
							? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
							: "bg-red-500/10 text-red-400 border-red-500/20"
					}`}
				>
					{appeal.status}
				</span>
			</div>

			<div className="bg-dark-layer-1 border border-gray-800 rounded-md p-3 text-xs space-y-2">
				<p className="text-gray-400">
					<strong className="text-gray-200">Owner Username:</strong> @{appeal.ownerUsername}
				</p>
				<p className="text-gray-400">
					<strong className="text-gray-200">Appeal Statement:</strong> {appeal.reason}
				</p>
				{appeal.evidence && (
					<p className="text-gray-400">
						<strong className="text-gray-200">Evidence/Details:</strong> {appeal.evidence}
					</p>
				)}
				{appeal.contactEmail && (
					<p className="text-gray-400">
						<strong className="text-gray-200">Contact Email:</strong> {appeal.contactEmail}
					</p>
				)}
			</div>

			{appeal.status === "Pending" && (
				<div className="space-y-3">
					<textarea
						aria-label="Moderator decision notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
						rows={2}
					/>
					<div className="flex gap-2 justify-end">
						<button
							onClick={() => resolveAppeal(appeal.id, "Rejected", notes)}
							className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-lg border border-red-500/20 transition"
						>
							Reject Appeal
						</button>
						<button
							onClick={() => resolveAppeal(appeal.id, "Approved", notes)}
							className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg border border-emerald-500/20 transition"
						>
							Approve & Restore
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export function OrganizationsTab({ triggerStatusMessage }: { triggerStatusMessage: (type: "success" | "error" | "info", msg: string) => void }) {
	// Sub-tabs: directory | reports | appeals | audit-logs
	const [subTab, setSubTab] = useState<"directory" | "reports" | "appeals" | "audit-logs">("directory");

	// Directory State
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [loadingOrgs, setLoadingOrgs] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [visibilityFilter, setVisibilityFilter] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);

	// Multi-select
	const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

	// Reports State
	const [reports, setReports] = useState<any[]>([]);
	const [loadingReports, setLoadingReports] = useState(false);

	// Appeals State
	const [appeals, setAppeals] = useState<any[]>([]);
	const [loadingAppeals, setLoadingAppeals] = useState(false);

	// Modals Staging
	const [activeModal, setActiveModal] = useState<
		| null
		| "details"
		| "edit"
		| "transfer"
		| "warning"
		| "suspend"
		| "ban"
		| "restrict"
		| "delete"
		| "announcement"
		| "bulk_warn"
		| "bulk_suspend"
		| "bulk_ban"
		| "bulk_announcement"
	>(null);

	const [targetOrg, setTargetOrg] = useState<any>(null);

	// Form Inputs
	const [editForm, setEditForm] = useState({
		displayName: "",
		description: "",
		visibility: "public",
		country: "",
		university: "",
		company: ""
	});
	const [newOwnerUid, setNewOwnerUid] = useState("");
	const [warningForm, setWarningForm] = useState({
		reason: "Policy Violation",
		category: "spam",
		severity: "medium",
		description: "",
		expiresDays: 30
	});
	const [suspendForm, setSuspendForm] = useState({
		reason: "Investigating abusive behavior",
		durationDays: 7
	});
	const [banForm, setBanForm] = useState({
		reason: "Severe and repeated terms of service violations."
	});
	const [restrictFeatures, setRestrictFeatures] = useState<string[]>([]);
	const [announcementForm, setAnnouncementForm] = useState({
		title: "",
		content: ""
	});

	// Fetch Stats/Overview counts
	const stats = useMemo(() => {
		const orgsList = Array.isArray(organizations) ? organizations : [];
		const reportsList = Array.isArray(reports) ? reports : [];
		const appealsList = Array.isArray(appeals) ? appeals : [];

		const total = orgsList.length;
		const active = orgsList.filter((o) => o?.status === "active").length;
		const suspended = orgsList.filter((o) => o?.status === "suspended").length;
		const banned = orgsList.filter((o) => o?.status === "banned").length;
		const reportsCount = reportsList.filter((r) => r?.status === "pending").length;
		const appealsCount = appealsList.filter((a) => a?.status === "Pending").length;
		return { total, active, suspended, banned, reportsCount, appealsCount };
	}, [organizations, reports, appeals]);

	// Fetch functions
	const fetchOrganizations = async () => {
		setLoadingOrgs(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(
				`/api/admin/organizations?search=${encodeURIComponent(
					searchQuery
				)}&status=${statusFilter}&visibility=${visibilityFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=25`,
				{
					headers: { Authorization: `Bearer ${token}` }
				}
			);
			const data = await res.json();
			if (data.success) {
				setOrganizations(data.organizations);
				setTotalPages(data.totalPages);
				setTotalCount(data.totalCount);
			} else {
				triggerStatusMessage("error", data.error || "Failed to load organizations.");
			}
		} catch (err) {
			console.error("fetchOrganizations error:", err);
			triggerStatusMessage("error", "Error contacting server.");
		} finally {
			setLoadingOrgs(false);
		}
	};

	const fetchReports = async () => {
		setLoadingReports(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations/reports`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const data = await res.json();
			if (data.success) {
				setReports(data.reports);
			}
		} catch (err) {
			console.error("fetchReports error:", err);
		} finally {
			setLoadingReports(false);
		}
	};

	const fetchAppeals = async () => {
		setLoadingAppeals(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations/appeals`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const data = await res.json();
			if (data.success) {
				setAppeals(data.appeals);
			}
		} catch (err) {
			console.error("fetchAppeals error:", err);
		} finally {
			setLoadingAppeals(false);
		}
	};

	useEffect(() => {
		fetchOrganizations();
		fetchReports();
		fetchAppeals();
	}, [searchQuery, statusFilter, visibilityFilter, sortBy, sortOrder, page]);

	// Actions execution handlers
	const handleAction = async (actionName: string, orgId: string, payload: any) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations/moderation`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ orgId, action: actionName, payload })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Action "${actionName}" applied successfully.`);
				setActiveModal(null);
				fetchOrganizations();
			} else {
				triggerStatusMessage("error", data.error || "Action execution failed.");
			}
		} catch (err) {
			triggerStatusMessage("error", "Error executing action.");
		}
	};

	const handleBulkAction = async (actionName: string, payload: any) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ action: actionName, orgIds: selectedOrgIds, payload })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Bulk action "${actionName}" finished.`);
				setSelectedOrgIds([]);
				setActiveModal(null);
				fetchOrganizations();
			} else {
				triggerStatusMessage("error", data.error || "Bulk action failed.");
			}
		} catch (err) {
			triggerStatusMessage("error", "Error executing bulk action.");
		}
	};

	const resolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations/reports`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ reportId, status })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Report marked as ${status}.`);
				fetchReports();
			}
		} catch (err) {
			triggerStatusMessage("error", "Failed to resolve report.");
		}
	};

	const resolveAppeal = async (appealId: string, status: "Approved" | "Rejected", notes: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			const res = await fetch(`/api/admin/organizations/appeals`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ appealId, status, moderatorNotes: notes })
			});
			const data = await res.json();
			if (data.success) {
				triggerStatusMessage("success", `Appeal marked as ${status}.`);
				fetchAppeals();
				fetchOrganizations();
			}
		} catch (err) {
			triggerStatusMessage("error", "Failed to resolve appeal.");
		}
	};

	const exportBackup = (org: any) => {
		const blob = new Blob([JSON.stringify(org, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `backup-org-${org.slug || org.id}-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		triggerStatusMessage("success", "Backup configuration generated.");
	};

	// Open Modals helper
	const openModal = (type: any, org: any) => {
		setTargetOrg(org);
		if (type === "edit") {
			setEditForm({
				displayName: org.displayName || org.name,
				description: org.description || "",
				visibility: org.visibility || "public",
				country: org.country || "",
				university: org.university || "",
				company: org.company || ""
			});
		} else if (type === "restrict") {
			setRestrictFeatures(org.restrictedFeatures || []);
		}
		setActiveModal(type);
	};

	return (
		<div className="space-y-6">
			{/* Sub-tabs header switcher */}
			<div className="flex justify-between items-center bg-dark-surface border border-gray-850 p-2 rounded-lg">
				<div className="flex gap-1">
					{[
						{ id: "directory", label: "Directory Explore" },
						{ id: "reports", label: `Reports (${stats.reportsCount})` },
						{ id: "appeals", label: `Appeals (${stats.appealsCount})` }
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setSubTab(tab.id as any)}
							className={`px-4 py-2 text-xs font-bold rounded-md transition ${
								subTab === tab.id
									? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
									: "text-gray-400 hover:text-white"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-3">
					Total Orgs: {stats.total}
				</div>
			</div>

			{/* Sub Tab: Directory */}
			{subTab === "directory" && (
				<div className="space-y-5">
					{/* Search, filters, bulk options */}
					<div className="flex flex-wrap gap-4 items-center justify-between bg-dark-surface border border-gray-850 p-4 rounded-lg">
						<div className="flex flex-wrap gap-3 items-center flex-1 min-w-[300px]">
							<div className="relative flex-1 max-w-[300px]">
								<FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
								<input
									type="text"
									aria-label="Search organizations by name, UID, or owner"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md pl-9 pr-4 py-2.5 outline-none focus:border-emerald-500 transition"
								/>
							</div>

							<BeastCodeSelect
								options={[
									{ value: "", label: "All Statuses" },
									{ value: "active", label: "Active" },
									{ value: "suspended", label: "Suspended" },
									{ value: "banned", label: "Banned" },
									{ value: "deleted", label: "Deleted" },
									{ value: "archived", label: "Archived" }
								]}
								value={statusFilter}
								onChange={(val) => setStatusFilter(val)}
								size="sm"
								className="w-40"
							/>

							<BeastCodeSelect
								options={[
									{ value: "", label: "All Visibilities" },
									{ value: "public", label: "Public" },
									{ value: "private", label: "Private" },
									{ value: "secret", label: "Secret" }
								]}
								value={visibilityFilter}
								onChange={(val) => setVisibilityFilter(val)}
								size="sm"
								className="w-40"
							/>
						</div>

						{/* Bulk Operations */}
						{selectedOrgIds.length > 0 && (
							<div className="flex gap-2 items-center bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2 animate-fade-in">
								<span className="text-[10px] text-emerald-500 font-bold mr-2">
									{selectedOrgIds.length} Selected
								</span>
								<button
									onClick={() => openModal("bulk_warn", null)}
									className="px-2.5 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-[10px] font-bold rounded-lg border border-yellow-500/20 transition"
								>
									Warn
								</button>
								<button
									onClick={() => openModal("bulk_suspend", null)}
									className="px-2.5 py-1.5 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 text-[10px] font-bold rounded-lg border border-orange-500/20 transition"
								>
									Suspend
								</button>
								<button
									onClick={() => openModal("bulk_ban", null)}
									className="px-2.5 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-bold rounded-lg border border-red-500/20 transition"
								>
									Ban
								</button>
								<button
									onClick={() => handleBulkAction("delete", {})}
									className="px-2.5 py-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 text-[10px] font-bold rounded-lg border border-gray-500/20 transition"
								>
									Soft Delete
								</button>
								<button
									onClick={() => {
										if (
											confirm(
												`DANGER: Are you absolutely sure you want to PERMANENTLY delete all ${selectedOrgIds.length} selected organizations and all associated data? This action CANNOT be undone!`
											)
										) {
											handleBulkAction("permanent_delete", {});
										}
									}}
									className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 text-[10px] font-bold rounded-lg border border-rose-900/40 transition flex items-center gap-1"
								>
									<FaTrash size={9} /> Permanent Delete
								</button>
								<button
									onClick={() => openModal("bulk_announcement", null)}
									className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition flex items-center gap-1"
								>
									<FaBullhorn size={9} /> Announce
								</button>
								<button
									onClick={() => setSelectedOrgIds([])}
									className="text-gray-400 hover:text-white px-1.5"
								>
									<FaTimes size={10} />
								</button>
							</div>
						)}
					</div>

					{/* Main Data Table */}
					<div className="bg-dark-surface border border-gray-850 rounded-lg overflow-x-auto shadow-2xl">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-gray-850 bg-dark-layer-1/50 text-gray-400 font-extrabold uppercase tracking-wider">
									<th className="py-4 px-4 w-10">
										<input
											type="checkbox"
											checked={
												selectedOrgIds.length > 0 &&
												selectedOrgIds.length === organizations.length
											}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedOrgIds(organizations.map((o) => o.id));
												} else {
													setSelectedOrgIds([]);
												}
											}}
											className="rounded bg-dark-layer-1 border-gray-800 text-emerald-500 focus:ring-emerald-500"
										/>
									</th>
									<th className="py-4 px-4">Workspace Details</th>
									<th className="py-4 px-4">Owner</th>
									<th className="py-4 px-4">Visibility</th>
									<th className="py-4 px-4">Status</th>
									<th className="py-4 px-4 text-center">Members</th>
									<th className="py-4 px-4 text-center">Contests</th>
									<th className="py-4 px-4 text-center">Problems</th>
									<th className="py-4 px-4 text-center text-rose-400">Reports</th>
									<th className="py-4 px-4 text-center text-yellow-500">Warnings</th>
									<th className="py-4 px-4 text-center">Health</th>
									<th className="py-4 px-4 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-850">
								{loadingOrgs ? (
									<tr>
										<td colSpan={12} className="py-16 text-center text-gray-500 font-semibold">
											<div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
											Retrieving organization list...
										</td>
									</tr>
								) : organizations.length === 0 ? (
									<tr>
										<td colSpan={12} className="py-16 text-center text-gray-500 font-semibold">
											No organizations found matching search/filters.
										</td>
									</tr>
								) : (
									organizations.map((org) => {
										const isSelected = selectedOrgIds.includes(org.id);
										const statusColors = {
											active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
											under_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
											warned: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
											restricted: "bg-orange-500/10 text-orange-400 border-orange-500/20",
											frozen: "bg-blue-500/10 text-blue-400 border-blue-500/20",
											suspended: "bg-red-500/10 text-red-400 border-red-500/20",
											banned: "bg-rose-500/10 text-rose-500 border-rose-500/20",
											deleted: "bg-gray-500/10 text-gray-400 border-gray-500/20",
											archived: "bg-purple-500/10 text-purple-400 border-purple-500/20"
										};
										const statusVal = ((org.status || "active") as keyof typeof statusColors) in statusColors
											? (org.status as keyof typeof statusColors)
											: "active";

										const orgDisplayName = org.displayName || org.name || "Workspace";
										const orgIdStr = org.id ? `${org.id.substring(0, 8)}...` : "unknown";
										const orgSlugStr = org.slug || org.id || "";
										const ownerName = org.ownerUsername || "Unknown";
										const ownerUidStr = org.ownerUid ? `${org.ownerUid.substring(0, 8)}...` : "None";

										return (
											<tr
												key={org.id}
												className={`hover:bg-dark-layer-1/30 transition-all ${
													isSelected ? "bg-emerald-500/5" : ""
												}`}
											>
												<td className="py-4 px-4">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) => {
															if (e.target.checked) {
																setSelectedOrgIds((prev) => [...prev, org.id]);
															} else {
																setSelectedOrgIds((prev) =>
																	prev.filter((id) => id !== org.id)
																);
															}
														}}
														className="rounded bg-dark-layer-1 border-gray-800 text-emerald-500 focus:ring-emerald-500"
													/>
												</td>
												<td className="py-4 px-4">
													<div className="flex items-center gap-3">
														<OrganizationAvatar
															organization={org}
															name={orgDisplayName}
															size={36}
															className="rounded-md border border-gray-800 shrink-0"
														/>
														<div className="min-w-0">
															<span className="font-extrabold text-white block hover:text-emerald-500 transition cursor-pointer" onClick={() => openModal("details", org)}>
																{orgDisplayName}
															</span>
															<span className="text-[10px] text-gray-500 font-mono block">
																{orgIdStr} | @{orgSlugStr}
															</span>
														</div>
													</div>
												</td>
												<td className="py-4 px-4 font-semibold text-gray-300">
													<div className="flex flex-col">
														<span>@{ownerName}</span>
														<span className="text-[9px] text-gray-600 font-mono">
															{ownerUidStr}
														</span>
													</div>
												</td>
												<td className="py-4 px-4 text-gray-400 capitalize">
													<div className="flex items-center gap-1.5 font-bold">
														{org.visibility === "public" && (
															<FaGlobe size={11} className="text-emerald-500" />
														)}
														{org.visibility === "private" && (
															<FaLock size={11} className="text-amber-500" />
														)}
														{org.visibility === "secret" && (
															<FaEyeSlash size={11} className="text-red-500" />
														)}
														{org.visibility || "public"}
													</div>
												</td>
												<td className="py-4 px-4">
													<span
														className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
															statusColors[statusVal] ||
															"bg-gray-500/10 text-gray-400 border-gray-500/20"
														}`}
													>
														{(org.status || "active").replace("_", " ")}
													</span>
												</td>
												<td className="py-4 px-4 text-center font-mono font-bold text-white">
													{org.memberCount}
												</td>
												<td className="py-4 px-4 text-center font-mono font-bold text-gray-400">
													{org.contestCount}
												</td>
												<td className="py-4 px-4 text-center font-mono font-bold text-gray-400">
													{org.problemCount}
												</td>
												<td className="py-4 px-4 text-center font-mono font-bold text-rose-400">
													{org.reportsCount}
												</td>
												<td className="py-4 px-4 text-center font-mono font-bold text-yellow-500">
													{org.warningsCount}
												</td>
												<td className="py-4 px-4 text-center">
													<span
														className={`font-black text-xs ${
															org.healthScore >= 80
																? "text-emerald-400"
																: org.healthScore >= 50
																? "text-yellow-500"
																: "text-rose-500"
														}`}
													>
														{org.healthScore}%
													</span>
												</td>
												<td className="py-4 px-4 text-right">
													<div className="flex gap-2 justify-end">
														<button
															onClick={() => openModal("details", org)}
															className="bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition"
														>
															Manage
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Pagination footer */}
					{totalPages > 1 && (
						<div className="flex justify-between items-center pt-2">
							<span className="text-xs text-gray-500 font-semibold">
								Showing page {page} of {totalPages} ({totalCount} items)
							</span>

							<div className="flex gap-2">
								<button
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
									className="px-3.5 py-2 bg-dark-surface hover:bg-dark-fill-3 border border-gray-850 rounded-md text-xs font-bold transition disabled:opacity-30 cursor-pointer"
								>
									Prev
								</button>
								<button
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="px-3.5 py-2 bg-dark-surface hover:bg-dark-fill-3 border border-gray-850 rounded-md text-xs font-bold transition disabled:opacity-30 cursor-pointer"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Sub Tab: Reports */}
			{subTab === "reports" && (
				<div className="space-y-4">
					{loadingReports ? (
						<div className="text-center py-12 text-gray-500 font-semibold">Loading reports...</div>
					) : reports.length === 0 ? (
						<div className="bg-dark-surface border border-gray-850 rounded-lg p-8 text-center text-gray-500 font-semibold">
							No reports filed at this time.
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{reports.map((report) => (
								<div
									key={report.id}
									className="bg-dark-surface border border-gray-850 rounded-lg p-5 space-y-4"
								>
									<div className="flex justify-between items-start">
										<div>
											<h4 className="text-sm font-black text-white">
												{report.organizationName}
											</h4>
											<span className="text-[10px] text-gray-500 font-mono block">
												slug: @{report.organizationSlug} | id: {report.organizationId}
											</span>
										</div>

										<span
											className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
												report.status === "pending"
													? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
													: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
											}`}
										>
											{report.status}
										</span>
									</div>

									<div className="bg-dark-layer-1 border border-gray-800 rounded-md p-3 text-xs space-y-2">
										<p className="text-gray-400">
											<strong className="text-gray-200">Category:</strong> {report.reason.toUpperCase()}
										</p>
										<p className="text-gray-400">
											<strong className="text-gray-200">Description:</strong> {report.description || "None provided."}
										</p>
										{report.evidence && (
											<p className="text-gray-400">
												<strong className="text-gray-200">Evidence Link:</strong>{" "}
												<a
													href={report.evidence}
													target="_blank"
													rel="noreferrer"
													className="text-emerald-500 underline font-mono"
												>
													{report.evidence}
												</a>
											</p>
										)}
									</div>

									<div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
										<span>Filed by: @{report.reporterUsername}</span>
										<span>{new Date(report.timestamp).toLocaleString()}</span>
									</div>

									{report.status === "pending" && (
										<div className="flex gap-2 pt-1.5 justify-end">
											<button
												onClick={() => resolveReport(report.id, "dismissed")}
												className="px-3 py-1.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-gray-400 font-bold rounded-lg transition"
											>
												Dismiss
											</button>
											<button
												onClick={() => resolveReport(report.id, "resolved")}
												className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black text-bg-base font-black rounded-lg transition"
												style={{ color: "var(--bg-base)" }}
											>
												Resolve & Close
											</button>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Sub Tab: Appeals */}
			{subTab === "appeals" && (
				<div className="space-y-4">
					{loadingAppeals ? (
						<div className="text-center py-12 text-gray-500 font-semibold">Loading appeals...</div>
					) : appeals.length === 0 ? (
						<div className="bg-dark-surface border border-gray-850 rounded-lg p-8 text-center text-gray-500 font-semibold">
							No organization appeals currently open.
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{appeals.map((appeal) => (
								<AppealCard key={appeal.id} appeal={appeal} resolveAppeal={resolveAppeal} />
							))}
						</div>
					)}
				</div>
			)}

			{/* ============================================================
			    MODAL DIALOGS
			   ============================================================ */}

			{/* 1. View Details Modal */}
			{activeModal === "details" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Workspace Admin Center</h3>
							<button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
							<div className="flex items-center gap-4 bg-dark-layer-1/50 border border-gray-850 rounded-md p-4">
								<OrganizationAvatar
									organization={targetOrg}
									name={targetOrg.displayName || targetOrg.name || "Workspace"}
									size={56}
									className="rounded-lg border border-gray-800 shrink-0"
								/>
								<div>
									<h4 className="text-base font-extrabold text-white">{targetOrg.displayName || targetOrg.name || "Workspace"}</h4>
									<span className="text-[10px] text-gray-500 font-mono">@{targetOrg.slug || targetOrg.id}</span>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3 text-xs">
								<div className="bg-dark-layer-1 border border-gray-850 rounded-md p-3">
									<span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Owner</span>
									<span className="font-semibold text-white">@{targetOrg.ownerUsername || "Unknown"}</span>
								</div>
								<div className="bg-dark-layer-1 border border-gray-850 rounded-md p-3">
									<span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Status</span>
									<span className="font-semibold text-emerald-500 uppercase text-[10px]">{targetOrg.status || "active"}</span>
								</div>
								<div className="bg-dark-layer-1 border border-gray-850 rounded-md p-3">
									<span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Health Score</span>
									<span className="font-bold text-emerald-400">{targetOrg.healthScore ?? 100}%</span>
								</div>
								<div className="bg-dark-layer-1 border border-gray-850 rounded-md p-3">
									<span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Restricted Features</span>
									<span className="text-gray-400 font-semibold">{targetOrg.restrictedFeatures?.join(", ") || "None"}</span>
								</div>
							</div>

							{/* Actions List */}
							<div className="space-y-2">
								<span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Administration Actions</span>
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => openModal("edit", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaEdit className="text-blue-400" /> Edit Metadata
									</button>
									<button
										onClick={() => openModal("transfer", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaCrown className="text-yellow-400" /> Transfer Owner
									</button>
									<button
										onClick={() => openModal("warning", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaExclamationTriangle className="text-yellow-500" /> Issue Warning
									</button>
									<button
										onClick={() => openModal("restrict", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaShieldAlt className="text-orange-400" /> Restrict Features
									</button>
									<button
										onClick={() => handleAction(targetOrg.status === "frozen" ? "unfreeze" : "freeze", targetOrg.id, {})}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaVolumeMute className="text-blue-400" /> {targetOrg.status === "frozen" ? "Unfreeze" : "Freeze Workspace"}
									</button>
									<button
										onClick={() => openModal("suspend", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaBan className="text-red-400" /> Suspend
									</button>
									<button
										onClick={() => openModal("ban", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaBan className="text-rose-500" /> Ban Workspace
									</button>
									<button
										onClick={() => handleAction("restore", targetOrg.id, {})}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaUndo className="text-emerald-400" /> Restore status
									</button>
									<button
										onClick={() => openModal("announcement", targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaBullhorn className="text-emerald-500" /> Announcement
									</button>
									<button
										onClick={() => exportBackup(targetOrg)}
										className="p-2.5 bg-dark-layer-1 hover:bg-dark-fill-3 border border-gray-800 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2"
									>
										<FaFileAlt className="text-gray-400" /> Backup Data
									</button>
									<button
										onClick={() => handleAction("delete", targetOrg.id, {})}
										className="p-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2 text-red-400"
									>
										<FaTrash /> Soft Delete
									</button>
									<button
										onClick={() => {
											if (confirm("WARNING: Are you absolutely sure you want to permanently delete this workspace? This cannot be undone!")) {
												handleAction("permanent_delete", targetOrg.id, {});
											}
										}}
										className="p-2.5 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-[10px] font-bold rounded-lg text-left transition flex items-center gap-2 text-rose-400"
									>
										<FaTrash /> Permanent Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 2. Edit Metadata Modal */}
			{activeModal === "edit" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							// In production this PUTs to organizations config
							triggerStatusMessage("success", "Metadata changes applied.");
							setActiveModal(null);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Edit Organization Profile</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Display Name</label>
								<input
									type="text"
									value={editForm.displayName}
									onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
								<textarea
									value={editForm.description}
									onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Country</label>
									<input
										type="text"
										value={editForm.country}
										onChange={(e) => setEditForm((prev) => ({ ...prev, country: e.target.value }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">University</label>
									<input
										type="text"
										value={editForm.university}
										onChange={(e) => setEditForm((prev) => ({ ...prev, university: e.target.value }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									/>
								</div>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-emerald-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Save Changes
							</button>
						</div>
					</form>
				</div>
			)}

			{/* 3. Transfer Owner Modal */}
			{activeModal === "transfer" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleAction("transfer_ownership", targetOrg.id, { newOwnerUid });
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Transfer Ownership</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<p className="text-xs text-gray-400">
								This will assign a new user UID as the primary Owner of the workspace. The current owner will be demoted to a Member.
							</p>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Owner UID</label>
								<input
									type="text"
									value={newOwnerUid}
									onChange={(e) => setNewOwnerUid(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-yellow-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Confirm Transfer
							</button>
						</div>
					</form>
				</div>
			)}

			{/* 4. Issue Warning Modal */}
			{activeModal === "warning" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleAction("warn", targetOrg.id, warningForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Issue Official Warning</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</label>
									<input
										type="text"
										value={warningForm.reason}
										onChange={(e) => setWarningForm((prev) => ({ ...prev, reason: e.target.value }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
										required
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
									<BeastCodeSelect
										options={[
											{ value: "spam", label: "Spam Content" },
											{ value: "abuse", label: "Harassment / Abuse" },
											{ value: "copyright", label: "Copyright Infringement" },
											{ value: "cheating", label: "Contest Cheating" },
											{ value: "malicious", label: "Malicious Code" }
										]}
										value={warningForm.category}
										onChange={(val) => setWarningForm((prev) => ({ ...prev, category: val }))}
										size="sm"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Severity</label>
									<BeastCodeSelect
										options={[
											{ value: "low", label: "Low" },
											{ value: "medium", label: "Medium" },
											{ value: "high", label: "High (Immediate Action)" }
										]}
										value={warningForm.severity}
										onChange={(val) => setWarningForm((prev) => ({ ...prev, severity: val }))}
										size="sm"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expiration (Days)</label>
									<input
										type="number"
										value={warningForm.expiresDays}
										onChange={(e) => setWarningForm((prev) => ({ ...prev, expiresDays: parseInt(e.target.value, 10) }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
										required
									/>
								</div>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Warning Description</label>
								<textarea
									value={warningForm.description}
									onChange={(e) => setWarningForm((prev) => ({ ...prev, description: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-yellow-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Issue Warning
							</button>
						</div>
					</form>
				</div>
			)}

			{/* 5. Suspend Modal */}
			{activeModal === "suspend" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleAction("suspend", targetOrg.id, suspendForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Suspend Organization</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suspension Duration (Days)</label>
								<input
									type="number"
									value={suspendForm.durationDays}
									onChange={(e) => setSuspendForm((prev) => ({ ...prev, durationDays: parseInt(e.target.value, 10) }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</label>
								<textarea
									value={suspendForm.reason}
									onChange={(e) => setSuspendForm((prev) => ({ ...prev, reason: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-orange-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Confirm Suspension
							</button>
						</div>
					</form>
				</div>
			)}

			{/* 6. Ban Modal */}
			{activeModal === "ban" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleAction("ban", targetOrg.id, banForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white text-rose-500">Ban Organization</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<p className="text-xs text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 rounded-md p-3.5">
								WARNING: This will permanently ban the organization from the platform. All features will be deactivated immediately.
							</p>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ban Reason</label>
								<textarea
									value={banForm.reason}
									onChange={(e) => setBanForm((prev) => ({ ...prev, reason: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-red-600 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Apply Ban
							</button>
						</div>
					</form>
				</div>
			)}

			{/* 7. Restrict Features Modal */}
			{activeModal === "restrict" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Restrict Features</h3>
							<button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-3">
							<p className="text-xs text-gray-400 mb-2">
								Toggle specific privileges for this workspace. Restricting a feature deactivates that workflow for all members.
							</p>

							{[
								{ id: "recruitment", label: "Disable Recruitment Systems" },
								{ id: "contests", label: "Disable Contest Creation" },
								{ id: "threads", label: "Disable Discussion Threads" },
								{ id: "file_uploads", label: "Disable File Uploads" },
								{ id: "problems", label: "Disable Custom Problems" },
								{ id: "announcements", label: "Disable Announcement Board" },
								{ id: "invitations", label: "Disable New Invitations" }
							].map((feature) => {
								const checked = restrictFeatures.includes(feature.id);
								return (
									<label
										key={feature.id}
										className="flex items-center gap-3 p-3 bg-dark-layer-1/50 border border-gray-850 rounded-md cursor-pointer hover:bg-dark-layer-1 transition text-xs font-semibold text-gray-300"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={(e) => {
												if (e.target.checked) {
													setRestrictFeatures((prev) => [...prev, feature.id]);
												} else {
													setRestrictFeatures((prev) =>
														prev.filter((f) => f !== feature.id)
													);
												}
											}}
											className="rounded bg-dark-layer-2 border-gray-800 text-emerald-500 focus:ring-emerald-500"
										/>
										<span>{feature.label}</span>
									</label>
								);
							})}
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								onClick={() => handleAction("restrict_features", targetOrg.id, { restrictedFeatures: restrictFeatures })}
								className="px-4 py-2 bg-emerald-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Apply Restrictions
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 8. Announcement Modal */}
			{activeModal === "announcement" && targetOrg && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleAction("announcement", targetOrg.id, announcementForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Send Admin Announcement</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Announcement Title</label>
								<input
									type="text"
									value={announcementForm.title}
									onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content</label>
								<textarea
									value={announcementForm.content}
									onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={4}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-emerald-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Post Announcement
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Bulk Actions Modals */}
			{activeModal === "bulk_warn" && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleBulkAction("warn", warningForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Bulk Warn Organizations</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</label>
									<input
										type="text"
										value={warningForm.reason}
										onChange={(e) => setWarningForm((prev) => ({ ...prev, reason: e.target.value }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
										required
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
									<BeastCodeSelect
										options={[
											{ value: "spam", label: "Spam Content" },
											{ value: "abuse", label: "Harassment / Abuse" },
											{ value: "copyright", label: "Copyright Infringement" },
											{ value: "cheating", label: "Contest Cheating" },
											{ value: "malicious", label: "Malicious Code" }
										]}
										value={warningForm.category}
										onChange={(val) => setWarningForm((prev) => ({ ...prev, category: val }))}
										size="sm"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Severity</label>
									<BeastCodeSelect
										options={[
											{ value: "low", label: "Low" },
											{ value: "medium", label: "Medium" },
											{ value: "high", label: "High" }
										]}
										value={warningForm.severity}
										onChange={(val) => setWarningForm((prev) => ({ ...prev, severity: val }))}
										size="sm"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expiration (Days)</label>
									<input
										type="number"
										value={warningForm.expiresDays}
										onChange={(e) => setWarningForm((prev) => ({ ...prev, expiresDays: parseInt(e.target.value, 10) }))}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
										required
									/>
								</div>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Warning Description</label>
								<textarea
									value={warningForm.description}
									onChange={(e) => setWarningForm((prev) => ({ ...prev, description: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-2.5 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-yellow-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Warn Selected
							</button>
						</div>
					</form>
				</div>
			)}

			{activeModal === "bulk_suspend" && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleBulkAction("suspend", suspendForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Bulk Suspend</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suspension Duration (Days)</label>
								<input
									type="number"
									value={suspendForm.durationDays}
									onChange={(e) => setSuspendForm((prev) => ({ ...prev, durationDays: parseInt(e.target.value, 10) }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</label>
								<textarea
									value={suspendForm.reason}
									onChange={(e) => setSuspendForm((prev) => ({ ...prev, reason: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-orange-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Suspend Selected
							</button>
						</div>
					</form>
				</div>
			)}

			{activeModal === "bulk_ban" && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleBulkAction("ban", banForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white text-rose-500">Bulk Ban</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<p className="text-xs text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 rounded-md p-3.5">
								WARNING: This will permanently ban all selected organizations.
							</p>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ban Reason</label>
								<textarea
									value={banForm.reason}
									onChange={(e) => setBanForm((prev) => ({ ...prev, reason: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={3}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-red-600 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Ban Selected
							</button>
						</div>
					</form>
				</div>
			)}

			{activeModal === "bulk_announcement" && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							await handleBulkAction("announcement", announcementForm);
						}}
						className="bg-dark-surface border border-gray-850 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
					>
						<div className="flex justify-between items-center p-5 border-b border-gray-850">
							<h3 className="text-sm font-black text-white">Bulk Announcement</h3>
							<button type="button" onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white">
								<FiX size={16} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Announcement Title</label>
								<input
									type="text"
									value={announcementForm.title}
									onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									required
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content</label>
								<textarea
									value={announcementForm.content}
									onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-md p-3 text-white outline-none focus:border-emerald-500 transition"
									rows={4}
									required
								/>
							</div>
						</div>

						<div className="flex gap-2 p-5 border-t border-gray-850 bg-dark-layer-1/30 justify-end">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="px-4 py-2 bg-dark-layer-1 border border-gray-850 text-gray-300 font-bold text-xs rounded-md transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-emerald-500 text-bg-base font-black text-xs rounded-md transition"
								style={{ color: "var(--bg-base)" }}
							>
								Post Announcement
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
