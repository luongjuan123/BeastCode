import React, { useEffect, useState } from "react";
import AppShell from "@/components/UI/AppShell";
import PageHeader from "@/components/UI/PageHeader";
import Badge from "@/components/UI/Badge";
import BeastCodePagination from "@/components/UI/BeastCodePagination";
import { getServerTime, getContestStatus, syncContestStatus } from "@/utils/contestStatusService";
import useHasMounted from "@/hooks/useHasMounted";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
	collection, getDocs, doc, setDoc, getDoc, query, where, orderBy, updateDoc, increment
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import {
	FaGlobe, FaLock, FaCalendarAlt, FaHourglassHalf, FaHistory,
	FaCheckCircle, FaUserCheck, FaTrophy, FaChevronRight,
	FaSpinner, FaArrowRight, FaUniversity, FaClock
} from "react-icons/fa";

interface ContestItem {
	id: string;
	title: string;
	description: string;
	banner: string;
	startTime: number;
	endTime: number;
	duration: number;
	visibility: string;
	securityLevel: string;
	status: string;
	virtualEnabled: boolean;
	registrationEnabled: boolean;
	university?: string;
	leaderboardFreeze: number;
}

const LiveCountdown: React.FC<{ targetTime: number }> = ({ targetTime }) => {
	const [timeLeft, setTimeLeft] = useState("");

	useEffect(() => {
		const updateTimer = () => {
			const now = Date.now();
			const diff = Math.max(0, targetTime - now);
			if (diff <= 0) {
				setTimeLeft("00:00:00");
				return;
			}
			const hrs = Math.floor(diff / (1000 * 60 * 60));
			const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const secs = Math.floor((diff % (1000 * 60)) / 1000);
			setTimeLeft(
				`${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
			);
		};
		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [targetTime]);

	return (
		<span className="font-mono text-xs px-2 py-0.5 rounded bg-bg-surface-elevated text-accent border border-accent/20 inline-flex items-center gap-1.5">
			<FaClock className="text-accent" size={10} /> {timeLeft}
		</span>
	);
};

export default function ContestsPage() {
	const router = useRouter();
	const hasMounted = useHasMounted();
	const [user] = useAuthState(auth);
	const setAuthModal = useSetRecoilState(authModalState);

	const [contests, setContests] = useState<ContestItem[]>([]);
	const [userRegistrations, setUserRegistrations] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(true);
	const [actionId, setActionId] = useState<string | null>(null);

	// Password modal state
	const [showPassModal, setShowPassModal] = useState<ContestItem | null>(null);
	const [passInput, setPassInput] = useState("");

	const [statusRibbon, setStatusRibbon] = useState<{ type: "success" | "error"; message: string } | null>(null);
	const [pastPage, setPastPage] = useState(1);

	const triggerRibbon = (type: "success" | "error", message: string) => {
		setStatusRibbon({ type, message });
		setTimeout(() => setStatusRibbon(null), 4000);
	};

	const fetchContests = async () => {
		setLoading(true);
		try {
			// Get contests (exclude draft unless admin. For now, get all where status != draft)
			const q = query(collection(firestore, "contests"), orderBy("createdAt", "desc"));
			const querySnapshot = await getDocs(q);
			const list: ContestItem[] = [];
			const now = getServerTime();
			querySnapshot.forEach((doc) => {
				const data = doc.data();
				// Hide draft contests for non-logged-in/non-admin users
				if (data.status === "draft") return;

				const contestData = {
					id: doc.id,
					startTime: data.startTime || 0,
					endTime: data.endTime || 0,
					leaderboardFreeze: data.leaderboardFreeze || 0,
					status: data.status || "draft",
					registrationEnabled: data.registrationEnabled !== false,
				};

				const computedStatus = getContestStatus(contestData, now);

				// Sync to database in background if status drifted
				if (data.status !== computedStatus) {
					syncContestStatus(doc.id, data.status || "draft", computedStatus);
				}

				list.push({
					id: doc.id,
					title: data.title || doc.id,
					description: data.description || "",
					banner: data.banner || "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=60",
					startTime: contestData.startTime,
					endTime: contestData.endTime,
					duration: data.duration || 120,
					visibility: data.visibility || "public",
					securityLevel: data.securityLevel || "standard",
					status: computedStatus,
					virtualEnabled: !!data.virtualEnabled,
					registrationEnabled: contestData.registrationEnabled,
					university: data.university || "",
					leaderboardFreeze: contestData.leaderboardFreeze,
				});
			});
			setContests(list);

			// Fetch user registrations if logged in
			if (user) {
				const regSnap = await getDocs(
					query(collection(firestore, "contest_participants"), where("uid", "==", user.uid))
				);
				const regs: Record<string, boolean> = {};
				regSnap.forEach((doc) => {
					const data = doc.data();
					regs[data.contestId] = true;
				});
				setUserRegistrations(regs);
			}
		} catch (err) {
			console.error("Error loading contests:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchContests();
	}, [user]);

	// Auto-transition contests dynamically in-memory every 5 seconds
	useEffect(() => {
		if (contests.length === 0) return;

		const interval = setInterval(() => {
			const now = getServerTime();
			let hasChanges = false;
			const updated = contests.map((c) => {
				const contestData = {
					id: c.id,
					startTime: c.startTime,
					endTime: c.endTime,
					leaderboardFreeze: c.leaderboardFreeze || 0,
					status: c.status,
					registrationEnabled: c.registrationEnabled,
				};
				const computed = getContestStatus(contestData, now);
				if (computed !== c.status) {
					hasChanges = true;
					syncContestStatus(c.id, c.status, computed);
					return { ...c, status: computed };
				}
				return c;
			});

			if (hasChanges) {
				setContests(updated);
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [contests]);

	// Register logic
	const handleRegister = async (contest: ContestItem) => {
		if (!user) {
			setAuthModal({ isOpen: true, type: "login" });
			return;
		}

		setActionId(contest.id);

		try {
			// 1. Password check if password visibility
			if (contest.visibility === "password") {
				setShowPassModal(contest);
				setPassInput("");
				setActionId(null);
				return;
			}

			// 2. University email domain check
			if (contest.visibility === "university" && contest.university) {
				const userEmail = user.email || "";
				if (!userEmail.endsWith(`@${contest.university}`) && !userEmail.endsWith(`.${contest.university}`)) {
					triggerRibbon("error", `This contest is restricted to users with a domain of "${contest.university}".`);
					setActionId(null);
					return;
				}
			}

			await executeRegister(contest.id);
		} catch (err: any) {
			console.error("Registration error:", err);
			triggerRibbon("error", getFriendlyErrorMessage(err, "Registration failed. Please try again."));
			setActionId(null);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!showPassModal || !user) return;

		const targetContest = showPassModal;
		setShowPassModal(null);
		setActionId(targetContest.id);

		try {
			// Fetch the password to verify
			const contestDoc = await getDoc(doc(firestore, "contests", targetContest.id));
			const actualPassword = contestDoc.data()?.password;

			if (passInput.trim() !== actualPassword) {
				triggerRibbon("error", "Incorrect password.");
				setActionId(null);
				return;
			}

			await executeRegister(targetContest.id);
		} catch (err: any) {
			console.error("Password verify error:", err);
			triggerRibbon("error", "Verification failed.");
			setActionId(null);
		}
	};

	const executeRegister = async (contestId: string) => {
		if (!user) return;
		try {
			const regId = `${contestId}_${user.uid}`;
			const regRef = doc(firestore, "contest_participants", regId);
			
			await setDoc(regRef, {
				id: regId,
				contestId,
				uid: user.uid,
				username: user.email?.split("@")[0] || "user",
				displayName: user.displayName || user.email?.split("@")[0] || "User",
				registeredAt: Date.now(),
				status: "registered",
				isVirtual: false
			});

			// Update stats counter
			const statsRef = doc(firestore, "contest_statistics", contestId);
			const statsDoc = await getDoc(statsRef);
			if (statsDoc.exists()) {
				await updateDoc(statsRef, { participantsCount: increment(1) });
			}

			setUserRegistrations(prev => ({ ...prev, [contestId]: true }));
			triggerRibbon("success", "Successfully registered for the contest!");

			// Send registration confirmation email
			try {
				const userToken = await user.getIdToken();
				await fetch("/api/send-registration-confirmation-email", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${userToken}`
					},
					body: JSON.stringify({
						contestId
					})
				});
			} catch (emailErr) {
				console.error("Failed to send registration confirmation email:", emailErr);
			}
		} catch (e: any) {
			triggerRibbon("error", getFriendlyErrorMessage(e, "Failed to register. Please try again."));
		} finally {
			setActionId(null);
		}
	};

	// Start Virtual Participation
	const handleStartVirtual = async (contestId: string) => {
		if (!user) {
			setAuthModal({ isOpen: true, type: "login" });
			return;
		}

		setActionId(contestId);
		try {
			const regId = `${contestId}_${user.uid}`;
			const regRef = doc(firestore, "contest_participants", regId);

			const existingSnap = await getDoc(regRef);
			if (existingSnap.exists() && existingSnap.data().status === "active") {
				// Redirect directly if already active virtual participant
				router.push(`/contests/${contestId}`);
				return;
			}

			const now = Date.now();
			await setDoc(regRef, {
				id: regId,
				contestId,
				uid: user.uid,
				username: user.email?.split("@")[0] || "user",
				displayName: user.displayName || user.email?.split("@")[0] || "User",
				registeredAt: now,
				joinedAt: now,
				status: "active",
				isVirtual: true,
				virtualStartTime: now
			});

			triggerRibbon("success", "Virtual participation session started!");
			router.push(`/contests/${contestId}`);
		} catch (e: any) {
			console.error("Virtual join error:", e);
			triggerRibbon("error", "Failed to start virtual session.");
			setActionId(null);
		}
	};

	if (!hasMounted) return null;

	const running = contests.filter((c) => c.status === "running" || c.status === "frozen");
	const upcoming = contests.filter((c) => c.status === "scheduled" || c.status === "registration_open");
	const past = contests.filter((c) => c.status === "ended" || c.status === "archived");

	const pastPageSize = 20;
	const paginatedPast = past.slice((pastPage - 1) * pastPageSize, pastPage * pastPageSize);
	const totalPastPages = Math.ceil(past.length / pastPageSize);

	return (
		<AppShell activeNav="Contests">
			{/* Status Alert Banner */}
			{statusRibbon && (
				<div className={`fixed top-16 right-6 z-50 p-3 rounded-md border text-xs font-mono transition-all duration-200 ${
					statusRibbon.type === "success"
						? "bg-bg-surface text-accent border-accent/30"
						: "bg-bg-surface text-bc-error border-bc-error/30"
				}`}>
					{statusRibbon.message}
				</div>
			)}

			<div className='max-w-[1180px] mx-auto px-4 py-8 space-y-8'>
				<PageHeader
					breadcrumbs={[
						{ label: "Home", href: "/" },
						{ label: "Contests" },
					]}
					title="Contests"
					description="Scheduled and real-time algorithmic programming competitions. Compete live, solve timed challenges, and earn global rating points."
					metrics={[
						{ label: "Total Contests", value: contests.length },
						{ label: "Running", value: running.length },
						{ label: "Upcoming", value: upcoming.length },
					]}
				/>

				{loading ? (
					<div className='flex flex-col justify-center items-center py-20 gap-3'>
						<div className='w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin' />
						<div className='text-text-muted font-mono text-xs'>Loading contests...</div>
					</div>
				) : (
					<div className='space-y-8'>
						
						{/* 1. RUNNING SECTION */}
						{running.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
									<span className='w-2 h-2 rounded-full bg-accent animate-pulse' />
									<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary'>
										Running Contests
									</h2>
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{running.map((c) => {
										const isReg = userRegistrations[c.id];
										return (
											<div key={c.id} className='rounded-lg border border-border-subtle bg-bg-surface overflow-hidden hover:border-border-strong transition-colors'>
												<div className='h-28 bg-cover bg-center relative' style={{ backgroundImage: `url(${c.banner})` }}>
													<div className='absolute inset-0 bg-bg-base/80' />
													<div className='absolute top-3 right-3'>
														<LiveCountdown targetTime={c.endTime} />
													</div>
													<div className='absolute bottom-3 left-4 right-4'>
														<span className='text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded'>
															{c.status === "frozen" ? "Frozen" : "Active"}
														</span>
														<h3 className='text-base font-bold text-text-primary mt-1 leading-tight'>{c.title}</h3>
													</div>
												</div>
												<div className='p-4 space-y-3'>
													<p className='text-xs text-text-secondary line-clamp-2'>{c.description}</p>
													<div className='flex items-center justify-between text-xs font-mono text-text-muted'>
														<span className='flex items-center gap-1.5'><FaHourglassHalf className='text-accent' /> {c.duration} mins</span>
														<span className='flex items-center gap-1.5 capitalize'>
															{c.visibility === "public" ? <FaGlobe className='text-accent' /> : <FaLock className='text-bc-warning' />}
															{c.visibility}
														</span>
													</div>
													
													{/* Action button */}
													{isReg || !c.registrationEnabled ? (
														<Link
															href={`/contests/${c.id}`}
															className='w-full py-2 rounded-md font-semibold text-xs bg-accent hover:bg-accent/90 text-bg-base transition flex items-center justify-center gap-1.5'
														>
															Enter Arena <FaArrowRight size={10} />
														</Link>
													) : (
														<button
															onClick={() => handleRegister(c)}
															disabled={actionId === c.id}
															className='w-full py-2 rounded-md font-semibold text-xs hover:bg-accent/10 transition border border-accent/40 text-accent flex items-center justify-center gap-1.5'
														>
															{actionId === c.id ? <FaSpinner className='animate-spin' /> : "Register & Join"}
														</button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* 2. UPCOMING SECTION */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
								<FaCalendarAlt size={13} className='text-accent' />
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary'>
									Upcoming Contests
								</h2>
							</div>
							{upcoming.length === 0 ? (
								<div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border-subtle text-center gap-2 bg-bg-surface/30">
									<FaCalendarAlt size={18} className="text-text-muted" />
									<p className="text-xs text-text-muted">There are no upcoming contests scheduled right now.</p>
								</div>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{upcoming.map((c) => {
										const isReg = userRegistrations[c.id];
										return (
											<div key={c.id} className='rounded-lg border border-border-subtle bg-bg-surface overflow-hidden hover:border-border-strong transition-colors'>
												<div className='h-20 bg-cover bg-center relative' style={{ backgroundImage: `url(${c.banner})` }}>
													<div className='absolute inset-0 bg-bg-base/75' />
													<div className='absolute bottom-2.5 left-4 right-4'>
														<h3 className='text-sm font-bold text-text-primary leading-tight'>{c.title}</h3>
													</div>
												</div>
												<div className='p-4 space-y-3'>
													<p className='text-xs text-text-secondary line-clamp-2'>{c.description}</p>
													
													<div className='space-y-1 text-xs font-mono text-text-muted'>
														<p><span className='text-text-secondary'>Starts:</span> {new Date(c.startTime).toLocaleString()}</p>
														<p><span className='text-text-secondary'>Duration:</span> {c.duration} minutes</p>
														{c.visibility === "university" && (
															<p className='text-[10px] text-accent font-mono flex items-center gap-1 mt-0.5'>
																<FaUniversity /> Restricted to @{c.university} domain
															</p>
														)}
													</div>

													<div className='flex items-center justify-between pt-1 border-t border-border-subtle'>
														<span className='flex items-center gap-1 text-xs font-mono text-text-muted capitalize'>
															{c.visibility === "public" ? <FaGlobe className='text-accent' /> : <FaLock className='text-bc-warning' />}
															{c.visibility}
														</span>

														{isReg ? (
															<Link
																href={`/contests/${c.id}`}
																className='text-xs font-semibold text-accent hover:underline flex items-center gap-1 px-2.5 py-1 rounded border border-accent/20 bg-accent/5'
															>
																<FaCheckCircle size={10} /> Registered
															</Link>
														) : (
															<button
																onClick={() => handleRegister(c)}
																disabled={actionId === c.id}
																className='px-3.5 py-1.5 rounded-md text-xs font-semibold bg-accent hover:bg-accent/90 transition text-bg-base flex items-center gap-1.5'
															>
																{actionId === c.id ? <FaSpinner className='animate-spin' /> : "Register"}
															</button>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* 3. PAST SECTION */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
								<FaHistory size={13} className='text-text-muted' />
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary'>
									Past Contests & Archives
								</h2>
							</div>
							{past.length === 0 ? (
								<div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border-subtle text-center gap-2 bg-bg-surface/30">
									<FaHistory size={18} className="text-text-muted" />
									<p className="text-xs text-text-muted">The contest archives are currently empty.</p>
								</div>
							) : (
								<div className="space-y-4">
									<div className='border border-border-subtle rounded-md overflow-hidden bg-bg-surface'>
										<div className='overflow-x-auto'>
											<table className='w-full text-xs text-left text-text-secondary'>
												<thead>
													<tr className="border-b border-border-subtle bg-bg-surface-elevated text-[11px] font-mono uppercase text-text-muted">
														<th className='px-4 py-2.5'>Contest Name</th>
														<th className='px-4 py-2.5 w-36'>Ended Date</th>
														<th className='px-4 py-2.5 w-28'>Duration</th>
														<th className='px-4 py-2.5 w-40 text-right pr-6'>Participation</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-border-subtle'>
													{paginatedPast.map((c) => (
														<tr key={c.id} className='hover:bg-bg-surface-hover transition-colors'>
															<td className='px-4 py-3'>
																<Link
																	href={`/contests/${c.id}`}
																	className='font-semibold text-text-primary hover:text-accent transition-colors'
																>
																	{c.title}
																</Link>
																<p className='text-[11px] text-text-muted line-clamp-1 mt-0.5'>{c.description}</p>
															</td>
															<td className='px-4 py-3 font-mono text-xs text-text-muted'>
																{new Date(c.endTime).toLocaleDateString()}
															</td>
															<td className='px-4 py-3 font-mono text-xs text-text-muted'>
																{c.duration} mins
															</td>
															<td className='px-4 py-3 text-right pr-4'>
																<div className='flex justify-end gap-1.5'>
																	{c.virtualEnabled && (
																		<button
																			onClick={() => handleStartVirtual(c.id)}
																			disabled={actionId === c.id}
																			className='text-xs font-mono px-2.5 py-1 rounded border border-accent/30 hover:bg-accent/10 text-accent transition-colors flex items-center gap-1'
																		>
																			{actionId === c.id ? <FaSpinner className='animate-spin' /> : "Virtual"}
																		</button>
																	)}
																	<Link
																		href={`/contests/${c.id}`}
																		className='text-xs font-mono px-2.5 py-1 rounded bg-bg-surface-elevated hover:bg-bg-surface-hover text-text-secondary hover:text-text-primary border border-border-subtle transition-colors flex items-center gap-1'
																	>
																		Results <FaChevronRight size={8} />
																	</Link>
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>

									{totalPastPages > 1 && (
										<div className="rounded-md border border-border-subtle bg-bg-surface">
											<BeastCodePagination
												currentPage={pastPage}
												totalPages={totalPastPages}
												onPageChange={setPastPage}
												totalItems={past.length}
												pageSize={pastPageSize}
											/>
										</div>
									)}
								</div>
							)}
						</div>

					</div>
				)}
			</div>

			{/* Join Password Modal */}
			{showPassModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-[#080909]/85'>
					<form onSubmit={handlePasswordSubmit} className='bg-bg-surface border border-border-default rounded-lg p-5 max-w-sm w-full mx-4 shadow-lg'>
						<h3 className='text-sm font-semibold text-text-primary mb-1'>Passcode Required</h3>
						<p className='text-text-muted text-xs mb-3'>
							Contest <span className='text-accent font-mono'>&quot;{showPassModal.title}&quot;</span> is password-protected.
						</p>

						<input
							type='password'
							placeholder='Enter passcode'
							value={passInput}
							onChange={(e) => setPassInput(e.target.value)}
							autoComplete='off'
							autoCorrect='off'
							autoCapitalize='off'
							spellCheck={false}
							className='w-full p-2 text-xs rounded-md outline-none border border-border-subtle bg-bg-base focus:border-accent font-mono mb-4 text-text-primary'
							required
							autoFocus
						/>

						<div className='flex justify-end gap-2'>
							<button
								type='button'
								onClick={() => setShowPassModal(null)}
								className='px-3 py-1.5 bg-bg-surface-elevated text-text-secondary hover:text-text-primary rounded-md text-xs font-mono border border-border-subtle'
							>
								Cancel
							</button>
							<button
								type='submit'
								className='px-3.5 py-1.5 bg-accent text-bg-base rounded-md text-xs font-semibold hover:bg-accent/90'
							>
								Verify & Register
							</button>
						</div>
					</form>
				</div>
			)}
		</AppShell>
	);
}
