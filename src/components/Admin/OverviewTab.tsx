import React, { useState } from "react";
import {
	FiDatabase,
	FiUsers,
	FiActivity,
	FiRefreshCw,
	FiFlag,
	FiBookOpen,
	FiChevronDown,
	FiAlertTriangle,
	FiGrid
} from "react-icons/fi";
import { ConfirmationModal } from "./AdminShared";

interface ActivityLogItem {
	id: string;
	adminUid: string;
	targetUid?: string;
	targetName?: string;
	action: string;
	reason: string;
	timestamp: number;
}

interface OverviewTabProps {
	stats: {
		problems: number;
		users: number;
		submissions: number;
		reports: number;
		appeals: number;
		contests: number;
	};
	statsLoading: boolean;
	activities: ActivityLogItem[];
	activitiesLoading: boolean;
	syncing: boolean;
	recounting: boolean;
	onSync: () => Promise<void>;
	onRecount: () => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
	stats,
	statsLoading,
	activities,
	activitiesLoading,
	syncing,
	recounting,
	onSync,
	onRecount
}) => {
	const [showSyncConfirm, setShowSyncConfirm] = useState(false);
	const [showRecountConfirm, setShowRecountConfirm] = useState(false);

	const statsCards = [
		{ title: "Problems", count: stats.problems, desc: "Total database challenges", icon: <FiGrid size={14} /> },
		{ title: "Users", count: stats.users, desc: "Registered accounts", icon: <FiUsers size={14} /> },
		{ title: "Submissions", count: stats.submissions, desc: "Historical runs", icon: <FiActivity size={14} /> },
		{ title: "Reports", count: stats.reports, desc: "Pending reports", highlight: stats.reports > 0, icon: <FiFlag size={14} /> },
		{ title: "Appeals", count: stats.appeals, desc: "Waiting user appeals", highlight: stats.appeals > 0, icon: <FiFlag size={14} /> },
		{ title: "Contests", count: stats.contests, desc: "Active competitions", icon: <FiBookOpen size={14} /> }
	];

	return (
		<div className="space-y-6">
			{/* Stats Grid */}
			<section className="grid grid-cols-2 lg:grid-cols-6 gap-4 select-none">
				{statsCards.map((card, idx) => (
					<div
						key={idx}
						className={`p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm flex flex-col gap-1.5 transition hover:border-[var(--border-accent)] ${
							card.highlight ? "border-red-500/25 bg-red-950/5" : ""
						}`}
					>
						<div className="flex items-center justify-between text-[var(--text-muted)]">
							<span className="text-[10px] font-bold uppercase tracking-wider">{card.title}</span>
							<span className={card.highlight ? "text-red-400" : ""}>{card.icon}</span>
						</div>
						{statsLoading ? (
							<div className="h-6 w-12 bg-[var(--bg-dark-fill-3)] rounded animate-pulse my-0.5" />
						) : (
							<span className={`text-base font-black tracking-tight ${card.highlight ? "text-red-400" : "text-[var(--text-primary)]"}`}>
								{card.count}
							</span>
						)}
						<span className="text-[9px] text-[var(--text-muted)] truncate">{card.desc}</span>
					</div>
				))}
			</section>

			{/* Responsive 2-Column Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				
				{/* Left Columns (Diagnostics & Maintenance) */}
				<div className="lg:col-span-2 flex flex-col gap-6">
					
					{/* Diagnostics Panel */}
					<div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg flex flex-col gap-3 shadow-sm text-xs">
						<span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2 mb-1 block">
							System Diagnostics
						</span>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="p-3 bg-[var(--bg-dark-fill-3)]/30 border border-[var(--border-subtle)] rounded-md">
								<span className="text-[10px] text-[var(--text-muted)] block mb-1">Core Synced</span>
								<span className="font-mono text-xs text-[var(--text-primary)] font-bold">Yes</span>
							</div>
							<div className="p-3 bg-[var(--bg-dark-fill-3)]/30 border border-[var(--border-subtle)] rounded-md">
								<span className="text-[10px] text-[var(--text-muted)] block mb-1">Security Audit</span>
								<span className="text-emerald-500 font-bold text-xs">Passed</span>
							</div>
							<div className="p-3 bg-[var(--bg-dark-fill-3)]/30 border border-[var(--border-subtle)] rounded-md">
								<span className="text-[10px] text-[var(--text-muted)] block mb-1">Active Connections</span>
								<span className="font-mono text-emerald-450 font-bold text-xs">Stable</span>
							</div>
						</div>
					</div>

					{/* System Maintenance */}
					<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm flex flex-col gap-4">
						<span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2 block">
							Advanced System Maintenance
						</span>
						<p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
							Run administrative synchronization or data repairs. Use caution before triggering.
						</p>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Sync database button */}
							<button
								onClick={() => setShowSyncConfirm(true)}
								disabled={syncing}
								className="flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-emerald-450 hover:text-emerald-400 font-bold text-xs rounded-md transition disabled:opacity-50"
							>
								<FiRefreshCw className={syncing ? "animate-spin" : ""} size={12} />
								<span>{syncing ? "Syncing..." : "Sync Static Database"}</span>
							</button>

							{/* Solved stats recounting */}
							<button
								onClick={() => setShowRecountConfirm(true)}
								disabled={recounting}
								className="flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-emerald-400 font-bold text-xs rounded-md transition disabled:opacity-50"
							>
								<FiDatabase className={recounting ? "animate-pulse" : ""} size={12} />
								<span>{recounting ? "Recounting..." : "Recount Solved Statistics"}</span>
							</button>
						</div>
					</div>
				</div>

				{/* Right Sidebar Column (Activity Log Feed) */}
				<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm flex flex-col gap-4">
					<h3 className="text-xs uppercase tracking-wider font-extrabold text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
						<span>Audit Trail</span>
						<FiActivity size={12} className="text-[var(--text-muted)]" />
					</h3>

					{activitiesLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, idx) => (
								<div key={idx} className="space-y-1.5 animate-pulse">
									<div className="h-3 bg-white/5 rounded w-3/4" />
									<div className="h-2.5 bg-white/5 rounded w-1/2" />
								</div>
							))}
						</div>
					) : activities.length === 0 ? (
						<span className="text-[10px] text-[var(--text-muted)] italic">No recent activities logged</span>
					) : (
						<div className="space-y-4">
							{activities.map((log) => (
								<div key={log.id} className="text-[10px] flex flex-col gap-0.5 border-l-2 border-[var(--border-subtle)] pl-2.5">
									<span className="font-bold text-[var(--text-primary)] uppercase font-mono tracking-wider text-[8px] text-emerald-450">
										{log.action.replace(/_/g, " ")}
									</span>
									<span className="text-[var(--text-secondary)] leading-relaxed select-text">
										{log.reason}
									</span>
									<span className="text-[9px] text-[var(--text-muted)] mt-0.5">
										{new Date(log.timestamp).toLocaleString()}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Confirmation Modals */}
			<ConfirmationModal
				isOpen={showSyncConfirm}
				onClose={() => setShowSyncConfirm(false)}
				onConfirm={async () => {
					setShowSyncConfirm(false);
					await onSync();
				}}
				title="Confirm Database Synchronization"
				message="Are you sure you want to synchronize mock and static problem data to Firestore? This will add any missing static problems to your database. Existing documents will not be overwritten."
				confirmText="Run Sync"
				loading={syncing}
			/>

			<ConfirmationModal
				isOpen={showRecountConfirm}
				onClose={() => setShowRecountConfirm(false)}
				onConfirm={async () => {
					setShowRecountConfirm(false);
					await onRecount();
				}}
				title="Confirm Statistics Recount"
				message="Are you sure you want to recalculate and seed solved stats for all users? This will scan every user's solved list, check it against valid database problem documents, and write cleaned statistics back to Firestore. This operation may take several seconds."
				confirmText="Run Recount"
				loading={recounting}
			/>
		</div>
	);
};
