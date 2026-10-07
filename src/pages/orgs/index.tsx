import React, { useEffect, useState } from "react";
import AppShell from "@/components/UI/AppShell";
import PageHeader from "@/components/UI/PageHeader";
import Badge from "@/components/UI/Badge";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";
import {
	FaGlobe,
	FaLock,
	FaSearch,
	FaPlus,
	FaUsers,
	FaTrophy,
	FaQuestionCircle,
	FaCheckCircle,
	FaSchool,
	FaBriefcase,
	FaFolderOpen,
	FaMapMarkerAlt,
	FaLink,
	FaShieldAlt,
	FaUndoAlt,
	FaStar,
	FaRegStar,
	FaEyeSlash,
	FaEye,
	FaTimes,
	FaCheck,
	FaEnvelopeOpenText,
	FaArrowRight,
	FaRegClock,
} from "react-icons/fa";
import { useRouter } from "next/router";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";

interface OrgItem {
	slug: string;
	name: string;
	type: string;
	visibility: string;
	description: string;
	avatar?: string;
	avatarUrl: string;
	avatarStoragePath?: string;
	avatarUpdatedAt?: number;
	bannerUrl: string;
	memberCount: number;
	contestCount: number;
	problemCount: number;
	verified: boolean;
	category: string;
	country: string;
	website: string;
	isMember: boolean;
}

export default function OrgsIndexPage() {
	const [user, loadingAuth] = useAuthState(auth);
	const router = useRouter();

	const [activeViewTab, setActiveViewTab] = useState<"explore" | "my-orgs">("explore");

	const [orgs, setOrgs] = useState<OrgItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState("");

	// Modal State
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");
	const [newOrgType, setNewOrgType] = useState("coding_club");
	const [newOrgVisibility, setNewOrgVisibility] = useState("public");
	const [newOrgDesc, setNewOrgDesc] = useState("");
	const [newOrgWebsite, setNewOrgWebsite] = useState("");
	const [newOrgLocation, setNewOrgLocation] = useState("");
	const [newOrgCountry, setNewOrgCountry] = useState("Vietnam");
	const [newOrgCategory, setNewOrgCategory] = useState("Technology");
	const [newOrgEmail, setNewOrgEmail] = useState("");
	
	const [createLoading, setCreateLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	// Your Organizations State
	const [memberships, setMemberships] = useState<{
		owned: any[];
		administered: any[];
		member: any[];
		favorites: any[];
		archived: any[];
		invited: any[];
		pendingRequests: any[];
	}>({
		owned: [],
		administered: [],
		member: [],
		favorites: [],
		archived: [],
		invited: [],
		pendingRequests: [],
	});
	const [loadingMyOrgs, setLoadingMyOrgs] = useState(false);
	const [actionPending, setActionPending] = useState<string | null>(null);

	const fetchOrgs = async () => {
		if (!user) {
			setOrgs([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			let url = "/api/organizations";
			const params = new URLSearchParams();
			if (search) params.append("q", search);
			if (typeFilter) params.append("type", typeFilter);
			
			if (params.toString()) {
				url += `?${params.toString()}`;
			}

			const idToken = await user.getIdToken();
			const headers = {
				Authorization: `Bearer ${idToken}`,
			};

			const res = await fetch(url, { headers });
			const data = await res.json();
			if (data.success) {
				setOrgs(data.organizations || []);
			}
		} catch (err) {
			console.error("Error fetching organizations:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchMemberships = async () => {
		if (!user) return;
		setLoadingMyOrgs(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/users/memberships", {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			const data = await res.json();
			if (data.success) {
				setMemberships({
					owned: data.owned || [],
					administered: data.administered || [],
					member: data.member || [],
					favorites: data.favorites || [],
					archived: data.archived || [],
					invited: data.invited || [],
					pendingRequests: data.pendingRequests || [],
				});
			}
		} catch (err) {
			console.error("Error fetching user memberships:", err);
		} finally {
			setLoadingMyOrgs(false);
		}
	};

	useEffect(() => {
		if (loadingAuth) return;
		if (user) {
			fetchOrgs();
		} else {
			setOrgs([]);
			setLoading(false);
		}
	}, [user, loadingAuth, typeFilter]);

	useEffect(() => {
		if (!loadingAuth && activeViewTab === "my-orgs" && user) {
			fetchMemberships();
		}
	}, [user, loadingAuth, activeViewTab]);

	useEffect(() => {
		const handleOrgJoined = () => {
			fetchMemberships();
			fetchOrgs();
		};
		window.addEventListener("org-joined", handleOrgJoined);
		return () => {
			window.removeEventListener("org-joined", handleOrgJoined);
		};
	}, [user]);

	useEffect(() => {
		if (router.query.tab === "my-organizations") {
			setActiveViewTab("my-orgs");
		}
	}, [router.query.tab]);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		fetchOrgs();
	};

	// Actions for workspace preferences
	const handleToggleFavorite = async (orgId: string, isFav: boolean) => {
		if (!user) return;
		setActionPending(orgId);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${orgId}/preference`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ isFavorite: isFav }),
			});
			const data = await res.json();
			if (data.success) {
				fetchMemberships();
			}
		} catch (err) {
			console.error("Failed to toggle favorite:", err);
		} finally {
			setActionPending(null);
		}
	};

	const handleToggleHidden = async (orgId: string, isHide: boolean) => {
		if (!user) return;
		setActionPending(orgId);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${orgId}/preference`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ isHidden: isHide }),
			});
			const data = await res.json();
			if (data.success) {
				fetchMemberships();
			}
		} catch (err) {
			console.error("Failed to toggle hidden:", err);
		} finally {
			setActionPending(null);
		}
	};

	const handleCancelJoinRequest = async (orgId: string) => {
		if (!user) return;
		setActionPending(orgId);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${orgId}/join`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				fetchMemberships();
			}
		} catch (err) {
			console.error("Failed to cancel join request:", err);
		} finally {
			setActionPending(null);
		}
	};

	const handleInviteRespond = async (inviteId: string, action: "accept" | "decline") => {
		if (!user) return;
		setActionPending(inviteId);
		try {
			const idToken = await user.getIdToken();
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
				fetchMemberships();
			}
		} catch (err) {
			console.error("Failed to respond to invitation:", err);
		} finally {
			setActionPending(null);
		}
	};

	const handleCreateOrg = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		setCreateLoading(true);
		setErrorMsg("");
		setSuccessMsg("");

		try {
			const slug = newOrgName
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.trim()
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-");

			const displayName = newOrgName;

			const idToken = await user.getIdToken();
			const res = await fetch("/api/organizations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					slug,
					name: newOrgName,
					displayName,
					organizationType: newOrgType,
					type: newOrgType,
					visibility: newOrgVisibility,
					description: newOrgDesc,
					website: newOrgWebsite,
					location: newOrgLocation,
					country: newOrgCountry,
					category: newOrgCategory,
					email: newOrgEmail,
					contactEmail: newOrgEmail,
				}),
			});

			const data = await res.json();
			if (data.success) {
				setSuccessMsg("Organization created successfully! Redirecting...");
				setTimeout(() => {
					setShowCreateModal(false);
					router.push(`/orgs/${data.organization.slug}`);
				}, 1500);
			} else {
				const errorVal = data.error;
				const errMsg = typeof errorVal === "object" && errorVal !== null
					? (errorVal.message || errorVal.error || JSON.stringify(errorVal))
					: (errorVal || "Failed to create organization.");
				setErrorMsg(errMsg);
			}
		} catch (err: any) {
			setErrorMsg(err.message || "An error occurred.");
		} finally {
			setCreateLoading(false);
		}
	};

	return (
		<AppShell activeNav="Organizations" maxWidth="wide">
			<PageHeader
				title="Organizations"
				description="Collaborative developer workspaces, engineering teams, tech clubs, and academic institutions."
				badge={
					<Badge variant="default" size="sm" className="font-mono uppercase">
						{orgs.length} WORKSPACES
					</Badge>
				}
				actions={
					user ? (
						<button
							onClick={() => {
								setNewOrgName("");
								setNewOrgDesc("");
								setNewOrgWebsite("");
								setNewOrgLocation("");
								setNewOrgEmail("");
								setNewOrgVisibility("public");
								setErrorMsg("");
								setSuccessMsg("");
								setShowCreateModal(true);
							}}
							className="px-3.5 py-1.5 rounded-md font-medium text-xs bg-accent hover:bg-accent-hover text-bg-page transition flex items-center gap-1.5"
						>
							<FaPlus size={11} /> Create Workspace
						</button>
					) : undefined
				}
			/>

			{/* Primary Navigation Switcher */}
			<div className="flex border-b border-border-default mb-6 gap-6">
				<button
					onClick={() => {
						setActiveViewTab("explore");
						router.push("/orgs", undefined, { shallow: true });
					}}
					className={`pb-3 text-xs font-mono font-medium transition-all relative ${
						activeViewTab === "explore"
							? "text-accent"
							: "text-text-muted hover:text-text-primary"
					}`}
				>
					Explore Directory
					{activeViewTab === "explore" && (
						<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
					)}
				</button>
				{user && (
					<button
						onClick={() => {
							setActiveViewTab("my-orgs");
							router.push("/orgs?tab=my-organizations", undefined, { shallow: true });
						}}
						className={`pb-3 text-xs font-mono font-medium transition-all relative ${
							activeViewTab === "my-orgs"
								? "text-accent"
								: "text-text-muted hover:text-text-primary"
						}`}
					>
						Your Organizations
						{activeViewTab === "my-orgs" && (
							<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
						)}
					</button>
				)}
			</div>

			{activeViewTab === "explore" ? (
				<>
					{/* Toolbar / Search panel */}
					<div className="bg-bg-surface border border-border-default rounded-lg p-3 mb-6">
						<form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center">
							<div className="relative flex-1 w-full">
								<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted pointer-events-none">
									<FaSearch size={12} />
								</span>
								<input
									type="text"
									placeholder="Search organizations by title, slug, or keywords..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default focus:border-accent text-xs rounded-md pl-9 pr-3 py-2 text-text-primary outline-none transition font-sans"
								/>
							</div>

							<div className="flex gap-2 w-full md:w-auto">
								<BeastCodeSelect
									options={[
										{ value: "", label: "All Organization Types" },
										{ value: "university", label: "University / College" },
										{ value: "company", label: "Company / Enterprise" },
										{ value: "coding_club", label: "Coding Club" },
										{ value: "research_lab", label: "Research Lab" },
										{ value: "community", label: "Public Community" },
										{ value: "private_team", label: "Private Team" }
									]}
									value={typeFilter}
									onChange={(val) => setTypeFilter(val)}
									size="sm"
									className="flex-1 md:w-56"
								/>

								<button
									type="submit"
									className="bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default text-xs font-medium px-4 py-2 rounded-md transition"
								>
									Filter
								</button>
							</div>
						</form>
					</div>

						{/* Directories List */}
						{loading ? (
							<div className="flex flex-col justify-center items-center py-24 gap-3">
								<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
								<div className="text-xs text-text-muted font-mono">Loading workspaces...</div>
							</div>
						) : orgs.length === 0 ? (
							<div className="text-center py-16 bg-bg-surface border border-border-default rounded-lg p-8">
								<div className="w-12 h-12 rounded-md bg-bg-elevated flex items-center justify-center mx-auto mb-3 border border-border-default text-text-muted">
									<FaFolderOpen size={20} />
								</div>
								<h3 className="text-sm font-semibold text-text-primary">No workspaces found</h3>
								<p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
									We couldn&apos;t find any organizations matching your search filters. Try clearing your filters or create a new organization.
								</p>
								<button
									onClick={() => {
										setSearch("");
										setTypeFilter("");
									}}
									className="mt-4 bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-primary px-3.5 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1.5"
								>
									<FaUndoAlt size={10} /> Reset Filters
								</button>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{orgs.map((org) => (
									<div
										key={org.slug}
										className="relative bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col justify-between hover:border-accent/40 transition group cursor-pointer"
									>
										<Link
											href={`/orgs/${org.slug}`}
											prefetch={false}
											className="absolute inset-0 z-10"
											aria-label={`View ${org.name}`}
										/>
										<div className="relative z-0 flex flex-col justify-between h-full">
											<div>
												{/* Banner */}
												<div
													className="h-20 bg-cover bg-center relative"
													style={{
														backgroundImage: org.bannerUrl
															? `url(${org.bannerUrl})`
															: `linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(15, 18, 16, 0.95) 100%)`,
													}}
												>
													<div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
													<div className="absolute top-2.5 right-2.5 z-10">
														<span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-bg-surface/90 text-text-secondary border border-border-subtle backdrop-blur-xs">
															{(org.type || "coding_club").replace("_", " ")}
														</span>
													</div>
												</div>

												{/* Avatar placement */}
												<div className="px-4 pb-1.5 -mt-6 flex items-end gap-3 relative z-10">
													<OrganizationAvatar
														organization={org}
														size="lg"
														className="border border-border-default rounded-md shadow-md"
													/>
													<div className="mb-0.5 flex-1 min-w-0">
														<div className="flex items-center gap-1.5">
															<h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition">
																{org.name}
															</h3>
															{org.verified && (
																<FaCheckCircle className="text-accent shrink-0" size={12} title="Verified workspace" />
															)}
														</div>
														<span className="text-[10px] text-text-muted font-mono">@{org.slug}</span>
													</div>
												</div>

												{/* Body Description */}
												<div className="px-4 pt-2">
													<p className="text-xs text-text-secondary line-clamp-2 min-h-[32px] leading-relaxed">
														{org.description || "Welcome! No description uploaded yet for this organization workspace."}
													</p>
												</div>

												{/* Statistics Row */}
												<div className="px-4 py-2.5 flex items-center justify-between text-xs font-mono text-text-muted border-t border-border-subtle mt-3 bg-bg-elevated/20">
													<span className="flex items-center gap-1.5">
														<FaUsers size={11} className="text-accent" />
														{org.memberCount} members
													</span>
													<span className="flex items-center gap-1.5">
														<FaTrophy size={11} className="text-amber-400" />
														{org.contestCount} contests
													</span>
												</div>
											</div>

											{/* Actions card footer */}
											<div className="px-4 py-2 bg-bg-surface border-t border-border-subtle flex items-center justify-between">
												<span className="text-[9px] uppercase font-mono font-medium px-2 py-0.5 rounded bg-bg-elevated text-text-muted border border-border-subtle flex items-center gap-1">
													{org.visibility === "public" ? <FaGlobe size={8} /> : <FaLock size={8} />}
													{org.visibility}
												</span>
												<span className="text-xs font-mono text-accent group-hover:text-accent-hover transition flex items-center gap-1">
													{org.isMember ? "Enter Workspace" : "View Profile"} →
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</>
				) : (
					/* Your Organizations View */
					<div className="space-y-8">
						{loadingMyOrgs ? (
							<div className="flex flex-col justify-center items-center py-24 gap-3">
								<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
								<div className="text-xs text-text-muted font-mono">Retrieving your workspaces...</div>
							</div>
						) : (
							<>
								{/* 1. Pending Invitations Section */}
								{memberships.invited.length > 0 && (
									<div className="bg-bg-surface border border-accent/30 rounded-lg p-5">
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaEnvelopeOpenText className="text-accent" />
											Pending Invitations ({memberships.invited.length})
										</h2>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{memberships.invited.map((inv) => (
												<div key={inv.inviteId} className="bg-bg-elevated/40 border border-border-subtle rounded-md p-3.5 flex flex-col justify-between">
													<div className="flex gap-3">
														<OrganizationAvatar
															src={inv.orgLogo}
															name={inv.orgName}
															size={44}
															className="rounded-md border border-border-default shrink-0"
														/>
														<div className="min-w-0 flex-1">
															<h4 className="text-xs font-semibold text-text-primary truncate">{inv.orgName}</h4>
															<p className="text-[10px] text-text-muted font-mono">Role Offered: <span className="text-accent font-mono uppercase font-medium">{inv.roleId}</span></p>
															<p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{inv.description || "Workspace inviting you to join."}</p>
															<p className="text-[9px] text-text-muted mt-1 flex items-center gap-1 font-mono"><FaRegClock /> Invited by {inv.inviterName}</p>
														</div>
													</div>
													<div className="flex justify-end gap-2 mt-3 border-t border-border-subtle pt-2.5">
														<button
															onClick={() => handleInviteRespond(inv.inviteId, "decline")}
															disabled={actionPending === inv.inviteId}
															className="bg-bg-elevated hover:bg-bg-hover text-text-secondary border border-border-default font-medium text-xs px-3 py-1 rounded-md transition"
														>
															Decline
														</button>
														<button
															onClick={() => handleInviteRespond(inv.inviteId, "accept")}
															disabled={actionPending === inv.inviteId}
															className="bg-accent hover:bg-accent-hover text-bg-page font-medium text-xs px-3 py-1 rounded-md transition"
														>
															Accept & Join
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* 2. Favorites Workspaces */}
								{memberships.favorites.length > 0 && (
									<div>
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaStar className="text-amber-400" />
											Favorites ({memberships.favorites.length})
										</h2>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{memberships.favorites.map((org) => (
												<MyWorkspaceCard
													key={org.slug}
													org={org}
													onFavorite={handleToggleFavorite}
													onHide={handleToggleHidden}
													actionPending={actionPending}
												/>
											))}
										</div>
									</div>
								)}

								{/* 3. Owned Workspaces */}
								{memberships.owned.length > 0 && (
									<div>
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaShieldAlt className="text-accent" />
											Workspaces You Own ({memberships.owned.length})
										</h2>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{memberships.owned.map((org) => (
												<MyWorkspaceCard
													key={org.slug}
													org={org}
													onFavorite={handleToggleFavorite}
													onHide={handleToggleHidden}
													actionPending={actionPending}
												/>
											))}
										</div>
									</div>
								)}

								{/* 4. Administered Workspaces */}
								{memberships.administered.length > 0 && (
									<div>
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaShieldAlt className="text-amber-400" />
											Workspaces You Administer ({memberships.administered.length})
										</h2>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{memberships.administered.map((org) => (
												<MyWorkspaceCard
													key={org.slug}
													org={org}
													onFavorite={handleToggleFavorite}
													onHide={handleToggleHidden}
													actionPending={actionPending}
												/>
											))}
										</div>
									</div>
								)}

								{/* 5. Shared Memberships */}
								{memberships.member.length > 0 && (
									<div>
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaUsers className="text-accent" />
											Workspaces You Belong To ({memberships.member.length})
										</h2>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{memberships.member.map((org) => (
												<MyWorkspaceCard
													key={org.slug}
													org={org}
													onFavorite={handleToggleFavorite}
													onHide={handleToggleHidden}
													actionPending={actionPending}
												/>
											))}
										</div>
									</div>
								)}

								{/* 6. Pending Join Requests Sent */}
								{memberships.pendingRequests.length > 0 && (
									<div className="bg-bg-surface border border-border-default rounded-lg p-5">
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaRegClock className="text-text-muted" />
											Join Requests Sent ({memberships.pendingRequests.length})
										</h2>
										<div className="space-y-2.5">
											{memberships.pendingRequests.map((reqItem) => (
												<div key={reqItem.requestId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-bg-elevated/40 border border-border-subtle p-3 rounded-md">
													<div className="flex gap-3">
														<OrganizationAvatar
															src={reqItem.orgLogo}
															name={reqItem.orgName}
															size={36}
															className="rounded-md border border-border-default shrink-0"
														/>
														<div>
															<h4 className="text-xs font-semibold text-text-primary">{reqItem.orgName}</h4>
															<p className="text-[10px] text-text-muted font-mono mt-0.5">Submitted: {new Date(reqItem.submittedAt).toLocaleDateString()}</p>
															{reqItem.message && <p className="text-[10px] text-text-secondary mt-0.5 italic">&quot;{reqItem.message}&quot;</p>}
														</div>
													</div>
													<div className="flex items-center gap-2 w-full sm:w-auto justify-between border-t sm:border-t-0 border-border-subtle pt-2 sm:pt-0 shrink-0">
														<span className="text-[9px] uppercase font-mono font-medium tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
															Pending Review
														</span>
														<button
															onClick={() => handleCancelJoinRequest(reqItem.organizationId)}
															disabled={actionPending === reqItem.organizationId}
															className="bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 font-medium text-xs px-2.5 py-1 rounded-md transition"
														>
															Cancel Request
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* 7. Archived / Hidden Workspaces */}
								{memberships.archived.length > 0 && (
									<div className="bg-bg-surface border border-border-default rounded-lg p-5">
										<h2 className="text-xs font-mono font-medium text-text-muted flex items-center gap-2 mb-3 uppercase tracking-wider">
											<FaEyeSlash size={11} />
											Hidden / Archived Workspaces ({memberships.archived.length})
										</h2>
										<div className="space-y-2">
											{memberships.archived.map((org) => (
												<div key={org.slug} className="flex justify-between items-center bg-bg-elevated/40 p-2.5 rounded-md border border-border-subtle">
													<div className="flex items-center gap-2.5">
														<FaFolderOpen className="text-text-muted" size={14} />
														<div>
															<h4 className="text-xs font-medium text-text-primary">{org.displayName || org.name}</h4>
															<span className="text-[10px] text-text-muted font-mono">@{org.slug}</span>
														</div>
													</div>
													<button
														onClick={() => handleToggleHidden(org.id, false)}
														disabled={actionPending === org.id}
														className="text-text-muted hover:text-text-primary border border-border-default text-xs px-2.5 py-1 rounded-md transition flex items-center gap-1"
													>
														<FaEye size={10} /> Restore
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Empty State */}
								{memberships.owned.length === 0 &&
									memberships.administered.length === 0 &&
									memberships.member.length === 0 &&
									memberships.favorites.length === 0 &&
									memberships.invited.length === 0 &&
									memberships.pendingRequests.length === 0 && (
										<div className="text-center py-16 bg-bg-surface border border-border-default rounded-lg p-8">
											<div className="w-12 h-12 rounded-md bg-bg-elevated flex items-center justify-center mx-auto mb-3 border border-border-default text-text-muted">
												<FaFolderOpen size={20} />
											</div>
											<h3 className="text-sm font-semibold text-text-primary">No active workspaces</h3>
											<p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
												You do not belong to any organizations yet. Find an organization in the directory or create your own.
											</p>
											<button
												onClick={() => setActiveViewTab("explore")}
												className="mt-4 bg-accent hover:bg-accent-hover text-bg-page px-3.5 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1.5"
											>
												Explore Directory <FaArrowRight size={10} />
											</button>
										</div>
									)}
							</>
						)}
					</div>
				)}

			{/* Create Organization Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fadeIn">
					<div className="bg-bg-surface border border-border-default rounded-lg w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
						<div className="bg-bg-surface px-5 py-3 border-b border-border-default flex justify-between items-center">
							<h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-muted">Create New Workspace</h3>
							<button
								onClick={() => setShowCreateModal(false)}
								className="text-text-muted hover:text-text-primary transition text-base p-1"
							>
								&times;
							</button>
						</div>

						<form onSubmit={handleCreateOrg} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto font-sans">
							<div>
								<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
									Organization Name <span className="text-rose-400">*</span>
								</label>
								<input
									type="text"
									placeholder="e.g. Stanford Coding Club"
									value={newOrgName}
									onChange={(e) => setNewOrgName(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Workspace Type <span className="text-rose-400">*</span>
									</label>
									<BeastCodeSelect
										options={[
											{ value: "university", label: "University" },
											{ value: "company", label: "Company" },
											{ value: "coding_club", label: "Coding Club" },
											{ value: "research_lab", label: "Research Lab" },
											{ value: "community", label: "Public Community" },
											{ value: "private_team", label: "Private Team" }
										]}
										value={newOrgType}
										onChange={(val) => setNewOrgType(val)}
										size="sm"
									/>
								</div>
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Visibility <span className="text-rose-400">*</span>
									</label>
									<BeastCodeSelect
										options={[
											{ value: "public", label: "PUBLIC (Visible, searchable, join request allowed)" },
											{ value: "private", label: "PRIVATE (Visible, searchable, requires approval)" },
											{ value: "secret", label: "SECRET (Undiscoverable, invite-only)" }
										]}
										value={newOrgVisibility}
										onChange={(val) => setNewOrgVisibility(val)}
										size="sm"
									/>
								</div>
							</div>

							{/* Visibility Explanations */}
							<div className="bg-bg-elevated/40 border border-border-subtle rounded-md p-3 space-y-2 font-mono text-[10px]">
								<div className="leading-relaxed">
									<strong className="text-text-primary uppercase tracking-wider block mb-0.5">PUBLIC</strong>
									<span className="text-text-muted">Visible in directory. Searchable. Anyone can request to join immediately.</span>
								</div>
								<div className="leading-relaxed border-t border-border-subtle pt-2">
									<strong className="text-accent uppercase tracking-wider block mb-0.5">PRIVATE</strong>
									<span className="text-text-muted">Visible in directory. Content hidden. Requires administrator approval.</span>
								</div>
								<div className="leading-relaxed border-t border-border-subtle pt-2">
									<strong className="text-rose-400 uppercase tracking-wider block mb-0.5">SECRET</strong>
									<span className="text-text-muted">Completely hidden from search and directory. Only accessible via token or direct link.</span>
								</div>
							</div>

							<div>
								<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
									Short Description
								</label>
								<textarea
									placeholder="Write a brief overview describing the workspace..."
									value={newOrgDesc}
									onChange={(e) => setNewOrgDesc(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans h-16 resize-none"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Website URL
									</label>
									<input
										type="text"
										placeholder="e.g. stanford.edu"
										value={newOrgWebsite}
										onChange={(e) => setNewOrgWebsite(e.target.value)}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
									/>
								</div>
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Industry Category
									</label>
									<input
										type="text"
										placeholder="e.g. Education"
										value={newOrgCategory}
										onChange={(e) => setNewOrgCategory(e.target.value)}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Workspace Location
									</label>
									<input
										type="text"
										placeholder="e.g. Stanford, CA"
										value={newOrgLocation}
										onChange={(e) => setNewOrgLocation(e.target.value)}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
									/>
								</div>
								<div>
									<label className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider block mb-1">
										Contact Email
									</label>
									<input
										type="email"
										placeholder="e.g. contact@stanford.edu"
										value={newOrgEmail}
										onChange={(e) => setNewOrgEmail(e.target.value)}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent text-xs rounded-md p-2.5 text-text-primary outline-none transition font-sans"
									/>
								</div>
							</div>

							{errorMsg && <p className="text-xs text-rose-400 font-mono">{errorMsg}</p>}
							{successMsg && <p className="text-xs text-accent font-mono">{successMsg}</p>}

							<div className="border-t border-border-subtle pt-3 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="px-3.5 py-1.5 bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-default rounded-md text-xs font-medium transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={createLoading}
									className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-bg-page rounded-md text-xs font-medium disabled:opacity-50 transition"
								>
									{createLoading ? "Creating..." : "Create Workspace"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</AppShell>
	);
}

const getOrgIcon = (type?: string) => {
	switch (type) {
		case "university":
			return <FaSchool className="text-accent" size={18} />;
		case "company":
			return <FaBriefcase className="text-accent" size={18} />;
		default:
			return <FaFolderOpen className="text-accent" size={18} />;
	}
};

// Sub-component for individual card in My Organizations
function MyWorkspaceCard({
	org,
	onFavorite,
	onHide,
	actionPending,
}: {
	org: any;
	onFavorite: (orgId: string, isFav: boolean) => void;
	onHide: (orgId: string, isHide: boolean) => void;
	actionPending: string | null;
}) {
	return (
		<div className="relative bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col justify-between hover:border-accent/40 transition group cursor-pointer">
			<Link
				href={`/orgs/${org.slug}`}
				prefetch={false}
				className="absolute inset-0 z-10"
				aria-label={`Enter ${org.displayName || org.name}`}
			/>
			<div className="relative z-0 flex flex-col justify-between h-full w-full">
				<div>
					{/* Banner */}
					<div
						className="h-20 bg-cover bg-center relative"
						style={{
							backgroundImage: org.banner
								? `url(${org.banner})`
								: `linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(15, 18, 16, 0.95) 100%)`,
						}}
					>
						<div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

						{/* Top preference buttons (Star / Unstar / Hide) */}
						<div className="absolute top-2 right-2 flex gap-1 z-20">
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onFavorite(org.id, !org.isFavorite);
								}}
								disabled={actionPending === org.id}
								className="w-6 h-6 rounded-md bg-bg-surface/80 hover:bg-bg-surface text-amber-400 border border-border-default flex items-center justify-center transition"
								title={org.isFavorite ? "Unstar workspace" : "Star workspace"}
							>
								{org.isFavorite ? <FaStar size={11} /> : <FaRegStar size={11} className="text-text-muted" />}
							</button>
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onHide(org.id, true);
								}}
								disabled={actionPending === org.id}
								className="w-6 h-6 rounded-md bg-bg-surface/80 hover:bg-bg-surface text-text-muted hover:text-text-primary border border-border-default flex items-center justify-center transition"
								title="Hide workspace"
							>
								<FaEyeSlash size={11} />
							</button>
						</div>
					</div>

					{/* Avatar & Title */}
					<div className="px-4 pb-1.5 -mt-6 flex items-end gap-3 relative z-10">
						<OrganizationAvatar
							organization={org}
							size={44}
							className="rounded-md border border-border-default shadow-md shrink-0"
						/>
						<div className="mb-0.5 flex-1 min-w-0">
							<h3 className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition">
								{org.displayName || org.name}
							</h3>
							<span className="text-[10px] text-text-muted font-mono">@{org.slug}</span>
						</div>
					</div>

					{/* Description */}
					<div className="px-4 pt-2">
						<p className="text-xs text-text-secondary line-clamp-2 min-h-[30px] leading-relaxed">
							{org.description || "Welcome! No description uploaded yet."}
						</p>
					</div>

					{/* Stats Row */}
					<div className="px-4 py-2 flex gap-4 text-xs font-mono text-text-muted border-t border-border-subtle mt-2.5 bg-bg-elevated/20">
						<span className="flex items-center gap-1">
							<FaUsers size={11} className="text-accent" />
							{org.memberCount || 0} members
						</span>
						{org.contestCount !== undefined && (
							<span className="flex items-center gap-1">
								<FaTrophy size={11} className="text-amber-400" />
								{org.contestCount} contests
							</span>
						)}
					</div>
				</div>

				{/* Action buttons footer */}
				<div className="px-4 py-2 bg-bg-surface border-t border-border-subtle flex items-center justify-between">
					<span className="text-[9px] uppercase font-mono font-medium px-2 py-0.5 rounded bg-bg-elevated text-text-muted border border-border-subtle flex items-center gap-1">
						<FaShieldAlt size={8} className="text-accent" />
						{org.membershipRole || "Member"}
					</span>
					<span className="text-xs font-mono text-accent group-hover:text-accent-hover transition flex items-center gap-1">
						Enter Workspace →
					</span>
				</div>
			</div>
		</div>
	);
}
