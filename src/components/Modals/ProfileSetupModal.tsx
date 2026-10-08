import React, { useEffect, useState } from "react";
import { auth, firestore } from "@/firebase/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {
	FaGraduationCap,
	FaSpinner,
	FaChevronRight,
	FaChevronLeft,
	FaCheckCircle,
	FaTimes,
	FaUserTie
} from "react-icons/fa";

interface ProfileSetupModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// Procedural SVG avatar data URL generator
const generateAvatarDataUrl = (letter: string, bg: string, text: string) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
		<rect width="100" height="100" fill="${encodeURIComponent(bg)}"/>
		<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="45" font-weight="bold" fill="${encodeURIComponent(text)}">${letter}</text>
	</svg>`;
	return `data:image/svg+xml;utf8,${svg}`;
};

const AVATAR_OPTIONS = [
	{ id: "amber", label: "Alpha Amber", value: generateAvatarDataUrl("A", "#2d1f10", "#f59e0b"), color: "#f59e0b" },
	{ id: "emerald", label: "Beta Emerald", value: generateAvatarDataUrl("E", "#0c2c1c", "#10b981"), color: "#10b981" },
	{ id: "sapphire", label: "Gamma Sapphire", value: generateAvatarDataUrl("S", "#0f1b3c", "#3b82f6"), color: "#3b82f6" },
	{ id: "crimson", label: "Delta Crimson", value: generateAvatarDataUrl("C", "#330a15", "#f43f5e"), color: "#f43f5e" },
];

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose }) => {
	const [user] = useAuthState(auth);
	const [step, setStep] = useState(1);
	const [isLoadingExisting, setIsLoadingExisting] = useState(true);

	// Form inputs
	const [username, setUsername] = useState("");
	const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0].value);
	const [displayName, setDisplayName] = useState("");
	const [studentId, setStudentId] = useState("");
	const [school, setSchool] = useState("BeastCode University");
	const [faculty, setFaculty] = useState("");
	const [className, setClassName] = useState("");
	const [showStudentInfo, setShowStudentInfo] = useState(true);

	// Availability and validation state
	const [isValidatingUsername, setIsValidatingUsername] = useState(false);
	const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
	const [errors, setErrors] = useState<{ step1?: string; step2?: string }>({});
	const [submitting, setSubmitting] = useState(false);

	// Escape key dismissal
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !submitting) {
				onClose();
			}
		};
		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, submitting, onClose]);

	// Load existing fields if user doc exists
	useEffect(() => {
		if (!user || !isOpen) return;
		let isCancelled = false;

		const loadExisting = async () => {
			setIsLoadingExisting(true);
			try {
				const userRef = doc(firestore, "users", user.uid);
				const userSnap = await getDoc(userRef);
				if (isCancelled) return;

				if (userSnap.exists()) {
					const data = userSnap.data();
					setDisplayName(data.displayName || user.displayName || "");
					setUsername(data.username || "");
					setStudentId(data.studentId || "");
					setSchool(data.school || "BeastCode University");
					setFaculty(data.faculty || "");
					setClassName(data.class || "");
					setAvatarUrl(data.avatarUrl || data.avatar || AVATAR_OPTIONS[0].value);
					setShowStudentInfo(data.showStudentInfo !== false);

					if (data.username) {
						setIsUsernameAvailable(true);
					}
				} else {
					setDisplayName(user.displayName || "");
				}
			} catch (e) {
				console.error("Error loading user profile in setup modal:", e);
			} finally {
				if (!isCancelled) {
					setIsLoadingExisting(false);
				}
			}
		};

		loadExisting();
		return () => {
			isCancelled = true;
		};
	}, [user, isOpen]);

	// Live username availability checker
	useEffect(() => {
		if (!username.trim()) {
			setIsUsernameAvailable(null);
			return;
		}

		// Basic format validation
		const regex = /^[a-zA-Z0-9_]{3,15}$/;
		if (!regex.test(username)) {
			setIsUsernameAvailable(false);
			setErrors((prev) => ({ ...prev, step1: "Username must be 3-15 characters, alphanumeric/underscores." }));
			return;
		} else {
			setErrors((prev) => ({ ...prev, step1: undefined }));
		}

		let isCancelled = false;

		const checkUsername = async () => {
			setIsValidatingUsername(true);
			try {
				const q = query(
					collection(firestore, "users"),
					where("username", "==", username.trim().toLowerCase()),
					limit(1)
				);
				const snap = await getDocs(q);
				if (isCancelled) return;

				if (snap.empty) {
					setIsUsernameAvailable(true);
				} else {
					const existingUserDoc = snap.docs[0];
					if (user && existingUserDoc.id === user.uid) {
						setIsUsernameAvailable(true);
					} else {
						setIsUsernameAvailable(false);
					}
				}
			} catch (err) {
				console.error("Failed to query username:", err);
				if (!isCancelled) setIsUsernameAvailable(false);
			} finally {
				if (!isCancelled) setIsValidatingUsername(false);
			}
		};

		const delayDebounce = setTimeout(checkUsername, 500);
		return () => {
			isCancelled = true;
			clearTimeout(delayDebounce);
		};
	}, [username, user]);

	if (!isOpen || !user) return null;

	const handleStep1Next = () => {
		if (!username.trim() || isUsernameAvailable !== true) return;
		setStep(2);
	};

	const handleSkipAcademic = () => {
		setShowStudentInfo(false);
		setSchool("Independent Developer");
		setFaculty("General");
		setStudentId("N/A");
		setClassName("N/A");
	};

	const handleStep2Submit = async () => {
		if (!displayName.trim()) {
			setErrors((prev) => ({ ...prev, step2: "Display name is required." }));
			return;
		}

		if (showStudentInfo) {
			if (!studentId.trim() || !school.trim() || !faculty.trim() || !className.trim()) {
				setErrors((prev) => ({
					...prev,
					step2: "Please fill in all student fields, or use the non-student option below."
				}));
				return;
			}
		}

		setErrors((prev) => ({ ...prev, step2: undefined }));
		setSubmitting(true);
		try {
			const userRef = doc(firestore, "users", user.uid);
			await setDoc(
				userRef,
				{
					username: username.trim().toLowerCase(),
					avatarUrl: avatarUrl,
					displayName: displayName.trim(),
					studentId: showStudentInfo ? studentId.trim() : (studentId.trim() || "N/A"),
					school: showStudentInfo ? school.trim() : (school.trim() || "Independent Developer"),
					faculty: showStudentInfo ? faculty.trim() : (faculty.trim() || "General"),
					class: showStudentInfo ? className.trim() : (className.trim() || "N/A"),
					showStudentInfo,
					experienceLevel: "Newbie",
					isOnboarded: true,
					email: user.email,
					usernameLastChangedAt: Date.now(),
					updatedAt: Date.now(),
				},
				{ merge: true }
			);
			onClose();
		} catch (error: any) {
			console.error("Error setting up profile:", error);
			setErrors((prev) => ({ ...prev, step2: "Failed to finalize profile. Please try again." }));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080909]/85 p-4 overflow-y-auto"
			onClick={(e) => {
				if (e.target === e.currentTarget && !submitting) {
					onClose();
				}
			}}
		>
			<div className="bc-modal-shell rounded-lg border border-border-default w-full max-w-lg p-6 shadow-xl relative my-auto">
				{/* Step indicator and Close Button header */}
				<div className="flex items-center justify-between border-b border-border-default pb-4 mb-5">
					<div className="flex items-center gap-3">
						<div className="bg-accent/10 p-2 rounded-md text-accent shrink-0 border border-accent/20">
							<FaGraduationCap size={18} />
						</div>
						<div>
							<h2 className="text-sm font-semibold text-text-primary">Developer Profile Setup</h2>
							<p className="text-[11px] text-text-muted mt-0.5">Configure your developer profile.</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-1.5">
							<span className={`w-6 h-1 rounded-full ${step >= 1 ? "bg-brand-orange" : "bg-gray-850"}`} />
							<span className={`w-6 h-1 rounded-full ${step >= 2 ? "bg-brand-orange" : "bg-gray-850"}`} />
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							aria-label="Close setup modal"
							className="text-dark-gray-7 hover:text-dark-gray-8 p-1.5 rounded-lg hover:bg-white/5 transition disabled:opacity-40"
						>
							<FaTimes size={15} />
						</button>
					</div>
				</div>

				{isLoadingExisting ? (
					<div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
						<FaSpinner className="animate-spin text-brand-orange" size={24} />
						<p className="text-xs text-dark-gray-7">Loading your developer settings...</p>
					</div>
				) : (
					<>
						{/* STEP 1: Choose Username & Avatar */}
						{step === 1 && (
							<div className="space-y-6">
								{/* Username Input */}
								<div>
									<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-2">
										Choose Username
									</label>
									<div className="relative">
										<input
											type="text"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											autoComplete="username"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="w-full bc-input-shell rounded-xl p-3.5 text-xs placeholder:text-bc-muted transition pr-10"
										/>
										<div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
											{isValidatingUsername && (
												<FaSpinner className="animate-spin text-brand-orange" size={14} />
											)}
											{!isValidatingUsername && isUsernameAvailable === true && (
												<FaCheckCircle className="text-bc-success" size={15} />
											)}
											{!isValidatingUsername && isUsernameAvailable === false && (
												<span className="w-2 h-2 rounded-full bg-bc-error" />
											)}
										</div>
									</div>
									{isUsernameAvailable === false && (
										<p className="text-bc-error text-xs mt-1.5 font-medium">
											{errors.step1 || "This username is unavailable."}
										</p>
									)}
									{isUsernameAvailable === true && (
										<p className="text-bc-success text-[10px] mt-1.5 font-medium">Username is available.</p>
									)}
								</div>

								{/* Avatar Selector */}
								<div>
									<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-2.5">
										Select Core Avatar
									</label>
									<div className="grid grid-cols-4 gap-3">
										{AVATAR_OPTIONS.map((opt) => (
											<button
												key={opt.id}
												type="button"
												onClick={() => setAvatarUrl(opt.value)}
												className={`aspect-square rounded-xl border bg-dark-surface/80 flex flex-col items-center justify-center p-2.5 transition-all hover:scale-105 active:scale-95 ${
													avatarUrl === opt.value
														? "border-brand-orange ring-2 ring-brand-orange/10"
														: "border-gray-850 hover:border-dark-hover"
												}`}
											>
												<img
													src={opt.value}
													alt={opt.label}
													className="w-12 h-12 rounded-full object-cover border"
													style={{ borderColor: opt.color }}
												/>
											</button>
										))}
									</div>
								</div>

								{/* Footer Actions */}
								<div className="flex justify-between items-center pt-4 border-t border-gray-850">
									<button
										type="button"
										onClick={onClose}
										className="text-xs text-dark-gray-7 hover:text-dark-gray-8 transition px-2 py-1"
									>
										Set up later
									</button>
									<button
										type="button"
										onClick={handleStep1Next}
										disabled={!username.trim() || isUsernameAvailable !== true || isValidatingUsername}
										className="bc-btn-brand disabled:opacity-40 font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition"
									>
										<span>Academic Profile</span>
										<FaChevronRight size={10} />
									</button>
								</div>
							</div>
						)}

						{/* STEP 2: Academic Profile */}
						{step === 2 && (
							<div className="space-y-4">
								<div>
									<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-1.5">
										Full Display Name <span className="text-bc-error">*</span>
									</label>
									<input
										type="text"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										autoComplete="name"
										autoCorrect="off"
										spellCheck={false}
										className="w-full bc-input-shell rounded-xl p-3 text-xs placeholder:text-bc-muted transition"
										required
									/>
								</div>

								{showStudentInfo ? (
									<>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-1.5">
													Student ID Code <span className="text-bc-error">*</span>
												</label>
												<input
													type="text"
													value={studentId}
													onChange={(e) => setStudentId(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bc-input-shell rounded-xl p-3 text-xs placeholder:text-bc-muted font-mono transition"
													required
												/>
											</div>

											<div>
												<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-1.5">
													Class / Cohort <span className="text-bc-error">*</span>
												</label>
												<input
													type="text"
													value={className}
													onChange={(e) => setClassName(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bc-input-shell rounded-xl p-3 text-xs placeholder:text-bc-muted transition"
													required
												/>
											</div>
										</div>

										<div>
											<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-1.5">
												School / University <span className="text-bc-error">*</span>
											</label>
											<input
												type="text"
												value={school}
												onChange={(e) => setSchool(e.target.value)}
												autoComplete="organization"
												autoCorrect="off"
												spellCheck={false}
												className="w-full bc-input-shell rounded-xl p-3 text-xs placeholder:text-bc-muted transition"
												required
											/>
										</div>

										<div>
											<label className="text-xs font-semibold text-dark-gray-7 uppercase tracking-wider block mb-1.5">
												Faculty / Department <span className="text-bc-error">*</span>
											</label>
											<input
												type="text"
												value={faculty}
												onChange={(e) => setFaculty(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												spellCheck={false}
												className="w-full bc-input-shell rounded-xl p-3 text-xs placeholder:text-bc-muted transition"
												required
											/>
										</div>
									</>
								) : (
									<div className="p-4 rounded-xl border border-dashed border-gray-800 bg-dark-surface/30 text-center space-y-1">
										<p className="text-xs text-dark-gray-8 font-medium">Independent Developer Mode</p>
										<p className="text-[11px] text-bc-muted">Academic student verification is skipped.</p>
									</div>
								)}

								<div className="flex items-center justify-between p-4 border border-gray-850 rounded-xl bg-dark-surface/40 mt-2">
									<div>
										<label className="text-xs font-semibold block text-dark-gray-8">
											University Student Profile
										</label>
										<p className="text-[10px] text-bc-muted mt-0.5">
											{showStudentInfo
												? "Visible on university department leaderboards and contests."
												: "Disabled. Set as independent developer."}
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											if (showStudentInfo) {
												handleSkipAcademic();
											} else {
												setShowStudentInfo(true);
											}
										}}
										className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
											showStudentInfo ? "bg-brand-orange" : "bg-gray-750"
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-dark-layer-2 shadow ring-0 transition duration-200 ease-in-out ${
												showStudentInfo ? "translate-x-5" : "translate-x-0"
											}`}
										/>
									</button>
								</div>

								{showStudentInfo && (
									<button
										type="button"
										onClick={handleSkipAcademic}
										className="text-[11px] text-dark-gray-7 hover:text-brand-orange transition flex items-center gap-1.5 mt-1"
									>
										<FaUserTie size={11} />
										<span>I am not a student / Independent developer</span>
									</button>
								)}

								{errors.step2 && (
									<div className="p-3 bg-bc-error/10 border border-bc-error/20 rounded-lg text-bc-error text-xs font-medium">
										{errors.step2}
									</div>
								)}

								{/* Footer Actions */}
								<div className="flex justify-between pt-4 border-t border-gray-850 mt-4">
									<button
										type="button"
										onClick={() => setStep(1)}
										className="bc-btn-ghost font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition"
									>
										<FaChevronLeft size={10} />
										<span>Back</span>
									</button>
									<button
										type="button"
										onClick={handleStep2Submit}
										disabled={submitting}
										className="bc-btn-brand disabled:opacity-40 font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition"
									>
										{submitting ? (
											<>
												<FaSpinner className="animate-spin" size={12} />
												<span>Finalizing...</span>
											</>
										) : (
											<>
												<span>Finalize Workspace</span>
												<FaChevronRight size={10} />
											</>
										)}
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default ProfileSetupModal;
