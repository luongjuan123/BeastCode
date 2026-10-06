import { useState, useEffect, useCallback, useRef } from "react";
import PreferenceNav from "./PreferenceNav/PreferenceNav";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import EditorFooter from "./EditorFooter";
import { Problem } from "@/utils/types/problem";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { useRouter } from "next/router";
import { arrayUnion, doc, updateDoc, addDoc, collection, increment, getDoc, setDoc } from "firebase/firestore";
import useLocalStorage from "@/hooks/useLocalStorage";
import { SupportedLanguage, starterCodes, runPistonCode } from "@/utils/pistonRunner";
import { FiCheck, FiX } from "react-icons/fi";
import { useSubmission } from "@/context/SubmissionContext";
import TestcaseScorecard from "../TestcaseScorecard/TestcaseScorecard";
import { getSubmissionStateMetadata } from "@/utils/submissionUtils";

import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import { EditorView } from "@codemirror/view";

type PlaygroundProps = {
	problem: Problem;
	setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
	setSolved: React.Dispatch<React.SetStateAction<boolean>>;
	lightTheme?: boolean;
	contestId?: string;
	onSubmissionCreated?: (submission: any) => void;
	language: SupportedLanguage;
	setLanguage: React.Dispatch<React.SetStateAction<SupportedLanguage>>;
	userCode: string;
	setUserCode: React.Dispatch<React.SetStateAction<string>>;

	// Lifted states
	customInputChecked: boolean;
	setCustomInputChecked: React.Dispatch<React.SetStateAction<boolean>>;
	customInputText: string;
	setCustomInputText: React.Dispatch<React.SetStateAction<string>>;
	activeTestCaseId: number;
	setActiveTestCaseId: React.Dispatch<React.SetStateAction<number>>;
	consoleTab: "testcases" | "custominput" | "results" | "submission";
	setConsoleTab: React.Dispatch<React.SetStateAction<"testcases" | "custominput" | "results" | "submission">>;
	activeExampleId: number;
	setActiveExampleId: React.Dispatch<React.SetStateAction<number>>;
	settings: ISettings;
	setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
	selectionRange: { anchor: number; head: number } | null;
	setSelectionRange: React.Dispatch<React.SetStateAction<{ anchor: number; head: number } | null>>;
	scrollTop: number;
	setScrollTop: React.Dispatch<React.SetStateAction<number>>;
};

export interface ISettings {
	fontSize: string;
	settingsModalIsOpen: boolean;
	dropdownIsOpen: boolean;
}

const Playground: React.FC<PlaygroundProps> = ({
	problem,
	setSuccess,
	setSolved,
	lightTheme = false,
	contestId,
	onSubmissionCreated,
	language,
	setLanguage,
	userCode,
	setUserCode,
	customInputChecked,
	setCustomInputChecked,
	customInputText,
	setCustomInputText,
	activeTestCaseId,
	setActiveTestCaseId,
	consoleTab,
	setConsoleTab,
	activeExampleId,
	setActiveExampleId,
	settings,
	setSettings,
	selectionRange,
	setSelectionRange,
	scrollTop,
	setScrollTop,
}) => {
	const [user, loading] = useAuthState(auth);
	const router = useRouter();
	const pid = router.query.pid;

	const {
		selectedSub,
		setSelectedSub,
		selectedSubTestCaseIndex,
		setSelectedSubTestCaseIndex,
		isSubmitting,
		submittingStage,
		submittingProgress,
		submittingVerdict,
		submitCode,
		runStatus,
		runResults,
		runError,
		runCode
	} = useSubmission();

	const celebratedSubIdRef = useRef<string | null>(null);

	// Trigger confetti and mark solved when an Accepted submission is completed or selected
	useEffect(() => {
		if (
			selectedSub &&
			(selectedSub.status === "passed" || selectedSub.verdict?.toLowerCase() === "accepted") &&
			celebratedSubIdRef.current !== selectedSub.id
		) {
			celebratedSubIdRef.current = selectedSub.id;
			setSuccess(true);
			setTimeout(() => setSuccess(false), 5000);
			setSolved(true);
		}
	}, [selectedSub, setSuccess, setSolved]);

	const testResults = runResults || [];
	const passedCount = testResults.filter((r: any) => r.passed).length;
	const totalCount = testResults.length;
	const runMessage = runError || (runStatus === "accepted" ? "All test cases passed successfully!" : "");
	const executingType = isSubmitting ? "submit" : (runStatus === "running" ? "run" : null);

	const handleToggleCustomInput = (checked: boolean) => {
		setCustomInputChecked(checked);
		if (checked) {
			setConsoleTab("custominput");
		} else {
			setConsoleTab("testcases");
		}
	};

	const handleExecute = async (isSubmit: boolean) => {
		if (!user) {
			alert(`Please login to ${isSubmit ? "submit" : "run"} your code`);
			return;
		}

		if (isSubmit) {
			try {
				setConsoleTab("submission");
				const submissionId = await submitCode(userCode, language, problem, contestId);
				if (submissionId) {
					if (onSubmissionCreated) {
						onSubmissionCreated(submissionId);
					}
				}
			} catch (error: any) {
				console.error("Submission error:", error);
				alert(getFriendlyErrorMessage(error, "Unable to submit your solution. Please try again."));
			}
			return;
		}

		// Run code flow
		try {
			setConsoleTab("results");
			await runCode(userCode, language, problem, customInputChecked, customInputText);
			setActiveTestCaseId(0);
		} catch (error: any) {
			console.error("Run Code error:", error);
		}
	};

	const [syncStatus, setSyncStatus] = useState<"connected" | "syncing" | "offline-saved" | "error">("connected");
	const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

	// 2. Throttled Cloud Save Flow
	const triggerCloudSave = useCallback(async (codeToSave: string) => {
		if (!user || !pid) return;

		setSyncStatus("syncing");

		// Check offline status
		if (typeof window !== "undefined" && !navigator.onLine) {
			setSyncStatus("offline-saved");
			// Add to offline sync queue
			const queueKey = `offline-sync-queue`;
			const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
			const item = {
				uid: user.uid,
				pid,
				contestId: contestId || null,
				language,
				code: codeToSave,
				updatedAt: Date.now()
			};
			const filtered = queue.filter((x: any) => !(x.pid === pid && x.language === language && x.contestId === contestId));
			filtered.push(item);
			localStorage.setItem(queueKey, JSON.stringify(filtered));
			return;
		}

		try {
			const docName = contestId 
				? `${contestId}_${user.uid}_${pid}_${language}`
				: `${user.uid}_${pid}_${language}`;
			const collectionName = contestId ? "contest_drafts" : "drafts";
			const docRef = doc(firestore, collectionName, docName);
			
			await setDoc(docRef, {
				uid: user.uid,
				problemId: pid,
				contestId: contestId || null,
				language,
				code: codeToSave,
				updatedAt: Date.now()
			}, { merge: true });

			setSyncStatus("connected");
		} catch (err) {
			console.error("Cloud save failed:", err);
			setSyncStatus("error");
		}
	}, [user, pid, contestId, language]);

	// 1. Initial Load & Recovery Flow
	useEffect(() => {
		const openSubId = router.query.openSubmissionId as string;
		if (!openSubId || !user || !pid) return;

		let active = true;
		const fetchAndLoadSubmission = async () => {
			try {
				const collectionName = contestId ? "contest_submissions" : "submissions";
				const subDocRef = doc(firestore, collectionName, openSubId);
				const snap = await getDoc(subDocRef);
				if (snap.exists() && active) {
					const data = snap.data();
					if (data && data.code) {
						setUserCode(data.code);
						if (data.language) {
							setLanguage(data.language as SupportedLanguage);
						}
						// Save to local storage draft metadata so it persists
						const localMetaKey = `code-meta-${user.uid}-${pid}-${data.language}`;
						localStorage.setItem(localMetaKey, JSON.stringify({ code: data.code, updatedAt: Date.now() }));
						
						// Clear the query parameter from URL using router.replace
						const cleanQuery = { ...router.query };
						delete cleanQuery.openSubmissionId;
						router.replace({ pathname: router.pathname, query: cleanQuery }, undefined, { shallow: true });
					}
				}
			} catch (err) {
				console.error("Error recovering submission in editor:", err);
			}
		};

		fetchAndLoadSubmission();
		return () => {
			active = false;
		};
	}, [router.query.openSubmissionId, user, pid, contestId]);

	// 2. Draft Recovery Flow
	useEffect(() => {
		if (loading || !pid || router.query.openSubmissionId) return;

		let active = true;

		const loadCodeDraft = async () => {
			const localMetaKey = user ? `code-meta-${user.uid}-${pid}-${language}` : `code-meta-${pid}-${language}`;
			const localLegacyKey = user ? `code-${user.uid}-${pid}-${language}` : `code-${pid}-${language}`;

			// Get local storage values
			let localCode = "";
			let localTime = 0;

			const localMetaStr = localStorage.getItem(localMetaKey);
			if (localMetaStr) {
				try {
					const parsed = JSON.parse(localMetaStr);
					localCode = parsed.code || "";
					localTime = parsed.updatedAt || 0;
				} catch (e) {}
			} else {
				// Legacy fallback
				const legacyStr = localStorage.getItem(localLegacyKey);
				if (legacyStr) {
					try {
						localCode = JSON.parse(legacyStr) || "";
						localTime = 1; // dummy low timestamp
					} catch (e) {}
				}
			}

			// Get remote Firestore values
			let remoteCode = "";
			let remoteTime = 0;

			if (user) {
				try {
					const docName = contestId 
						? `${contestId}_${user.uid}_${pid}_${language}`
						: `${user.uid}_${pid}_${language}`;
					const collectionName = contestId ? "contest_drafts" : "drafts";
					const docRef = doc(firestore, collectionName, docName);
					const docSnap = await getDoc(docRef);
					if (docSnap.exists()) {
						const data = docSnap.data();
						remoteCode = data.code || "";
						remoteTime = data.updatedAt || 0;
					}
				} catch (err) {
					console.error("Failed to fetch remote draft:", err);
				}
			}

			if (!active) return;

			// Determine which one is newer
			if (remoteTime > localTime && remoteCode) {
				setUserCode(remoteCode);
				// Update local cache
				localStorage.setItem(localMetaKey, JSON.stringify({ code: remoteCode, updatedAt: remoteTime }));
				setSyncStatus("connected");
			} else if (localCode) {
				setUserCode(localCode);
				if (localTime > remoteTime && user) {
					// We have a newer local edit, trigger background sync
					triggerCloudSave(localCode);
				} else {
					setSyncStatus("connected");
				}
			} else {
				// Fallback to starter code
				const customStarter = starterCodes[pid as string]?.[language];
				const starter = customStarter || problem.starterCode;
				setUserCode(starter);
				setSyncStatus("connected");
			}
		};

		loadCodeDraft();

		return () => {
			active = false;
		};
	}, [pid, language, problem.starterCode, user, loading, contestId, triggerCloudSave]);

	// 3. Online/Offline Reconnection Listener
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleOnline = async () => {
			setSyncStatus("syncing");
			const queueKey = `offline-sync-queue`;
			const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");

			if (queue.length > 0 && user) {
				try {
					for (const item of queue) {
						if (item.uid !== user.uid) continue;
						const docName = item.contestId 
							? `${item.contestId}_${user.uid}_${item.pid}_${item.language}`
							: `${user.uid}_${item.pid}_${item.language}`;
						const collectionName = item.contestId ? "contest_drafts" : "drafts";
						const docRef = doc(firestore, collectionName, docName);
						
						await setDoc(docRef, {
							uid: user.uid,
							problemId: item.pid,
							contestId: item.contestId || null,
							language: item.language,
							code: item.code,
							updatedAt: item.updatedAt
						}, { merge: true });
					}
					// Clear queue
					localStorage.removeItem(queueKey);
				} catch (err) {
					console.error("Failed to sync offline queue:", err);
				}
			}

			// Also sync current editor code to make sure it's up to date
			triggerCloudSave(userCode);
		};

		const handleOffline = () => {
			setSyncStatus("offline-saved");
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [user, userCode, pid, language, contestId, triggerCloudSave]);

	const onChange = (value: string) => {
		setUserCode(value);
		if (loading) return;

		// 1. Instantly save to local storage metadata
		const localMetaKey = user ? `code-meta-${user.uid}-${pid}-${language}` : `code-meta-${pid}-${language}`;
		localStorage.setItem(localMetaKey, JSON.stringify({ code: value, updatedAt: Date.now() }));

		// 2. Set syncing status
		if (user) {
			setSyncStatus("syncing");
			if (saveTimeout) clearTimeout(saveTimeout);

			// Start new debounce timeout for 3 seconds
			const timeout = setTimeout(() => {
				triggerCloudSave(value);
			}, 3000);
			setSaveTimeout(timeout);
		}
	};

	const getExtensions = () => {
		const baseExtensions = (() => {
			switch (language) {
				case "javascript":
					return [javascript()];
				case "python":
					return [python()];
				case "cpp":
				case "c":
					return [cpp()];
				case "java":
					return [java()];
				default:
					return [javascript()];
			}
		})();

		return [
			...baseExtensions,
			EditorView.updateListener.of((update) => {
				if (update.selectionSet) {
					const main = update.state.selection.main;
					setSelectionRange({ anchor: main.anchor, head: main.head });
				}
			}),
			EditorView.domEventHandlers({
				scroll(event, view) {
					setScrollTop(view.scrollDOM.scrollTop);
				}
			})
		];
	};

	return (
		<div className="flex flex-col relative w-full h-full border-t lg:border-t-0 lg:border-l overflow-hidden animate-fade-in" style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)" }}>
			{/* preference nav */}
			<PreferenceNav
				settings={settings}
				setSettings={setSettings}
				language={language}
				setLanguage={setLanguage}
				lightTheme={lightTheme}
				syncStatus={syncStatus}
			/>

			{/* Main Layout: Vertically Stacked Editor and Console Tray */}
			<div className="flex-1 overflow-y-auto w-full flex flex-col">
				{/* Editor View */}
				<div className="w-full min-h-[600px] overflow-auto border-b" style={{ borderColor: "var(--border-subtle)" }}>
					<CodeMirror
						value={userCode}
						theme={lightTheme ? undefined : vscodeDark}
						onChange={onChange}
						extensions={getExtensions()}
						style={{ fontSize: settings.fontSize }}
						onCreateEditor={(view) => {
							if (selectionRange) {
								try {
									view.dispatch({ selection: selectionRange });
								} catch (e) {}
							}
							if (scrollTop) {
								try {
									view.scrollDOM.scrollTop = scrollTop;
								} catch (e) {}
							}
						}}
					/>
				</div>

				{/* Console Results Panel (Tabbed Output Tray) */}
				<div className="w-full px-5 pb-20 pt-4" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
					<div className="flex items-center space-x-2 border-b pb-2 mb-4" style={{ borderColor: "var(--border-default)" }}>
						<button
							type="button"
							onClick={() => setConsoleTab("testcases")}
							className="text-xs font-semibold px-3 py-1.5 rounded-md transition duration-200"
							style={{
								fontFamily: "'Inter', sans-serif",
								background: consoleTab === "testcases" ? "var(--bg-dark-layer-1)" : "transparent",
								color: consoleTab === "testcases" ? "var(--text-primary)" : "var(--text-secondary)",
								border: consoleTab === "testcases" ? "1px solid var(--border-default)" : "1px solid transparent"
							}}
						>
							Test Cases
						</button>
						<button
							type="button"
							onClick={() => setConsoleTab("custominput")}
							className="text-xs font-semibold px-3 py-1.5 rounded-md transition duration-200"
							style={{
								fontFamily: "'Inter', sans-serif",
								background: consoleTab === "custominput" ? "var(--bg-dark-layer-1)" : "transparent",
								color: consoleTab === "custominput" ? "var(--text-primary)" : "var(--text-secondary)",
								border: consoleTab === "custominput" ? "1px solid var(--border-default)" : "1px solid transparent"
							}}
						>
							Custom Input {customInputChecked && <span className="inline-block w-1.5 h-1.5 rounded-full ml-1 bg-brand-orange" />}
						</button>
						<button
							type="button"
							onClick={() => setConsoleTab("results")}
							className="text-xs font-semibold px-3 py-1.5 rounded-md transition duration-200"
							style={{
								fontFamily: "'Inter', sans-serif",
								background: consoleTab === "results" ? "var(--bg-dark-layer-1)" : "transparent",
								color: consoleTab === "results" ? "var(--text-primary)" : "var(--text-secondary)",
								border: consoleTab === "results" ? "1px solid var(--border-default)" : "1px solid transparent"
							}}
						>
							Results {runStatus !== "idle" && (
								<span className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${
									runStatus === "running" ? "bg-brand-orange animate-pulse" : runStatus === "accepted" ? "bg-emerald-400" : "bg-rose-400"
								}`} />
							)}
						</button>
						<button
							type="button"
							onClick={() => setConsoleTab("submission")}
							className="text-xs font-semibold px-3 py-1.5 rounded-md transition duration-200"
							style={{
								fontFamily: "'Inter', sans-serif",
								background: consoleTab === "submission" ? "var(--bg-dark-layer-1)" : "transparent",
								color: consoleTab === "submission" ? "var(--text-primary)" : "var(--text-secondary)",
								border: consoleTab === "submission" ? "1px solid var(--border-default)" : "1px solid transparent"
							}}
						>
							Submission {isSubmitting || ["submitting", "queued", "compiling", "running", "evaluating"].includes(selectedSub?.status || submittingStage) ? (
								<span className="inline-block w-1.5 h-1.5 rounded-full ml-1 bg-brand-orange animate-pulse" />
							) : selectedSub ? (
								<span className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${
									selectedSub.status === "passed" || selectedSub.verdict?.toLowerCase() === "accepted"
										? "bg-emerald-400"
										: "bg-rose-400"
								}`} />
							) : null}
						</button>
					</div>

					<div className="my-2">
						{consoleTab === "testcases" && (() => {
							const sampleExamples = (problem.examples || []).filter((ex: any) => ex.isSample);
							const displayExamples = sampleExamples.length > 0 ? sampleExamples : (problem.examples || []);
							// Clamp activeExampleId to range of displayExamples
							const activeIdx = Math.min(activeExampleId, Math.max(0, displayExamples.length - 1));
							return (
								<div className="space-y-4">
									<div className="flex flex-wrap gap-2">
										{displayExamples.map((example, idx) => (
											<button
												key={example.id || idx}
												type="button"
												onClick={() => setActiveExampleId(idx)}
												className="text-xs font-semibold px-3 py-1.5 rounded-md transition duration-200"
												style={{
													fontFamily: "'Inter', sans-serif",
													background: activeIdx === idx ? "var(--bg-dark-layer-1)" : "var(--bg-dark-layer-2)",
													color: activeIdx === idx ? "var(--text-primary)" : "var(--text-secondary)",
													border: activeIdx === idx ? "1px solid var(--border-default)" : "1px solid transparent"
												}}
											>
												Case {idx + 1}
											</button>
										))}
									</div>

									{displayExamples[activeIdx] && (
										<div className="space-y-3 animate-fade-in">
											<div>
												<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Input:</p>
												<pre 
													className="border px-4 py-3 rounded-lg text-xs whitespace-pre-wrap text-gray-200"
													style={{
														fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
														backgroundColor: "rgba(0,0,0,0.35)",
														borderColor: "var(--border-default)"
													}}
												>
													{displayExamples[activeIdx].inputText}
												</pre>
											</div>
											<div>
												<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Expected Output:</p>
												<pre 
													className="border px-4 py-3 rounded-lg text-xs whitespace-pre-wrap text-gray-200"
													style={{
														fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
														backgroundColor: "rgba(0,0,0,0.35)",
														borderColor: "var(--border-default)"
													}}
												>
													{displayExamples[activeIdx].outputText}
												</pre>
											</div>
											{displayExamples[activeIdx].explanation && (
												<div>
													<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Explanation:</p>
													<div 
														className="text-xs bg-white/[0.02] border p-3 rounded-lg leading-relaxed text-gray-300"
														style={{ borderColor: "var(--border-default)" }}
													>
														{displayExamples[activeIdx].explanation}
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})()}

						{consoleTab === "custominput" && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Custom Execution Input:</p>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={customInputChecked}
											onChange={(e) => handleToggleCustomInput(e.target.checked)}
											className="rounded border-border-default bg-bg-base text-accent focus:ring-0"
										/>
										<span className="text-xs text-text-secondary">Enable Custom Input</span>
									</label>
								</div>
								<textarea
									value={customInputText}
									onChange={(e) => {
										setCustomInputText(e.target.value);
										if (!customInputChecked) {
											setCustomInputChecked(true);
										}
									}}
									rows={5}
									className="w-full text-xs font-mono p-3 rounded-md outline-none border focus:ring-0 transition bg-bg-base border-border-subtle text-text-primary placeholder:text-text-muted focus:border-accent"
									placeholder="Provide custom input arguments to run your solution (e.g. [2,7,11,15]\n9)"
								/>
							</div>
						)}

						{consoleTab === "results" && (
							<div>
								{runStatus === "idle" ? (
									<div className="text-text-muted text-xs py-8 italic text-center">
										No run results yet. Click &quot;Run&quot; to test your solution.
									</div>
								) : runStatus === "running" ? (
									<div className="rounded-md p-4 border border-border-subtle max-w-md mx-auto mt-2 bg-bg-surface">
										<h3 className="text-xs font-medium mb-3 flex items-center gap-2 text-text-secondary">
											<div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-accent" />
											Executing code...
										</h3>
										<div className="text-xs font-mono text-text-muted">
											Running test cases against execution sandbox...
										</div>
									</div>
								) : runStatus === "accepted" || runStatus === "wrong_answer" ? (
									<div className="space-y-3">
										{/* Verdict Banner */}
										{runStatus === "accepted" ? (
											<div className="bg-accent/10 border border-accent/20 text-accent p-3 rounded-md font-semibold text-xs flex items-center gap-2">
												<span className="w-2 h-2 rounded-full bg-accent" />
												Accepted
											</div>
										) : (
											<div className="bg-bc-error/10 border border-bc-error/20 text-bc-error p-3 rounded-md font-semibold text-xs flex items-center gap-2">
												<span className="w-2 h-2 rounded-full bg-bc-error" />
												Wrong Answer
											</div>
										)}

										{testResults.length > 0 && (() => {
											const activeRunIdx = Math.min(activeTestCaseId, Math.max(0, testResults.length - 1));
											return (
												<div className="space-y-3">
													{/* Case Switcher Tabs */}
													<div className="flex flex-wrap gap-1.5">
														{testResults.map((_, idx) => (
															<button
																key={idx}
																type="button"
																onClick={() => setActiveTestCaseId(idx)}
																className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
																	activeRunIdx === idx
																		? "bg-bg-surface-elevated text-text-primary border border-border-default"
																		: "bg-bg-surface text-text-secondary hover:text-text-primary border border-transparent"
																}`}
															>
																Case {idx + 1}
															</button>
														))}
													</div>

													{testResults[activeRunIdx] && (
														<div className="space-y-3 pt-1 animate-fade-in">
															<div>
																<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Input:</p>
																<pre 
																	className="border border-border-subtle bg-bg-base px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap text-text-primary"
																>
																	{testResults[activeRunIdx].input || <span className="italic text-text-muted">Empty Input</span>}
																</pre>
															</div>

															<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																<div>
																	<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Your Output:</p>
																	<pre 
																		className={`border px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap ${
																			testResults[activeRunIdx].passed
																				? "bg-accent/5 border-accent/20 text-accent"
																				: "bg-bc-error/5 border-bc-error/20 text-bc-error"
																		}`}
																	>
																		{testResults[activeRunIdx].actual || <span className="italic opacity-50">Empty Output</span>}
																	</pre>
																</div>
																<div>
																	<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Expected Output:</p>
																	<pre 
																		className="border border-accent/20 bg-accent/5 px-3 py-2 rounded-md text-xs font-mono whitespace-pre-wrap text-accent"
																	>
																		{testResults[activeRunIdx].expected}
																	</pre>
																</div>
															</div>

															{testResults[activeRunIdx].error && (
																<div>
																	<p className="text-[11px] font-mono uppercase text-text-muted mb-1">Error Details:</p>
																	<pre 
																		className="border border-bc-error/30 p-3 rounded-md text-xs font-mono overflow-auto max-h-[140px] whitespace-pre-wrap bg-bg-base text-bc-error"
																	>
																		{testResults[activeRunIdx].error}
																	</pre>
																</div>
															)}
														</div>
													)}
												</div>
											);
										})()}
									</div>
								) : runStatus === "compile_error" ? (
									<div className="space-y-3 animate-fade-in">
										<div className="text-bc-error text-sm font-semibold flex items-center gap-2">
											<span>Compilation Error</span>
										</div>
										<div className="text-xs font-mono text-text-muted">Diagnostics:</div>
										<pre className="text-xs font-mono p-3 rounded-md border overflow-auto max-h-[180px] whitespace-pre-wrap text-bc-error bg-bg-base border-border-subtle">
											{runMessage}
										</pre>
									</div>
								) : (
									<div className="text-center py-6 animate-fade-in">
										<div className="text-bc-error font-semibold mb-1 text-xs font-mono">Execution Error</div>
										<div className="text-xs text-text-muted">{runMessage}</div>
									</div>
								)}
							</div>
						)}

						{consoleTab === "submission" && (
							<div>
								{(!selectedSub && !isSubmitting && submittingStage === "idle") ? (
									<div className="text-text-muted text-xs py-8 italic text-center">
										No active submission. Click &quot;Submit&quot; to test your solution against all test cases.
									</div>
								) : (isSubmitting || ["submitting", "queued", "compiling", "running", "evaluating"].includes(selectedSub?.status || submittingStage)) ? (
									<div className="rounded-md p-4 border border-border-subtle max-w-lg mx-auto my-3 bg-bg-surface">
										<div className="flex items-center justify-between mb-3">
											<h3 className="text-xs font-medium flex items-center gap-2 text-text-primary">
												<div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-accent" />
												Judging Submission...
											</h3>
											<span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold border border-accent/20">
												{submittingStage || selectedSub?.stage || selectedSub?.status || "queued"}
											</span>
										</div>

										<div className="space-y-3 py-1">
											<div className="w-full bg-bg-base rounded h-1.5 overflow-hidden border border-border-subtle">
												<div
													className="h-full bg-accent rounded transition-all duration-300"
													style={{
														width: submittingProgress && submittingProgress.total > 0
															? `${Math.max(10, Math.min(100, Math.round((submittingProgress.current / submittingProgress.total) * 100)))}%`
															: submittingStage === "submitting" ? "15%"
															: submittingStage === "queued" ? "30%"
															: submittingStage === "compiling" ? "50%"
															: submittingStage === "running" ? "75%"
															: submittingStage === "evaluating" ? "90%" : "30%"
													}}
												/>
											</div>

											<div className="flex items-center justify-between text-xs">
												<span className="text-text-muted">
													{submittingStage === "submitting" && "Preparing solution payload..."}
													{submittingStage === "queued" && "Queued in scheduler..."}
													{submittingStage === "compiling" && "Compiling source code..."}
													{submittingStage === "running" && (
														submittingProgress
															? `Executing test cases [${submittingProgress.current} / ${submittingProgress.total}]`
															: "Executing test cases..."
													)}
													{submittingStage === "evaluating" && "Verifying outputs..."}
													{!["submitting", "queued", "compiling", "running", "evaluating"].includes(submittingStage) && "Processing submission..."}
												</span>
												{submittingProgress && submittingProgress.total > 0 && (
													<span className="font-mono text-[11px] font-semibold text-accent">
														{Math.round((submittingProgress.current / submittingProgress.total) * 100)}%
													</span>
												)}
											</div>
										</div>
									</div>
								) : selectedSub ? (
									<div className="space-y-3 animate-fade-in">
										{(() => {
											const subMeta = getSubmissionStateMetadata(selectedSub.verdict || selectedSub.status, selectedSub.status);
											const isAccepted = selectedSub.status === "passed" || selectedSub.verdict?.toLowerCase() === "accepted";
											const subResults = selectedSub.testResults || [];
											const passedTotal = subResults.filter((r: any) => r.passed).length;
											const totalCount = subResults.length;

											return (
												<>
													{/* Verdict Banner */}
													<div
														className="p-3.5 rounded-md border flex flex-wrap items-center justify-between gap-3 bg-bg-surface border-border-subtle"
													>
														<div className="flex items-center gap-3">
															{subMeta.Icon && (
																<subMeta.Icon
																	size={20}
																	style={{ color: subMeta.color }}
																/>
															)}
															<div>
																<h3 className="font-semibold text-sm tracking-tight" style={{ color: subMeta.color }}>
																	{subMeta.label}
																</h3>
																<p className="text-[11px] text-text-muted">
																	{subMeta.description}
																</p>
															</div>
														</div>

														{/* Metric badges */}
														<div className="flex items-center gap-2.5 text-xs font-mono">
															{selectedSub.runtime !== undefined && (
																<div className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-base border border-border-subtle">
																	<span className="text-text-muted">Runtime:</span>
																	<span className="font-semibold text-text-primary">{selectedSub.runtime} ms</span>
																</div>
															)}
															{selectedSub.memory !== undefined && (
																<div className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-base border border-border-subtle">
																	<span className="text-text-muted">Memory:</span>
																	<span className="font-semibold text-text-primary">{(selectedSub.memory / 1024).toFixed(1)} MB</span>
																</div>
															)}
															{totalCount > 0 && (
																<div className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-base border border-border-subtle">
																	<span className="text-text-muted">Passed:</span>
																	<span className={`font-semibold ${isAccepted ? "text-accent" : "text-bc-warning"}`}>
																		{passedTotal}/{totalCount}
																	</span>
																</div>
															)}
														</div>
													</div>

													{/* Compiler Diagnostic Output if compilation error */}
													{selectedSub.verdict === "Compilation Error" || (selectedSub.status === "failed" && subResults.length === 0) ? (
														<div className="space-y-2 pt-2">
															<p className="text-xs font-mono font-semibold text-bc-error uppercase tracking-wider">Compiler Diagnostic Output:</p>
															<pre className="p-3 rounded-md text-xs font-mono overflow-auto max-h-[220px] bg-bg-base border border-border-subtle text-bc-error whitespace-pre-wrap leading-relaxed">
																{selectedSub.error || selectedSub.message || "Compilation failed with unknown diagnostics."}
															</pre>
														</div>
													) : subResults.length > 0 ? (
														<div className="space-y-4 pt-1">
															<TestcaseScorecard
																testResults={subResults}
																activeIndex={selectedSubTestCaseIndex}
																setActiveIndex={setSelectedSubTestCaseIndex}
																runtime={selectedSub.runtime}
																memory={selectedSub.memory}
																score={selectedSub.score}
															/>

															{subResults[selectedSubTestCaseIndex] && (() => {
																const currentCase = subResults[selectedSubTestCaseIndex];
																const isSample = !!problem.examples?.[selectedSubTestCaseIndex]?.isSample;
																const isContestActive = !!contestId;

																if (!isSample && isContestActive) {
																	return (
																		<div className="bg-dark-fill-3/30 border border-border-subtle rounded-xl p-4 text-center" style={{ borderColor: "var(--border-subtle)" }}>
																			<p className="text-gray-400 italic text-xs leading-relaxed">
																				🔒 Input and expected output details are hidden for test cases to prevent hardcoding during the contest.
																			</p>
																			{currentCase.runtime !== undefined && (
																				<p className="text-[10px] text-gray-500 mt-1">
																					Execution profile: {currentCase.runtime} ms • {(currentCase.memory ? currentCase.memory / 1024 : 0).toFixed(2)} MB
																				</p>
																			)}
																		</div>
																	);
																}

																return (
																	<div className="space-y-3 pt-2">
																		<div>
																			<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Input:</p>
																			<pre className="border border-gray-850 bg-black/35 px-4 py-2.5 rounded-lg text-xs whitespace-pre-wrap text-gray-200 font-mono">
																				{currentCase.input || <span className="italic text-gray-550">Empty Input</span>}
																			</pre>
																		</div>

																		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																			<div>
																				<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Your Output:</p>
																				<pre className={`border px-4 py-2.5 rounded-lg text-xs whitespace-pre-wrap font-mono ${
																					currentCase.passed
																						? "bg-green-500/10 border-green-500/20 text-green-450"
																						: "bg-red-900/20 border-red-500/20 text-rose-450"
																				}`}>
																					{currentCase.actual || <span className="italic opacity-50">Empty Output</span>}
																				</pre>
																			</div>
																			{currentCase.expected && (
																				<div>
																					<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Expected Output:</p>
																					<pre className="border border-green-500/20 bg-green-500/10 px-4 py-2.5 rounded-lg text-xs whitespace-pre-wrap text-green-450 font-mono">
																						{currentCase.expected}
																					</pre>
																				</div>
																			)}
																		</div>

																		{currentCase.error && (
																			<div>
																				<p className="text-[11px] font-bold mb-1 text-gray-400 uppercase tracking-wider">Error Details:</p>
																				<pre className="border p-3 rounded-xl text-xs overflow-auto max-h-[140px] whitespace-pre-wrap bg-rose-950/20 border-rose-800/35 text-rose-450 font-mono">
																					{currentCase.error}
																				</pre>
																			</div>
																		)}
																	</div>
																);
															})()}
														</div>
													) : null}
												</>
											);
										})()}
									</div>
								) : null}
							</div>
						)}
					</div>
				</div>
			</div>

			<EditorFooter
				handleRun={() => handleExecute(false)}
				handleSubmit={() => handleExecute(true)}
				lightTheme={lightTheme}
				onUploadFile={(code) => setUserCode(code)}
				customInputChecked={customInputChecked}
				setCustomInputChecked={handleToggleCustomInput}
				executingType={executingType}
			/>
		</div>
	);
};

export default Playground;
