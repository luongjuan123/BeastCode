import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import Topbar from "@/components/Topbar/Topbar";
import useHasMounted from "@/hooks/useHasMounted";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { getServerTime, getContestStatus, syncContestStatus } from "@/utils/contestStatusService";
import { auth, firestore } from "@/firebase/firebase";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import { useAuthState } from "react-firebase-hooks/auth";
import {
	doc, getDoc, getDocs, collection, query, where,
	orderBy, addDoc, onSnapshot, increment, updateDoc, setDoc
} from "firebase/firestore";
import Link from "next/link";
import { useSetRecoilState } from "recoil";
import ErrorDisplay from "@/components/UI/ErrorDisplay";
import { authModalState } from "@/atoms/authModalAtom";
import { useAdmin } from "@/hooks/useAdmin";
import { useContestStandings } from "@/hooks/useContestStandings";
import {
	FaGlobe, FaLock, FaHourglassHalf, FaTrophy, FaVolumeUp,
	FaQuestionCircle, FaFileAlt, FaComments, FaUsers, FaChartPie,
	FaSpinner, FaCheckCircle, FaTimesCircle, FaArrowRight,
	FaFlag, FaBolt, FaCrown, FaCheck, FaTimes, FaList, FaChevronLeft,
	FaMedal
} from "react-icons/fa";

interface Contest {
	id: string;
	title: string;
	description: string;
	banner: string;
	startTime: number;
	endTime: number;
	duration: number;
	visibility: string;
	securityLevel: string;
	status: string; // draft, scheduled, running, ended, archived
	rules: string;
	virtualEnabled: boolean;
	registrationEnabled: boolean;
	leaderboardFreeze: number;
	penaltyRules: {
		minutesPerIncorrect: number;
	};
	password?: string;
	university?: string;
	maxParticipants?: number;
}

interface ContestProblem {
	id: string;
	problemId: string;
	label: string; // A, B, C...
	points: number;
	difficulty: string;
	order: number;
	customConstraints: string;
	title?: string;
	solveCount?: number;
	attemptsCount?: number;
}

interface Participant {
	uid: string;
	username: string;
	displayName: string;
	status: string; // registered, active, terminated
	isVirtual: boolean;
	joinedAt?: number;
	virtualStartTime?: number;
}

interface Clarification {
	id: string;
	uid: string;
	username: string;
	question: string;
	answer: string;
	isPublic: boolean;
	askedAt: number;
	answeredAt?: number;
}

interface Announcement {
	id: string;
	title: string;
	content: string;
	timestamp: number;
}

interface Submission {
	id: string;
	problemId: string;
	uid: string;
	username: string;
	language: string;
	status: string;
	timestamp: number;
	runtime: number;
	memory: number;
	verdict: string;
	score: number;
	penaltyMinutes: number;
}

interface LeaderboardRow {
	uid: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	rank: number;
	score: number;
	penalty: number;
	problemsSolved: Record<string, { solved: boolean; attempts: number; time: number }>;
}

export default function ContestPortal() {
	const router = useRouter();
	const { cid } = router.query;
	const hasMounted = useHasMounted();
	const [user] = useAuthState(auth);
	const setAuthModal = useSetRecoilState(authModalState);
	const { standings } = useContestStandings(cid as string);

	const [contest, setContest] = useState<Contest | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("overview");

	const [isAdmin, loadingAdmin] = useAdmin();
	const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
	const [passcodeInput, setPasscodeInput] = useState("");
	const [passcodeError, setPasscodeError] = useState("");

	useEffect(() => {
		if (typeof window !== "undefined" && cid && contest) {
			const stored = sessionStorage.getItem(`contest_passcode_${cid}`);
			if (stored && stored === contest.password) {
				setIsPasscodeVerified(true);
			}
		}
	}, [cid, contest]);

	useEffect(() => {
		if (router.query.tab) {
			setActiveTab(router.query.tab as string);
		}
	}, [router.query.tab]);

	const nowTime = getServerTime();
	const computedStatus = contest
		? getContestStatus(
				{
					id: contest.id,
					startTime: contest.startTime,
					endTime: contest.endTime,
					leaderboardFreeze: contest.leaderboardFreeze || 0,
					status: contest.status,
					registrationEnabled: contest.registrationEnabled !== false,
				},
				nowTime
		  )
		: "draft";

	// Perform background synchronization if status changed
	useEffect(() => {
		if (contest && computedStatus !== contest.status) {
			syncContestStatus(contest.id, contest.status, computedStatus);
		}
	}, [contest, computedStatus]);

	const isContestRunning = computedStatus === "running" || computedStatus === "frozen";
	const isContestEnded = computedStatus === "ended" || computedStatus === "archived";
	const isContestScheduled = computedStatus === "scheduled" || computedStatus === "registration_open";

	// Contest Participant state
	const [participantState, setParticipantState] = useState<Participant | null>(null);
	const [isRegistered, setIsRegistered] = useState(false);
	const [isRegisteredLoading, setIsRegisteredLoading] = useState(true);

	// Timer state
	const [timeLeft, setTimeLeft] = useState("");
	const [contestStateLabel, setContestStateLabel] = useState("");

	// Data tabs state
	const [problems, setProblems] = useState<ContestProblem[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [clarifications, setClarifications] = useState<Clarification[]>([]);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
	const [editorialMarkdown, setEditorialMarkdown] = useState("");

	// Forms
	const [clarQuestion, setClarQuestion] = useState("");
	const [submittingClar, setSubmittingClar] = useState(false);

	// Discussion state
	const [comments, setComments] = useState<{ id: string; username: string; text: string; timestamp: number }[]>([]);
	const [newComment, setNewComment] = useState("");

	const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const triggerStatus = (type: "success" | "error", text: string) => {
		setStatusMsg({ type, text });
		setTimeout(() => setStatusMsg(null), 4000);
	};

	// --- 1. COUNTDOWN TIMER ENGINE ---
	useEffect(() => {
		if (!contest) return;

		const interval = setInterval(() => {
			const now = getServerTime();
			let targetTime = 0;
			let label = "";

			const computed = getContestStatus(
				{
					id: contest.id,
					startTime: contest.startTime,
					endTime: contest.endTime,
					leaderboardFreeze: contest.leaderboardFreeze || 0,
					status: contest.status,
					registrationEnabled: contest.registrationEnabled !== false,
				},
				now
			);

			// Determine if virtual participation is running
			if (participantState?.isVirtual && participantState.status === "active" && participantState.virtualStartTime) {
				const endVirtual = participantState.virtualStartTime + contest.duration * 60000;
				if (now < endVirtual) {
					targetTime = endVirtual;
					label = "Virtual Solving Time Remaining";
				} else {
					targetTime = 0;
					label = "Virtual Contest Ended";
				}
			} else {
				// Regular contest lifecycle using computed states
				if (computed === "scheduled" || computed === "registration_open") {
					targetTime = contest.startTime;
					label = "Starts in:";
				} else if (computed === "running") {
					targetTime = contest.endTime;
					label = "Ends in:";
				} else if (computed === "frozen") {
					targetTime = contest.endTime;
					label = "Leaderboard unlocks in:";
				} else {
					targetTime = 0;
					label = "Contest finished.";
				}
			}

			setContestStateLabel(label);

			if (targetTime === 0) {
				setTimeLeft("00:00:00");
				clearInterval(interval);
				return;
			}

			const diff = targetTime - now;
			const hrs = Math.floor(diff / 3600000);
			const mins = Math.floor((diff % 3600000) / 60000);
			const secs = Math.floor((diff % 60000) / 1000);

			const format = (num: number) => num.toString().padStart(2, "0");
			setTimeLeft(`${format(hrs)}:${format(mins)}:${format(secs)}`);
		}, 1000);

		return () => clearInterval(interval);
	}, [contest, participantState]);

	// --- 2. FETCH CONTEST DATA ---
	const fetchContest = useCallback(async () => {
		if (!cid) return;
		try {
			const docRef = doc(firestore, "contests", cid as string);
			const snap = await getDoc(docRef);
			if (!snap.exists()) {
				setContest(null);
				setLoading(false);
				return;
			}
			setContest({ id: snap.id, ...snap.data() } as Contest);

			// Fetch editorial
			const edDoc = await getDoc(doc(firestore, "contest_editorial", cid as string));
			if (edDoc.exists()) {
				setEditorialMarkdown(edDoc.data().markdown || "");
			}
		} catch (e) {
			console.error("Error loading contest document:", e);
		} finally {
			setLoading(false);
		}
	}, [cid]);

	useEffect(() => {
		if (cid) {
			fetchContest();
		}
	}, [cid, fetchContest]);

	// --- 3. FETCH PARTICIPANT REGISTRATION STATE ---
	useEffect(() => {
		if (!cid || !user) {
			setIsRegistered(false);
			setIsRegisteredLoading(false);
			return;
		}

		setIsRegisteredLoading(true);
		const regRef = doc(firestore, "contest_participants", `${cid}_${user.uid}`);
		const unsub = onSnapshot(regRef, (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				setIsRegistered(true);
				setParticipantState({
					uid: data.uid,
					username: data.username,
					displayName: data.displayName,
					status: data.status,
					isVirtual: !!data.isVirtual,
					joinedAt: data.joinedAt,
					virtualStartTime: data.virtualStartTime
				});
			} else {
				setIsRegistered(false);
				setParticipantState(null);
			}
			setIsRegisteredLoading(false);
		}, (err) => {
			console.error("Error subscribing to registration:", err);
			setIsRegisteredLoading(false);
		});

		return () => unsub();
	}, [cid, user]);

	// --- 4. DATA TAB SUBSCRIPTIONS ---
	useEffect(() => {
		if (!cid) return;

		// Announcements
		const annQuery = query(collection(firestore, "contest_announcements"), where("contestId", "==", cid), orderBy("timestamp", "desc"));
		const unsubAnn = onSnapshot(annQuery, (snap) => {
			const list: Announcement[] = [];
			snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Announcement));
			setAnnouncements(list);
		});

		// Participants
		const partQuery = query(collection(firestore, "contest_participants"), where("contestId", "==", cid));
		const unsubPart = onSnapshot(partQuery, (snap) => {
			const list: Participant[] = [];
			snap.forEach((d) => {
				const p = d.data();
				list.push({
					uid: p.uid,
					username: p.username,
					displayName: p.displayName,
					status: p.status,
					isVirtual: !!p.isVirtual,
					joinedAt: p.joinedAt,
					virtualStartTime: p.virtualStartTime
				});
			});
			setParticipants(list);
		});

		// Clarifications
		let clarQuery = query(collection(firestore, "contest_clarifications"), where("contestId", "==", cid), orderBy("askedAt", "desc"));
		const unsubClar = onSnapshot(clarQuery, (snap) => {
			const list: Clarification[] = [];
			snap.forEach((d) => {
				const data = d.data();
				// Render if public, owned by current user, or admin
				if (data.isPublic || (user && data.uid === user.uid)) {
					list.push({ id: d.id, ...data } as Clarification);
				}
			});
			setClarifications(list);
		});

		// Comments / Discussion (Mocked/Simple thread collection for high-end feel)
		const commQuery = query(collection(firestore, "contests", cid as string, "discussions"), orderBy("timestamp", "desc"));
		const unsubComm = onSnapshot(commQuery, (snap) => {
			const list: any[] = [];
			snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
			setComments(list);
		}, (err) => {
			console.error("Error fetching discussions:", err);
		});

		return () => {
			unsubAnn();
			unsubPart();
			unsubClar();
			unsubComm();
		};
	}, [cid, user]);

	// --- 5. DETAILED PROBLEMS & SUBMISSIONS LOADER ---
	const loadProblemsAndSubmissions = useCallback(async () => {
		if (!cid || !contest) return () => {};

		let cpList: ContestProblem[] = [];
		const problemDetailCache: Record<string, any> = {};

		try {
			// Fetch core problem metadata
			const problemsSnapshot = await getDocs(collection(firestore, "problems"));
			problemsSnapshot.forEach((d) => {
				problemDetailCache[d.id] = d.data();
			});

			// 1. Load contest problems
			const cpSnap = await getDocs(
				query(collection(firestore, "contest_problems"), where("contestId", "==", cid), orderBy("order", "asc"))
			);
			cpSnap.forEach((d) => {
				const cpData = d.data();
				cpList.push({
					id: d.id,
					problemId: cpData.problemId,
					label: cpData.label,
					points: cpData.points,
					difficulty: cpData.difficulty,
					order: cpData.order,
					customConstraints: cpData.customConstraints || "",
					title: problemDetailCache[cpData.problemId]?.title || cpData.problemId,
					solveCount: 0,
					attemptsCount: 0
				});
			});
			setProblems(cpList);
		} catch (cpErr: any) {
			console.error("Error loading contest problems:", cpErr);
		}

		// 2. Subscribe ONLY to the current user's submissions in real-time to save read counts
		let unsubscribe: (() => void) | (() => Promise<void>) = () => {};
		if (user) {
			const q = query(
				collection(firestore, "contest_submissions"),
				where("contestId", "==", cid),
				where("uid", "==", user.uid),
				orderBy("timestamp", "asc")
			);

			unsubscribe = onSnapshot(q, (subSnap) => {
				const subList: Submission[] = [];
				subSnap.forEach((docSnap) => {
					const subData = docSnap.data();
					const submission: Submission = {
						id: docSnap.id,
						problemId: subData.problemId,
						uid: subData.uid,
						username: subData.username,
						language: subData.language,
						status: subData.status,
						timestamp: subData.timestamp,
						runtime: subData.runtime || 0,
						memory: subData.memory || 0,
						verdict: subData.verdict || "",
						score: subData.score || 0,
						penaltyMinutes: subData.penaltyMinutes || 0
					};
					subList.push(submission);
				});
				setSubmissions(subList.reverse()); // latest first
			}, (err) => {
				console.error("Error loading user submissions:", err);
			});
		}

		return unsubscribe;
	}, [cid, contest, user]);

	useEffect(() => {
		let unsub: (() => void) | undefined;
		if (contest && participants.length >= 0) {
			loadProblemsAndSubmissions().then((unsubFn) => {
				unsub = unsubFn;
			});
		}
		return () => {
			if (unsub) unsub();
		};
	}, [contest, participants, loadProblemsAndSubmissions]);

	useEffect(() => {
		if (!standings || !contest) return;

		const mappedRows: LeaderboardRow[] = standings.map((s) => {
			const problemsSolved: Record<string, { solved: boolean; attempts: number; time: number }> = {};
			
			Object.entries(s.problemResults).forEach(([pid, res]) => {
				const participant = participants.find((p) => p.uid === s.uid);
				const pStartTime = participant?.isVirtual && participant?.virtualStartTime
					? participant.virtualStartTime
					: contest.startTime;

				const elapsedMinutes = res.solvedTime
					? Math.max(0, Math.round((res.solvedTime - pStartTime) / 60000))
					: 0;

				problemsSolved[pid] = {
					solved: res.solved,
					attempts: res.incorrectAttempts,
					time: elapsedMinutes
				};
			});

			const pInfo = participants.find((p) => p.uid === s.uid);

			return {
				uid: s.uid,
				username: s.username,
				displayName: pInfo?.displayName || s.username,
				rank: s.rank,
				score: s.totalScore,
				penalty: s.totalPenalty,
				problemsSolved
			};
		});

		setLeaderboard(mappedRows);

		// Dynamically update solve counts and attempts counts of contest problems
		if (problems.length > 0) {
			setProblems((prevProblems) => {
				return prevProblems.map((p) => {
					let solveCount = 0;
					let attemptsCount = 0;

					standings.forEach((s) => {
						const res = s.problemResults[p.problemId];
						if (res) {
							if (res.solved) solveCount++;
							attemptsCount += res.incorrectAttempts + (res.solved ? 1 : 0);
						}
					});

					return {
						...p,
						solveCount,
						attemptsCount
					};
				});
			});
		}
	}, [standings, contest, participants, problems.length]);

	// --- 6. ACTION HANDLERS ---
	
	// Registration
	const handleRegister = async () => {
		if (!user) {
			setAuthModal({ isOpen: true, type: "login" });
			return;
		}
		if (!contest) return;

		// Require password if password protected
		if (contest.visibility === "password") {
			// Simply route to /contests so they register using the lists dialog
			router.push("/contests");
			return;
		}

		try {
			const regId = `${contest.id}_${user.uid}`;
			await setDoc(doc(firestore, "contest_participants", regId), {
				id: regId,
				contestId: contest.id,
				uid: user.uid,
				username: user.email?.split("@")[0] || "user",
				displayName: user.displayName || user.email?.split("@")[0] || "User",
				registeredAt: Date.now(),
				status: "registered",
				isVirtual: false
			});
			setIsRegistered(true);
			triggerStatus("success", "Successfully registered!");

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
						contestId: contest.id
					})
				});
			} catch (emailErr) {
				console.error("Failed to send registration confirmation email:", emailErr);
			}
		} catch (e: any) {
			triggerStatus("error", getFriendlyErrorMessage(e, "Registration failed. Please try again."));
		}
	};

	// Join Contest
	const handleJoinContest = async () => {
		if (!user || !contest) return;
		try {
			const regId = `${contest.id}_${user.uid}`;
			await updateDoc(doc(firestore, "contest_participants", regId), {
				status: "active",
				joinedAt: Date.now()
			});
			triggerStatus("success", "Entering Secure Arena...");
		} catch (e: any) {
			triggerStatus("error", getFriendlyErrorMessage(e, "Failed to join the contest."));
		}
	};

	// Ask clarification
	const handleAskClarification = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !cid || !clarQuestion.trim()) return;

		setSubmittingClar(true);
		try {
			await addDoc(collection(firestore, "contest_clarifications"), {
				contestId: cid,
				uid: user.uid,
				username: user.email?.split("@")[0] || "user",
				question: clarQuestion.trim(),
				answer: "",
				isPublic: false,
				askedAt: Date.now()
			});
			setClarQuestion("");
			triggerStatus("success", "Question submitted to admins!");
		} catch (err: any) {
			triggerStatus("error", "Failed to submit question.");
		} finally {
			setSubmittingClar(false);
		}
	};

	// Post discussion comment
	const handlePostComment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !cid || !newComment.trim()) return;

		try {
			await addDoc(collection(firestore, "contests", cid as string, "discussions"), {
				uid: user.uid,
				username: user.displayName || user.email?.split("@")[0] || "User",
				text: newComment.trim(),
				timestamp: Date.now()
			});
			setNewComment("");
		} catch (e: any) {
			console.error("Error posting discussion:", e);
		}
	};

	if (!hasMounted) return null;

	if (loading || loadingAdmin || isRegisteredLoading) {
		return (
			<div className='min-h-screen flex flex-col justify-center items-center gap-4' style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
				<div className='w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin'></div>
				<div className='text-gray-400'>Syncing contest arena...</div>
			</div>
		);
	}

	if (!contest) {
		return <ErrorDisplay type="contest_not_found" />;
	}

	// 1. Passcode verification view for private password contests
	if (contest.visibility === "password" && !isRegistered && !isAdmin && !isPasscodeVerified) {
		return (
			<AppShell activeNav="Contests">
				<div className='max-w-sm mx-auto px-4 mt-20'>
					<div className='p-6 rounded-lg border border-border-subtle bg-bg-surface space-y-4 text-center'>
						<div className='w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent border border-accent/20'>
							<FaLock size={18} />
						</div>
						<div className='space-y-1.5'>
							<h2 className='text-base font-semibold text-text-primary'>Passcode Protected</h2>
							<p className='text-xs text-text-muted leading-relaxed'>
								Contest <span className='text-accent font-mono'>&quot;{contest.title}&quot;</span> is restricted. Enter the passcode to proceed.
							</p>
						</div>

						<form onSubmit={(e) => {
							e.preventDefault();
							if (passcodeInput.trim() === contest.password) {
								if (typeof window !== "undefined") {
									sessionStorage.setItem(`contest_passcode_${cid}`, contest.password);
								}
								setIsPasscodeVerified(true);
								setPasscodeError("");
							} else {
								setPasscodeError("Incorrect password. Please try again.");
							}
						}} className='space-y-3 pt-1'>
							<input
								type='password'
								placeholder='Enter passcode'
								value={passcodeInput}
								onChange={(e) => setPasscodeInput(e.target.value)}
								className='w-full px-3 py-2 text-xs rounded-md outline-none border border-border-subtle bg-bg-base focus:border-accent font-mono text-center text-text-primary'
								required
								autoFocus
							/>

							{passcodeError && (
								<p className='text-xs font-mono text-bc-error'>{passcodeError}</p>
							)}

							<button
								type='submit'
								className='w-full py-2 rounded-md font-semibold text-xs bg-accent hover:bg-accent/90 text-bg-base transition-colors'
							>
								Unlock Contest Details
							</button>
						</form>
					</div>
				</div>
			</AppShell>
		);
	}

	// 2. Eligibility checks
	const isEligible = (() => {
		if (isAdmin) return true;
		if (isRegistered) return true;
		if (contest.visibility === "public") return true;
		if (contest.visibility === "private") return false;
		if (contest.visibility === "university") {
			if (!user) return false;
			const userEmail = user.email || "";
			const domain = contest.university || "";
			return userEmail.endsWith(`@${domain}`) || userEmail.endsWith(`.${domain}`);
		}
		if (contest.visibility === "password") {
			return isPasscodeVerified;
		}
		return true;
	})();

	if (!isEligible) {
		return <ErrorDisplay type="access_denied" />;
	}

	// 3. Render Contest Preview view
	const renderContestPreview = () => {
		let buttonText = "Register Now";
		let buttonDisabled = false;
		let buttonOnClick = handleRegister;
		let buttonIcon = null;
		let statusLabel = "";
		const isFull = participants.length >= (contest.maxParticipants || 1000);

		if (contest.status === "cancelled") {
			buttonText = "Contest Cancelled";
			buttonDisabled = true;
		} else if (contest.status === "archived") {
			buttonText = "Contest Archived";
			buttonDisabled = true;
		} else if (isContestEnded) {
			buttonText = "View Results";
			buttonOnClick = async () => {
				router.push(`/contests/${cid}?tab=leaderboard`);
			};
		} else if (isContestRunning) {
			if (isRegistered) {
				buttonText = "Enter Contest";
				buttonOnClick = handleJoinContest;
				buttonIcon = <FaArrowRight size={12} />;
			} else {
				if (isFull) {
					buttonText = "Contest Full";
					buttonDisabled = true;
				} else if (contest.registrationEnabled) {
					buttonText = "Register & Join";
					buttonOnClick = handleRegister;
				} else {
					buttonText = "Join Contest";
					buttonOnClick = handleRegister;
				}
			}
		} else { // Scheduled / Registration Open
			if (isRegistered) {
				buttonText = "Registered";
				buttonDisabled = true;
				buttonIcon = <FaCheckCircle className="text-emerald-400" size={14} />;
				statusLabel = "You're registered. The contest hasn't started yet.";
			} else {
				if (isFull) {
					buttonText = "Contest Full";
					buttonDisabled = true;
				} else {
					buttonText = "Register Now";
					buttonOnClick = handleRegister;
				}
			}
		}

		return (
			<AppShell activeNav="Contests">
				<div className='max-w-[1100px] mx-auto px-4 py-8 space-y-6'>
					{statusMsg && (
						<div className={`fixed top-16 right-6 z-50 p-3 rounded-md border text-xs font-mono transition-all duration-200 ${
							statusMsg.type === "success" ? "bg-bg-surface text-accent border-accent/30" : "bg-bg-surface text-bc-error border-bc-error/30"
						}`}>
							{statusMsg.text}
						</div>
					)}

					<div className='flex items-center gap-2 text-xs font-mono text-text-muted'>
						<Link href='/contests' className='hover:text-accent transition-colors flex items-center gap-1'>
							<FaChevronLeft size={10} /> Back to Contests
						</Link>
						<span>/</span>
						<span className='text-text-secondary'>Preview</span>
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
						<div className='lg:col-span-8 space-y-5'>
							<div className='rounded-lg border border-border-subtle overflow-hidden relative bg-bg-surface'>
								<div className='h-52 bg-cover bg-center relative' style={{ backgroundImage: `url(${contest.banner})` }}>
									<div className='absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/60 to-transparent' />
									<div className='absolute bottom-5 left-6 right-6'>
										<div className='flex items-center gap-2 flex-wrap'>
											<span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold ${
												isContestRunning ? "bg-accent text-bg-base" : "bg-accent/20 text-accent border border-accent/30"
											}`}>
												{computedStatus === "frozen" ? "Frozen" : computedStatus}
											</span>
											<span className='px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-bg-surface-elevated text-text-secondary border border-border-subtle capitalize'>
												{contest.visibility}
											</span>
										</div>
										<h1 className='text-2xl font-bold text-text-primary mt-2 leading-tight tracking-tight'>{contest.title}</h1>
										<p className='text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed max-w-2xl'>{contest.description}</p>
									</div>
								</div>
							</div>

							<div className='p-6 rounded-lg border border-border-subtle bg-bg-surface space-y-3'>
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary border-b border-border-subtle pb-2 flex items-center gap-2'>
									<FaList className='text-accent' size={12} /> Contest Description
								</h2>
								<p className='text-xs text-text-secondary whitespace-pre-wrap leading-relaxed'>{contest.description || "No description provided."}</p>
							</div>

							<div className='p-6 rounded-lg border border-border-subtle bg-bg-surface space-y-3'>
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary border-b border-border-subtle pb-2 flex items-center gap-2'>
									<FaFlag className='text-accent' size={12} /> Rules & Guidelines
								</h2>
								<div className='prose prose-invert max-w-none text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans'>
									{contest.rules || "No specific rules defined for this contest. Play fair and respect other solvers!"}
								</div>
							</div>

							<div className='p-6 rounded-lg border border-border-subtle bg-bg-surface space-y-3'>
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary border-b border-border-subtle pb-2'>
									Allowed Programming Languages
								</h2>
								<div className='flex flex-wrap gap-2 pt-1'>
									{["C++", "Java", "Python", "JavaScript"].map((lang) => (
										<span key={lang} className='px-3 py-1 rounded-md text-xs font-mono bg-bg-surface-elevated border border-border-subtle text-text-secondary'>
											{lang}
										</span>
									))}
								</div>
							</div>

							<div className='p-6 rounded-lg border border-border-subtle bg-bg-surface space-y-3'>
								<h2 className='text-sm font-semibold uppercase font-mono tracking-wider text-text-primary border-b border-border-subtle pb-2 flex items-center gap-2'>
									<FaCrown className='text-accent' size={14} /> Prizes & Rewards
								</h2>
								<div className='text-xs text-text-secondary leading-relaxed space-y-2 pt-1'>
									<p><FaTrophy className="inline mr-1.5 text-amber-400" size={12} /><span className='font-semibold text-text-primary'>1st Place</span>: Gold BeastCode Badge + 200 Rating XP</p>
									<p><FaMedal className="inline mr-1.5 text-slate-300" size={12} /><span className='font-semibold text-text-primary'>2nd - 3rd Place</span>: Silver BeastCode Badge + 100 Rating XP</p>
									<p><FaMedal className="inline mr-1.5 text-amber-600" size={12} /><span className='font-semibold text-text-primary'>Top 10 solvers</span>: Bronze BeastCode Badge + 50 Rating XP</p>
								</div>
							</div>
						</div>

						<div className='lg:col-span-4 space-y-5'>
							<div className='p-5 rounded-lg border border-border-subtle bg-bg-surface text-center space-y-4'>
								<div className='space-y-1'>
									<span className='text-[10px] uppercase font-mono tracking-wider text-text-muted block'>{contestStateLabel}</span>
									<span className='font-mono text-2xl font-bold tracking-wider text-accent block'>{timeLeft || "00:00:00"}</span>
								</div>

								<div className='space-y-2.5 pt-1'>
									<button
										onClick={() => {
											if (!user) {
												setAuthModal({ isOpen: true, type: "login" });
											} else if (buttonOnClick) {
												buttonOnClick();
											}
										}}
										disabled={buttonDisabled}
										className={`w-full py-2.5 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-2 ${
											buttonDisabled
												? "bg-accent/10 text-accent border border-accent/20 cursor-default"
												: "bg-accent hover:bg-accent/90 text-bg-base cursor-pointer"
										}`}
									>
										{buttonIcon}
										{buttonText}
									</button>
									{statusLabel && (
										<p className='text-[11px] text-text-muted leading-normal'>{statusLabel}</p>
									)}
								</div>
							</div>

							<div className='p-5 rounded-lg border border-border-subtle bg-bg-surface space-y-3'>
								<h3 className='text-xs font-mono uppercase tracking-wider font-semibold text-text-primary border-b border-border-subtle pb-2'>
									Contest Specifications
								</h3>
								<div className='space-y-2.5 text-xs'>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Organizer:</span>
										<span className='font-mono'>BeastCode Team</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Start Time:</span>
										<span className='font-mono'>{new Date(contest.startTime).toLocaleDateString()} {new Date(contest.startTime).toLocaleTimeString()}</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>End Time:</span>
										<span className='font-mono'>{new Date(contest.endTime).toLocaleDateString()} {new Date(contest.endTime).toLocaleTimeString()}</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Duration:</span>
										<span className='font-mono'>{contest.duration} minutes</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Reg. Deadline:</span>
										<span className='font-mono'>Until Start</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Difficulty:</span>
										<span className='font-mono'>Medium / Hard</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Problems:</span>
										<span className='font-mono'>{problems.length} problems</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Participants:</span>
										<span className='font-mono text-accent'>{participants.length} / {contest.maxParticipants || 1000}</span>
									</div>
									<div className='flex justify-between items-center text-text-secondary'>
										<span className='text-text-muted'>Security:</span>
										<span className='font-mono text-xs uppercase'>{contest.securityLevel || "standard"}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</AppShell>
		);
	};

	const showWorkspace = isAdmin || isContestEnded || (isRegistered && isContestRunning && participantState?.status === "active");

	if (!showWorkspace) {
		return renderContestPreview();
	}

	const canViewProblems = isContestEnded || isContestRunning || (participantState?.isVirtual && participantState.status === "active");

	return (
		<AppShell activeNav="Contests">
			<div className='max-w-[1240px] mx-auto px-4 py-6 space-y-6'>
				{statusMsg && (
					<div className={`fixed top-16 right-6 z-50 p-3 rounded-md border text-xs font-mono transition-all duration-200 ${
						statusMsg.type === "success" ? "bg-bg-surface text-accent border-accent/30" : "bg-bg-surface text-bc-error border-bc-error/30"
					}`}>
						{statusMsg.text}
					</div>
				)}

				{/* Contest Banner Card */}
				<div className='rounded-lg border border-border-subtle overflow-hidden relative bg-bg-surface'>
					<div className='h-40 bg-cover bg-center relative' style={{ backgroundImage: `url(${contest.banner})` }}>
						<div className='absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/70 to-transparent' />
						<div className='absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3'>
							<div>
								<span className='px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-accent text-bg-base'>
									{computedStatus}
								</span>
								<h1 className='text-xl sm:text-2xl font-bold text-text-primary mt-1 leading-tight'>{contest.title}</h1>
								<p className='text-xs text-text-muted mt-0.5 line-clamp-1 max-w-xl'>{contest.description}</p>
							</div>

							{/* Timer details */}
							<div className='bg-bg-surface/90 px-4 py-2 rounded-md border border-border-subtle shrink-0 text-center sm:text-right'>
								<span className='text-[10px] uppercase font-mono tracking-wider text-text-muted block mb-0.5'>{contestStateLabel}</span>
								<span className='font-mono text-xl font-bold tracking-wider text-accent'>{timeLeft}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Tabs list */}
				<SecondaryNav
					tabs={[
						{ id: "overview", label: "Overview", icon: <FaList size={11} /> },
						{ id: "problems", label: "Problems", icon: <FaFlag size={11} /> },
						{ id: "leaderboard", label: "Standings", icon: <FaTrophy size={11} /> },
						{ id: "submissions", label: "Submissions", icon: <FaBolt size={11} /> },
						{ id: "clarifications", label: "Clarifications", icon: <FaQuestionCircle size={11} /> },
						{ id: "editorial", label: "Editorial", icon: <FaFileAlt size={11} /> },
						{ id: "discussion", label: "Discussion", icon: <FaComments size={11} /> },
						{ id: "participants", label: "Participants", icon: <FaUsers size={11} /> }
					]}
					activeTab={activeTab}
					onChange={setActiveTab}
					className="mb-6"
				/>

				{/* MAIN TAB DETAILS */}
				<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
					
					{/* LEFT / CENTER VIEW */}
					<div className='lg:col-span-9 space-y-6'>
						
						{/* OVERVIEW TAB */}
						{activeTab === "overview" && (
							<div className='space-y-6'>
								<div className='p-6 rounded-lg border' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
									<h3 className='text-base font-bold mb-3' style={{ color: "var(--text-primary)" }}>Contest Overview</h3>
									<p className='text-sm text-gray-300 whitespace-pre-wrap leading-relaxed'>{contest.description || "No description provided."}</p>
								</div>

								<div className='p-6 rounded-lg border' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
									<h3 className='text-base font-bold mb-3' style={{ color: "var(--text-primary)" }}>Rules & Regulations</h3>
									<div className='prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed whitespace-pre-wrap'>
										{contest.rules || "No rules defined. Play fair!"}
									</div>
								</div>
							</div>
						)}

						{/* PROBLEMS TAB */}
						{activeTab === "problems" && (
							<div className='space-y-4'>
								{!canViewProblems ? (
									<div className='text-center py-20 border rounded-lg bg-dark-fill-3' style={{ borderColor: "var(--border-subtle)" }}>
										<FaLock size={30} className='mx-auto text-yellow-500 mb-3 animate-pulse' />
										<h4 className='font-bold text-white mb-1'>Problems Locked</h4>
										<p className='text-xs text-gray-400'>The problem set will unlock when the contest begins.</p>
									</div>
								) : (
									<div className='border rounded-lg overflow-hidden' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
										<table className='w-full text-sm text-left text-gray-300'>
											<thead>
												<tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-dark-layer-1)" }}>
													<th className='px-6 py-4 w-20 text-center'>Label</th>
													<th className='px-6 py-4'>Problem Name</th>
													<th className='px-6 py-4 w-32'>Difficulty</th>
													<th className='px-6 py-4 w-24 text-center'>Points</th>
													<th className='px-6 py-4 w-32 text-center'>Solve Rate</th>
												</tr>
											</thead>
											<tbody className='divide-y divide-border-subtle'>
												{problems.map((p) => {
													const hasJoined = participantState?.status === "active";
													const isTerminated = participantState?.status === "terminated";
													const isContestEnded = contest?.status === "ended";
													const canAccess = (hasJoined || isContestEnded) && !isTerminated;
													const path = canAccess 
														? `/contests/${cid}/problems/${p.problemId}` 
														: "#";

													return (
														<tr key={p.id} className='hover:bg-dark-fill-3 transition'>
															<td className='px-6 py-4 text-center font-bold text-brand-orange'>{p.label}</td>
															<td className='px-6 py-4 font-semibold text-white'>
																{canAccess ? (
																	<Link href={path} className='hover:underline hover:text-brand-orange transition'>
																		{p.title}
																	</Link>
																) : (
																	<button 
																		onClick={() => {
																			if (isTerminated) {
																				triggerStatus("error", "Your participation has been terminated due to secure rules violation. Access denied.");
																			} else {
																				triggerStatus("error", "You must click 'Join Contest' on the side panel to open problems.");
																			}
																		}}
																		className='hover:underline hover:text-brand-orange text-left font-semibold'
																	>
																		{p.title}
																	</button>
																)}
															</td>
															<td className='px-6 py-4'>
																{(() => {
																	const diffColor =
																		p.difficulty === "Easy"
																			? { color: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "color-mix(in srgb, var(--color-success) 25%, transparent)" }
																			: p.difficulty === "Medium"
																			? { color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "color-mix(in srgb, var(--color-warning) 25%, transparent)" }
																			: { color: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "color-mix(in srgb, var(--color-error) 25%, transparent)" };
																	return (
																		<span
																			className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border'
																			style={{
																				color: diffColor.color,
																				background: diffColor.bg,
																				borderColor: diffColor.border,
																			}}
																		>
																			{p.difficulty}
																		</span>
																	);
																})()}
															</td>
															<td className='px-6 py-4 text-center font-bold'>{p.points}</td>
															<td className='px-6 py-4 text-center text-xs text-gray-400'>
																{p.solveCount} / {p.attemptsCount} solved
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}

						{/* LEADERBOARD TAB */}
						{activeTab === "leaderboard" && (
							<div className='space-y-4'>
								{leaderboard.length === 0 ? (
									<p className='text-sm text-center text-gray-500 py-12'>No scores reported yet.</p>
								) : (
									<div className='border rounded-lg overflow-hidden' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
										<table className='w-full text-sm text-left text-gray-300'>
											<thead>
												<tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-dark-layer-1)" }}>
													<th className='px-4 py-4 w-16 text-center'>Rank</th>
													<th className='px-4 py-4'>User</th>
													<th className='px-4 py-4 w-24 text-center'>Score</th>
													<th className='px-4 py-4 w-28 text-center'>Penalty</th>
													{problems.map((p) => (
														<th key={p.problemId} className='px-2 py-4 w-16 text-center'>{p.label}</th>
													))}
												</tr>
											</thead>
											<tbody className='divide-y divide-border-subtle'>
												{leaderboard.map((row) => (
													<tr key={row.uid} className={`hover:bg-dark-fill-3 transition ${row.uid === user?.uid ? "bg-brand-orange/5" : ""}`}>
														<td className='px-4 py-4 text-center font-bold'>
															{row.rank === 1 ? <FaCrown className='text-yellow-400 mx-auto' /> : row.rank}
														</td>
														<td className='px-4 py-4 font-semibold text-white'>
															{row.displayName}
															<span className='text-[10px] text-gray-500 font-mono block'>@{row.username}</span>
														</td>
														<td className='px-4 py-4 text-center font-extrabold text-brand-orange'>{row.score}</td>
														<td className='px-4 py-4 text-center text-xs font-mono text-gray-400'>{row.penalty}</td>
														{problems.map((p) => {
															const res = row.problemsSolved[p.problemId];
															if (!res) return <td key={p.problemId} className='px-2 py-4 text-center'>-</td>;
															return (
																<td key={p.problemId} className={`px-2 py-4 text-center text-xs font-bold ${
																	res.solved 
																		? "text-emerald-400 bg-emerald-950/20" 
																		: res.attempts > 0 
																		? "text-red-400 bg-red-950/20" 
																		: ""
																}`}>
																	{res.solved ? (
																		<div>
																			<p className='text-emerald-500 flex items-center justify-center gap-0.5'><FaCheck size={8} /> +{res.attempts}</p>
																			<span className='text-[9px] font-semibold text-gray-500 block'>{res.time}m</span>
																		</div>
																	) : res.attempts > 0 ? (
																		<p className='text-red-500 flex items-center justify-center gap-0.5'><FaTimes size={8} /> -{res.attempts}</p>
																	) : "-"}
																</td>
															);
														})}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}

						{/* SUBMISSIONS TAB */}
						{activeTab === "submissions" && (
							<div className='space-y-4'>
								{!user ? (
									<p className='text-sm text-gray-400 text-center py-12'>Sign in to view your submissions.</p>
								) : submissions.length === 0 ? (
									<p className='text-sm text-gray-500 text-center py-12'>No submissions sent in this contest yet.</p>
								) : (
									<div className='border rounded-lg overflow-hidden' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
										<table className='w-full text-sm text-left text-gray-300'>
											<thead>
												<tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-dark-layer-1)" }}>
													<th className='px-6 py-4'>Problem</th>
													<th className='px-6 py-4'>Language</th>
													<th className='px-6 py-4'>Verdict</th>
													<th className='px-6 py-4 text-center'>Points</th>
													<th className='px-6 py-4 w-40'>Time</th>
												</tr>
											</thead>
											<tbody className='divide-y divide-border-subtle'>
												{submissions.map((sub) => {
													const probLabel = problems.find((p) => p.problemId === sub.problemId)?.label || "A";
													return (
														<tr key={sub.id} className='hover:bg-dark-fill-3 transition'>
															<td className='px-6 py-4 font-semibold text-white'>
																Problem {probLabel}
															</td>
															<td className='px-6 py-4 text-xs font-mono text-gray-400 capitalize'>{sub.language}</td>
															<td className={`px-6 py-4 font-bold text-xs ${
																sub.status === "pending"
																	? "text-brand-orange animate-pulse"
																	: sub.status === "passed"
																	? "text-emerald-400"
																	: "text-rose-400"
															}`}>
																{sub.status === "pending" ? (
																	<span className="flex items-center gap-1.5">
																		<div className="animate-spin rounded-full h-3 w-3 border-2 border-brand-orange border-t-transparent" />
																		Pending...
																	</span>
																) : (
																	sub.verdict
																)}
															</td>
															<td className='px-6 py-4 text-center font-bold'>{sub.score}</td>
															<td className='px-6 py-4 text-xs text-gray-500 font-mono'>
																{new Date(sub.timestamp).toLocaleString()}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}

						{/* CLARIFICATIONS TAB */}
						{activeTab === "clarifications" && (
							<div className='space-y-6'>
								{user && participantState?.status === "active" && (
									<form onSubmit={handleAskClarification} className='border rounded-lg p-6 space-y-4' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
										<h4 className='text-sm font-bold text-white'>Ask a Clarification</h4>
										<textarea
											placeholder='State your question clearly (e.g. In problem B, is N guaranteed to fit in a 32-bit integer?)...'
											value={clarQuestion}
											onChange={(e) => setClarQuestion(e.target.value)}
											rows={3}
											className='w-full p-3 text-sm rounded-xl outline-none border border-border-default bg-dark-layer-2 focus:border-brand-orange text-white'
											required
										/>
										<div className='flex justify-end'>
											<button
												type='submit'
												disabled={submittingClar}
												className='px-5 py-2 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-s text-bg-base flex items-center gap-1.5'
												style={{ color: "var(--bg-base)" }}
											>
												{submittingClar && <FaSpinner className='animate-spin' />}
												Send Clarification Request
											</button>
										</div>
									</form>
								)}

								<div className='space-y-4'>
									<h4 className='text-sm font-bold text-gray-400 uppercase tracking-wider'>Clarification Log</h4>
									{clarifications.length === 0 ? (
										<p className='text-xs text-gray-500 italic pl-2 border-l border-border-subtle'>No clarifications reported.</p>
									) : (
										<div className='space-y-4'>
											{clarifications.map((c) => (
												<div key={c.id} className='border rounded-xl p-4' style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
													<div className='flex justify-between items-center mb-1.5'>
														<span className='text-[10px] font-bold text-brand-orange'>From: {c.username}</span>
														<span className='text-[9px] font-semibold text-gray-500'>{new Date(c.askedAt).toLocaleString()}</span>
													</div>
													<div className='mb-2 text-xs'>
														<span className='font-bold block text-gray-500 mb-0.5'>Question:</span>
														<p className='text-white italic pl-2 border-l border-brand-orange/30'>{c.question}</p>
													</div>
													{c.answer ? (
														<div className='pl-3 border-l-2 border-emerald-500 bg-emerald-950/5 py-1.5 rounded-r text-xs'>
															<span className='font-bold block text-emerald-400 mb-0.5'>Answer ({c.isPublic ? "Public" : "Private"}):</span>
															<p className='text-gray-200'>{c.answer}</p>
														</div>
													) : (
														<span className='text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded'>Pending Admin Review</span>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}

						{/* EDITORIAL TAB */}
						{activeTab === "editorial" && (
							<div className='p-6 rounded-lg border' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
								{!isContestEnded ? (
									<div className='text-center py-12'>
										<FaLock size={28} className='text-gray-500 mx-auto mb-2' />
										<h4 className='font-semibold text-white'>Editorial Locked</h4>
										<p className='text-xs text-gray-400 mt-1'>The editorial details will be unlocked once the contest closes.</p>
									</div>
								) : !editorialMarkdown ? (
									<p className='text-sm text-gray-500 italic text-center py-12'>No editorial has been released for this contest.</p>
								) : (
									<div className='prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed whitespace-pre-wrap'>
										{editorialMarkdown}
									</div>
								)}
							</div>
						)}

						{/* DISCUSSION TAB */}
						{activeTab === "discussion" && (
							<div className='space-y-6'>
								{user ? (
									<form onSubmit={handlePostComment} className='flex gap-3 items-end'>
										<input
											type='text'
											placeholder='Write a comment, share rank, or ask a question...'
											value={newComment}
											onChange={(e) => setNewComment(e.target.value)}
											className='flex-1 p-2.5 text-xs rounded-xl outline-none border border-border-default bg-dark-layer-2 focus:border-brand-orange text-white'
											required
										/>
										<button
											type='submit'
											className='px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-s text-bg-base'
											style={{ color: "var(--bg-base)" }}
										>
											Comment
										</button>
									</form>
								) : (
									<p className='text-xs text-gray-500 italic'>Sign in to join the discussion.</p>
								)}

								<div className='space-y-3 pt-2'>
									{comments.length === 0 ? (
										<p className='text-xs text-gray-500 italic py-6 pl-2 border-l border-border-subtle'>No comments yet. Start the conversation!</p>
									) : (
										<div className='space-y-3'>
											{comments.map((c) => (
												<div key={c.id} className='p-4 border rounded-xl' style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
													<div className='flex justify-between items-center mb-1'>
														<span className='text-xs font-bold text-white'>{c.username}</span>
														<span className='text-[9px] font-semibold text-gray-500'>{new Date(c.timestamp).toLocaleString()}</span>
													</div>
													<p className='text-xs text-gray-300'>{c.text}</p>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}

						{/* PARTICIPANTS TAB */}
						{activeTab === "participants" && (
							<div className='space-y-4'>
								<h3 className='text-base font-bold' style={{ color: "var(--text-primary)" }}>Registered Participants ({participants.length})</h3>
								{participants.length === 0 ? (
									<p className='text-sm text-gray-500 italic py-6'>No registrants yet.</p>
								) : (
									<div className='border rounded-lg overflow-hidden' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
										<table className='w-full text-sm text-left text-gray-300'>
											<thead>
												<tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-dark-layer-1)" }}>
													<th className='px-6 py-4'>User</th>
													<th className='px-6 py-4'>Mode</th>
													<th className='px-6 py-4'>Status</th>
												</tr>
											</thead>
											<tbody className='divide-y divide-border-subtle'>
												{participants.map((p) => (
													<tr key={p.uid} className='hover:bg-dark-fill-3 transition'>
														<td className='px-6 py-4 font-semibold text-white'>
															{p.displayName}
															<span className='text-[10px] text-gray-500 font-mono block'>@{p.username}</span>
														</td>
														<td className='px-6 py-4 text-xs font-medium text-gray-400 capitalize'>
															{p.isVirtual ? "Virtual" : "Official"}
														</td>
														<td className='px-6 py-4'>
															<span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
																p.status === "active" ? "text-emerald-400 bg-emerald-400/10" :
																p.status === "terminated" ? "text-red-400 bg-red-400/10" :
																"text-gray-400 bg-gray-400/10"
															}`}>
																{p.status}
															</span>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}

					</div>

					{/* RIGHT SIDEBAR ACTIONS */}
					<div className='lg:col-span-3 space-y-6'>
						
						{/* Participant Control Panel */}
						<div className='p-6 rounded-lg border space-y-4' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
							<h4 className='text-sm font-bold text-white border-b pb-2' style={{ borderColor: "var(--border-subtle)" }}>
								Arena Admission
							</h4>

							{isRegisteredLoading ? (
								<div className='flex justify-center py-4'><FaSpinner className='animate-spin text-brand-orange' /></div>
							) : !isRegistered ? (
								<div className='space-y-3'>
									<p className='text-xs text-gray-400'>You are not registered for this contest yet.</p>
									{isContestScheduled && contest.registrationEnabled && (
										<button
											onClick={handleRegister}
											className='w-full py-2.5 rounded-xl font-bold text-sm bg-brand-orange hover:bg-brand-orange-s text-bg-base transition'
											style={{ color: "var(--bg-base)" }}
										>
											Register Now
										</button>
									)}
									{!contest.registrationEnabled && isContestRunning && (
										<button
											onClick={handleRegister}
											className='w-full py-2.5 rounded-xl font-bold text-sm bg-brand-orange hover:bg-brand-orange-s text-bg-base transition'
											style={{ color: "var(--bg-base)" }}
										>
											Register & Join
										</button>
									)}
								</div>
							) : participantState?.status === "registered" ? (
								<div className='space-y-3'>
									<span className='text-xs font-bold text-emerald-400 flex items-center gap-1'><FaCheckCircle /> Registered!</span>
									{isContestRunning ? (
										<button
											onClick={handleJoinContest}
											className='w-full py-2.5 rounded-xl font-bold text-sm bg-brand-orange hover:bg-brand-orange-s text-bg-base transition flex items-center justify-center gap-1.5'
											style={{ color: "var(--bg-base)" }}
										>
											Join Contest <FaArrowRight size={10} />
										</button>
									) : (
										<p className='text-xs text-gray-400'>Waiting for the scheduled start time to enter the arena.</p>
									)}
								</div>
							) : participantState?.status === "active" ? (
								<div className='space-y-3'>
									<span className='text-xs font-bold text-emerald-400 flex items-center gap-1'><FaCheckCircle /> Active Solver</span>
									<p className='text-xs text-gray-400'>You are inside the arena. Problem workspace links are active in the Problems tab.</p>
									{problems.length > 0 && (
										<Link
											href={`/contests/${cid}/problems/${problems[0].problemId}`}
											className='w-full py-2.5 rounded-xl font-bold text-sm bg-brand-orange hover:bg-brand-orange-s text-bg-base transition flex items-center justify-center gap-1.5'
											style={{ color: "var(--bg-base)" }}
										>
											Solve Problem A <FaArrowRight size={10} />
										</Link>
									)}
								</div>
							) : participantState?.status === "terminated" ? (
								<div className='space-y-3 border-l-2 border-red-500 pl-3 bg-red-950/5 py-2 rounded-r'>
									<span className='text-xs font-bold text-red-400 flex items-center gap-1.5'><FaTimesCircle /> Terminated</span>
									<p className='text-[10px] text-gray-400 leading-relaxed'>
										Your participation was ended due to an integrity violation of secure contest rules. Editor locked.
									</p>
								</div>
							) : null}
						</div>

						{/* Quick Announcements widget */}
						<div className='p-6 rounded-lg border space-y-4' style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
							<h4 className='text-sm font-bold text-white border-b pb-2' style={{ borderColor: "var(--border-subtle)" }}>
								Announcements
							</h4>
							{announcements.length === 0 ? (
								<p className='text-xs text-gray-500 italic'>No updates posted.</p>
							) : (
								<div className='space-y-3 max-h-60 overflow-y-auto pr-1'>
									{announcements.slice(0, 3).map((a) => (
										<div key={a.id} className='text-xs border-b border-border-subtle pb-2 last:border-0 last:pb-0'>
											<p className='font-bold text-white'>{a.title}</p>
											<p className='text-[10px] text-gray-400 leading-relaxed mt-0.5'>{a.content}</p>
										</div>
									))}
								</div>
							)}
						</div>

					</div>

				</div>

			</div>
		</AppShell>
	);
}
