import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { firestore, auth } from "@/firebase/firebase";
import { FiMail, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiPlay } from "react-icons/fi";

interface EmailTask {
	id: string;
	to: string;
	template?: string;
	subject?: string;
	status: "pending" | "processing" | "sent" | "failed" | "dead_letter" | "expired" | "cancelled";
	retryCount: number;
	nextRetryAt: number;
	sentAt?: number;
	createdAt?: number;
	error?: string;
}

export const EmailsTab: React.FC = () => {
	const [tasks, setTasks] = useState<EmailTask[]>([]);
	const [loading, setLoading] = useState(true);
	const [triggering, setTriggering] = useState(false);
	const [triggerResult, setTriggerResult] = useState<{
		success: boolean;
		processedCount: number;
		totalDurationMs: number;
		details: any[];
		message?: string;
	} | null>(null);

	// Stats
	const [stats, setStats] = useState({
		total: 0,
		pending: 0,
		processing: 0,
		sent: 0,
		failed: 0,
		dead_letter: 0,
		expired: 0,
	});

	useEffect(() => {
		const q = query(collection(firestore, "emailQueue"), orderBy("nextRetryAt", "desc"), limit(50));
		const unsub = onSnapshot(q, (snap) => {
			const fetchedTasks: EmailTask[] = [];
			let pending = 0;
			let processing = 0;
			let sent = 0;
			let failed = 0;
			let dead_letter = 0;
			let expired = 0;

			snap.forEach((d) => {
				const data = d.data();
				const task: EmailTask = {
					id: d.id,
					to: data.to || "",
					template: data.template || "",
					subject: data.subject || "",
					status: data.status || "pending",
					retryCount: data.retryCount || 0,
					nextRetryAt: data.nextRetryAt || 0,
					sentAt: data.sentAt || 0,
					createdAt: data.createdAt || 0,
					error: data.error || "",
				};
				fetchedTasks.push(task);

				if (task.status === "pending") pending++;
				else if (task.status === "processing") processing++;
				else if (task.status === "sent") sent++;
				else if (task.status === "failed") failed++;
				else if (task.status === "dead_letter") dead_letter++;
				else if (task.status === "expired" || task.status === "cancelled") expired++;
			});

			setTasks(fetchedTasks);
			setStats({
				total: snap.size,
				pending,
				processing,
				sent,
				failed,
				dead_letter,
				expired,
			});
			setLoading(false);
		}, (err) => {
			console.error("emailQueue onSnapshot error:", err);
			setLoading(false);
		});

		return () => unsub();
	}, []);

	const triggerProcessor = async () => {
		setTriggering(true);
		setTriggerResult(null);
		try {
			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			const res = await fetch("/api/notifications/process-queue", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			setTriggerResult(data);
		} catch (err: any) {
			setTriggerResult({
				success: false,
				processedCount: 0,
				totalDurationMs: 0,
				details: [],
				message: err.message || "Network error",
			});
		} finally {
			setTriggering(false);
		}
	};

	const getBackoffMinutes = (retryCount: number) => {
		return Math.pow(2, retryCount);
	};

	return (
		<div className="space-y-6">
			{/* Top Panel Header */}
			<div className="flex justify-between items-center select-none">
				<div>
					<h2 className="text-base font-bold text-[var(--text-primary)]">Email Queue & SMTP Health</h2>
					<p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
						Monitor background transactional mail delivery tasks and trigger queue runs manually.
					</p>
				</div>
				<button
					onClick={triggerProcessor}
					disabled={triggering}
					className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-450 text-black font-semibold text-xs rounded-md transition shadow-sm disabled:opacity-50"
				>
					{triggering ? <FiRefreshCw className="animate-spin" size={13} /> : <FiPlay size={13} />}
					<span>Trigger Queue Processor</span>
				</button>
			</div>

			{/* Queue Status Aggregator */}
			<div className="grid grid-cols-2 lg:grid-cols-7 gap-3 select-none">
				{[
					{ label: "Total Tasks", count: stats.total, color: "text-[var(--text-primary)]" },
					{ label: "Pending", count: stats.pending, color: "text-amber-400" },
					{ label: "Processing", count: stats.processing, color: "text-blue-400" },
					{ label: "Sent", count: stats.sent, color: "text-emerald-400" },
					{ label: "Failed", count: stats.failed, color: "text-rose-400" },
					{ label: "Dead Letter", count: stats.dead_letter, color: "text-purple-400" },
					{ label: "Expired", count: stats.expired, color: "text-zinc-400" },
				].map((item, idx) => (
					<div
						key={idx}
						className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm flex flex-col gap-1"
					>
						<span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
							{item.label}
						</span>
						<span className={`text-base font-black tracking-tight ${item.color}`}>
							{loading ? (
								<div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
							) : (
								item.count
							)}
						</span>
					</div>
				))}
			</div>

			{/* Health Trigger Output Result */}
			{triggerResult && (
				<div
					className={`p-4 rounded-md border text-xs font-bold ${
						triggerResult.success
							? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
							: "bg-rose-950/40 text-rose-400 border-rose-800/40"
					}`}
				>
					<div className="flex items-center justify-between mb-2">
						<span>SMTP Processing Event Completed</span>
						<span className="font-mono text-[10px]">{triggerResult.totalDurationMs}ms duration</span>
					</div>
					<div className="font-normal space-y-1 mt-1 text-[10px] text-[var(--text-secondary)]">
						<p>Status: {triggerResult.success ? "Success" : "Failed"}</p>
						<p>Processed: {triggerResult.processedCount} tasks run</p>
						{triggerResult.message && <p className="text-red-400">Error: {triggerResult.message}</p>}
						{triggerResult.details && triggerResult.details.length > 0 && (
							<div className="mt-2 border-t border-[var(--border-subtle)] pt-2 space-y-1 font-mono text-[9px]">
								{triggerResult.details.map((detail, dIdx) => (
									<div key={dIdx} className="flex justify-between">
										<span>{detail.recipient}</span>
										<span className={detail.status === "sent" ? "text-emerald-400" : "text-red-400"}>
											{detail.status} {detail.error ? `(${detail.error})` : ""}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Queue Monitoring Matrix */}
			<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm overflow-hidden flex flex-col">
				<div className="overflow-x-auto">
					{loading ? (
						<div className="p-4 space-y-3">
							{Array.from({ length: 5 }).map((_, idx) => (
								<div
									key={idx}
									className="flex items-center justify-between p-4 bg-[var(--bg-dark-fill-3)]/30 border border-[var(--border-subtle)] rounded-md animate-pulse"
								>
									<div className="h-4 bg-white/5 rounded w-1/3" />
									<div className="h-4 bg-white/5 rounded w-1/4" />
									<div className="h-4 bg-white/5 rounded w-12" />
								</div>
							))}
						</div>
					) : tasks.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center select-none">
							<div className="w-10 h-10 rounded-full bg-[var(--bg-dark-fill-3)] flex items-center justify-center text-[var(--text-muted)] mb-3">
								<FiMail size={20} />
							</div>
							<h4 className="text-xs font-bold text-[var(--text-primary)]">No tasks in queue</h4>
							<p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-xs">
								The email delivery queue is empty or has been cleared.
							</p>
						</div>
					) : (
						<table className="w-full text-xs text-left text-[var(--text-secondary)]">
							<thead>
								<tr className="bg-[var(--bg-dark-fill-3)]/50 border-b border-[var(--border-subtle)] sticky top-0 select-none z-10 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">
									<th className="px-5 py-3">Recipient</th>
									<th className="px-5 py-3">Template / Subject</th>
									<th className="px-5 py-3 w-28">Status</th>
									<th className="px-5 py-3 w-28">Retries</th>
									<th className="px-5 py-3 w-40">Next Retry At</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-subtle)]">
								{tasks.map((task) => {
									const statusColors =
										task.status === "sent"
											? { text: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-900/30" }
											: task.status === "dead_letter"
											? { text: "text-purple-400", bg: "bg-purple-950/20 border-purple-900/30" }
											: task.status === "expired" || task.status === "cancelled"
											? { text: "text-zinc-400", bg: "bg-zinc-800/40 border-zinc-700/30" }
											: task.status === "failed"
											? { text: "text-rose-400", bg: "bg-rose-950/20 border-rose-900/30" }
											: task.status === "processing"
											? { text: "text-blue-400", bg: "bg-blue-950/20 border-blue-900/30" }
											: { text: "text-amber-400", bg: "bg-amber-950/20 border-amber-900/30" };

									return (
										<tr key={task.id} className="hover:bg-[var(--bg-hover)] transition">
											<td className="px-5 py-3 font-bold text-[var(--text-primary)] select-all font-mono text-[10px]">
												{task.to}
											</td>
											<td className="px-5 py-3">
												<div className="flex flex-col gap-0.5">
													<span className="font-bold text-[var(--text-primary)]">
														{task.subject || "No Subject"}
													</span>
													<span className="text-[9px] text-[var(--text-muted)] font-mono">
														Template: {task.template || "custom"}
													</span>
													{task.error && (
														<span className="text-[9px] text-red-400 flex items-center gap-1 mt-1 font-sans">
															<FiAlertCircle size={10} />
															<span className="truncate max-w-sm" title={task.error}>
																{task.error}
															</span>
														</span>
													)}
												</div>
											</td>
											<td className="px-5 py-3">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColors.text} ${statusColors.bg}`}
												>
													{task.status === "sent" ? (
														<FiCheckCircle size={8} />
													) : task.status === "failed" ? (
														<FiAlertCircle size={8} />
													) : (
														<span className="w-1 h-1 rounded-full bg-current animate-pulse mr-0.5" />
													)}
													<span>{task.status}</span>
												</span>
											</td>
											<td className="px-5 py-3 font-mono font-bold text-[10px]">
												{task.retryCount} / 5
											</td>
											<td className="px-5 py-3 text-[10px] text-[var(--text-muted)] font-mono">
												{task.status === "sent" ? (
													<span className="text-emerald-500 font-bold">
														{task.sentAt ? new Date(task.sentAt).toLocaleTimeString() : "Sent"}
													</span>
												) : task.status === "failed" ? (
													<span className="text-red-500 font-bold">Max Retries</span>
												) : (
													<div>
														<p>{new Date(task.nextRetryAt).toLocaleTimeString()}</p>
														<p className="text-[8px] text-[var(--text-muted)]">
															Backoff: {getBackoffMinutes(task.retryCount)}m
														</p>
													</div>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
};

export default EmailsTab;
