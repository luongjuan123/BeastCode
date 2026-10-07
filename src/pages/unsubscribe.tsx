import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import { FaCheckCircle, FaExclamationTriangle, FaBellSlash } from "react-icons/fa";

export default function UnsubscribePage() {
	const router = useRouter();
	const { email: queryEmail, type: queryType } = router.query;
	const [email, setEmail] = useState("");
	const [preferenceType, setPreferenceType] = useState("");
	const [unsubscribedAll, setUnsubscribedAll] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	useEffect(() => {
		if (queryEmail) {
			setEmail(String(queryEmail));
		}
		if (queryType) {
			setPreferenceType(String(queryType));
		}
	}, [queryEmail, queryType]);

	const handleUnsubscribe = async (all: boolean) => {
		if (!email || !email.includes("@")) {
			setError("Please provide a valid email address.");
			return;
		}

		setLoading(true);
		setError("");
		setSuccessMessage("");

		try {
			const res = await fetch("/api/unsubscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					type: all ? "all" : preferenceType || "all",
				}),
			});

			const data = await res.json();
			if (data.success) {
				setSuccessMessage(data.message);
				if (all) {
					setUnsubscribedAll(true);
				}
			} else {
				setError(data.message || "Failed to update notification settings.");
			}
		} catch (err: any) {
			setError("An error occurred. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AppShell activeNav="" maxWidth="normal">
			<div className="py-12 flex justify-center px-4">
				<div className="w-full max-w-md bg-surface border border-border-default rounded-lg p-6 space-y-5">
					<div className="flex items-center gap-3 border-b border-border-subtle pb-4">
						<div className="w-9 h-9 rounded-md bg-surface-elevated border border-border-subtle text-emerald-450 flex items-center justify-center shrink-0">
							<FaBellSlash className="text-sm" />
						</div>
						<div>
							<h1 className="text-sm font-semibold text-text-primary">
								Notification Preferences
							</h1>
							<p className="text-[11px] text-text-muted mt-0.5">
								Manage competitive and platform notification subscriptions.
							</p>
						</div>
					</div>

					{successMessage ? (
						<div className="space-y-4 pt-2">
							<div className="flex items-center gap-2.5 p-3 rounded-md bg-emerald-950/20 border border-emerald-900/30 text-xs">
								<FaCheckCircle className="text-emerald-450 shrink-0 text-sm" />
								<p className="text-emerald-300 leading-relaxed font-mono">{successMessage}</p>
							</div>
							<button
								onClick={() => router.push("/")}
								className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-md font-semibold text-xs transition-colors"
							>
								Back to Platform Home
							</button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-1.5">
								<label className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
									Email Address
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="developer@domain.com"
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									disabled={!!queryEmail}
									className="w-full bg-bg-base border border-border-default text-text-primary text-xs rounded-md px-3 py-2 outline-none font-mono focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>

							{preferenceType && (
								<div className="p-3 rounded-md bg-surface-elevated border border-border-subtle flex items-center justify-between text-xs">
									<span className="text-text-secondary text-[11px]">Selected Category:</span>
									<span className="font-mono text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20 capitalize font-medium">
										{preferenceType}
									</span>
								</div>
							)}

							{error && (
								<div className="flex items-center gap-2.5 p-3 rounded-md bg-red-950/20 border border-red-900/30 text-xs text-red-300">
									<FaExclamationTriangle className="text-red-400 shrink-0 text-sm" />
									<span className="leading-snug">{error}</span>
								</div>
							)}

							<div className="flex flex-col gap-2 pt-2">
								{preferenceType && preferenceType !== "all" && (
									<button
										onClick={() => handleUnsubscribe(false)}
										disabled={loading}
										className="w-full bg-surface-elevated hover:bg-surface-hover text-text-primary border border-border-subtle text-xs py-2 rounded-md font-medium transition-colors disabled:opacity-50"
									>
										{loading ? "Processing..." : `Unsubscribe from ${preferenceType} notifications only`}
									</button>
								)}
								<button
									onClick={() => handleUnsubscribe(true)}
									disabled={loading}
									className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold py-2 rounded-md transition-colors disabled:opacity-50"
								>
									{loading ? "Processing..." : "Unsubscribe from all communications"}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</AppShell>
	);
}
