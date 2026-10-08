import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import LoadingState from "@/components/UI/LoadingState";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { FaCheck, FaTimes, FaUsers, FaLock, FaGlobe } from "react-icons/fa";

export default function InviteLinkPage() {
	const router = useRouter();
	const { linkId } = router.query;
	const [user, loadingAuth] = useAuthState(auth);

	const [inviteLink, setInviteLink] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	useEffect(() => {
		if (!linkId || loadingAuth) return;

		const fetchLinkDetails = async () => {
			setLoading(true);
			setError("");
			try {
				const idToken = await user?.getIdToken();
				const headers: any = {};
				if (idToken) {
					headers["Authorization"] = `Bearer ${idToken}`;
				}

				const res = await fetch(`/api/invite-links/${linkId}`, { headers });
				const data = await res.json();

				if (data.success) {
					setInviteLink(data.inviteLink);
				} else {
					setError(data.error || "Failed to load invite link details.");
				}
			} catch (err) {
				console.error("Error loading invite link details:", err);
				setError("An error occurred while fetching invite details.");
			} finally {
				setLoading(false);
			}
		};

		fetchLinkDetails();
	}, [linkId, user, loadingAuth]);

	const handleJoin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !inviteLink) return;
		setJoining(true);
		setError("");
		setSuccessMsg("");

		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/invite-links/${linkId}/join`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ password }),
			});

			const data = await res.json();
			if (data.success) {
				setSuccessMsg("Successfully joined! Redirecting to workspace...");
				setTimeout(() => {
					router.push(`/orgs/${data.slug}`);
				}, 1500);
			} else {
				setError(data.error || "Failed to join workspace.");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred.");
		} finally {
			setJoining(false);
		}
	};

	return (
		<AppShell activeNav="Organizations" maxWidth="normal">
			<div className="max-w-[480px] mx-auto py-16">
				{loading ? (
					<div className="bg-bg-surface border border-border-default rounded-lg p-8">
						<LoadingState message="Loading invite link details..." />
					</div>
				) : error ? (
					<div className="bg-bg-surface border border-rose-800/40 rounded-lg p-6 text-center">
						<div className="w-12 h-12 rounded-md bg-rose-950/40 flex items-center justify-center mx-auto mb-3 border border-rose-800/50">
							<FaTimes className="text-rose-400" size={20} />
						</div>
						<h3 className="text-sm font-semibold text-text-primary">Invalid Invite Link</h3>
						<p className="text-xs text-text-muted mt-1 leading-relaxed">{error}</p>
						<button
							onClick={() => router.push("/orgs")}
							className="mt-4 bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-primary px-3.5 py-1.5 rounded-md text-xs font-medium transition"
						>
							Back to Organizations
						</button>
					</div>
				) : (
					<div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden shadow-xl">
						<div className="h-16 bg-gradient-to-r from-accent/15 via-bg-elevated to-accent/10 relative border-b border-border-subtle">
							<div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
						</div>

						<div className="p-6 -mt-10 relative flex flex-col items-center text-center">
							{/* Logo */}
							<div className="w-16 h-16 rounded-md border-2 border-border-default bg-bg-elevated overflow-hidden shadow-lg mb-3 shrink-0 flex items-center justify-center">
								{inviteLink.organizationLogo ? (
									<img
										src={inviteLink.organizationLogo}
										alt={inviteLink.organizationName}
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-2xl font-mono font-bold text-accent">
										{inviteLink.organizationName.substring(0, 1).toUpperCase()}
									</span>
								)}
							</div>

							{/* Title & Badge */}
							<span className="text-[10px] text-accent uppercase font-mono font-medium tracking-wider bg-accent/10 px-2 py-0.5 rounded border border-accent/30 mb-2">
								Join Workspace
							</span>

							<h2 className="text-lg font-bold text-text-primary leading-tight">
								{inviteLink.organizationName}
							</h2>
							<p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 justify-center font-mono">
								<FaUsers size={11} className="text-accent" /> {inviteLink.memberCount} members currently active
							</p>

							{/* Role Offered Details */}
							<div className="w-full bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 text-left my-4 space-y-1.5">
								<div className="flex justify-between items-center">
									<span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">Offered Role</span>
									<span className="text-[9px] font-mono font-medium uppercase px-2 py-0.5 rounded border border-accent/30 bg-accent/10 text-accent">
										{inviteLink.roleId}
									</span>
								</div>
								<p className="text-xs text-text-secondary leading-relaxed pt-1">
									You are invited to join this workspace as a {inviteLink.roleId}. You will be able to access private contests, internal problems, and announcements.
								</p>
							</div>

							{/* Form for Joining / Password Input */}
							<form onSubmit={handleJoin} className="w-full space-y-3.5">
								{inviteLink.passwordRequired && (
									<div className="text-left space-y-1">
										<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
											<FaLock size={9} className="text-rose-400" /> Enter Workspace Password
										</label>
										<input
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="w-full bg-bg-elevated border border-border-default focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
											required
										/>
									</div>
								)}

								{successMsg && <p className="text-xs text-accent font-mono animate-pulse">{successMsg}</p>}
								{error && <p className="text-xs text-rose-400 font-mono">{error}</p>}

								<div className="grid grid-cols-2 gap-2 pt-1">
									<button
										type="button"
										onClick={() => router.push("/orgs")}
										disabled={joining}
										className="bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-secondary font-medium text-xs px-4 py-2 rounded-md transition flex items-center justify-center gap-1.5"
									>
										<FaTimes size={10} /> Decline
									</button>
									<button
										type="submit"
										disabled={joining}
										className="bg-accent hover:bg-accent-hover text-bg-page font-medium text-xs px-4 py-2 rounded-md transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
									>
										<FaCheck size={10} /> Join Workspace
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</AppShell>
	);
}
