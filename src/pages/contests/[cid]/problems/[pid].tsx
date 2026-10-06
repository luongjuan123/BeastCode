import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Topbar from "@/components/Topbar/Topbar";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { getServerTime, getContestStatus } from "@/utils/contestStatusService";
import Workspace from "@/components/Workspace/Workspace";
import useHasMounted from "@/hooks/useHasMounted";
import { Problem } from "@/utils/types/problem";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { problems as staticProblems } from "@/utils/problems";
import Link from "next/link";
import { FaLock, FaExclamationTriangle, FaExpand, FaClock, FaChevronLeft, FaSpinner } from "react-icons/fa";
import { SubmissionProvider } from "@/context/SubmissionContext";
import ErrorDisplay from "@/components/UI/ErrorDisplay";

interface Contest {
	id: string;
	title: string;
	status: string;
	securityLevel: string;
	duration: number;
	startTime: number;
	endTime: number;
	leaderboardFreeze?: number;
	registrationEnabled?: boolean;
}

interface ContestProblem {
	problemId: string;
	label: string;
	title: string;
}

const ContestTimerDisplay: React.FC<{
	contest: Contest | null;
	isVirtual: boolean;
	virtualEndTime: number | null;
}> = React.memo(({ contest, isVirtual, virtualEndTime }) => {
	const [timeLeft, setTimeLeft] = useState("");

	useEffect(() => {
		if (!contest) return;

		const timer = setInterval(() => {
			const now = getServerTime();
			let target = 0;

			if (isVirtual && virtualEndTime) {
				target = virtualEndTime;
			} else {
				target = contest.endTime;
			}

			if (now >= target) {
				setTimeLeft("00:00:00");
				clearInterval(timer);
				return;
			}

			const diff = target - now;
			const hrs = Math.floor(diff / 3600000);
			const mins = Math.floor((diff % 3600000) / 60000);
			const secs = Math.floor((diff % 60000) / 1000);

			const format = (n: number) => n.toString().padStart(2, "0");
			setTimeLeft(`${format(hrs)}:${format(mins)}:${format(secs)}`);
		}, 1000);

		return () => clearInterval(timer);
	}, [contest, isVirtual, virtualEndTime]);

	return <span>{timeLeft}</span>;
});
ContestTimerDisplay.displayName = "ContestTimerDisplay";

const ContestProblemPage: React.FC = () => {
	const router = useRouter();
	const { cid, pid } = router.query;
	const hasMounted = useHasMounted();
	const [user, loadingUser] = useAuthState(auth);

	const [problem, setProblem] = useState<Problem | null>(null);
	const [contest, setContest] = useState<Contest | null>(null);
	const [allContestProblems, setAllContestProblems] = useState<ContestProblem[]>([]);
	const [participantStatus, setParticipantStatus] = useState<string | null>(null);
	const [isVirtual, setIsVirtual] = useState(false);
	const [virtualEndTime, setVirtualEndTime] = useState<number | null>(null);

	const [loading, setLoading] = useState(true);

	// Anti-cheat state
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [warnings, setWarnings] = useState(0);
	const [showExamLockModal, setShowExamLockModal] = useState(false);
	const [terminatedReason, setTerminatedReason] = useState<string | null>(null);
	const [showWarningModal, setShowWarningModal] = useState(false);
	const [violationType, setViolationType] = useState<"fullscreen" | "tab">("fullscreen");
	const [pendingWarningCount, setPendingWarningCount] = useState(0);

	const warningsRef = useRef(0);
	warningsRef.current = warnings;

	const lastWarningTimeRef = useRef<number>(0);
	const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Fetch everything
	const fetchData = useCallback(async () => {
		if (!cid || !pid) return;

		const isInitialLoad = !contest;
		if (isInitialLoad) {
			setLoading(true);
		}

		try {
			let currentContest = contest;
			
			// 1. Fetch Contest
			if (!currentContest) {
				const contestDoc = await getDoc(doc(firestore, "contests", cid as string));
				if (!contestDoc.exists()) {
					setLoading(false);
					return;
				}
				const cData = contestDoc.data();
				currentContest = { id: contestDoc.id, ...cData } as Contest;
				setContest(currentContest);
			}

			// 2. Fetch Participant status
			if (user) {
				const partDoc = await getDoc(doc(firestore, "contest_participants", `${cid}_${user.uid}`));
				if (partDoc.exists()) {
					const pData = partDoc.data();
					setParticipantStatus(pData.status);
					setIsVirtual(!!pData.isVirtual);
					setWarnings(pData.warningsCount || 0);
					if (pData.isVirtual && pData.virtualStartTime) {
						setVirtualEndTime(pData.virtualStartTime + currentContest.duration * 60000);
					}
					if (pData.status === "terminated") {
						setTerminatedReason("Your session was terminated by administrators or security rules.");
						setLoading(false);
						return;
					}
				} else {
					setParticipantStatus(null);
				}
			}

			// 3. Fetch Problem details
			let probObj: any = null;
			const problemDoc = await getDoc(doc(firestore, "problems", pid as string));
			if (problemDoc.exists()) {
				const data = problemDoc.data();
				const dbTags = data.tags && Array.isArray(data.tags)
					? data.tags
					: [];
				const rawEx: any[] = Array.isArray(data.examples) ? data.examples : [];
				let publicSamples = rawEx.filter((ex) => Boolean(ex && ex.isSample));
				if (publicSamples.length === 0 && rawEx.length > 0) {
					publicSamples = rawEx.slice(0, 3).map((ex, idx) => ({ ...ex, isSample: true, id: ex.id || idx + 1 }));
				}
				const sanitizedSamples = publicSamples.map((s, idx) => ({
					id: s.id || idx + 1,
					inputText: s.inputText || "",
					outputText: s.outputText || "",
					explanation: s.explanation || "",
					img: s.img || "",
					isSample: true,
				}));

				probObj = {
					id: problemDoc.id,
					title: data.title || "",
					problemStatement: data.problemStatement || "",
					examples: sanitizedSamples,
					constraints: data.constraints || "",
					starterCode: data.starterCode || "",
					handlerFunction: data.handlerFunction || "",
					starterFunctionName: data.starterFunctionName || "",
					inputFormat: data.inputFormat || "",
					outputFormat: data.outputFormat || "",
					tags: dbTags,
					description: data.description || "",
					language: data.language || "English",
					difficulty: data.difficulty || "Medium",
					points: data.points || 100,
				};
			} else if (staticProblems[pid as string]) {
				// Check if the static problem is deleted
				const deletedDoc = await getDoc(doc(firestore, "deleted_problems", pid as string));
				if (!deletedDoc.exists()) {
					const staticProb = staticProblems[pid as string];
					const dbTags = staticProb.tags && Array.isArray(staticProb.tags)
						? staticProb.tags
						: [];
					probObj = {
						id: pid as string,
						title: staticProb.title || "",
						problemStatement: staticProb.problemStatement || "",
						examples: staticProb.examples || [],
						constraints: staticProb.constraints || "",
						starterCode: staticProb.starterCode || "",
						handlerFunction: typeof staticProb.handlerFunction === "function" ? staticProb.handlerFunction.toString() : staticProb.handlerFunction,
						starterFunctionName: staticProb.starterFunctionName || "",
						inputFormat: staticProb.inputFormat || "",
						outputFormat: staticProb.outputFormat || "",
						tags: dbTags,
						description: staticProb.description || "",
						language: staticProb.language || "English",
						difficulty: staticProb.difficulty || "Medium",
						points: staticProb.points || 100,
					};
				}
			}
			setProblem(probObj);

			// 4. Fetch list of all problems in this contest for the header tabs
			if (allContestProblems.length === 0) {
				const cpSnap = await getDocs(
					query(collection(firestore, "contest_problems"), where("contestId", "==", cid), orderBy("order", "asc"))
				);
				const cpList: ContestProblem[] = [];
				cpSnap.forEach((d) => {
					const cpData = d.data();
					cpList.push({
						problemId: cpData.problemId,
						label: cpData.label,
						title: cpData.problemId
					});
				});
				setAllContestProblems(cpList);
			}

			// Trigger Exam mode lock modal if security is enabled (only on initial load)
			if (isInitialLoad && (currentContest.securityLevel === "standard" || currentContest.securityLevel === "strict")) {
				setShowExamLockModal(true);
			}

		} catch (err) {
			console.error("Error loading contest problem:", err);
		} finally {
			if (isInitialLoad) {
				setLoading(false);
			}
		}
	}, [cid, pid, user, contest, allContestProblems.length]);

	useEffect(() => {
		if (cid && pid && !loadingUser) {
			fetchData();
		}
	}, [cid, pid, user, loadingUser, fetchData]);


	// --- ANTI-CHEAT HANDLERS ---
	const terminateUser = useCallback(async (reason: string) => {
		if (!cid || !user) return;
		try {
			setParticipantStatus("terminated");
			setTerminatedReason(reason);
			
			// Exit fullscreen if active
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(() => {});
			}

			// Call hardened /api/contests/terminate endpoint
			const userToken = await user.getIdToken();
			await fetch("/api/contests/terminate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${userToken}`
				},
				body: JSON.stringify({
					contestId: cid,
					reason
				})
			});
		} catch (e) {
			console.error("Error terminating user:", e);
		}
	}, [cid, user]);

	// Real-time synchronization of participant standing
	useEffect(() => {
		if (!cid || !user) return;
		const partRef = doc(firestore, "contest_participants", `${cid}_${user.uid}`);
		const unsub = onSnapshot(partRef, (snap) => {
			if (snap.exists()) {
				const pData = snap.data();
				setParticipantStatus(pData.status);
				if (pData.warningsCount !== undefined) {
					setWarnings(pData.warningsCount);
					warningsRef.current = pData.warningsCount;
				}
				if (pData.status === "terminated") {
					setTerminatedReason(pData.terminationReason || "Your session was terminated due to proctoring violations.");
					if (document.fullscreenElement) {
						document.exitFullscreen().catch(() => {});
					}
				}
			}
		}, (err) => {
			console.error("Error watching participant standing:", err);
		});

		return () => unsub();
	}, [cid, user]);

	const logIntegrityEvent = useCallback(async (type: string, details: string) => {
		if (!cid || !user) return;
		try {
			await addDoc(collection(firestore, "contest_integrity_events"), {
				contestId: cid,
				uid: user.uid,
				username: user.email?.split("@")[0] || "user",
				type,
				timestamp: Date.now(),
				details
			});
		} catch (e) {
			console.error("Error logging integrity event:", e);
		}
	}, [cid, user]);

	const triggerSecurityWarning = useCallback(async (type: "fullscreen" | "tab", details: string) => {
		if (showWarningModal || showExamLockModal || participantStatus === "terminated" || !cid || !user || !contest) return;

		const nowTime = Date.now();
		if (nowTime - lastWarningTimeRef.current < 2000) {
			return;
		}
		lastWarningTimeRef.current = nowTime;

		if (contest.securityLevel === "standard" || contest.securityLevel === "strict") {
			const isStrict = contest.securityLevel === "strict";
			const newWarnCount = warningsRef.current + 1;
			setWarnings(newWarnCount);
			warningsRef.current = newWarnCount;

			try {
				const regRef = doc(firestore, "contest_participants", `${cid}_${user.uid}`);
				await updateDoc(regRef, { warningsCount: newWarnCount });
			} catch (dbErr) {
				console.error("Failed to sync warning count to DB:", dbErr);
			}

			logIntegrityEvent(type === "fullscreen" ? "fullscreen_exit" : "tab_switch", details);

			if (isStrict || newWarnCount >= 3) {
				terminateUser(
					isStrict
						? `Strict Mode Violation: Instant termination triggered by ${type === "fullscreen" ? "exiting fullscreen" : "switching tabs / losing focus"}.`
						: `Violation Limit Exceeded: 3 proctoring infractions recorded (${type === "fullscreen" ? "exited fullscreen" : "tab switch / lost focus"}).`
				);
			} else {
				setViolationType(type);
				setPendingWarningCount(newWarnCount);
				setShowWarningModal(true);
			}
		}
	}, [contest, cid, user, showWarningModal, showExamLockModal, participantStatus, logIntegrityEvent, terminateUser]);

	// Listeners
	useEffect(() => {
		if (!contest || contest.securityLevel === "casual" || participantStatus === "terminated") return;

		const onFullscreenChange = () => {
			const isFull = !!document.fullscreenElement;
			setIsFullscreen(isFull);
			if (!isFull && !showExamLockModal) {
				triggerSecurityWarning("fullscreen", "User exited fullscreen mode.");
			}
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				triggerSecurityWarning("tab", "User switched tabs or minimized browser window.");
			}
		};

		const handleBlur = () => {
			if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
			blurTimeoutRef.current = setTimeout(() => {
				if (!document.hasFocus() && document.visibilityState === "visible") {
					triggerSecurityWarning("tab", "User lost focus on the contest window.");
				}
			}, 1200);
		};

		const handleFocus = () => {
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
				blurTimeoutRef.current = null;
			}
		};

		document.addEventListener("fullscreenchange", onFullscreenChange);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("blur", handleBlur);
		window.addEventListener("focus", handleFocus);

		return () => {
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("focus", handleFocus);
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
			}
		};
	}, [contest, participantStatus, showExamLockModal, triggerSecurityWarning]);

	const now = getServerTime();
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
				now
		  )
		: null;

	const isVirtualActive = isVirtual && virtualEndTime && now < virtualEndTime;
	const isRegularActive = computedStatus === "running" || computedStatus === "frozen";
	const isContestActive = !!((isVirtualActive || isRegularActive) && participantStatus !== "terminated");

	useEffect(() => {
		if (!isContestActive) return;

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "Are you sure you want to leave the contest? Your progress might not be saved.";
			return e.returnValue;
		};

		const handleRouteChange = (url: string) => {
			if (url.startsWith(`/contests/${cid}/problems/`)) {
				return;
			}
			router.events.emit("routeChangeError");
			alert("You cannot leave the problem-solving workspace while the contest is active. Please complete the contest first.");
			throw "Route change aborted";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		router.events.on("routeChangeStart", handleRouteChange);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			router.events.off("routeChangeStart", handleRouteChange);
		};
	}, [isContestActive, cid, router]);

	// Fullscreen request
	const enterFullscreenMode = () => {
		const elem = document.documentElement;
		const requestMethod = elem.requestFullscreen || (elem as any).mozRequestFullScreen || (elem as any).webkitRequestFullscreen || (elem as any).msRequestFullscreen;
		
		if (requestMethod) {
			requestMethod.call(elem)
				.then(() => {
					setIsFullscreen(true);
					setShowExamLockModal(false);
					logIntegrityEvent("session_start", "User locked into Secure Mode.");
				})
				.catch((err: any) => {
					console.error("Fullscreen lock failed:", err);
					alert("Could not enter secure fullscreen mode. Please check browser permissions.");
				});
		}
	};

	if (!hasMounted) return null;

	if (loading || loadingUser) {
		return (
			<div className='min-h-screen flex flex-col justify-center items-center gap-3 bg-bg-base text-text-primary'>
				<FaSpinner className='animate-spin text-accent-brand' size={24} />
				<p className='text-xs font-mono text-text-muted'>Initializing secure compiler environment...</p>
			</div>
		);
	}

	if (!contest) {
		return <ErrorDisplay type="contest_not_found" />;
	}

	if (!problem) {
		return <ErrorDisplay type="problem_not_found" />;
	}

	// Admission Checks
	if (!user) {
		return (
			<div className='bg-bg-base min-h-screen text-text-primary flex flex-col'>
				<Topbar />
				<main className='flex-1 flex flex-col justify-center items-center gap-4 px-4 pb-20'>
					<h3 className='text-lg font-semibold text-text-primary'>Authentication Required</h3>
					<p className='text-xs text-text-muted'>Sign in with an authenticated developer account to enter the contest.</p>
				</main>
			</div>
		);
	}

	const isContestEnded = computedStatus === "ended" || computedStatus === "archived";

	if (participantStatus === "terminated" || terminatedReason) {
		return (
			<div className='bg-bg-base min-h-screen text-text-primary flex flex-col'>
				<Topbar />
				<main className='flex-1 flex flex-col justify-center items-center gap-5 px-4 pb-20'>
					<div className="w-14 h-14 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
						<FaExclamationTriangle size={24} />
					</div>
					<div className="text-center space-y-2 max-w-md">
						<span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
							Disqualified • Proctoring Policy Infraction
						</span>
						<h3 className='text-xl font-semibold text-text-primary tracking-tight'>Session Terminated</h3>
						<p className='text-xs text-text-secondary leading-relaxed'>
							{terminatedReason || "Your contest workspace session has been terminated due to proctoring policy violations."}
						</p>
					</div>
					<div className="bg-bg-surface border border-border-default rounded-md p-4 max-w-md w-full text-center space-y-1.5 text-xs text-text-muted">
						<p className="font-medium text-text-secondary">Security Incident Recorded</p>
						<p className="text-[11px] text-text-muted">
							Solution editor locked, submissions disabled, and the event has been logged to the audit ledger.
						</p>
					</div>
					<Link href={`/contests/${cid}`} className='inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-medium bg-bg-surface-elevated hover:bg-bg-surface border border-border-default text-text-primary transition-colors'>
						Return to Contest Overview
					</Link>
				</main>
			</div>
		);
	}

	if (!isContestEnded && (!participantStatus || participantStatus === "registered")) {
		return (
			<div className='bg-bg-base min-h-screen text-text-primary flex flex-col'>
				<Topbar />
				<main className='flex-1 flex flex-col justify-center items-center gap-4 px-4 pb-20'>
					<h3 className='text-lg font-semibold text-text-primary'>Contest Entry Required</h3>
					<p className='text-xs text-text-muted mb-2'>Register and enter the contest from the overview dashboard before viewing problems.</p>
					<Link href={`/contests/${cid}`} className='inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors font-mono'>
						Contest Dashboard
					</Link>
				</main>
			</div>
		);
	}

	const isProblemLoading = !problem || problem.id !== pid;

	return (
		<div className='min-h-screen bg-bg-base text-text-primary flex flex-col'>
			{/* Technical Contest Header */}
			<header className='flex justify-between items-center px-4 py-2.5 border-b border-border-default bg-bg-surface h-12'>
				<div className='flex items-center gap-3'>
					{!isContestActive && (
						<>
							<Link
								href={`/contests/${cid}`}
								className='text-xs font-mono text-text-muted hover:text-text-primary flex items-center gap-1.5 transition-colors'
							>
								<FaChevronLeft size={9} /> Back
							</Link>
							<span className='h-3.5 w-px bg-border-default' />
						</>
					)}
					<h2 className='text-xs font-semibold text-text-primary truncate max-w-xs'>{contest?.title}</h2>
					<div className='flex items-center gap-1.5 bg-bg-base border border-border-default rounded px-2 py-0.5 text-xs text-text-secondary font-mono'>
						<FaClock size={10} className='text-accent-brand' />
						<ContestTimerDisplay contest={contest} isVirtual={isVirtual} virtualEndTime={virtualEndTime} />
					</div>
				</div>

				{/* Problem set tabs */}
				<SecondaryNav
					tabs={allContestProblems.map((cp) => ({
						id: cp.problemId,
						label: cp.label,
						href: `/contests/${cid}/problems/${cp.problemId}`
					}))}
					activeTab={pid as string}
				/>

				<div className='text-xs font-mono text-text-muted'>
					Integrity: <span className='capitalize text-accent-brand font-medium'>{contest?.securityLevel}</span>
				</div>
			</header>

			{isProblemLoading ? (
				<div className='flex-1 flex flex-col justify-center items-center gap-3 bg-bg-base text-text-primary'>
					<FaSpinner className='animate-spin text-accent-brand' size={24} />
					<p className='text-xs font-mono text-text-muted'>Loading problem workspace...</p>
				</div>
			) : (
				problem && (
					<div className='flex-1 overflow-hidden relative'>
						<SubmissionProvider problemId={problem.id} contestId={cid as string}>
							<Workspace problem={problem} contestId={cid as string} />
						</SubmissionProvider>
					</div>
				)
			)}

			{/* Exam Mode Lock Modal */}
			{showExamLockModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
					<div className='bg-bg-surface border border-border-default rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl text-center space-y-5'>
						<div className='w-12 h-12 rounded-md bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center mx-auto text-accent-brand'>
							<FaLock size={20} />
						</div>
						<div className='space-y-1.5'>
							<h3 className='text-base font-semibold text-text-primary'>Secure Environment Required</h3>
							<p className='text-xs text-text-secondary leading-relaxed'>
								This contest enforces strict proctoring. Exiting fullscreen, resizing, or switching browser tabs logs security infractions. Exceeding the infraction limit results in immediate disqualification.
							</p>
						</div>

						<button
							onClick={enterFullscreenMode}
							className='w-full py-2.5 rounded-md font-mono text-xs font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors flex items-center justify-center gap-2'
						>
							<FaExpand size={11} /> Enter Secure Fullscreen
						</button>
					</div>
				</div>
			)}

			{/* Security Warning Modal */}
			{showWarningModal && (
				<div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4'>
					<div className='bg-bg-surface border border-red-500/30 rounded-lg p-6 max-w-md w-full shadow-2xl text-center space-y-4 relative overflow-hidden'>
						<div className="w-12 h-12 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
							<FaExclamationTriangle size={20} />
						</div>

						<div className='space-y-1'>
							<span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
								Integrity Warning
							</span>
							<h3 className='text-base font-semibold text-text-primary tracking-tight'>
								{violationType === "fullscreen" ? "Fullscreen Mode Exited" : "Window Focus Lost"}
							</h3>
							<p className='text-xs text-text-secondary leading-relaxed'>
								{violationType === "fullscreen" 
									? "You have left fullscreen mode. Exiting fullscreen is recorded as a policy violation."
									: "You switched tabs or lost window focus. Leaving the problem workspace is prohibited."}
							</p>
						</div>

						{/* Warning indicator counter */}
						<div className="bg-bg-base border border-border-default rounded-md p-3 flex justify-between items-center font-mono">
							<span className="text-xs text-text-muted">Violations recorded:</span>
							<span className="text-xs font-semibold text-red-400">
								{pendingWarningCount} / 3
							</span>
						</div>
						<p className="text-[11px] text-red-400/80 font-mono">
							Violation {pendingWarningCount} of 3. Reaching 3 violations terminates your contest session.
						</p>

						<button
							onClick={() => {
								setShowWarningModal(false);
								if (!document.fullscreenElement) {
									enterFullscreenMode();
								}
							}}
							className='w-full py-2.5 rounded-md font-mono text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-2'
						>
							Acknowledge & Resume
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ContestProblemPage;
