import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import useHasMounted from "@/hooks/useHasMounted";
import { useAdmin } from "@/hooks/useAdmin";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import {
	FaBell,
	FaHistory,
	FaCheckCircle,
	FaTimesCircle,
	FaSync,
	FaPlay,
	FaPaperPlane,
	FaEye,
	FaInfoCircle,
	FaChevronRight
} from "react-icons/fa";

interface QueueItem {
	id: string;
	toEmail: string;
	category: string;
	eventType: string;
	subject: string;
	status: "pending" | "processing" | "sent" | "failed";
	retryCount: number;
	nextRetryAt: number;
	createdAt: number;
	error?: string;
	deliveryDurationMs?: number;
	previewUrl?: string;
}

interface HistoryItem {
	id: string;
	eventType: string;
	userEmail: string;
	category: string;
	status: string;
	timestamp: number;
	reason?: string;
	error?: string;
}

interface Analytics {
	sentCount: number;
	failedCount: number;
	totalDurationMs: number;
	averageDurationMs: number;
}

export default function AdminNotificationsPage() {
	const router = useRouter();
	const hasMounted = useHasMounted();
	const [user] = useAuthState(auth);
	const [isAdmin, checkingAdmin] = useAdmin();

	const [activeTab, setActiveTab] = useState<"overview" | "history" | "preview" | "test">("overview");

	// State for logs
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [analytics, setAnalytics] = useState<Analytics>({
		sentCount: 0,
		failedCount: 0,
		totalDurationMs: 0,
		averageDurationMs: 0
	});

	const [loadingData, setLoadingData] = useState(false);
	const [processingQueue, setProcessingQueue] = useState(false);
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

	// State for live previewer
	const [previewEvent, setPreviewEvent] = useState("AUTH_WELCOME");
	const [previewHtml, setPreviewHtml] = useState("");
	const [loadingPreview, setLoadingPreview] = useState(false);

	// State for test event trigger
	const [testEvent, setTestEvent] = useState("AUTH_WELCOME");
	const [testEmail, setTestEmail] = useState("");
	const [testName, setTestName] = useState("");
	const [testCustomContent, setTestCustomContent] = useState("");
	const [sendingTest, setSendingTest] = useState(false);

	const eventTypeList = [
		{ value: "AUTH_WELCOME", label: "Auth: Welcome Email" },
		{ value: "AUTH_VERIFY", label: "Auth: Email Verification" },
		{ value: "AUTH_RESET", label: "Auth: Password Reset" },
		{ value: "AUTH_CHANGE_CONFIRM", label: "Auth: Email Change Confirmation" },
		{ value: "AUTH_LOGIN_ALERT", label: "Auth: Login Alert" },
		{ value: "CONTEST_PUBLISHED", label: "Contest: Published" },
		{ value: "CONTEST_REG_CONFIRM", label: "Contest: Registration Confirmed" },
		{ value: "CONTEST_REG_REMINDER", label: "Contest: Registration Reminder" },
		{ value: "CONTEST_SOON", label: "Contest: Starting Soon" },
		{ value: "CONTEST_STARTED", label: "Contest: Started" },
		{ value: "CONTEST_ENDING", label: "Contest: Ending Soon" },
		{ value: "CONTEST_ENDED", label: "Contest: Completed" },
		{ value: "CONTEST_EDITORIAL", label: "Contest: Editorial Released" },
		{ value: "CONTEST_RESULTS", label: "Contest: Standings Published" },
		{ value: "CONTEST_WINNER", label: "Contest: Winner Ceremony" },
		{ value: "PROB_DAILY", label: "Problems: Daily Challenge" },
		{ value: "PROB_SOLVED_MILESTONE", label: "Problems: Solved Milestone" },
		{ value: "PROB_EDITORIAL", label: "Problems: Editorial Solution" },
		{ value: "PROB_RECOMMENDED", label: "Problems: Practice Recommendations" },
		{ value: "THREAD_REPLY", label: "Threads: Someone Replied" },
		{ value: "THREAD_MENTION", label: "Threads: Someone Mentioned You" },
		{ value: "THREAD_LIKE", label: "Threads: Someone Liked Post" },
		{ value: "THREAD_QUOTE", label: "Threads: Someone Quoted You" },
		{ value: "ACC_PROFILE_UPDATED", label: "Account: Profile Updated" },
		{ value: "ACC_PASSWORD_CHANGED", label: "Account: Password Changed" },
		{ value: "ACC_SUSPICIOUS_LOGIN", label: "Account: Suspicious Login Alert" },
		{ value: "ACC_ROLE_CHANGED", label: "Account: Role Update" },
		{ value: "ACC_WARNING", label: "Account: Official Warning" },
		{ value: "SYS_MAINTENANCE", label: "System: Scheduled Maintenance" },
		{ value: "SYS_DOWNTIME", label: "System: Scheduled Downtime" },
		{ value: "SYS_RESTORED", label: "System: Service Restored" },
		{ value: "SYS_NEW_FEATURE", label: "System: New Feature Announcement" },
		{ value: "SYS_NEWSLETTER", label: "System: Monthly Newsletter" },
		{ value: "ACH_BADGE", label: "Achievements: Badge Earned" },
		{ value: "ACH_LEVEL_UP", label: "Achievements: Level Up" },
		{ value: "ACH_XP_MILESTONE", label: "Achievements: XP Target Cleared" },
		{ value: "ACH_STREAK_REMINDER", label: "Achievements: Streak Reminder" },
		{ value: "ACH_STREAK_WARN", label: "Achievements: Streak Danger Warning" },
		{ value: "UNI_INVITE", label: "University: Group Invitation" },
		{ value: "UNI_CONTEST_INVITE", label: "University: Private Contest Invite" },
		{ value: "UNI_TEAM_INVITE", label: "University: Coding Team Invite" },
		{ value: "SECURE_TERMINATION", label: "Special: Secure Exam Disqualification" },
		{ value: "VIRTUAL_MODE", label: "Special: Virtual Contest Mode" }
	];

	// 1. Auth Guard Redirect
	useEffect(() => {
		if (!checkingAdmin && !isAdmin) {
			router.replace("/");
		}
	}, [isAdmin, checkingAdmin, router]);

	// 2. Load Queue Logs & History
	const loadLogs = async () => {
		if (!user) return;
		setLoadingData(true);
		setFeedback(null);
		try {
			const token = await user.getIdToken();
			const res = await fetch("/api/notifications/get-logs", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const data = await res.json();
			if (data.success) {
				setQueue(data.queue || []);
				setHistory(data.history || []);
				setAnalytics(data.analytics || { sentCount: 0, failedCount: 0, totalDurationMs: 0, averageDurationMs: 0 });
			} else {
				setFeedback({ type: "error", text: data.message || "Failed to load log history" });
			}
		} catch (err: any) {
			setFeedback({ type: "error", text: err.message || "Network error loading log history" });
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (isAdmin) {
			loadLogs();
		}
	}, [isAdmin]);

	// 3. Load HTML Template Preview
	const loadPreview = async () => {
		if (!user) return;
		setLoadingPreview(true);
		try {
			const token = await user.getIdToken();
			const res = await fetch("/api/notifications/preview-template", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ eventType: previewEvent })
			});
			const data = await res.json();
			if (data.success) {
				setPreviewHtml(data.html);
			} else {
				setPreviewHtml(`<p style="color: red; padding: 20px;">Failed to render: ${data.message}</p>`);
			}
		} catch (err: any) {
			setPreviewHtml(`<p style="color: red; padding: 20px;">Render error: ${err.message}</p>`);
		} finally {
			setLoadingPreview(false);
		}
	};

	useEffect(() => {
		if (isAdmin) {
			loadPreview();
		}
	}, [previewEvent, isAdmin]);

	// 4. Force Queue Process Task
	const runQueueProcessor = async () => {
		if (!user) return;
		setProcessingQueue(true);
		setFeedback(null);
		try {
			const res = await fetch("/api/notifications/process-queue", {
				method: "POST"
			});
			const data = await res.json();
			if (data.success) {
				setFeedback({
					type: "success",
					text: `Queue processor executed. Processed tasks: ${data.processedCount}. duration: ${data.totalDurationMs}ms.`
				});
				await loadLogs();
			} else {
				setFeedback({ type: "error", text: data.message || "Queue processing encountered an error" });
			}
		} catch (err: any) {
			setFeedback({ type: "error", text: err.message || "Network error executing queue processor" });
		} finally {
			setProcessingQueue(false);
		}
	};

	// 5. Send Test Notification Event
	const triggerTestEvent = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		if (!testEmail || !testName) {
			setFeedback({ type: "error", text: "Please enter recipient name and email" });
			return;
		}

		setSendingTest(true);
		setFeedback(null);

		try {
			const token = await user.getIdToken();
			const res = await fetch("/api/notifications/test-trigger", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					eventType: testEvent,
					recipientEmail: testEmail,
					recipientName: testName,
					customContent: testCustomContent
				})
			});

			const data = await res.json();
			if (data.success) {
				setFeedback({
					type: "success",
					text: `Success: Notification task successfully created! status: ${data.status}. Log ID: ${data.logId || "N/A"}`
				});
				setTestCustomContent("");
				await loadLogs();
			} else {
				setFeedback({ type: "error", text: data.message || "Failed to trigger event" });
			}
		} catch (err: any) {
			setFeedback({ type: "error", text: err.message || "Network error dispatching test notification" });
		} finally {
			setSendingTest(false);
		}
	};

	if (!hasMounted) return null;

	if (checkingAdmin) {
		return (
			<AppShell activeNav="Admin" maxWidth="wide">
				<div className="py-24">
					<LoadingState message="Verifying administrative credentials..." />
				</div>
			</AppShell>
		);
	}

	if (!user || !isAdmin) {
		return (
			<AppShell activeNav="Admin" maxWidth="wide">
				<div className="py-24 flex flex-col items-center justify-center p-4">
					<div className="max-w-md w-full p-6 rounded-lg text-center space-y-4 bg-bg-surface border border-border-default">
						<FaTimesCircle className="mx-auto text-rose-400" size={40} />
						<div className="space-y-1.5">
							<h1 className="text-base font-semibold text-text-primary">
								Access Denied
							</h1>
							<p className="text-xs text-text-muted leading-relaxed">
								You do not have permission to view the Notification & Email Platform Control Center.
								Please sign in with an Administrator account.
							</p>
						</div>
					</div>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title="Notification & Email Platform"
				description="Event-driven notification routing, template testing, and SMTP background queue manager."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Email Queue", href: "/admin?tab=emails" },
					{ label: "Notifications" },
				]}
				actions={
					<div className="flex items-center gap-2">
						<button
							onClick={loadLogs}
							disabled={loadingData}
							className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-border-default hover:bg-bg-hover bg-bg-elevated text-text-primary flex items-center gap-2 transition"
						>
							<FaSync className={loadingData ? "animate-spin" : ""} size={11} />
							Refresh
						</button>
						<button
							onClick={runQueueProcessor}
							disabled={processingQueue}
							className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-accent-brand hover:bg-accent-hover text-black flex items-center gap-1.5 transition"
						>
							<FaPlay size={10} />
							{processingQueue ? "Processing..." : "Process Queue"}
						</button>
					</div>
				}
			/>

			<div className="space-y-6">
				{/* Feedback Banner */}
				{feedback && (
					<div
						className={`p-3 rounded-md flex items-center gap-2.5 text-xs font-mono transition-all duration-300 ${
							feedback.type === "success"
								? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/40"
								: "bg-rose-950/30 text-rose-400 border border-rose-800/40"
						}`}
					>
						{feedback.type === "success" ? <FaCheckCircle size={13} /> : <FaTimesCircle size={13} />}
						<span>{feedback.text}</span>
					</div>
				)}

				<div
					className="flex items-center gap-1.5 p-1 rounded-md border transition-all duration-300 w-max max-w-full mb-4"
					style={{
						backgroundColor: "var(--bg-dark-layer-1)",
						borderColor: "var(--border-subtle)",
					}}
				>
					{[
						{ id: "overview", label: "Overview & Analytics", icon: <FaBell /> },
						{ id: "history", label: "Queue Logs & History", icon: <FaHistory /> },
						{ id: "preview", label: "Template Live Preview", icon: <FaEye /> },
						{ id: "test", label: "Trigger Test Alert", icon: <FaPaperPlane /> }
					].map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as any)}
								className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
									isActive
										? "border-emerald-500/40 bg-surface text-emerald-450 font-semibold"
										: "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
								}`}
							>
								{tab.icon}
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Tab content */}
				{activeTab === "overview" && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* Card: Total Sent */}
						<div
							className="p-5 rounded-lg space-y-2"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
								Total Dispatched
							</p>
							<h3 className="text-3xl font-black text-emerald-400">{analytics.sentCount || 0}</h3>
							<p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
								Delivered successfully via SMTP / tests.
							</p>
						</div>

						{/* Card: Total Failed */}
						<div
							className="p-5 rounded-lg space-y-2"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
								Failed Dispatches
							</p>
							<h3 className="text-3xl font-black text-red-400">{analytics.failedCount || 0}</h3>
							<p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
								Errors encountered, subject to retries.
							</p>
						</div>

						{/* Card: Avg duration */}
						<div
							className="p-5 rounded-lg space-y-2"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
								Avg Delivery Duration
							</p>
							<h3 className="text-3xl font-black text-blue-400">
								{analytics.averageDurationMs ? `${analytics.averageDurationMs}ms` : "0ms"}
							</h3>
							<p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
								Average time to execute transporter.
							</p>
						</div>

						{/* Card: Pending Queue */}
						<div
							className="p-5 rounded-lg space-y-2"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
								Tasks Pending Queue
							</p>
							<h3 className="text-3xl font-black text-amber-400">
								{queue.filter((item) => item.status === "pending" || item.status === "processing").length}
							</h3>
							<p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
								Pending items waiting to run next.
							</p>
						</div>

						{/* Quick status information */}
						<div
							className="md:col-span-4 p-5 rounded-lg flex items-start gap-4"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<FaInfoCircle className="text-brand-orange mt-0.5 shrink-0" size={16} />
							<div className="space-y-1">
								<h4 className="text-xs font-bold">Queue Processing Schedule</h4>
								<p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
									The BeastCode Email Queue implements transactional decoupling. Whenever an event is triggered by
									users (registration, contest creation, achievements), the platform constructs the email and saves
									it as a task document in Firestore `emailQueue` collection immediately. Running the queue worker
									fetches pending records, executes delivery with exponential backoff retries, and logs analytics.
								</p>
							</div>
						</div>
					</div>
				)}

				{activeTab === "history" && (
					<div className="space-y-6">
						{/* Table: Queue Logs */}
						<div
							className="rounded-lg overflow-hidden"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<div className="p-5 border-b border-border-subtle">
								<h2 className="text-sm font-bold">Active Outgoing Email Queue Tasks (Top 50)</h2>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr
											className="text-[10px] uppercase tracking-wider font-bold"
											style={{
												background: "var(--bg-dark-fill-3)",
												color: "var(--text-muted)",
												borderBottom: "1px solid var(--border-subtle)"
											}}
										>
											<th className="px-5 py-3">Subject / Event</th>
											<th className="px-5 py-3">Recipient</th>
											<th className="px-5 py-3">Category</th>
											<th className="px-5 py-3">Status</th>
											<th className="px-5 py-3">Retries</th>
											<th className="px-5 py-3">Created</th>
											<th className="px-5 py-3">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border-subtle text-xs">
										{queue.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-5 py-12 text-center text-text-secondary">
													No queue logs found in database.
												</td>
											</tr>
										) : (
											queue.map((item) => (
												<tr key={item.id} className="hover:bg-dark-fill-3 transition-colors">
													<td className="px-5 py-4">
														<div className="font-bold text-text-primary truncate max-w-[220px]">
															{item.subject}
														</div>
														<div className="text-[10px] text-text-muted mt-0.5 font-mono">
															{item.eventType}
														</div>
													</td>
													<td className="px-5 py-4 font-medium text-text-secondary">{item.toEmail}</td>
													<td className="px-5 py-4">
														<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-fill-3 border border-border-subtle text-text-secondary">
															{item.category}
														</span>
													</td>
													<td className="px-5 py-4">
														<span
															className={`px-2 py-0.5 rounded text-[10px] font-bold ${
																item.status === "sent"
																	? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
																	: item.status === "failed"
																	? "bg-red-500/10 text-red-400 border border-red-500/30"
																	: item.status === "processing"
																	? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
																	: "bg-amber-500/10 text-amber-400 border border-amber-500/30"
															}`}
														>
															{item.status.toUpperCase()}
														</span>
														{item.error && (
															<div className="text-[9px] text-red-400 mt-1 max-w-[180px] truncate" title={item.error}>
																Err: {item.error}
															</div>
														)}
													</td>
													<td className="px-5 py-4 text-center font-bold">{item.retryCount} / 5</td>
													<td className="px-5 py-4 text-text-muted">
														{new Date(item.createdAt).toLocaleTimeString()}
													</td>
													<td className="px-5 py-4">
														{item.previewUrl && (
															<a
																href={item.previewUrl}
																target="_blank"
																rel="noreferrer"
																className="text-brand-orange hover:underline font-bold text-[10px] flex items-center gap-1"
															>
																Preview
																<FaChevronRight size={8} />
															</a>
														)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* Table: History Traces */}
						<div
							className="rounded-lg overflow-hidden"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<div className="p-5 border-b border-border-subtle">
								<h2 className="text-sm font-bold">Historical Dispather Traces (Top 30)</h2>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr
											className="text-[10px] uppercase tracking-wider font-bold"
											style={{
												background: "var(--bg-dark-fill-3)",
												color: "var(--text-muted)",
												borderBottom: "1px solid var(--border-subtle)"
											}}
										>
											<th className="px-5 py-3">Event / Category</th>
											<th className="px-5 py-3">User Email</th>
											<th className="px-5 py-3">Action Status</th>
											<th className="px-5 py-3">Reason / Details</th>
											<th className="px-5 py-3">Timestamp</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border-subtle text-xs">
										{history.length === 0 ? (
											<tr>
												<td colSpan={5} className="px-5 py-12 text-center text-text-secondary">
													No historic traces logged.
												</td>
											</tr>
										) : (
											history.map((item) => (
												<tr key={item.id} className="hover:bg-dark-fill-3 transition-colors">
													<td className="px-5 py-4">
														<div className="font-bold text-text-primary">{item.eventType}</div>
														<div className="text-[9px] text-text-muted mt-0.5">{item.category}</div>
													</td>
													<td className="px-5 py-4 text-text-secondary">{item.userEmail}</td>
													<td className="px-5 py-4">
														<span
															className={`px-2 py-0.5 rounded text-[10px] font-bold ${
																item.status === "skipped"
																	? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
																	: item.status === "queued" || item.status === "sent"
																	? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
																	: "bg-red-500/10 text-red-400 border border-red-500/30"
															}`}
														>
															{item.status.toUpperCase()}
														</span>
													</td>
													<td className="px-5 py-4 text-text-secondary max-w-[240px] truncate">
														{item.reason || item.error || "Processed successfully"}
													</td>
													<td className="px-5 py-4 text-text-muted">
														{new Date(item.timestamp).toLocaleString()}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)}

				{activeTab === "preview" && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Configuration column */}
						<div className="space-y-4">
							<div
								className="p-5 rounded-lg space-y-4"
								style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
							>
								<h3 className="text-sm font-bold border-b border-border-subtle pb-3">Template Selector</h3>
								<div className="space-y-2">
									<label className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
										Choose Event Type
									</label>
									<BeastCodeSelect
										options={eventTypeList}
										value={previewEvent}
										onChange={(val) => setPreviewEvent(val)}
										size="sm"
									/>
								</div>

								<div className="space-y-2">
									<h4 className="text-xs font-bold">Template Features</h4>
									<ul className="text-[10px] space-y-1.5 text-text-secondary list-disc pl-4">
										<li>Responsive layout tested on major clients</li>
										<li>Custom event branding details</li>
										<li>Personalized username placeholders</li>
										<li>Global footer with unsubscribe URLs</li>
									</ul>
								</div>
							</div>
						</div>

						{/* Rendering column */}
						<div className="md:col-span-2">
							<div
								className="rounded-lg overflow-hidden flex flex-col h-[640px]"
								style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
							>
								<div className="p-4 border-b border-border-subtle flex justify-between items-center bg-dark-fill-3">
									<span className="text-xs font-bold">Rendered Responsive Email View</span>
									{loadingPreview && <span className="text-[10px] text-brand-orange animate-pulse">Rendering...</span>}
								</div>

								<div className="flex-1 bg-[#09090b] p-4 overflow-hidden relative">
									{previewHtml ? (
										<iframe
											srcDoc={previewHtml}
											title="Email Live Preview"
											className="w-full h-full border-0 rounded-xl bg-[#09090b]"
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">
											Choose a template to preview.
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === "test" && (
					<div className="max-w-xl mx-auto">
						<form
							onSubmit={triggerTestEvent}
							className="p-6 rounded-lg space-y-4"
							style={{ background: "var(--bg-dark-layer-1)", border: "1px solid var(--border-subtle)" }}
						>
							<h3 className="text-sm font-bold border-b border-border-subtle pb-3">Dispatch Test Event Alert</h3>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
										Recipient Name
									</label>
									<input
										type="text"
										required
										placeholder="e.g. Alex"
										value={testName}
										onChange={(e) => setTestName(e.target.value)}
										className="w-full px-3 py-2 text-xs rounded-lg bg-dark-fill-3 border border-border-subtle text-text-primary focus:outline-none focus:border-brand-orange"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
										Recipient Email
									</label>
									<input
										type="email"
										required
										placeholder="e.g. user@test.com"
										value={testEmail}
										onChange={(e) => setTestEmail(e.target.value)}
										className="w-full px-3 py-2 text-xs rounded-lg bg-dark-fill-3 border border-border-subtle text-text-primary focus:outline-none focus:border-brand-orange"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
									Notification Event Type
								</label>
								<BeastCodeSelect
									options={eventTypeList}
									value={testEvent}
									onChange={(val) => setTestEvent(val)}
									size="sm"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
									Custom Body Paragraph Content (Optional)
								</label>
								<textarea
									rows={4}
									placeholder="Write any additional detail or broadcast message payload..."
									value={testCustomContent}
									onChange={(e) => setTestCustomContent(e.target.value)}
									className="w-full px-3 py-2 text-xs rounded-lg bg-dark-fill-3 border border-border-subtle text-text-primary focus:outline-none focus:border-brand-orange"
								/>
							</div>

							<button
								type="submit"
								disabled={sendingTest}
								className="w-full py-2.5 text-xs font-bold rounded-lg bg-brand-orange hover:bg-opacity-90 text-white flex items-center justify-center gap-2 shadow-lg shadow-brand-glow transition-all"
							>
								<FaPaperPlane />
								{sendingTest ? "Dispatching..." : "Dispatch Notification Task"}
							</button>
						</form>
					</div>
				)}
			</div>
		</AppShell>
	);
}
