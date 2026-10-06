import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import Topbar from "@/components/Topbar/Topbar";
import TestcaseScorecard from "@/components/Workspace/TestcaseScorecard/TestcaseScorecard";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { getSubmissionStateMetadata } from "@/utils/submissionUtils";
import { FiArrowLeft, FiCode } from "react-icons/fi";

interface SubmissionDetailsProps {
	problem: {
		id: string;
		title: string;
		difficulty: string;
		examples: any[];
	};
	initialSubmission: any;
	contestId?: string;
}

const formatLanguage = (lang: string) => {
	switch ((lang || "").toLowerCase()) {
		case "javascript": return "JavaScript";
		case "python": return "Python 3";
		case "cpp": return "C++20";
		case "java": return "Java";
		case "c": return "C";
		default: return lang || "Unknown";
	}
};

const formatRelativeTime = (ts: number) => {
	const diff = Date.now() - ts;
	const secs = Math.floor(diff / 1000);
	if (secs < 60) return "just now";
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	return `${days}d ago`;
};

export const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({
	problem,
	initialSubmission,
	contestId,
}) => {
	const router = useRouter();
	const [user] = useAuthState(auth);
	const [sub, setSub] = useState(initialSubmission);
	const [peerSubmissions, setPeerSubmissions] = useState<any[]>([]);
	const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);

	// 1. Subscribe to active submission in real-time
	useEffect(() => {
		const collectionName = contestId ? "contest_submissions" : "submissions";
		const docRef = doc(firestore, collectionName, initialSubmission.id);
		const unsub = onSnapshot(docRef, (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				setSub({
					id: snap.id,
					...data,
				});

				// Auto-select first failed testcase if not loaded
				if (data.testResults && Array.isArray(data.testResults)) {
					const firstFailIdx = data.testResults.findIndex((r: any) => !r.passed);
					setActiveTestCaseIndex(firstFailIdx >= 0 ? firstFailIdx : 0);
				}
			}
		}, (err) => {
			console.error("Error watching submission detail real-time state:", err);
		});
		return () => unsub();
	}, [initialSubmission.id, contestId]);

	// 2. Fetch all submissions to compute peers statistics
	useEffect(() => {
		const fetchPeerSubmissions = async () => {
			try {
				const collectionName = contestId ? "contest_submissions" : "submissions";
				const q = query(
					collection(firestore, collectionName),
					where("problemId", "==", problem.id),
					...(contestId ? [where("contestId", "==", contestId)] : [])
				);
				const snap = await getDocs(q);
				const list: any[] = [];
				snap.forEach((docSnap) => {
					list.push({ id: docSnap.id, ...docSnap.data() });
				});
				setPeerSubmissions(list);
			} catch (err) {
				console.error("Error fetching peer submissions for stats:", err);
			}
		};
		fetchPeerSubmissions();
	}, [problem.id, contestId]);

	// 3. Compute beats stats relative to other user submissions
	const perf = useMemo(() => {
		if (!sub || sub.status !== "passed" || peerSubmissions.length === 0) return null;
		const peerSubs = peerSubmissions.filter(s => s.language === sub.language && s.status === "passed");
		if (peerSubs.length <= 1) {
			return { runtimeBeats: 100, memoryBeats: 100 };
		}
		
		const currentRuntime = sub.runtime || 10;
		const currentMemory = sub.memory || 2048;
		
		const fasterCount = peerSubs.filter(s => (s.runtime || 10) > currentRuntime).length;
		const lessMemoryCount = peerSubs.filter(s => (s.memory || 2048) > currentMemory).length;
		
		const runtimeBeats = Math.round((fasterCount / (peerSubs.length - 1)) * 100);
		const memoryBeats = Math.round((lessMemoryCount / (peerSubs.length - 1)) * 100);
		
		return {
			runtimeBeats: Math.max(5, Math.min(99, runtimeBeats)),
			memoryBeats: Math.max(5, Math.min(99, memoryBeats))
		};
	}, [sub, peerSubmissions]);

	const currentStage = (sub.stage || sub.status || "submitting").toLowerCase();
	const isFinished = !["submitting", "queued", "compiling", "running", "evaluating", "pending"].includes(currentStage);

	const subMeta = getSubmissionStateMetadata(sub.verdict || sub.status, sub.status);

	const handleOpenInEditor = () => {
		if (!sub || !user) return;
		// Navigate back to problem page and ask to load submission code
		if (contestId) {
			router.push(`/contests/${contestId}/problems/${problem.id}?openSubmissionId=${sub.id}`);
		} else {
			router.push(`/problems/${problem.id}?openSubmissionId=${sub.id}`);
		}
	};

	const handleBack = () => {
		if (contestId) {
			router.push(`/contests/${contestId}/problems/${problem.id}`);
		} else {
			router.push(`/problems/${problem.id}`);
		}
	};

	const getCodeMirrorExtensions = () => {
		switch ((sub.language || "").toLowerCase()) {
			case "javascript": return [javascript()];
			case "python": return [python()];
			case "cpp":
			case "c": return [cpp()];
			case "java": return [java()];
			default: return [javascript()];
		}
	};

	const difficultyColor = 
		problem.difficulty === "Easy" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
		problem.difficulty === "Medium" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
		"text-rose-500 border-rose-500/20 bg-rose-500/5";

	return (
		<div className="min-h-screen flex flex-col bg-[#0a0a0c] text-white">
			<Topbar />
			<main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
				{/* Breadcrumb & Navigation */}
				<div className="flex justify-between items-center">
					<button
						onClick={handleBack}
						className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] px-4 py-2 rounded-xl"
					>
						<FiArrowLeft size={14} /> Back to Problem
					</button>
					<span className="text-xs font-mono text-gray-500">Submission ID: {sub.id}</span>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					{/* Left Panel: Verdict & Meta */}
					<div className="lg:col-span-1 space-y-6">
						{/* Verdict Card */}
						<div
							className="relative overflow-hidden rounded-lg border p-6 flex flex-col gap-4 transition-all duration-300"
							style={{
								backgroundColor: "rgba(20, 20, 24, 0.6)",
								borderColor: subMeta.borderColor || "rgba(255,255,255,0.05)",
								boxShadow: subMeta.glowShadow || "none",
							}}
						>
							<div className="flex items-center gap-3">
								{subMeta.Icon && (
									<subMeta.Icon
										size={28}
										className={!isFinished ? "animate-spin text-brand-orange" : ""}
										style={{ color: subMeta.color }}
									/>
								)}
								<div>
									<h2 className="text-xl font-black font-sans uppercase tracking-tight" style={{ color: subMeta.color }}>
										{subMeta.label}
									</h2>
									<p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(sub.timestamp)}</p>
								</div>
							</div>

							<div className="h-[1px] w-full bg-white/[0.05]" />

							<div className="space-y-1.5">
								<p className="text-xs text-gray-300 font-medium leading-relaxed">
									{subMeta.description}
								</p>
								<p className="text-[10px] text-gray-500 italic leading-relaxed">
									{subMeta.advice}
								</p>
							</div>

							{!isFinished && (
								<div className="mt-2 space-y-2">
									<div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
										<span>Judging Phase</span>
										<span className="text-brand-orange animate-pulse">{currentStage}</span>
									</div>
									<div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
										<div
											className="h-full bg-brand-orange rounded-full animate-pulse transition-all duration-500"
											style={{
												width: 
													currentStage === "submitting" ? "15%" :
													currentStage === "queued" ? "30%" :
													currentStage === "compiling" ? "50%" :
													currentStage === "running" ? "75%" :
													currentStage === "evaluating" ? "90%" : "0%"
											}}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Problem summary card */}
						<div className="rounded-lg border border-white/[0.05] p-5 bg-white/[0.02] space-y-3">
							<h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Problem</h3>
							<div className="flex items-center justify-between">
								<h4 className="text-base font-bold text-white truncate max-w-[180px]">{problem.title}</h4>
								<span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${difficultyColor}`}>
									{problem.difficulty}
								</span>
							</div>
						</div>

						{/* Execution Stats Card */}
						{isFinished && sub.status === "passed" && perf && (
							<div className="rounded-lg border border-white/[0.05] p-5 bg-white/[0.02] space-y-5">
								<h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Performance Beats</h3>
								<div className="space-y-4">
									<div>
										<div className="flex justify-between items-center text-xs mb-1.5">
											<span className="font-semibold text-gray-400">Runtime ({sub.runtime} ms)</span>
											<span className="font-black text-emerald-400">Beats {perf.runtimeBeats}%</span>
										</div>
										<div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
											<div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${perf.runtimeBeats}%` }} />
										</div>
									</div>
									<div>
										<div className="flex justify-between items-center text-xs mb-1.5">
											<span className="font-semibold text-gray-400">Memory ({(sub.memory / 1024).toFixed(2)} MB)</span>
											<span className="font-black text-emerald-400">Beats {perf.memoryBeats}%</span>
										</div>
										<div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
											<div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${perf.memoryBeats}%` }} />
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Right Panel: Code & Testcase analysis */}
					<div className="lg:col-span-2 space-y-6">
						{/* Scorecard / Testcase Results */}
						{sub.testResults && Array.isArray(sub.testResults) && sub.testResults.length > 0 ? (
							<div className="border border-white/[0.05] bg-white/[0.01] rounded-lg p-5 space-y-6">
								<h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Testcase Scorecard</h3>
								<TestcaseScorecard
									testResults={sub.testResults}
									activeIndex={activeTestCaseIndex}
									setActiveIndex={setActiveTestCaseIndex}
									runtime={sub.runtime}
									memory={sub.memory}
									score={sub.score}
								/>

								{sub.testResults[activeTestCaseIndex] && (
									<div className="mt-4 pt-4 border-t border-white/[0.05] space-y-4">
										{(() => {
											const currentCase = sub.testResults[activeTestCaseIndex];
											const isSample = !!problem.examples[activeTestCaseIndex]?.isSample;

											if (!isSample) {
												return (
													<div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 text-center">
														<p className="text-gray-400 italic text-xs leading-relaxed">
															🔒 Input and output details are hidden for secret test cases to prevent hardcoding.
														</p>
														{currentCase.runtime !== undefined && (
															<p className="text-[10px] text-gray-500 mt-1.5">
																Execution profile: {currentCase.runtime} ms • {(currentCase.memory ? currentCase.memory / 1024 : 0).toFixed(2)} MB
															</p>
														)}
													</div>
												);
											}

											return (
												<div className="space-y-4">
													<div>
														<p className="text-[11px] font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Input:</p>
														<div className="border px-4 py-3 rounded-lg text-xs font-mono whitespace-pre-wrap bg-black/40 border-white/[0.05] text-gray-300">
															{currentCase.input || <span className="italic text-gray-600">Empty Input</span>}
														</div>
													</div>
													
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														{currentCase.expected && (
															<div>
																<p className="text-[11px] font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Expected Output:</p>
																<div className="border px-4 py-3 rounded-lg text-xs font-mono whitespace-pre-wrap bg-green-500/10 border-green-500/20 text-green-450">
																	{currentCase.expected}
																</div>
															</div>
														)}
														<div>
															<p className="text-[11px] font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Your Output:</p>
															<div className={`border px-4 py-3 rounded-lg text-xs font-mono whitespace-pre-wrap ${
																currentCase.passed
																	? "bg-green-500/10 border-green-500/20 text-green-450"
																	: "bg-red-500/10 border-red-500/20 text-rose-400"
															}`}>
																{currentCase.actual || <span className="italic text-gray-600">Empty Output</span>}
															</div>
														</div>
													</div>

													{currentCase.error && (
														<div>
															<p className="text-[11px] font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Error Details:</p>
															<pre className="border p-4 rounded-xl text-xs font-mono overflow-auto max-h-[140px] whitespace-pre-wrap bg-black/40 border-white/[0.05] text-red-400">
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
						) : (
							sub.status === "failed" && sub.verdict === "Compilation Error" && (sub.error || sub.message) && (
								<div className="border border-white/[0.05] bg-white/[0.01] rounded-lg p-5 space-y-3">
									<p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Compiler Diagnostic Output:</p>
									<pre className="p-4 rounded-xl text-xs font-mono overflow-auto max-h-[220px] bg-black/60 border border-white/[0.05] text-rose-400 whitespace-pre-wrap leading-relaxed">
										{sub.error || sub.message}
									</pre>
								</div>
							)
						)}

						{/* Code Card */}
						<div className="border border-white/[0.05] rounded-lg overflow-hidden bg-white/[0.01] space-y-3 p-5">
							<div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
								<h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Submitted Solution</h3>
								<button
									onClick={handleOpenInEditor}
									className="flex items-center gap-1.5 text-xs text-brand-orange hover:text-brand-orange/80 font-bold transition"
								>
									<FiCode size={14} /> Open in editor
								</button>
							</div>

							<div className="text-xs text-gray-400 flex items-center justify-between pb-1">
								<span>Language: {formatLanguage(sub.language)}</span>
							</div>

							<div className="border border-white/[0.05] rounded-xl overflow-hidden">
								<CodeMirror
									value={sub.code || ""}
									theme={vscodeDark}
									editable={false}
									readOnly={true}
									extensions={getCodeMirrorExtensions()}
								/>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};
