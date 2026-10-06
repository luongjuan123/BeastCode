import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import LoadingState from "@/components/UI/LoadingState";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { FaCheck, FaTimes, FaUsers, FaCrown, FaShieldAlt } from "react-icons/fa";

import { apiClient } from "@/utils/apiClient";

export default function InvitationPage() {
	const router = useRouter();
	const { inviteId } = router.query;
	const [user, loadingAuth] = useAuthState(auth);

	const [invitation, setInvitation] = useState<any>(null);
	const [orgDetails, setOrgDetails] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [responding, setResponding] = useState(false);
	const [error, setError] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	useEffect(() => {
		if (!inviteId || loadingAuth || !user) return;

		const fetchInvitationDetails = async () => {
			setLoading(true);
			setError("");
			try {
				// Fetch from invitations using centralized apiClient
				const data = await apiClient.get(`/api/users/invitations`);

				if (data.success) {
					const found = data.invitations?.find((inv: any) => inv.inviteId === inviteId);
					if (found) {
						setInvitation(found);

						// Fetch target organization profile using apiClient (falls back to meta on fail)
						try {
							const orgData = await apiClient.get(`/api/organizations/${found.organizationId}`);
							if (orgData.success) {
								setOrgDetails(orgData.organization);
							}
						} catch (orgErr) {
							console.log("Could not fetch org details directly, using invitation metadata:", orgErr);
						}
					} else {
						setError("Invitation not found, already accepted/declined, or expired.");
					}
				} else {
					setError(data.error || "Failed to load invitation.");
				}
			} catch (err: any) {
				console.error("Error loading invitation details:", err);
				setError(err.message || "An error occurred while fetching invitation details.");
			} finally {
				setLoading(false);
			}
		};

		fetchInvitationDetails();
	}, [inviteId, user, loadingAuth]);

	const handleRespond = async (action: "accept" | "decline") => {
		if (!user || !invitation) return;
		setResponding(true);
		setError("");
		setSuccessMsg("");

		try {
			const data = await apiClient.post(`/api/users/invitations/${inviteId}/respond`, { action });
			if (data.success) {
				setSuccessMsg(action === "accept" ? "Successfully joined! Redirecting..." : "Invitation declined.");
				// Dispatch custom event to notify orgs list page to refresh in real-time
				window.dispatchEvent(new Event("org-joined"));
				setTimeout(() => {
					if (action === "accept") {
						const slug = orgDetails?.slug || invitation?.organizationSlug;
						if (slug) {
							router.push(`/orgs/${slug}`);
						} else {
							router.push("/orgs?tab=my-organizations");
						}
					} else {
						router.push("/orgs?tab=my-organizations");
					}
				}, 1500);
			} else {
				setError(data.error || `Failed to ${action} invitation.`);
			}
		} catch (err: any) {
			setError(err.message || "An error occurred.");
		} finally {
			setResponding(false);
		}
	};

	// Authenticate gate
	if (!loadingAuth && !user) {
		return (
			<AppShell activeNav="Organizations" maxWidth="normal">
				<div className="max-w-[480px] mx-auto py-24 text-center">
					<div className="bg-bg-surface border border-border-default rounded-lg p-6 shadow-lg">
						<h3 className="text-sm font-semibold text-text-primary">Sign in to Accept Invitation</h3>
						<p className="text-xs text-text-muted mt-1 leading-relaxed">
							You must be signed in to verify and accept this workspace invitation.
						</p>
						<button
							onClick={() => router.push(`/auth?prev=${encodeURIComponent(router.asPath)}`)}
							className="mt-5 bg-accent hover:bg-accent-hover text-bg-page font-medium text-xs px-4 py-2 rounded-md transition"
						>
							Sign In / Sign Up
						</button>
					</div>
				</div>
			</AppShell>
		);
	}

	const displayLogo = orgDetails?.avatar || orgDetails?.avatarUrl || invitation?.organizationLogo;
	const displayNameStr = orgDetails?.displayName || orgDetails?.name || invitation?.organizationName;
	const displaySlug = orgDetails?.slug || invitation?.organizationSlug || "";
	const displayMemberCount = orgDetails?.memberCount !== undefined ? orgDetails.memberCount : (invitation?.organizationMemberCount || 0);
	const displayVisibility = orgDetails?.visibility || invitation?.organizationVisibility || "private";
	const displayType = orgDetails?.organizationType || invitation?.organizationType || "Organization";
	const displayDescription = orgDetails?.description || invitation?.organizationDescription || "You will gain standard workspace access, allowing you to view and solve internal problem sets, join contests, and coordinate announcements.";

	return (
		<AppShell activeNav="Organizations" maxWidth="normal">
			<div className="max-w-[480px] mx-auto py-16">
				{loading ? (
					<div className="bg-bg-surface border border-border-default rounded-lg p-8">
						<LoadingState message="Loading invitation details..." />
					</div>
				) : error ? (
					<div className="bg-bg-surface border border-rose-800/40 rounded-lg p-6 text-center">
						<div className="w-12 h-12 rounded-md bg-rose-950/40 flex items-center justify-center mx-auto mb-3 border border-rose-800/50">
							<FaTimes className="text-rose-400" size={20} />
						</div>
						<h3 className="text-sm font-semibold text-text-primary">Unable to load invitation</h3>
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
								{displayLogo ? (
									<img
										src={displayLogo}
										alt={displayNameStr}
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-2xl font-mono font-bold text-accent">
										{(displayNameStr || "W").substring(0, 1).toUpperCase()}
									</span>
								)}
							</div>

							{/* Badge */}
							<span className="text-[10px] text-accent uppercase font-mono font-medium tracking-wider bg-accent/10 px-2 py-0.5 rounded border border-accent/30 mb-2">
								Workspace Invitation
							</span>

							<h2 className="text-lg font-bold text-text-primary leading-tight">
								Join {displayNameStr}
							</h2>
							{displaySlug && <p className="text-xs text-text-muted font-mono mt-0.5">@{displaySlug}</p>}

							{/* Type & Visibility Badges */}
							<div className="flex flex-wrap gap-1.5 items-center justify-center mt-2">
								{displayType && (
									<span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-bg-elevated border border-border-subtle text-text-muted">
										{displayType}
									</span>
								)}
								<span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
									displayVisibility === "public"
										? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
										: displayVisibility === "private"
										? "bg-amber-500/10 text-amber-400 border-amber-500/20"
										: "bg-rose-500/10 text-rose-400 border-rose-500/20"
								}`}>
									{displayVisibility}
								</span>
							</div>

							{/* Stats Card */}
							<div className="flex gap-4 items-center justify-center mt-4 mb-4 text-xs text-text-muted font-mono bg-bg-elevated/40 border border-border-subtle rounded-md px-3.5 py-1.5">
								<span className="flex items-center gap-1.5">
									<FaUsers className="text-accent" size={11} />
									{displayMemberCount} members
								</span>
								<span className="w-1 h-1 rounded-full bg-border-default" />
								<span className="flex items-center gap-1.5">
									<FaCrown className="text-amber-400" size={11} />
									Invited By: @{invitation?.inviterName || "Admin"}
								</span>
							</div>

							{/* Role being offered info box */}
							<div className="w-full bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 text-left mb-5">
								<span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block mb-1">Role Offered</span>
								<div className="flex items-center gap-2">
									<FaShieldAlt className="text-accent" size={12} />
									<span className="text-xs font-mono font-medium text-text-primary uppercase">
										{invitation?.roleId || "Member"}
									</span>
								</div>
								<p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
									{displayDescription}
								</p>
							</div>

							{successMsg && <p className="text-xs text-accent font-mono mb-3">{successMsg}</p>}
							{error && <p className="text-xs text-rose-400 font-mono mb-3">{error}</p>}

							{/* Action buttons */}
							<div className="w-full flex flex-col gap-2">
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => handleRespond("decline")}
										disabled={responding}
										className="bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-secondary font-medium text-xs px-4 py-2 rounded-md transition flex items-center justify-center gap-1.5"
									>
										<FaTimes size={10} /> Decline
									</button>
									<button
										onClick={() => handleRespond("accept")}
										disabled={responding}
										className="bg-accent hover:bg-accent-hover text-bg-page font-medium text-xs px-4 py-2 rounded-md transition flex items-center justify-center gap-1.5 shadow-xs"
									>
										<FaCheck size={10} /> Accept & Join
									</button>
								</div>
								<button
									onClick={() => router.push("/orgs?tab=my-organizations")}
									disabled={responding}
									className="text-xs text-text-muted hover:text-text-primary transition py-1 font-mono"
								>
									Maybe Later
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</AppShell>
	);
}
