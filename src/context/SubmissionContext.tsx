import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { collection, doc, query, where, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { Problem } from "@/utils/types/problem";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";

export type SubmissionStage =
	| "idle"
	| "submitting"
	| "queued"
	| "compiling"
	| "running"
	| "evaluating"
	| "statistics"
	| "completed";

export interface Submission {
	id: string;
	uid: string;
	username: string;
	problemId: string;
	problemTitle: string;
	code: string;
	language: string;
	status: string;
	stage?: string;
	progress?: string | { current: number; total: number } | null;
	verdict: string;
	score: number;
	timestamp: number;
	testResults: any[];
	contestId?: string;
	runtime?: number;
	memory?: number;
	error?: string;
	message?: string;
}

interface SubmissionContextType {
	// Submissions History & detail view
	submissions: Submission[];
	loadingSubs: boolean;
	selectedSub: Submission | null;
	setSelectedSub: (sub: Submission | null) => void;
	selectedSubTestCaseIndex: number;
	setSelectedSubTestCaseIndex: (index: number) => void;

	// Active Submit Lifecycle State
	isSubmitting: boolean;
	submittingId: string | null;
	submittingStage: SubmissionStage;
	submittingProgress: { current: number; total: number } | null;
	submittingVerdict: string;
	submitCode: (
		userCode: string,
		language: string,
		problem: Problem,
		contestId?: string
	) => Promise<string | null>;

	// Run Code State
	runStatus: "idle" | "running" | "accepted" | "wrong_answer" | "compile_error" | "error";
	runResults: any[] | null;
	runError: string | null;
	runCode: (
		userCode: string,
		language: string,
		problem: Problem,
		customInputChecked: boolean,
		customInputText: string
	) => Promise<any>;
}

const SubmissionContext = createContext<SubmissionContextType | undefined>(undefined);

export const SubmissionProvider: React.FC<{ problemId: string; contestId?: string; children: React.ReactNode }> = ({
	problemId,
	contestId,
	children,
}) => {
	const [user] = useAuthState(auth);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loadingSubs, setLoadingSubs] = useState(false);
	const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
	const [selectedSubTestCaseIndex, setSelectedSubTestCaseIndex] = useState<number>(0);

	// Submit States
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submittingId, setSubmittingId] = useState<string | null>(null);
	const [submittingStage, setSubmittingStage] = useState<SubmissionStage>("idle");
	const [submittingProgress, setSubmittingProgress] = useState<{ current: number; total: number } | null>(null);
	const [submittingVerdict, setSubmittingVerdict] = useState("Pending");

	// Run Code States
	const [runStatus, setRunStatus] = useState<"idle" | "running" | "accepted" | "wrong_answer" | "compile_error" | "error">("idle");
	const [runResults, setRunResults] = useState<any[] | null>(null);
	const [runError, setRunError] = useState<string | null>(null);

	// Real-time listener for the User's submissions history
	useEffect(() => {
		if (!user || !problemId) {
			setSubmissions([]);
			return;
		}

		setLoadingSubs(true);
		const collectionName = contestId ? "contest_submissions" : "submissions";
		const q = query(
			collection(firestore, collectionName),
			where("uid", "==", user.uid),
			where("problemId", "==", problemId),
			...(contestId ? [where("contestId", "==", contestId)] : [])
		);

		const unsubscribe = onSnapshot(
			q,
			(snap) => {
				const list: Submission[] = [];
				snap.forEach((docSnap) => {
					list.push({ id: docSnap.id, ...docSnap.data() } as Submission);
				});
				// Sort chronologically desc
				list.sort((a, b) => b.timestamp - a.timestamp);
				setSubmissions(list);
				setLoadingSubs(false);
			},
			(err) => {
				console.error("Error listening to submissions history:", err);
				setLoadingSubs(false);
			}
		);

		return () => unsubscribe();
	}, [user, problemId, contestId]);

	// Auto-sync selected submission when the real-time list gets updated (e.g. processing completes)
	useEffect(() => {
		if (selectedSub) {
			const updated = submissions.find((s) => s.id === selectedSub.id);
			if (updated) {
				setSelectedSub(updated);
			}
		}
	}, [submissions, selectedSub?.id]);

	// Submit Code Function
	const submitCode = async (
		userCode: string,
		language: string,
		problem: Problem,
		contestId?: string
	): Promise<string | null> => {
		if (!user) return null;

		setIsSubmitting(true);
		setSubmittingStage("submitting");
		setSubmittingProgress(null);
		setSubmittingVerdict("Pending");

		const collectionName = contestId ? "contest_submissions" : "submissions";
		const subDocRef = doc(collection(firestore, collectionName));
		const submissionId = subDocRef.id;
		setSubmittingId(submissionId);

		// 1. Pre-create the submission document locally with "submitting" status
		const initialDoc = {
			uid: user.uid,
			username: user.displayName || user.email?.split("@")[0] || "Anonymous",
			problemId: problem.id,
			problemTitle: problem.title,
			code: userCode,
			language,
			status: "submitting",
			verdict: "Pending",
			score: 0,
			timestamp: Date.now(),
			testResults: [],
			...(contestId ? { contestId } : {}),
		};

		await setDoc(subDocRef, initialDoc);

		// Select the newly pre-created submission detail view immediately
		setSelectedSub({ id: submissionId, ...initialDoc } as Submission);
		setSelectedSubTestCaseIndex(0);

		// 2. Set up real-time subscription to this submission document to track lifecycle transitions
		const unsubscribeSub = onSnapshot(
			subDocRef,
			(docSnap) => {
				if (docSnap.exists()) {
					const data = docSnap.data();
					setSelectedSub({ id: docSnap.id, ...data } as Submission);
					const status = data.status || "submitting";
					setSubmittingVerdict(data.verdict || "Pending");

					// Map status strings to SubmissionStage
					if (status === "submitting") {
						setSubmittingStage("submitting");
					} else if (status === "queued") {
						setSubmittingStage("queued");
					} else if (status === "compiling") {
						setSubmittingStage("compiling");
					} else if (status === "running") {
						setSubmittingStage("running");
						if (data.progress) {
							setSubmittingProgress(data.progress);
						}
					} else if (status === "evaluating") {
						setSubmittingStage("evaluating");
					} else if (status === "passed" || status === "failed") {
						setSubmittingStage("completed");
						setIsSubmitting(false);
						unsubscribeSub();
					}
				}
			},
			(err) => {
				console.error("Error watching active submission status:", err);
				setIsSubmitting(false);
			}
		);

		// 3. Make POST request to trigger compilation and execution on server
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/submit", {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					uid: user.uid,
					username: user.displayName || user.email?.split("@")[0] || "Anonymous",
					problemId: problem.id,
					problemTitle: problem.title,
					userCode,
					language,
					contestId,
					submissionId,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP error ${res.status} triggering submission`);
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || "Submission trigger failed on server");
			}

			return submissionId;
		} catch (err: any) {
			console.error("Submit API invocation error:", err);
			await updateDoc(subDocRef, {
				status: "failed",
				verdict: err.message?.includes("terminated") ? "Terminated" : (err.message?.includes("banned") ? "Banned" : "Internal Error"),
				error: err.message,
				timestamp: Date.now(),
			}).catch(() => {});
			setSubmittingStage("completed");
			setIsSubmitting(false);
			unsubscribeSub();
			throw err;
		}
	};

	// Run Code Function (locally runs the code on sample test cases)
	const runCode = async (
		userCode: string,
		language: string,
		problem: Problem,
		customInputChecked: boolean,
		customInputText: string
	): Promise<any> => {
		setRunStatus("running");
		setRunResults(null);
		setRunError(null);

		try {
			const filteredSamples = (problem.examples || []).filter((ex) => ex.isSample);
			const sampleCases = customInputChecked
				? [{ inputText: customInputText, outputText: "", isSample: true }]
				: (filteredSamples.length > 0 ? filteredSamples : (problem.examples || []));

			const idToken = user ? await user.getIdToken() : "";
			const res = await fetch("/api/run", {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
				},
				body: JSON.stringify({
					problemId: problem.id,
					userCode,
					language,
					testcases: sampleCases,
					isCustomInput: customInputChecked,
				}),
			});

			if (!res.ok) {
				throw new Error("Run API invocation failed");
			}

			const data = await res.json();
			if (data.isCompileError) {
				setRunStatus("compile_error");
				setRunError(data.error || "Compilation Error");
				return data;
			}

			if (!data.success) {
				setRunStatus("wrong_answer");
				setRunResults(data.testResults || null);
				setRunError(data.error || "Wrong Answer");
				return data;
			}

			setRunStatus("accepted");
			setRunResults(data.testResults || null);
			return data;
		} catch (err: any) {
			console.error("Run Code exception:", err);
			setRunStatus("error");
			setRunError(getFriendlyErrorMessage(err, "Execution Server Error"));
			return null;
		}
	};

	return (
		<SubmissionContext.Provider
			value={{
				submissions,
				loadingSubs,
				selectedSub,
				setSelectedSub,
				selectedSubTestCaseIndex,
				setSelectedSubTestCaseIndex,
				isSubmitting,
				submittingId,
				submittingStage,
				submittingProgress,
				submittingVerdict,
				submitCode,
				runStatus,
				runResults,
				runError,
				runCode,
			}}
		>
			{children}
		</SubmissionContext.Provider>
	);
};

export const useSubmission = () => {
	const context = useContext(SubmissionContext);
	if (context === undefined) {
		throw new Error("useSubmission must be used within a SubmissionProvider");
	}
	return context;
};
