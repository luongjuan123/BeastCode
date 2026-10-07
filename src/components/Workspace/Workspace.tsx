import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ProblemDescription from "./ProblemDescription/ProblemDescription";
import SecondaryNav from "../TabsNavigation/SecondaryNav";
import Playground, { ISettings } from "./Playground/Playground";
import { SupportedLanguage } from "@/utils/pistonRunner";
import ProblemDiscussions from "./ProblemDiscussions";
import { Problem } from "@/utils/types/problem";
import Confetti from "react-confetti";
import useWindowSize from "@/hooks/useWindowSize";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import useHasMounted from "@/hooks/useHasMounted";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { FaFacebook, FaTwitter, FaLinkedin, FaStar, FaGlobe, FaTimes, FaCheck, FaCode, FaLightbulb } from "react-icons/fa";
import { FiChevronRight, FiArrowLeft, FiZap, FiCheck, FiX } from "react-icons/fi";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { useSubmission } from "@/context/SubmissionContext";
import { getSubmissionStateMetadata } from "@/utils/submissionUtils";
import TestcaseScorecard from "./TestcaseScorecard/TestcaseScorecard";
import useLocalStorage from "@/hooks/useLocalStorage";
import BeastCodeSelect from "../UI/BeastCodeSelect";

const SocialIcon: React.FC<{ Icon: any; title: string }> = ({ Icon, title }) => {
	return (
		<button
			className="transition-colors p-2 rounded-md flex items-center justify-center cursor-pointer text-text-muted hover:text-accent hover:bg-accent/10 border border-transparent hover:border-border-subtle"
			title={title}
		>
			<Icon size={16} />
		</button>
	);
};

const getDifficultyBadgeStyle = (difficulty: string) => {
	const diff = (difficulty || "Easy").toLowerCase();
	let varColor = "var(--color-success)";
	if (diff === "medium") {
		varColor = "var(--color-warning)";
	}
	if (diff === "hard") {
		varColor = "var(--color-error)";
	}

	return {
		color: varColor,
		backgroundColor: `color-mix(in srgb, ${varColor} 8%, transparent)`,
		border: `1px solid color-mix(in srgb, ${varColor} 20%, transparent)`,
	};
};

type WorkspaceProps = {
	problem: Problem;
	contestId?: string;
};

const Workspace: React.FC<WorkspaceProps> = ({ problem, contestId }) => {
	const router = useRouter();
	const { width, height } = useWindowSize();
	const [user, loading] = useAuthState(auth);
	const [success, setSuccess] = useState(false);
	const [solved, setSolved] = useState(false);
	const [language, setLanguage] = useState<SupportedLanguage>("javascript");
	const [userCode, setUserCode] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"problem" | "submissions" | "leaderboard" | "discussions" | "editorial">("problem");

	// Lifted Playground States
	const [customInputChecked, setCustomInputChecked] = useState(false);
	const [customInputText, setCustomInputText] = useState("");
	const [activeTestCaseId, setActiveTestCaseId] = useState(0);
	const [consoleTab, setConsoleTab] = useState<"testcases" | "custominput" | "results" | "submission">("testcases");
	const [activeExampleId, setActiveExampleId] = useState(0);
	
	const [fontSize] = useLocalStorage("lcc-fontSize", "16px");
	const [settings, setSettings] = useState<ISettings>({
		fontSize: fontSize,
		settingsModalIsOpen: false,
		dropdownIsOpen: false,
	});
	const [selectionRange, setSelectionRange] = useState<{ anchor: number; head: number } | null>(null);
	const [scrollTop, setScrollTop] = useState<number>(0);

	useEffect(() => {
		const tab = router.query.tab as string;
		if (tab && ["problem", "submissions", "leaderboard", "discussions", "editorial"].includes(tab)) {
			setActiveTab(tab as any);
		} else {
			setActiveTab("problem");
		}
	}, [router.query.tab]);

	const handleTabChange = (tab: string) => {
		setActiveTab(tab as any);
		const cleanQuery = { ...router.query };
		if (tab === "problem") {
			delete cleanQuery.tab;
		} else {
			cleanQuery.tab = tab;
		}
		router.replace({ pathname: router.pathname, query: cleanQuery }, undefined, { shallow: true });
	};

	const hasMounted = useHasMounted();
	const [leftPercent, setLeftPercent] = useState<number>(45);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		if (!isDragging) return;
		const handlePointerMove = (e: PointerEvent) => {
			const containerWidth = window.innerWidth;
			if (containerWidth <= 0) return;
			const newPercent = (e.clientX / containerWidth) * 100;
			const minPercent = (300 / containerWidth) * 100;
			const maxPercent = ((containerWidth - 300) / containerWidth) * 100;
			setLeftPercent(Math.max(minPercent, Math.min(maxPercent, newPercent)));
		};
		const handlePointerUp = () => {
			setIsDragging(false);
		};
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [isDragging]);


	const [activeLanguage, setActiveLanguage] = useState<string>("en");
	const [translations, setTranslations] = useState<Record<string, any>>({});
	const [translating, setTranslating] = useState<boolean>(false);

	const handleTranslate = async (langCode: string) => {
		if (langCode === "en") {
			setActiveLanguage("en");
			return;
		}

		if (translations[langCode]) {
			setActiveLanguage(langCode);
			return;
		}

		setTranslating(true);
		try {
			const fieldsToTranslate = [
				{ key: "title", text: problem.title },
				{ key: "problemStatement", text: problem.problemStatement },
				{ key: "inputFormat", text: problem.inputFormat || "" },
				{ key: "constraints", text: problem.constraints || "" },
				{ key: "outputFormat", text: problem.outputFormat || "" },
				{ key: "editorialMarkdown", text: problem.editorial?.markdown || "" },
				...problem.examples.map((ex, idx) => ({
					key: `example_${idx}`,
					text: ex.explanation || "",
				})),
			].filter(item => item.text.trim() !== "");

			const separator = " ||||| ";
			const combinedText = fieldsToTranslate.map(item => item.text).join(separator);

			const res = await fetch("/api/translate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: combinedText,
					targetLang: langCode,
				}),
			});

			if (!res.ok) {
				throw new Error("Translation failed");
			}

			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}

			const translatedCombined = data.translatedText || "";
			const splitRegex = /\s*\|\|\|\|\|\s*/;
			const translatedParts = translatedCombined.split(splitRegex);

			const newTranslatedProblem: any = { ...problem };
			let partIdx = 0;
			fieldsToTranslate.forEach((item) => {
				const translatedVal = translatedParts[partIdx] || item.text;
				partIdx++;

				if (item.key === "title") {
					newTranslatedProblem.title = translatedVal;
				} else if (item.key === "problemStatement") {
					newTranslatedProblem.problemStatement = translatedVal;
				} else if (item.key === "inputFormat") {
					newTranslatedProblem.inputFormat = translatedVal;
				} else if (item.key === "constraints") {
					newTranslatedProblem.constraints = translatedVal;
				} else if (item.key === "outputFormat") {
					newTranslatedProblem.outputFormat = translatedVal;
				} else if (item.key === "editorialMarkdown") {
					if (newTranslatedProblem.editorial) {
						newTranslatedProblem.editorial = {
							...newTranslatedProblem.editorial,
							markdown: translatedVal,
						};
					}
				} else if (item.key.startsWith("example_")) {
					const idx = parseInt(item.key.split("_")[1]);
					if (newTranslatedProblem.examples[idx]) {
						newTranslatedProblem.examples[idx] = {
							...newTranslatedProblem.examples[idx],
							explanation: translatedVal,
						};
					}
				}
			});

			setTranslations((prev) => ({ ...prev, [langCode]: newTranslatedProblem }));
			setActiveLanguage(langCode);
		} catch (error) {
			console.error("Translation error:", error);
			alert("Failed to translate the problem. Please try again.");
		} finally {
			setTranslating(false);
		}
	};

	const displayProblem = activeLanguage === "en" ? problem : (translations[activeLanguage] || problem);

	// Sidebar statistics & ratings states
	const [submissionsCount, setSubmissionsCount] = useState(5);
	const [userRating, setUserRating] = useState(0);
	const [hoverRating, setHoverRating] = useState(0);
	const [isAdmin, setIsAdmin] = useState(false);
	const [contestDetails, setContestDetails] = useState<any>(null);

	const [ratingError, setRatingError] = useState<string | null>(null);
	const [shakeRating, setShakeRating] = useState(false);

	const triggerRatingError = (msg: string) => {
		setRatingError(msg);
		setShakeRating(true);
		setTimeout(() => setShakeRating(false), 500);
	};

	// Submissions tab state hook
	const {
		submissions,
		loadingSubs,
		selectedSub,
		setSelectedSub,
		selectedSubTestCaseIndex,
		setSelectedSubTestCaseIndex,
		isSubmitting,
		submittingStage,
		submittingProgress,
		submittingVerdict
	} = useSubmission();

	const [langFilter, setLangFilter] = useState<string>("all");
	const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [currentPage, setCurrentPage] = useState<number>(1);
	const itemsPerPage = 8;

	// Leaderboard tab states
	const [leaderboard, setLeaderboard] = useState<any[]>([]);
	const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

	// Fetch submissions count, check admin status, and load user's rating on mount
	useEffect(() => {
		const fetchInitialData = async () => {
			try {
				// 1. Fetch total submissions count for this problem
				const q = query(
					collection(firestore, contestId ? "contest_submissions" : "submissions"),
					where("problemId", "==", problem.id),
					...(contestId ? [where("contestId", "==", contestId)] : [])
				);
				const snap = await getDocs(q);
				if (snap.size > 0) {
					setSubmissionsCount(snap.size);
				}

				// 2. Check if logged-in user is admin/owner
				if (user) {
					const userRef = doc(firestore, "users", user.uid);
					const userDoc = await getDoc(userRef);
					if (userDoc.exists()) {
						const userData = userDoc.data();
						if (userData.role === "admin" || userData.isAdmin === true) {
							setIsAdmin(true);
						}
						if (userData.problemRatings && userData.problemRatings[problem.id]) {
							setUserRating(userData.problemRatings[problem.id]);
						} else {
							setUserRating(0);
						}
					}
				} else {
					setUserRating(0);
				}

				// 3. Fetch contest details if contestId exists
				if (contestId) {
					const contestDoc = await getDoc(doc(firestore, "contests", contestId));
					if (contestDoc.exists()) {
						setContestDetails(contestDoc.data());
					}
				}
			} catch (e) {
				console.error("Error fetching workspace initial metadata:", e);
			}
		};

		fetchInitialData();
	}, [problem.id, user, contestId]);


	// Fetch standings when activeTab switches to leaderboard
	useEffect(() => {
		if (activeTab === "leaderboard") {
			const fetchLeaderboard = async () => {
				setLoadingLeaderboard(true);
				try {
					// 1. Fetch user map
					const usersSnap = await getDocs(collection(firestore, "users"));
					const usersMap: Record<string, any> = {};
					usersSnap.forEach((docSnap) => {
						usersMap[docSnap.id] = docSnap.data();
					});

					// 2. Fetch submissions for this problem
					const q = query(
						collection(firestore, contestId ? "contest_submissions" : "submissions"),
						where("problemId", "==", problem.id),
						...(contestId ? [where("contestId", "==", contestId)] : [])
					);
					const snap = await getDocs(q);

					const userBest: Record<string, { score: number; timestamp: number; language: string }> = {};

					snap.forEach((docSnap) => {
						const sub = docSnap.data();
						const uid = sub.uid;
						if (!uid) return;
						const score = sub.score !== undefined ? sub.score : (sub.status === "passed" ? 100 : 0);
						const timestamp = sub.timestamp || Date.now();

						if (!userBest[uid]) {
							userBest[uid] = { score, timestamp, language: sub.language || "" };
						} else {
							if (score > userBest[uid].score) {
								userBest[uid] = { score, timestamp, language: sub.language || "" };
							} else if (score === userBest[uid].score && timestamp < userBest[uid].timestamp) {
								userBest[uid] = { score, timestamp, language: sub.language || "" };
							}
						}
					});

					const standings = Object.keys(userBest).map((uid) => {
						const userObj = usersMap[uid] || {};
						return {
							uid,
							displayName: userObj.displayName || "Anonymous User",
							avatarUrl: userObj.avatarUrl || "",
							score: userBest[uid].score,
							timestamp: userBest[uid].timestamp,
							language: userBest[uid].language,
						};
					});

					// Sort by score desc, then by earliest timestamp
					standings.sort((a, b) => {
						if (b.score !== a.score) return b.score - a.score;
						return a.timestamp - b.timestamp;
					});

					setLeaderboard(standings);
				} catch (err) {
					console.error("Error building leaderboard:", err);
				} finally {
					setLoadingLeaderboard(false);
				}
			};

			fetchLeaderboard();
		}
	}, [activeTab, problem.id]);

	// Helpers
	const formatLanguage = (lang: string) => {
		switch (lang?.toLowerCase()) {
			case "cpp":
				return "C++20";
			case "c":
				return "C";
			case "python":
				return "Python 3";
			case "javascript":
				return "JavaScript";
			case "java":
				return "Java";
			default:
				return lang;
		}
	};

	const formatRelativeTime = (ts: number) => {
		const diff = Date.now() - ts;
		const secs = Math.floor(diff / 1000);
		const mins = Math.floor(secs / 60);
		const hours = Math.floor(mins / 60);
		const days = Math.floor(hours / 24);

		if (secs < 60) return "just now";
		if (mins < 60) return `${mins} mins ago`;
		if (hours < 24) return `${hours} hours ago`;
		if (days === 1) return "yesterday";
		if (days < 30) return `${days} days ago`;
		return new Date(ts).toLocaleDateString();
	};

	const filteredSubmissions = submissions.filter((sub) => {
		const langMatch = langFilter === "all" || sub.language === langFilter;
		
		let outcomeMatch = true;
		if (outcomeFilter !== "all") {
			const subVerdict = (sub.verdict || "").toLowerCase();
			const subStatus = (sub.status || "").toLowerCase();
			if (outcomeFilter === "passed") {
				outcomeMatch = subStatus === "passed";
			} else if (outcomeFilter === "failed") {
				outcomeMatch = subStatus === "failed";
			} else {
				outcomeMatch = subVerdict.includes(outcomeFilter);
			}
		}
		
		const searchMatch =
			!searchQuery ||
			(sub.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(sub.verdict || "").toLowerCase().includes(searchQuery.toLowerCase());
			
		return langMatch && outcomeMatch && searchMatch;
	});

	const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
	const paginatedSubmissions = filteredSubmissions.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	const getPerformanceStats = (currentSub: any) => {
		if (!currentSub || currentSub.status !== "passed") return null;
		const peerSubs = submissions.filter(s => s.language === currentSub.language && s.status === "passed");
		if (peerSubs.length <= 1) {
			return { runtimeBeats: 100, memoryBeats: 100 };
		}
		
		const currentRuntime = currentSub.runtime || 10;
		const currentMemory = currentSub.memory || 2048;
		
		const fasterCount = peerSubs.filter(s => (s.runtime || 10) > currentRuntime).length;
		const lessMemoryCount = peerSubs.filter(s => (s.memory || 2048) > currentMemory).length;
		
		const runtimeBeats = Math.round((fasterCount / (peerSubs.length - 1)) * 100);
		const memoryBeats = Math.round((lessMemoryCount / (peerSubs.length - 1)) * 100);
		
		return {
			runtimeBeats: Math.max(5, Math.min(99, runtimeBeats)),
			memoryBeats: Math.max(5, Math.min(99, memoryBeats))
		};
	};

	const handleRateChallenge = async (stars: number) => {
		if (!user) {
			triggerRatingError("Sign in to rate");
			return;
		}

		try {
			const userRef = doc(firestore, "users", user.uid);
			await updateDoc(userRef, {
				[`problemRatings.${problem.id}`]: stars,
			});
			setUserRating(stars);
			setRatingError(null);
		} catch (error) {
			console.error("Error saving rating:", error);
			triggerRatingError("Failed to save rating");
		}
	};

	const handleOpenInEditor = () => {
		if (!selectedSub) return;
		if (loading) return;
		setLanguage(selectedSub.language as SupportedLanguage);
		setUserCode(selectedSub.code);
		const key = user ? `code-meta-${user.uid}-${problem.id}-${selectedSub.language}` : `code-meta-${problem.id}-${selectedSub.language}`;
		localStorage.setItem(key, JSON.stringify({ code: selectedSub.code, updatedAt: Date.now() }));
		setActiveTab("problem");
	};

	useEffect(() => {
		if (isSubmitting) {
			setActiveTab("submissions");
		}
	}, [isSubmitting]);

	if (!hasMounted) return null;

	return (
		<div className="min-h-screen bg-bg-base text-text-primary font-sans select-text" style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
			<div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-y-8">
				{/* Block A: The Information & Navigation Header */}
				<div className="bg-bg-surface border border-border-default rounded-lg p-4 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
					{/* Title & Metadata Area */}
					<div>
						{!contestId && (
							<div className="flex items-center text-[10px] font-bold uppercase tracking-wider select-none mb-2 text-text-muted">
								<Link href="/" className="hover:text-brand-orange transition-colors duration-200">
									Problem List
								</Link>
								{displayProblem.tags && displayProblem.tags.length > 0 && (
									<>
										<FiChevronRight className="w-3.5 h-3.5 mx-1 opacity-50 text-text-muted" />
										<Link
											href={`/tags/${encodeURIComponent(displayProblem.tags[0].toLowerCase())}`}
											className="hover:text-brand-orange transition-colors duration-200"
										>
											{displayProblem.tags[0]}
										</Link>
									</>
								)}
								<FiChevronRight className="w-3.5 h-3.5 mx-1 opacity-50 text-text-muted" />
								<span className="text-text-primary">{displayProblem.title}</span>
							</div>
						)}

						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
							<h1 className="text-2xl md:text-3xl font-black tracking-tight text-text-primary" style={{ fontFamily: "'Russo One', sans-serif", color: "var(--text-primary)" }}>
								{displayProblem.title}
							</h1>
							
							{/* Compact Meta Info Row */}
							<div className="flex flex-wrap items-center gap-3 bg-dark-fill-3/20 border border-border-subtle rounded-xl p-3 text-xs font-semibold select-none">
								<div className="flex items-center gap-2">
									<span className="text-text-muted">Difficulty:</span>
									<span
										className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase outline-1 outline-offset-0 transition-all duration-300"
										style={getDifficultyBadgeStyle(displayProblem.difficulty || "Easy")}
									>
										{displayProblem.difficulty}
									</span>
								</div>

								<div className="h-4 w-px bg-border-subtle" />

								<div>
									<span className="text-text-muted">Points: </span>
									<span className="font-bold text-text-primary">{displayProblem.points || 100}</span>
								</div>

								<div className="h-4 w-px bg-border-subtle" />

								<div className="flex items-center gap-1.5 font-sans">
									<span className="text-text-muted">Rate:</span>
									<div className={`flex gap-1 ${shakeRating ? "animate-shake" : ""}`}>
										{[1, 2, 3, 4, 5].map((star) => {
											const isFilled = star <= (hoverRating || userRating);
											return (
												<button
													key={star}
													type="button"
													onClick={() => handleRateChallenge(star)}
													onMouseEnter={() => setHoverRating(star)}
													onMouseLeave={() => setHoverRating(0)}
													className="focus:outline-none transition-colors"
													style={{
														color: isFilled ? "var(--accent)" : "color-mix(in srgb, var(--text-muted) 30%, transparent)",
													}}
												>
													<FaStar size={13} />
												</button>
											);
										})}
									</div>
								</div>

								{isAdmin && (
									<>
										<div className="h-4 w-px bg-border-subtle" />
										<Link href={`/admin/problems/${problem.id}`} className="hover:text-accent text-accent transition-colors font-semibold text-xs flex items-center gap-1 font-mono">
											✎ Edit Challenge
										</Link>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Horizontal Tab Navigation */}
					<div className="border-b border-border-default pb-0.5 overflow-x-auto whitespace-nowrap scrollbar-none" style={{ borderColor: "var(--border-default)", msOverflowStyle: "none", scrollbarWidth: "none" }}>
						<SecondaryNav
							tabs={[
								{ id: "problem", label: "Problem" },
								{ id: "submissions", label: "Submissions" },
								{ id: "leaderboard", label: "Leaderboard" },
								{ id: "discussions", label: "Discussions" },
								{ id: "editorial", label: "Editorial" },
							]}
							activeTab={activeTab}
							onChange={handleTabChange}
							className="mb-0"
						/>
					</div>

					{/* Content Expansion Area */}
					<div className="w-full">
						{activeTab === "problem" && (
							<div className="space-y-6 animate-fade-in">
								<ProblemDescription
									problem={displayProblem}
									_solved={solved}
									lightTheme={false}
									activeLanguage={activeLanguage}
									translating={translating}
									handleTranslate={handleTranslate}
								/>
							</div>
						)}

						{activeTab === "submissions" && (
							<div className="space-y-6 animate-fade-in">
								{selectedSub ? (
									<div className="space-y-6">
										{/* Header row */}
										<div className="flex justify-between items-center pb-4 border-b border-border-subtle">
											<button
												onClick={() => setSelectedSub(null)}
												className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle px-3 py-1.5 rounded-md"
											>
												<FiArrowLeft size={13} /> Back to Submissions
											</button>
											<span className="text-xs font-mono text-text-muted">
												ID: {selectedSub.id}
											</span>
										</div>

										{/* Pipeline Stage Indicator */}
										{(() => {
											const currentStage = (selectedSub.stage || submittingStage || selectedSub.status || "submitting").toLowerCase();
											const isFinished = !["submitting", "queued", "compiling", "running", "evaluating", "pending"].includes(currentStage);
											if (isFinished) return null;

											const stages = [
												{ key: "submitting", label: "Submitting", desc: "Preparing payload" },
												{ key: "queued", label: "Queued", desc: "Waiting for slot" },
												{ key: "compiling", label: "Compiling", desc: "Compiling code" },
												{ key: "running", label: "Running", desc: "Executing tests" },
												{ key: "evaluating", label: "Evaluating", desc: "Verifying outputs" },
												{ key: "completed", label: "Completed", desc: "Final verdict" }
											];

											const getStageStatus = (stageKey: string) => {
												const stageOrder = ["submitting", "queued", "compiling", "running", "evaluating", "completed"];
												const currentIdx = stageOrder.indexOf(currentStage);
												const targetIdx = stageOrder.indexOf(stageKey);
												
												if (currentIdx > targetIdx) return "completed";
												if (currentIdx === targetIdx) return "active";
												return "upcoming";
											};

											const currentProgress = selectedSub.progress || (currentStage === "running" ? submittingProgress : null);

											return (
												<div className="py-4 px-4 bg-bg-surface border border-border-subtle rounded-md mb-6 flex flex-col md:flex-row justify-between items-center gap-3 relative overflow-hidden">
													{stages.map((stg, index) => {
														const status = getStageStatus(stg.key);
														return (
															<div key={stg.key} className="flex-1 flex flex-col items-center text-center relative z-10">
																{/* Icon circle */}
																<div className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs transition-colors ${
																	status === "completed"
																		? "bg-accent/15 border-accent text-accent"
																		: status === "active"
																		? "bg-accent/10 border-accent text-accent animate-pulse"
																		: "bg-bg-base border-border-subtle text-text-muted"
																}`}>
																	{status === "completed" ? (
																		<FaCheck size={10} />
																	) : status === "active" ? (
																		<div className="w-2 h-2 rounded-full bg-accent" />
																	) : (
																		<div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
																	)}
																</div>
																{/* Text */}
																<div className="mt-2">
																	<p className={`text-xs font-medium ${
																		status === "active" ? "text-accent font-semibold" : "text-text-primary"
																	}`}>
																		{stg.label}
																	</p>
																	<p className="text-[10px] text-text-muted mt-0.5 font-mono">
																		{stg.key === "running" && currentProgress
																			? `Cases: ${typeof currentProgress === "object" && currentProgress !== null ? `${currentProgress.current} / ${currentProgress.total}` : currentProgress}`
																			: stg.desc}
																	</p>
																</div>
															</div>
														);
													})}
												</div>
											);
										})()}

										{/* Verdict Header Panel */}
										{(() => {
											const currentStage = (selectedSub.stage || submittingStage || selectedSub.status || "submitting").toLowerCase();
											const isFinished = !["submitting", "queued", "compiling", "running", "evaluating", "pending"].includes(currentStage);
											if (!isFinished) return null;

											const subMeta = getSubmissionStateMetadata(selectedSub.verdict || selectedSub.status);
											const perf = getPerformanceStats(selectedSub);

											return (
												<div className="space-y-4">
													<div
														className="p-5 rounded-lg border border-border-subtle bg-bg-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
													>
														<div className="space-y-2">
															<div className="flex items-center gap-3">
																<div className="p-2 rounded-md bg-bg-surface-elevated border border-border-subtle" style={{ color: subMeta.color }}>
																	{subMeta.Icon && <subMeta.Icon size={20} />}
																</div>
																<div>
																	<h2 className="text-xl font-bold tracking-tight" style={{ color: subMeta.color }}>
																		{subMeta.label}
																	</h2>
																	<p className="text-xs font-mono text-text-muted">
																		Submitted {formatRelativeTime(selectedSub.timestamp)} • Language: {formatLanguage(selectedSub.language)}
																	</p>
																</div>
															</div>
															<p className="text-xs text-text-secondary max-w-xl font-normal leading-relaxed">
																{subMeta.description}
															</p>
														</div>

														<div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full md:w-auto">
															<div className="bg-bg-base border border-border-subtle px-4 py-3 rounded-md text-center min-w-[90px]">
																<p className="text-[10px] uppercase font-mono text-text-muted">Score</p>
																<p className="text-xl font-bold font-mono mt-0.5 text-text-primary">
																	{(selectedSub.score !== undefined ? selectedSub.score : (selectedSub.status === "passed" ? 100 : 0)).toFixed(1)}
																</p>
															</div>

															{selectedSub.runtime !== undefined && (
																<div className="bg-bg-base border border-border-subtle px-4 py-3 rounded-md text-center min-w-[90px]">
																	<p className="text-[10px] uppercase font-mono text-text-muted">Runtime</p>
																	<p className="text-xl font-bold font-mono mt-0.5 text-text-primary">
																		{selectedSub.runtime} <span className="text-xs font-normal text-text-muted">ms</span>
																	</p>
																</div>
															)}

															{selectedSub.memory !== undefined && (
																<div className="bg-bg-base border border-border-subtle px-4 py-3 rounded-md text-center min-w-[90px]">
																	<p className="text-[10px] uppercase font-mono text-text-muted">Memory</p>
																	<p className="text-xl font-bold font-mono mt-0.5 text-text-primary">
																		{(selectedSub.memory / 1024).toFixed(2)} <span className="text-xs font-normal text-text-muted">MB</span>
																	</p>
																</div>
															)}
														</div>
													</div>

													{/* Advice Panel */}
													{subMeta.advice && (
														<div className="bg-bg-surface border border-border-subtle p-4 rounded-md space-y-1.5">
															<h4 className="text-xs uppercase font-mono font-semibold text-accent tracking-wider flex items-center gap-1.5">
																<FaLightbulb size={12} /> Optimization Advice
															</h4>
															<p className="text-xs text-text-secondary leading-relaxed">
																{subMeta.advice}
															</p>
														</div>
													)}

													{/* Performance distribution stats */}
													{perf && (
														<div className="bg-bg-surface border border-border-subtle p-4 rounded-md space-y-3">
															<h3 className="text-xs uppercase font-mono font-semibold text-text-muted tracking-wider flex items-center gap-1.5">
																<FiZap size={12} /> Performance Profile
															</h3>
															<div className="space-y-3">
																<div>
																	<div className="flex justify-between items-center text-xs mb-1">
																		<span className="text-text-secondary">Runtime Efficiency</span>
																		<span className="font-mono text-xs font-semibold text-accent">Beats {perf.runtimeBeats}% of users</span>
																	</div>
																	<div className="w-full h-1.5 rounded bg-bg-base overflow-hidden border border-border-subtle">
																		<div className="h-full bg-accent rounded transition-all duration-500" style={{ width: `${perf.runtimeBeats}%` }} />
																	</div>
																</div>
																<div>
																	<div className="flex justify-between items-center text-xs mb-1">
																		<span className="text-text-secondary">Memory Footprint</span>
																		<span className="font-mono text-xs font-semibold text-accent">Beats {perf.memoryBeats}% of users</span>
																	</div>
																	<div className="w-full h-1.5 rounded bg-bg-base overflow-hidden border border-border-subtle">
																		<div className="h-full bg-accent rounded transition-all duration-500" style={{ width: `${perf.memoryBeats}%` }} />
																	</div>
																</div>
															</div>
														</div>
													)}

													{/* Testcase Scorecard / Error log */}
													{selectedSub.status === "failed" && (selectedSub.verdict === "Compilation Error" || !selectedSub.testResults || selectedSub.testResults.length === 0) ? (
														<div className="space-y-2">
															<p className="text-xs font-mono font-semibold text-bc-error">Compiler Diagnostic Output:</p>
															<pre className="p-3 rounded-md text-xs font-mono overflow-auto max-h-[220px] bg-bg-base border border-border-subtle text-bc-error whitespace-pre-wrap leading-relaxed">
																{selectedSub.error || selectedSub.message || "Compilation failed with unknown diagnostics."}
															</pre>
														</div>
													) : (
														selectedSub.testResults && Array.isArray(selectedSub.testResults) && selectedSub.testResults.length > 0 && (
															<div className="space-y-4">
																<TestcaseScorecard
																	testResults={selectedSub.testResults}
																	activeIndex={selectedSubTestCaseIndex}
																	setActiveIndex={setSelectedSubTestCaseIndex}
																	runtime={selectedSub.runtime}
																	memory={selectedSub.memory}
																	score={selectedSub.score}
																/>

																{selectedSub.testResults[selectedSubTestCaseIndex] && (
																	<div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
																		{(() => {
																			const currentCase = selectedSub.testResults[selectedSubTestCaseIndex];
																			const isSample = !!problem.examples[selectedSubTestCaseIndex]?.isSample;
																			const isRun = selectedSub.verdict && selectedSub.verdict.includes("Run Finished");
																			const isContestActive = !!(
																				contestId &&
																				contestDetails &&
																				contestDetails.startTime <= Date.now() &&
																				Date.now() < contestDetails.endTime
																			);
																			
																			if (!isSample && !isRun) {
																				const maskMsg = isContestActive
																					? "🔒 Input and expected output details are masked to prevent hardcoding during an active contest."
																					: "🔒 Input and output details are hidden for secret test cases to prevent hardcoding.";
																				return (
																					<div className="bg-bg-surface border border-border-subtle rounded-md p-4 text-center">
																						<p className="text-text-muted italic text-xs leading-relaxed">
																							{maskMsg}
																						</p>
																						{currentCase.runtime !== undefined && (
																							<p className="text-[10px] font-mono text-text-muted mt-1.5">
																								Execution profile: {currentCase.runtime} ms • {(currentCase.memory ? currentCase.memory / 1024 : 0).toFixed(2)} MB
																							</p>
																						)}
																					</div>
																				);
																			}
																			
																			return (
																				<div className="space-y-3">
																					<div>
																						<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Input:</p>
																						<div className="border border-border-subtle px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap bg-bg-base text-text-primary">
																							{currentCase.input || <span className="italic text-text-muted">Empty Input</span>}
																						</div>
																					</div>
																					
																					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																						{currentCase.expected && (
																							<div>
																								<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Expected Output:</p>
																								<div className="border border-accent/20 px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap bg-accent/5 text-accent">
																									{currentCase.expected}
																								</div>
																							</div>
																						)}
																						<div>
																							<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Your Output:</p>
																							<div className={`border px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap ${
																								currentCase.passed
																									? "border-accent/20 bg-accent/5 text-accent"
																									: "border-bc-error/20 bg-bc-error/5 text-bc-error"
																							}`}>
																								{currentCase.actual || <span className="italic text-text-muted">Empty Output</span>}
																							</div>
																						</div>
																					</div>

																					{currentCase.error && (
																						<div>
																							<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Error Details:</p>
																							<pre className="border border-border-subtle p-3 rounded-md text-xs font-mono overflow-auto max-h-[140px] whitespace-pre-wrap bg-bg-base text-bc-error">
																								{currentCase.error}
																							</pre>
																						</div>
																					)}
																				</div>
																			);
																		})()}
																	</div>
																)}
															</div>
														)
													)}
												</div>
											);
										})()}

										{/* Submitted Code Section */}
										<div className="space-y-3 pt-6 border-t border-border-subtle">
											<h3 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">Submitted Code</h3>
											<div className="border border-border-subtle rounded-md overflow-hidden bg-bg-base">
												{/* Editor Header */}
												<div className="flex justify-between items-center bg-bg-surface px-4 py-2 border-b border-border-subtle text-xs text-text-muted">
													<span className="font-mono text-xs text-text-secondary">Language: {formatLanguage(selectedSub.language)}</span>
													<button
														onClick={handleOpenInEditor}
														className="flex items-center gap-1.5 text-accent hover:text-accent/80 transition font-mono text-xs"
													>
														<FaCode size={12} /> Open in editor
													</button>
												</div>
												<CodeMirror
													value={selectedSub.code || ""}
													theme={vscodeDark}
													editable={false}
													readOnly={true}
												/>
											</div>
										</div>
									</div>
								) : (
									<div className="space-y-4">
										<div className="pb-3 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
											<div>
												<h3 className="text-sm font-semibold text-text-primary">Submissions History</h3>
												<p className="text-xs text-text-muted mt-0.5">Filter, search, and review your previous attempts.</p>
											</div>
											
											{/* Filters / Search Row */}
											<div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
												<input
													type="text"
													placeholder="Search code or status..."
													value={searchQuery}
													onChange={(e) => {
														setSearchQuery(e.target.value);
														setCurrentPage(1);
													}}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="px-2.5 py-1 text-xs rounded-md border border-border-subtle outline-none bg-bg-surface text-text-primary focus:border-accent w-full sm:w-[170px]"
												/>

												<BeastCodeSelect
													size="sm"
													options={[
														{ value: "all", label: "All Languages" },
														{ value: "javascript", label: "JavaScript" },
														{ value: "python", label: "Python 3" },
														{ value: "cpp", label: "C++20" },
														{ value: "java", label: "Java" }
													]}
													value={langFilter}
													onChange={(val) => {
														setLangFilter(val);
														setCurrentPage(1);
													}}
													className="w-36"
												/>

												<BeastCodeSelect
													size="sm"
													options={[
														{ value: "all", label: "All Outcomes" },
														{ value: "passed", label: "Passed / Accepted" },
														{ value: "failed", label: "Failed" },
														{ value: "wrong answer", label: "Wrong Answer" },
														{ value: "compilation error", label: "Compilation Error" },
														{ value: "runtime error", label: "Runtime Error" },
														{ value: "time limit exceeded", label: "Time Limit Exceeded" },
														{ value: "memory limit exceeded", label: "Memory Limit Exceeded" }
													]}
													value={outcomeFilter}
													onChange={(val) => {
														setOutcomeFilter(val);
														setCurrentPage(1);
													}}
													className="w-40"
												/>
											</div>
										</div>

										{loadingSubs ? (
											<div className="flex justify-center items-center py-12">
												<div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
											</div>
										) : paginatedSubmissions.length === 0 ? (
											<div className="text-center py-12 text-text-muted italic text-xs">
												No submissions match your query.
											</div>
										) : (
											<div className="space-y-3">
												<div className="overflow-x-auto rounded-md border border-border-subtle bg-bg-surface">
													<table className="w-full text-xs text-left text-text-secondary">
														<thead className="text-[11px] uppercase font-mono bg-bg-surface-elevated text-text-muted border-b border-border-subtle">
															<tr>
																<th className="px-4 py-2.5">Language</th>
																<th className="px-4 py-2.5">Submitted</th>
																<th className="px-4 py-2.5">Result</th>
																<th className="px-4 py-2.5">Runtime</th>
																<th className="px-4 py-2.5">Memory</th>
																<th className="px-4 py-2.5">Score</th>
																<th className="px-4 py-2.5 text-right pr-6">Action</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-border-subtle">
															{paginatedSubmissions.map((sub) => {
																const subMeta = getSubmissionStateMetadata(sub.verdict || sub.status);
																return (
																	<tr key={sub.id} className="hover:bg-bg-surface-hover transition-colors">
																		<td className="px-4 py-2.5 font-mono text-xs text-text-muted">
																			{formatLanguage(sub.language)}
																		</td>
																		<td className="px-4 py-2.5 text-xs text-text-muted">
																			{formatRelativeTime(sub.timestamp)}
																		</td>
																		<td className="px-4 py-2.5 font-semibold">
																			<span className="flex items-center gap-1.5" style={{ color: subMeta.color }}>
																				{subMeta.Icon && <subMeta.Icon size={12} className={["submitting", "queued", "compiling", "running", "evaluating"].includes(subMeta.name) ? "animate-pulse" : ""} />}
																				{subMeta.label}
																			</span>
																		</td>
																		<td className="px-4 py-2.5 text-xs font-mono text-text-muted">
																			{sub.runtime !== undefined ? `${sub.runtime} ms` : "—"}
																		</td>
																		<td className="px-4 py-2.5 text-xs font-mono text-text-muted">
																			{sub.memory !== undefined ? `${(sub.memory / 1024).toFixed(1)} MB` : "—"}
																		</td>
																		<td className="px-4 py-2.5 font-mono font-semibold text-text-primary">
																			{(sub.score !== undefined ? sub.score : (sub.status === "passed" ? 100 : 0)).toFixed(1)}
																		</td>
																		<td className="px-4 py-2.5 text-right pr-4">
																			<button
																				onClick={() => {
																					setSelectedSub(sub);
																					setSelectedSubTestCaseIndex(0);
																					setConsoleTab("submission");
																				}}
																				className="bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-mono px-2.5 py-1 rounded-md transition-colors"
																			>
																				View Details
																			</button>
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>

												{/* Pagination Controls */}
												{totalPages > 1 && (
													<div className="flex items-center justify-between pt-2 select-none">
														<span className="text-xs font-mono text-text-muted">
															Page {currentPage} of {totalPages}
														</span>
														<div className="flex gap-1.5">
															<button
																onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
																disabled={currentPage === 1}
																className="px-2.5 py-1 text-xs font-mono rounded-md border border-border-subtle bg-bg-surface hover:bg-bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
															>
																Previous
															</button>
															<button
																onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
																disabled={currentPage === totalPages}
																className="px-2.5 py-1 text-xs font-mono rounded-md border border-border-subtle bg-bg-surface hover:bg-bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
															>
																Next
															</button>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{activeTab === "leaderboard" && (
							<div className="space-y-4 animate-fade-in">
								<div className="pb-3 border-b border-border-subtle">
									<h3 className="text-sm font-semibold text-text-primary">Problem Leaderboard ({displayProblem.title})</h3>
									<p className="text-xs text-text-muted mt-0.5">Ranked by highest score achieved, then by submission timestamp.</p>
								</div>

								{loadingLeaderboard ? (
									<div className="flex justify-center items-center py-12">
										<div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
									</div>
								) : leaderboard.length === 0 ? (
									<div className="text-center py-12 text-text-muted italic text-xs">
										No submissions recorded yet for this challenge.
									</div>
								) : (
									<div className="overflow-x-auto rounded-md border border-border-subtle bg-bg-surface">
										<table className="w-full text-xs text-left text-text-secondary">
											<thead className="text-[11px] uppercase font-mono bg-bg-surface-elevated text-text-muted border-b border-border-subtle">
												<tr>
													<th className="px-4 py-2.5 w-16 text-center">Rank</th>
													<th className="px-4 py-2.5">User</th>
													<th className="px-4 py-2.5">Score</th>
													<th className="px-4 py-2.5">Language</th>
													<th className="px-4 py-2.5">Solved</th>
													<th className="px-4 py-2.5 text-right pr-6">Region</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border-subtle">
												{leaderboard.map((player, idx) => {
													const rank = idx + 1;
													return (
														<tr key={player.uid} className="hover:bg-bg-surface-hover transition-colors">
															<td className="px-4 py-2.5 text-center font-mono font-semibold text-text-muted">{rank}</td>
															<td className="px-4 py-2.5">
																<div className="flex items-center gap-2">
																	{player.avatarUrl ? (
																		<img
																			src={player.avatarUrl}
																			alt="Avatar"
																			className="w-5 h-5 rounded-full object-cover border border-border-subtle"
																		/>
																	) : (
																		<div className="w-5 h-5 rounded-full bg-bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted">
																			<FaGlobe size={9} />
																		</div>
																	)}
																	<span className="font-semibold text-text-primary">{player.displayName}</span>
																</div>
															</td>
															<td className="px-4 py-2.5 font-mono font-semibold text-accent">{player.score.toFixed(1)}</td>
															<td className="px-4 py-2.5 font-mono text-xs text-text-muted">{formatLanguage(player.language)}</td>
															<td className="px-4 py-2.5 text-xs text-text-muted">{formatRelativeTime(player.timestamp)}</td>
															<td className="px-4 py-2.5 text-right pr-6">
																<div className="inline-flex items-center gap-1.5 text-xs text-text-muted select-none">
																	<span>🇻🇳</span>
																	<span className="text-text-secondary font-mono text-xs">VN</span>
																</div>
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

						{activeTab === "discussions" && (
							<div className="animate-fade-in">
								<ProblemDiscussions problemId={problem.id} problemTitle={displayProblem.title} lightTheme={false} />
							</div>
						)}

						{activeTab === "editorial" && (
							<div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
								<h3 className="text-base font-semibold text-text-primary pb-2 border-b border-border-subtle">
									Official Editorial
								</h3>
								
								{displayProblem.editorial?.videoUrl && (
									<div className="space-y-2">
										<h4 className="text-xs uppercase font-mono text-text-muted">Video Walkthrough</h4>
										<div className="aspect-video w-full max-w-2xl mx-auto overflow-hidden rounded-md border border-border-subtle bg-bg-base">
											<iframe
												src={getEmbedUrl(displayProblem.editorial.videoUrl)}
												title="Video solution"
												frameBorder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowFullScreen
												className="w-full h-full"
											/>
										</div>
									</div>
								)}

								<div className="text-xs leading-relaxed text-text-secondary mt-3 prose prose-invert max-w-none">
									{displayProblem.editorial?.markdown ? (
										<div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayProblem.editorial.markdown, false) }} />
									) : (
										<p className="text-text-muted italic text-center py-8">
											No official editorial has been published for this problem yet.
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Block B & Block C: The Full-Width Code Canvas & Execution Console */}
				{activeTab === "problem" && (
					<div className="w-full">
						<Playground
							key={user ? `${user.uid}-${problem.id}` : `guest-${problem.id}`}
							problem={problem}
							setSuccess={setSuccess}
							setSolved={setSolved}
							lightTheme={false}
							contestId={contestId}
							language={language}
							setLanguage={setLanguage}
							userCode={userCode}
							setUserCode={setUserCode}
							customInputChecked={customInputChecked}
							setCustomInputChecked={setCustomInputChecked}
							customInputText={customInputText}
							setCustomInputText={setCustomInputText}
							activeTestCaseId={activeTestCaseId}
							setActiveTestCaseId={setActiveTestCaseId}
							consoleTab={consoleTab}
							setConsoleTab={setConsoleTab}
							activeExampleId={activeExampleId}
							setActiveExampleId={setActiveExampleId}
							settings={settings}
							setSettings={setSettings}
							selectionRange={selectionRange}
							setSelectionRange={setSelectionRange}
							scrollTop={scrollTop}
							setScrollTop={setScrollTop}
						/>
					</div>
				)}
			</div>

			{/* Confetti celebration for success */}
			{success && <Confetti gravity={0.3} tweenDuration={4000} width={width - 1} height={height - 1} />}
		</div>
	);
};

// Simple Markdown to HTML parser
function renderMarkdown(text: string, lightTheme: boolean): string {
	if (!text) return "";
	let html = text;

	// Bold
	html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	// Italic
	html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
	// Inline Code
	const inlineClass = "bg-bg-surface-elevated text-accent px-1.5 py-0.5 rounded text-xs font-mono border border-border-subtle";
	html = html.replace(/`(.*?)`/g, `<code class='${inlineClass}'>$1</code>`);
	// Code Blocks
	const preClass = "bg-bg-base p-3 rounded-md font-mono text-xs border border-border-subtle overflow-auto my-2 whitespace-pre text-text-primary";
	html = html.replace(/```([\s\S]*?)```/g, `<pre class='${preClass}'>$1</pre>`);
	// Links
	html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' class='text-accent hover:underline transition'>$1</a>");
	// Convert list markers if there are no HTML list tags
	if (!html.includes("<li")) {
		html = html.replace(/^\s*\*\s+(.*)$/gm, "<li class='list-disc ml-5 text-text-secondary'>$1</li>");
		html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li class='list-decimal ml-5 text-text-secondary'>$1</li>");
	}

	return html;
}

function getEmbedUrl(url: string): string {
	if (!url) return "";
	// Youtube
	let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
	let match = url.match(regExp);
	if (match && match[2].length === 11) {
		return `https://www.youtube.com/embed/${match[2]}`;
	}
	// Vimeo
	regExp = /vimeo\.com\/([0-9]+)/;
	match = url.match(regExp);
	if (match) {
		return `https://player.vimeo.com/video/${match[1]}`;
	}
	return url;
}

export default Workspace;
