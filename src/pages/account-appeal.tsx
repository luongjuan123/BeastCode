import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import AppShell from "@/components/UI/AppShell";

interface ModState {
	status: string;
	reason?: string;
	duration?: string;
	deleteAfter?: number;
	appealDeadline?: number;
	deleteTimerPaused?: boolean;
	email?: string;
	caseId?: string;
}

const AccountAppealPage: React.FC = () => {
	const [user, loadingAuth] = useAuthState(auth);
	const router = useRouter();
	const { refId } = router.query;
	const setAuthModalState = useSetRecoilState(authModalState);

	const [loadingData, setLoadingData] = useState(true);
	const [modState, setModState] = useState<ModState | null>(null);
	
	// Appeal form states
	const [appealMessage, setAppealMessage] = useState("");
	const [appealRefId, setAppealRefId] = useState("");
	const [appealFiles, setAppealFiles] = useState<{ name: string; base64: string }[]>([]);
	const [acceptTerms1, setAcceptTerms1] = useState(false);
	const [acceptTerms2, setAcceptTerms2] = useState(false);
	
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [downloading, setDownloading] = useState(false);

	useEffect(() => {
		if (refId) {
			setAppealRefId(String(refId).toUpperCase());
		}
	}, [refId]);

	useEffect(() => {
		if (loadingAuth) return;

		const fetchStatus = async () => {
			try {
				if (user) {
					// Authenticated user path
					const modRef = doc(firestore, "userModeration", user.uid);
					const modSnap = await getDoc(modRef);

					if (modSnap.exists()) {
						const data = modSnap.data() as ModState;
						setModState(data);
						if (data.caseId) {
							setAppealRefId(data.caseId);
						} else {
							setAppealRefId(user.uid.substring(0, 8).toUpperCase());
						}
					} else {
						// No moderation doc, check user doc directly
						const userRef = doc(firestore, "users", user.uid);
						const userSnap = await getDoc(userRef);
						const userData = userSnap.data() || {};
						if (userData.status === "PENDING_DELETION") {
							setModState({
								status: "PENDING_DELETION",
								deleteAfter: userData.deleteAfter,
								appealDeadline: userData.appealDeadline,
								caseId: userData.caseId
							});
							if (userData.caseId) {
								setAppealRefId(userData.caseId);
							} else {
								setAppealRefId(user.uid.substring(0, 8).toUpperCase());
							}
						} else {
							setModState({ status: "ACTIVE" });
						}
					}
				} else if (refId) {
					// Unauthenticated path: lookup moderation status by referenceId
					const res = await fetch(`/api/moderation/status-by-ref?refId=${refId}`);
					if (res.ok) {
						const data = await res.json();
						setModState({
							status: data.status,
							reason: data.reason,
							duration: data.duration,
							deleteAfter: data.deleteAfter,
							appealDeadline: data.appealDeadline,
							deleteTimerPaused: data.deleteTimerPaused,
							email: data.email,
							caseId: data.caseId
						});
						if (data.caseId) {
							setAppealRefId(data.caseId);
						}
					} else {
						setModState({ status: "UNKNOWN" });
					}
				} else {
					// No user and no refId: open login modal and redirect to home
					setAuthModalState({ isOpen: true, type: "login" });
					router.replace("/");
				}
			} catch (err) {
				console.error("Failed to load account status:", err);
				if (!user && !refId) {
					setAuthModalState({ isOpen: true, type: "login" });
					router.replace("/");
				}
			} finally {
				setLoadingData(false);
			}
		};

		fetchStatus();
	}, [user, loadingAuth, refId, router]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		if (appealFiles.length + files.length > 3) {
			setFeedback({ type: "error", text: "You can upload a maximum of 3 files." });
			return;
		}

		Array.from(files).forEach((file) => {
			if (file.size > 5 * 1024 * 1024) {
				setFeedback({ type: "error", text: `${file.name} exceeds 5MB size limit.` });
				return;
			}

			const reader = new FileReader();
			reader.onload = (ev) => {
				const base64 = ev.target?.result as string;
				setAppealFiles((prev) => [...prev, { name: file.name, base64 }]);
			};
			reader.readAsDataURL(file);
		});
	};

	const handleAppealSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		if (!appealRefId.trim()) {
			setFeedback({ type: "error", text: "Reference ID is required." });
			return;
		}
		if (appealMessage.length < 100) {
			setFeedback({ type: "error", text: "Appeal message must be at least 100 characters." });
			return;
		}
		if (!acceptTerms1 || !acceptTerms2) {
			setFeedback({ type: "error", text: "You must accept all terms to submit an appeal." });
			return;
		}

		setSubmitting(true);
		setFeedback(null);

		try {
			const idToken = user ? await user.getIdToken(true) : null;
			const headers: Record<string, string> = {
				"Content-Type": "application/json"
			};
			if (idToken) {
				headers["Authorization"] = `Bearer ${idToken}`;
			}

			const res = await fetch("/api/moderation/appeal", {
				method: "POST",
				headers,
				body: JSON.stringify({
					referenceId: appealRefId,
					appealMessage,
					files: appealFiles,
					acceptTerms: true
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error?.message || data.message || "Failed to submit appeal.");
			}

			setFeedback({ type: "success", text: "Appeal submitted successfully! Your case is now under review." });
			setModState((prev) => ({
				...prev,
				status: "APPEALED",
				deleteTimerPaused: true
			}));
		} catch (err: any) {
			setFeedback({ type: "error", text: err.message });
		} finally {
			setSubmitting(false);
		}
	};

	const handleAcceptDeletion = async () => {
		if (!user) return;
		if (!window.confirm("Are you absolutely sure you want to permanently delete your account immediately? This action is irreversible.")) {
			return;
		}
		
		setSubmitting(true);
		try {
			const idToken = await user.getIdToken(true);
			const res = await fetch("/api/moderation/self-delete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				}
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error?.message || data.message || "Failed to complete deletion.");
			}

			alert("Your account has been deleted permanently.");
			await auth.signOut();
			router.push("/");
		} catch (err: any) {
			alert("Deletion failed: " + err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDownloadData = async () => {
		if (!user) return;
		setDownloading(true);

		try {
			const dbFirestore = firestore;
			const userDoc = await getDoc(doc(dbFirestore, "users", user.uid));
			const userData = userDoc.exists() ? userDoc.data() : {};

			// Query user submissions
			const subsQuery = query(collection(dbFirestore, "submissions"), where("uid", "==", user.uid));
			const subsSnap = await getDocs(subsQuery);
			const submissions = subsSnap.docs.map(d => d.data());

			const exportBundle = {
				exportedAt: new Date().toISOString(),
				profile: {
					uid: user.uid,
					email: user.email,
					displayName: userData.displayName || "",
					username: userData.username || "",
					school: userData.school || "",
					studentId: userData.studentId || "",
					class: userData.class || "",
					faculty: userData.faculty || "",
					bio: userData.bio || "",
					createdAt: userData.createdAt || null
				},
				solvedProblems: userData.solvedProblems || [],
				submissions
			};

			const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
			const downloadAnchor = document.createElement("a");
			downloadAnchor.setAttribute("href", dataStr);
			downloadAnchor.setAttribute("download", `beastcode-data-export-${user.uid.substring(0, 8)}.json`);
			document.body.appendChild(downloadAnchor);
			downloadAnchor.click();
			downloadAnchor.remove();
		} catch (err) {
			alert("Failed to export data. Please try again.");
		} finally {
			setDownloading(false);
		}
	};

	if (loadingAuth || loadingData) {
		return (
			<AppShell activeNav="" maxWidth="normal">
				<div className="min-h-[60vh] flex items-center justify-center">
					<div className="text-center space-y-4">
						<div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
						<p className="text-text-muted text-xs font-mono">Verifying security parameters...</p>
					</div>
				</div>
			</AppShell>
		);
	}

	if (modState?.status === "ACTIVE") {
		return (
			<AppShell activeNav="" maxWidth="normal">
				<div className="min-h-[60vh] flex items-center justify-center">
					<div className="max-w-md w-full bg-surface border border-border-default rounded-lg p-6 text-center space-y-4">
						<div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center mx-auto text-lg">
							✓
						</div>
						<h3 className="text-base font-semibold text-text-primary">Account is Active</h3>
						<p className="text-xs text-text-secondary leading-relaxed">
							Your account is in good standing. You are being redirected to the home page.
						</p>
						<button
							onClick={() => router.push("/")}
							className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-md font-semibold text-xs transition-colors"
						>
							Go to Home
						</button>
					</div>
				</div>
			</AppShell>
		);
	}

	if (modState?.status === "UNKNOWN") {
		return (
			<AppShell activeNav="" maxWidth="normal">
				<div className="min-h-[60vh] flex items-center justify-center">
					<div className="max-w-md w-full bg-surface border border-red-900/30 rounded-lg p-6 text-center space-y-4">
						<div className="w-10 h-10 rounded-md bg-red-950/30 border border-red-900/40 text-red-400 flex items-center justify-center mx-auto text-lg">
							!
						</div>
						<h3 className="text-base font-semibold text-red-400">Case Not Found</h3>
						<p className="text-xs text-text-secondary leading-relaxed">
							No active moderation action or scheduled deletion was found matching this Reference ID. Please check the URL link in your email or contact support.
						</p>
						<button
							onClick={() => router.push("/")}
							className="w-full bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-text-primary py-2 rounded-md font-medium text-xs transition-colors"
						>
							Go to Home
						</button>
					</div>
				</div>
			</AppShell>
		);
	}

	const isAppealed = modState?.status === "APPEALED";
	const isDeletedPending = modState?.status === "PENDING_DELETION";
	const isBanned = modState?.status === "BANNED";

	return (
		<AppShell activeNav="" maxWidth="normal">
			<div className="py-8 flex justify-center">
				<div className="max-w-2xl w-full bg-surface border border-border-default rounded-lg overflow-hidden">
					{/* Top Header Banner */}
					<div className="bg-surface-elevated border-b border-border-subtle px-6 py-5 flex items-center gap-3">
						<div className="w-8 h-8 rounded-md bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-400 text-sm font-mono shrink-0">
							!
						</div>
						<div>
							<h1 className="text-sm font-semibold text-text-primary">Trust &amp; Safety Center</h1>
							<p className="text-[11px] text-red-400 font-mono uppercase tracking-wider mt-0.5">
								{isAppealed ? "Appeal Under Review" : isDeletedPending ? "Account Scheduled for Deletion" : "Account Suspended"}
							</p>
						</div>
					</div>

					<div className="p-6 space-y-6">
						{/* Status Details */}
						<div className="bg-surface-elevated border border-border-subtle rounded-md p-4 space-y-3">
							<div className="grid grid-cols-2 gap-4 text-xs">
								{user && (
									<div>
										<span className="text-text-muted block uppercase tracking-wider text-[10px] font-semibold">Account UID</span>
										<span className="font-mono text-text-secondary text-xs">{user.uid}</span>
									</div>
								)}
								<div className={!user ? "col-span-2" : ""}>
									<span className="text-text-muted block uppercase tracking-wider text-[10px] font-semibold">Appeal Ref ID</span>
									<span className="font-mono text-emerald-450 font-semibold text-xs">
										{appealRefId}
									</span>
								</div>
								{modState?.reason && (
									<div className="col-span-2">
										<span className="text-text-muted block uppercase tracking-wider text-[10px] font-semibold">Reason for Action</span>
										<p className="text-text-primary mt-1 text-xs bg-bg-base p-2.5 rounded-md border border-border-subtle">
											{modState.reason}
										</p>
									</div>
								)}
								{isDeletedPending && modState?.deleteAfter && (
									<div className="col-span-2 flex justify-between bg-red-950/20 border border-red-900/30 p-2.5 rounded-md text-xs">
										<span className="text-red-400 font-medium">Scheduled Deletion:</span>
										<span className="font-mono font-semibold text-text-primary">
											{new Date(modState.deleteAfter).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
						</div>

						{isAppealed ? (
							<div className="text-center py-6 space-y-3">
								<div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
								<h3 className="text-sm font-semibold text-text-primary">Appeal Under Investigation</h3>
								<p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
									An appeal has been submitted for this case. The deletion timer remains paused while our team reviews the details. We will notify you via email at <strong className="text-text-primary">{user?.email || modState?.email || "your registered email"}</strong> once a decision has been reached.
								</p>
							</div>
						) : (
							<form onSubmit={handleAppealSubmit} className="space-y-4">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-2">
									Submit a Request for Reinstatement
								</h3>

								<div className="grid grid-cols-2 gap-4">
									<div className="col-span-2">
										<label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
											Reference Case ID <span className="text-red-400">*</span>
										</label>
										{(user || refId || appealRefId) ? (
											<div className="w-full bg-bg-base border border-border-default rounded-md p-2.5 font-mono text-emerald-450 uppercase text-xs font-semibold select-all">
												{appealRefId || "Resolving ID..."}
											</div>
										) : (
											<input
												value={appealRefId}
												onChange={(e) => setAppealRefId(e.target.value)}
												required
												type="text"
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-bg-base border border-border-default rounded-md p-2.5 outline-none font-mono text-emerald-450 uppercase text-xs focus:border-emerald-500/50"
												placeholder="e.g. CASE-YYYY-XXXXXXXX"
											/>
										)}
									</div>

									<div className="col-span-2">
										<div className="flex justify-between items-center mb-1.5">
											<label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium">
												Appeal Statement <span className="text-red-400">*</span>
											</label>
											<span className={`text-[10px] font-mono ${appealMessage.length < 100 ? "text-amber-400" : "text-text-muted"}`}>
												{appealMessage.length} / 5000 chars (min 100)
											</span>
										</div>
										<textarea
											value={appealMessage}
											onChange={(e) => setAppealMessage(e.target.value)}
											required
											minLength={100}
											maxLength={5000}
											rows={5}
											placeholder="Explain clearly why the decision should be reversed. Provide any necessary context or explanations of what occurred..."
											autoComplete="off"
											autoCorrect="off"
											spellCheck={false}
											className="w-full bg-bg-base border border-border-default text-text-primary rounded-md p-3 outline-none text-xs placeholder:text-text-muted/50 resize-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
										/>
									</div>

									<div className="col-span-2">
										<label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
											Attach Supporting Evidence (Optional)
										</label>
										<input
											type="file"
											multiple
											accept="image/*,.pdf,.txt,.zip"
											onChange={handleFileChange}
											className="w-full bg-bg-base border border-border-default text-text-secondary text-xs rounded-md file:bg-surface-elevated file:text-text-primary file:border-0 file:py-1.5 file:px-3 file:mr-3 file:hover:bg-surface-hover file:text-xs file:font-medium cursor-pointer"
										/>
										<p className="text-[10px] text-text-muted mt-1">Images, PDF, TXT, or ZIP up to 5MB total.</p>

										{appealFiles.length > 0 && (
											<div className="mt-2 space-y-1">
												{appealFiles.map((f, i) => (
													<div key={i} className="flex justify-between bg-surface-elevated px-3 py-1.5 rounded-md border border-border-subtle text-xs">
														<span className="font-mono text-text-secondary truncate max-w-[300px]">{f.name}</span>
														<button
															type="button"
															onClick={() => setAppealFiles(prev => prev.filter((_, idx) => idx !== i))}
															className="text-red-400 hover:text-red-300 font-semibold ml-2 text-xs"
														>
															✕
														</button>
													</div>
												))}
											</div>
										)}
									</div>

									<div className="col-span-2 space-y-2">
										<label className="flex gap-2 items-start cursor-pointer select-none">
											<input
												type="checkbox"
												checked={acceptTerms1}
												onChange={(e) => setAcceptTerms1(e.target.checked)}
												className="mt-0.5 accent-emerald-500 rounded"
											/>
											<span className="text-[11px] text-text-secondary leading-tight">
												I agree that all statements, documents, and evidence submitted in this appeal are accurate, truthful, and provided in good faith.
											</span>
										</label>
										<label className="flex gap-2 items-start cursor-pointer select-none">
											<input
												type="checkbox"
												checked={acceptTerms2}
												onChange={(e) => setAcceptTerms2(e.target.checked)}
												className="mt-0.5 accent-emerald-500 rounded"
											/>
											<span className="text-[11px] text-text-secondary leading-tight">
												I understand that the review decision is final and that submitting false or misleading information will result in immediate permanent termination of all platform privileges.
											</span>
										</label>
									</div>
								</div>

								{feedback && (
									<div className={`p-3 rounded-md text-xs font-medium ${
										feedback.type === "success" ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40" : "bg-red-950/30 text-red-400 border border-red-900/40"
									}`}>
										{feedback.text}
									</div>
								)}

								<button
									type="submit"
									disabled={submitting}
									className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{submitting ? "Submitting Appeal..." : "Submit Appeal"}
								</button>
							</form>
						)}

						{/* Standard Compliance and Lifecycle Actions */}
						<div className="border-t border-border-subtle pt-5 flex flex-wrap justify-between items-center gap-3">
							<div className="flex gap-2">
								<button
									onClick={handleDownloadData}
									disabled={downloading || !user}
									className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-xs font-medium rounded-md text-text-primary transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
									title={!user ? "Please login to download your data" : ""}
								>
									📥 {downloading ? "Exporting..." : "Download My Data"}
								</button>
								{isDeletedPending && (
									<button
										onClick={handleAcceptDeletion}
										disabled={submitting || !user}
										className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/30 border border-red-900/40 text-red-400 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
										title={!user ? "Please login to accept deletion" : ""}
									>
										Accept Deletion
									</button>
								)}
							</div>

							{user ? (
								<button
									onClick={async () => {
										await auth.signOut();
										router.push("/");
									}}
									className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary rounded-md transition-colors"
								>
									Logout Session
								</button>
							) : (
								<button
									type="button"
									onClick={() => setAuthModalState({ isOpen: true, type: "login" })}
									className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-md transition-colors"
								>
									Log In to Dashboard
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</AppShell>
	);
};

export default AccountAppealPage;
