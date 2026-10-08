import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
	FaEye, FaEyeSlash, FaLock, FaCheck, FaSpinner,
	FaExclamationCircle, FaShieldAlt, FaLightbulb,
	FaLaptop, FaGlobe, FaHistory, FaLink, FaUnlink,
	FaCheckCircle, FaTimesCircle, FaKey, FaChevronRight,
	FaCopy, FaTimes, FaQrcode
} from "react-icons/fa";
import { analysePassword, strengthColor } from "@/utils/passwordPolicy";
import type { PasswordRequirement, PasswordStrengthLevel } from "@/utils/passwordPolicy";

interface Session {
	id: string;
	sessionId: string;
	ip: string;
	country: string;
	userAgent: string;
	browser: string;
	os: string;
	createdAt: number;
	lastActive: number;
}

interface LoginLog {
	id: string;
	ip: string;
	country: string;
	userAgent: string;
	browser: string;
	os: string;
	status: string;
	timestamp: number;
}

interface SecurityScoreData {
	score: number;
	level: string;
	breakdown: Array<{ check: string; met: boolean; value: number }>;
	mfaEnabled: boolean;
	emailVerified: boolean;
}

export default function SecuritySettings() {
	const router = useRouter();
	const [user] = useAuthState(auth);
	const [activeTab, setActiveTab] = useState<"overview" | "password" | "mfa" | "sessions" | "history">("overview");

	// State for Password Change Form
	const [currentPwd, setCurrentPwd] = useState("");
	const [newPwd, setNewPwd] = useState("");
	const [confirmPwd, setConfirmPwd] = useState("");
	const [pwdErrors, setPwdErrors] = useState<{ current?: string; new?: string; confirm?: string; general?: string }>({});
	const [pwdSubmitting, setPwdSubmitting] = useState(false);
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	// State for Verification Modal
	const [showModal, setShowModal] = useState(false);
	const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(""));
	const [modalError, setModalError] = useState<string | null>(null);
	const [modalLoading, setModalLoading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const codeInputsRef = useRef<HTMLInputElement[]>([]);

	const [signOutOtherDevices, setSignOutOtherDevices] = useState(true);
	const [pwdVerifySuccess, setPwdVerifySuccess] = useState(false);
	const [codeExpiresIn, setCodeExpiresIn] = useState(600);

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (showModal && codeExpiresIn > 0 && !pwdVerifySuccess) {
			timer = setTimeout(() => setCodeExpiresIn((prev) => prev - 1), 1000);
		}
		return () => clearTimeout(timer);
	}, [showModal, codeExpiresIn, pwdVerifySuccess]);

	useEffect(() => {
		if (showModal) {
			setCodeExpiresIn(600);
			setPwdVerifySuccess(false);
		}
	}, [showModal]);

	const formatExpirationTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Dashboard states
	const [scoreData, setScoreData] = useState<SecurityScoreData | null>(null);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [history, setHistory] = useState<LoginLog[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

	// 2FA states (Mock Setup)
	const [mfaType, setMfaType] = useState<"none" | "email" | "authenticator" | "passkeys">("none");
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const [showMfaSetup, setShowMfaSetup] = useState(false);
	const [mfaSecret, setMfaSecret] = useState("");
	const [mfaSetupCode, setMfaSetupCode] = useState("");

	const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("bc_session_id") : null;

	const pwdAnalysis = analysePassword(newPwd, {
		email: user?.email ?? "",
		displayName: user?.displayName ?? "",
	});

	const confirmMismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;
	const canSubmitPwd = pwdAnalysis.isValid && !confirmMismatch && currentPwd.length > 0 && !pwdSubmitting;

	// Fetch security data on mount / tab change
	const fetchSecurityData = async () => {
		if (!user) return;
		try {
			const idToken = await user.getIdToken();
			const headers = { Authorization: `Bearer ${idToken}` };

			const [scoreRes, sessionsRes, historyRes] = await Promise.all([
				fetch("/api/security/security-score", { headers }),
				fetch("/api/security/sessions", { headers }),
				fetch("/api/security/login-history", { headers }),
			]);

			if (scoreRes.ok) {
				const sData = await scoreRes.json();
				setScoreData(sData);
				if (sData.mfaEnabled) {
					setMfaType("authenticator");
				}
			}
			if (sessionsRes.ok) {
				const sList = await sessionsRes.json();
				setSessions(sList.sessions || []);
			}
			if (historyRes.ok) {
				const hList = await historyRes.json();
				setHistory(hList.history || []);
			}
		} catch (err) {
			console.error("Failed to load security dashboard:", err);
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		fetchSecurityData();
	}, [user]);

	// Toast timer
	useEffect(() => {
		if (toast) {
			const t = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(t);
		}
	}, [toast]);

	// Resend cooldown timer
	useEffect(() => {
		if (resendCooldown > 0) {
			const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
			return () => clearTimeout(t);
		}
	}, [resendCooldown]);

	// Focus code input
	useEffect(() => {
		if (showModal) {
			setTimeout(() => {
				codeInputsRef.current[0]?.focus();
			}, 100);
		}
	}, [showModal]);

	const showFeedback = (type: "success" | "error", text: string) => {
		setToast({ type, text });
	};

	// 1. Password change submission -> requests code
	const handlePwdRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		setPwdErrors({});

		// Client-side validations
		if (!currentPwd) {
			setPwdErrors({ current: "Current password is required." });
			return;
		}
		if (!newPwd) {
			setPwdErrors({ general: "New password is required." });
			return;
		}
		if (!confirmPwd) {
			setPwdErrors({ confirm: "Please confirm your new password." });
			return;
		}
		if (newPwd !== confirmPwd) {
			setPwdErrors({ confirm: "New passwords do not match." });
			return;
		}
		if (!pwdAnalysis.isValid) {
			setPwdErrors({ general: pwdAnalysis.firstError || "Password does not meet complexity requirements." });
			return;
		}

		setPwdSubmitting(true);

		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/security/change-password/request", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					currentPassword: currentPwd,
					newPassword: newPwd,
					confirmPassword: confirmPwd
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				setShowModal(true);
				setResendCooldown(60);
				setModalError(null);
			} else {
				const errorMsg = data.error || data.message || "Request failed.";
				if (errorMsg.toLowerCase().includes("current password")) {
					setPwdErrors({ current: errorMsg });
				} else {
					setPwdErrors({ general: errorMsg });
				}
			}
		} catch (err) {
			setPwdErrors({ general: "Network error. Please try again." });
		} finally {
			setPwdSubmitting(false);
		}
	};

	// 2. Code verification and update password execution
	const handlePwdVerify = async () => {
		if (!user) return;
		const codeStr = verificationCode.join("");
		if (codeStr.length < 6) {
			setModalError("Please enter all 6 digits.");
			return;
		}

		setModalError(null);
		setModalLoading(true);

		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/security/change-password/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					code: codeStr,
					currentPassword: currentPwd,
					newPassword: newPwd,
					confirmPassword: confirmPwd,
					signOutOtherDevices,
					currentSessionId
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				setPwdVerifySuccess(true);
				setModalError(null);
				
				// Force sign out since tokens were revoked on backend
				setTimeout(async () => {
					setShowModal(false);
					setCurrentPwd("");
					setNewPwd("");
					setConfirmPwd("");
					setVerificationCode(Array(6).fill(""));
					showFeedback("success", "Password updated successfully! Signing out of all devices.");
					if (typeof window !== "undefined") {
						localStorage.removeItem("bc_session_id");
					}
					await auth.signOut();
					router.push("/");
				}, 2200);
			} else {
				setModalError(data.error || "Verification failed.");
			}
		} catch (err) {
			setModalError("Network error. Please try again.");
		} finally {
			setModalLoading(false);
		}
	};

	const handleResendCode = async () => {
		if (resendCooldown > 0 || !user) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/security/resend-code", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({ purpose: "change-password" })
			});

			const data = await res.json();
			if (res.ok) {
				setResendCooldown(60);
				setModalError(null);
				showFeedback("success", "A new verification code has been sent.");
			} else {
				setModalError(data.error || "Failed to resend code.");
			}
		} catch (err) {
			setModalError("Network error.");
		}
	};

	// Code input handlers
	const handleCodeChange = (index: number, val: string) => {
		if (isNaN(Number(val))) return;
		const nextCode = [...verificationCode];
		nextCode[index] = val.slice(-1);
		setVerificationCode(nextCode);

		if (val && index < 5) {
			codeInputsRef.current[index + 1]?.focus();
		}
	};

	const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
			codeInputsRef.current[index - 1]?.focus();
		}
	};

	const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").trim();
		if (pasted.length === 6 && !isNaN(Number(pasted))) {
			const digits = pasted.split("");
			setVerificationCode(digits);
			codeInputsRef.current[5]?.focus();
		}
	};

	// Session deletion
	const handleRevokeSession = async (id: string) => {
		if (!user) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/security/session/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${idToken}` }
			});

			if (res.ok) {
				showFeedback("success", "Session revoked successfully.");
				if (id === currentSessionId) {
					if (typeof window !== "undefined") {
						localStorage.removeItem("bc_session_id");
					}
					await auth.signOut();
					router.push("/");
				} else {
					fetchSecurityData();
				}
			} else {
				const data = await res.json();
				showFeedback("error", data.error || "Failed to revoke session.");
			}
		} catch (err) {
			showFeedback("error", "Network error.");
		}
	};

	const handleRevokeAllOther = async () => {
		if (!user) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/security/logout-all", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({ currentSessionId })
			});

			if (res.ok) {
				showFeedback("success", "Logged out other devices successfully.");
				fetchSecurityData();
			} else {
				const data = await res.json();
				showFeedback("error", data.error || "Failed to log out other devices.");
			}
		} catch (err) {
			showFeedback("error", "Network error.");
		}
	};

	// 2FA Setup triggers
	const handleMfaConfigure = () => {
		if (mfaType !== "none") {
			// Mock Disabling MFA
			setMfaType("none");
			setRecoveryCodes([]);
			showFeedback("success", "Two-factor authentication disabled.");
		} else {
			setMfaSecret("JBSWY3DPEHPK3PXP");
			setShowMfaSetup(true);
		}
	};

	const verifyMfaSetup = () => {
		if (mfaSetupCode === "123456" || mfaSetupCode.length === 6) {
			setMfaType("authenticator");
			setShowMfaSetup(false);
			setMfaSetupCode("");
			// Generate mock recovery codes
			const codes = Array.from({ length: 8 }, () =>
				Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase() + "-" +
				Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()
			);
			setRecoveryCodes(codes);
			showFeedback("success", "Authenticator setup complete! Copy your recovery codes.");
		} else {
			showFeedback("error", "Invalid authenticator code. Enter a 6-digit code.");
		}
	};

	// Connected Accounts mock triggers
	const handleSocialConnect = (provider: string) => {
		showFeedback("error", `${provider} integration is configured on the root auth flow. Connect from sign-in screen.`);
	};

	if (loadingData) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-3">
				<FaSpinner className="animate-spin text-brand-orange" size={28} />
				<span className="text-xs text-dark-gray-7">Loading security settings...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Toast alert */}
			{toast && (
				<div
					className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl transition-all duration-300 animate-slide-up ${
						toast.type === "success"
							? "bg-color-success-bg border-color-success-border text-color-success"
							: "bg-color-error-bg border-color-error-border text-color-error"
					}`}
				>
					{toast.type === "success" ? <FaCheckCircle size={16} /> : <FaExclamationCircle size={16} />}
					<span className="text-xs font-semibold text-white">{toast.text}</span>
				</div>
			)}

			{/* Sub Navigation Tabs */}
			<div className="flex gap-2 border-b border-border-subtle pb-px overflow-x-auto">
				{[
					{ id: "overview", label: "Dashboard", icon: <FaShieldAlt size={13} /> },
					{ id: "password", label: "Change Password", icon: <FaKey size={13} /> },
					{ id: "mfa", label: "Two-Factor Auth", icon: <FaLock size={13} /> },
					{ id: "sessions", label: "Active Sessions", icon: <FaLaptop size={13} /> },
					{ id: "history", label: "Login History", icon: <FaHistory size={13} /> },
				].map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id as any)}
						className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
							activeTab === tab.id
								? "border-brand-orange text-brand-orange"
								: "border-transparent text-dark-gray-8 hover:text-white"
						}`}
					>
						{tab.icon}
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{/* 1. OVERVIEW / DASHBOARD TAB */}
			{activeTab === "overview" && scoreData && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Security Score Card */}
					<div
						className="md:col-span-1 rounded-lg p-6 flex flex-col items-center justify-between border"
						style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
					>
						<span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
							Security Score
						</span>
						
						{/* Progress wheel */}
						<div className="relative w-32 h-32 flex items-center justify-center my-6">
							<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="42" stroke="var(--border-subtle)" strokeWidth="6" fill="transparent" />
								<circle
									cx="50"
									cy="50"
									r="42"
									stroke={scoreData.score >= 90 ? "#10b981" : scoreData.score >= 75 ? "#22c55e" : scoreData.score >= 60 ? "#eab308" : "#f97316"}
									strokeWidth="6"
									fill="transparent"
									strokeDasharray="264"
									strokeDashoffset={264 - (264 * scoreData.score) / 100}
									className="transition-all duration-1000 ease-out"
								/>
							</svg>
							<div className="absolute flex flex-col items-center justify-center">
								<span className="text-3xl font-extrabold text-white">{scoreData.score}%</span>
								<span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
									{scoreData.level}
								</span>
							</div>
						</div>

						<p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
							Your security health is calculated by checks on your authentication methods.
						</p>
					</div>

					{/* Checklist breakdown */}
					<div
						className="md:col-span-2 rounded-lg p-6 border flex flex-col justify-between"
						style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
					>
						<div>
							<h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
								Security Verification Checks
							</h3>
							<div className="space-y-3.5">
								{scoreData.breakdown.map((item, idx) => (
									<div key={idx} className="flex items-center justify-between border-b border-border-subtle pb-2.5 last:border-0 last:pb-0">
										<div className="flex items-center gap-3">
											{item.met ? (
												<FaCheckCircle className="text-color-success shrink-0" size={16} />
											) : (
												<FaTimesCircle className="text-color-error shrink-0" size={16} />
											)}
											<span className="text-xs font-semibold text-white">{item.check}</span>
										</div>
										<span className={`text-xs font-bold ${item.met ? "text-color-success" : "text-dark-gray-6"}`}>
											{item.met ? `+${item.value} pts` : "0 pts"}
										</span>
									</div>
								))}
							</div>
						</div>

						{!scoreData.emailVerified && (
							<div className="mt-6 p-4 rounded-xl flex items-center justify-between bg-brand-orange/5 border border-brand-orange/20">
								<div>
									<h4 className="text-xs font-bold text-brand-orange">Verify your email address</h4>
									<p className="text-[10px] mt-0.5 text-dark-gray-8">An unverified email poses an account hijacking risk.</p>
								</div>
								<button
									onClick={async () => {
										showFeedback("success", "Verification email triggered successfully.");
									}}
									className="text-xs bc-btn-brand py-1.5 px-3 rounded-lg font-bold"
								>
									Verify Now
								</button>
							</div>
						)}
					</div>

					{/* Social Connections */}
					<div
						className="md:col-span-3 rounded-lg p-6 border"
						style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
					>
						<h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
							Connected Accounts
						</h3>
						<p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
							Linking alternative providers permits fast passwordless logins and simplifies backup authentication.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{[
								{ id: "google", name: "Google Account", icon: <FaGlobe size={18} />, connected: user?.providerData.some(p => p.providerId === "google.com") },
								{ id: "github", name: "GitHub Workspace", icon: <FaLink size={18} />, connected: user?.providerData.some(p => p.providerId === "github.com") },
								{ id: "microsoft", name: "Microsoft ActiveDirectory", icon: <FaLink size={18} />, connected: false },
								{ id: "discord", name: "Discord Server Guild", icon: <FaLink size={18} />, connected: false },
							].map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-dark-fill-3 hover:border-border-accent transition duration-200"
								>
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-dark-layer-1 flex items-center justify-center text-dark-gray-8">
											{p.icon}
										</div>
										<div>
											<span className="text-xs font-bold text-white block">{p.name}</span>
											<span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
												{p.connected ? "Authorized & Connected" : "Not connected"}
											</span>
										</div>
									</div>

									{p.connected ? (
										<button
											onClick={() => handleSocialConnect(p.name)}
											className="flex items-center gap-1.5 text-[10px] font-bold text-dark-gray-7 hover:text-rose-400 transition"
										>
											<FaUnlink size={10} /> Disconnect
										</button>
									) : (
										<button
											onClick={() => handleSocialConnect(p.name)}
											className="flex items-center gap-1.5 text-[10px] font-bold text-brand-orange hover:opacity-80 transition"
										>
											<FaLink size={10} /> Connect
										</button>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* 2. CHANGE PASSWORD FORM TAB */}
			{activeTab === "password" && (
				<div
					className="rounded-lg p-6 sm:p-8 border"
					style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
				>
					<h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
						Change Account Password
					</h3>
					<p className="text-xs mb-6" style={{ color: "var(--text-secondary)" }}>
						Verify your current password, generate a secure verification email code, and configure your new password.
					</p>

					{pwdErrors.general && (
						<div className="flex items-center gap-2 p-3.5 bg-color-error-bg border border-color-error-border rounded-xl text-color-error text-xs font-bold mb-5">
							<FaExclamationCircle size={14} className="shrink-0" />
							{pwdErrors.general}
						</div>
					)}

					<form onSubmit={handlePwdRequest} className="space-y-5 max-w-xl">
						{/* Current password */}
						<div className="space-y-1.5">
							<label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
								Current Password
							</label>
							<div className="relative">
								<input
									type={showCurrent ? "text" : "password"}
									value={currentPwd}
									onChange={(e) => { setCurrentPwd(e.target.value); setPwdErrors({}); }}
									autoComplete="current-password"
									disabled={pwdSubmitting}
									className={`w-full bc-input-shell rounded-lg py-2.5 px-3.5 pr-11 text-sm outline-none transition duration-200 ${
										pwdErrors.current ? "border-bc-error" : "focus:border-brand-orange"
									}`}
								/>
								<button
									type="button"
									onClick={() => setShowCurrent(!showCurrent)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-6 hover:text-white"
								>
									{showCurrent ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
								</button>
							</div>
							{pwdErrors.current && (
								<p className="text-[11px] font-semibold text-bc-error flex items-center gap-1">
									<FaExclamationCircle size={10} /> {pwdErrors.current}
								</p>
							)}
						</div>

						{/* New password */}
						<div className="space-y-1.5">
							<label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
								New Password
							</label>
							<div className="relative">
								<input
									type={showNew ? "text" : "password"}
									value={newPwd}
									onChange={(e) => { setNewPwd(e.target.value); setPwdErrors({}); }}
									autoComplete="new-password"
									disabled={pwdSubmitting}
									className={`w-full bc-input-shell rounded-lg py-2.5 px-3.5 pr-11 text-sm outline-none focus:border-brand-orange transition duration-200`}
								/>
								<button
									type="button"
									onClick={() => setShowNew(!showNew)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-6 hover:text-white"
								>
									{showNew ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
								</button>
							</div>
						</div>

						{/* Strength indicator details */}
						{newPwd.length > 0 && (
							<div className="rounded-xl p-4 bg-dark-fill-3 border border-border-subtle space-y-4">
								<div className="space-y-1.5">
									<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-dark-gray-8">
										<span>Strength</span>
										<span style={{ color: strengthColor(pwdAnalysis.level) }}>{pwdAnalysis.label}</span>
									</div>
									<div className="flex gap-1 h-1.5">
										{[1, 2, 3, 4, 5].map((seg) => (
											<div
												key={seg}
												className="flex-1 rounded-full transition-all duration-300"
												style={{ background: seg <= pwdAnalysis.score ? strengthColor(pwdAnalysis.level) : "var(--border-subtle)" }}
											/>
										))}
									</div>
								</div>

								{/* Checklist */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border-subtle/50">
									{pwdAnalysis.requirements.map((req) => (
										<div key={req.id} className="flex items-center gap-2 text-xs font-semibold">
											<span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
												req.met ? "bg-color-success-bg border-color-success-border text-color-success" : "border-gray-700 text-transparent"
											}`}>
												{req.met && <FaCheck size={7} />}
											</span>
											<span className={req.met ? "text-white" : "text-dark-gray-8"}>{req.label}</span>
										</div>
									))}
								</div>

								{pwdAnalysis.suggestions.length > 0 && (
									<div className="pt-2 border-t border-border-subtle/50">
										<span className="text-[10px] font-bold uppercase tracking-wider text-dark-gray-8 block mb-1">Suggestions:</span>
										<ul className="space-y-0.5">
											{pwdAnalysis.suggestions.map((s, idx) => (
												<li key={idx} className="text-[11px] text-dark-gray-8">• {s}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}

						{/* Confirm password */}
						<div className="space-y-1.5">
							<label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
								Confirm New Password
							</label>
							<div className="relative">
								<input
									type={showConfirm ? "text" : "password"}
									value={confirmPwd}
									onChange={(e) => { setConfirmPwd(e.target.value); setPwdErrors({}); }}
									autoComplete="new-password"
									disabled={pwdSubmitting}
									className={`w-full bc-input-shell rounded-lg py-2.5 px-3.5 pr-11 text-sm outline-none transition duration-200 ${
										confirmMismatch ? "border-bc-error" : "focus:border-brand-orange"
									}`}
								/>
								<button
									type="button"
									onClick={() => setShowConfirm(!showConfirm)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-6 hover:text-white"
								>
									{showConfirm ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
								</button>
							</div>
							{confirmMismatch && (
								<p className="text-[11px] font-semibold text-bc-error flex items-center gap-1">
									<FaExclamationCircle size={10} /> Passwords do not match.
								</p>
							)}
							{confirmPwd.length > 0 && !confirmMismatch && newPwd.length > 0 && (
								<p className="text-[11px] font-semibold text-color-success flex items-center gap-1">
									<FaCheckCircle size={12} /> Passwords match
								</p>
							)}
						</div>

						{/* Sign out other devices checkbox */}
						<div className="flex items-center gap-3 p-4 bg-dark-fill-3 border border-border-subtle rounded-xl max-w-xl">
							<input
								id="signOutOtherDevices"
								type="checkbox"
								checked={signOutOtherDevices}
								onChange={(e) => setSignOutOtherDevices(e.target.checked)}
								className="w-4 h-4 rounded border-gray-700 text-brand-orange focus:ring-brand-orange bg-dark-layer-1 cursor-pointer"
							/>
							<div className="flex flex-col select-none cursor-pointer" onClick={() => setSignOutOtherDevices(!signOutOtherDevices)}>
								<label htmlFor="signOutOtherDevices" className="text-xs font-bold text-white cursor-pointer">
									Sign out of other devices after changing password
								</label>
								<span className="text-[10px] text-dark-gray-8 mt-0.5">
									Forces all other devices to log in again using your new password.
								</span>
							</div>
						</div>

						<button
							type="submit"
							disabled={pwdSubmitting}
							className="bc-btn-brand py-2.5 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
						>
							{pwdSubmitting ? (
								<>
									<FaSpinner className="animate-spin" size={14} />
									<span>Sending Code...</span>
								</>
							) : (
								<>
									<FaLock size={12} />
									<span>Continue</span>
								</>
							)}
						</button>
					</form>
				</div>
			)}

			{/* 3. TWO-FACTOR AUTHENTICATION TAB */}
			{activeTab === "mfa" && (
				<div
					className="rounded-lg p-6 sm:p-8 border space-y-6"
					style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
				>
					<div>
						<h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
							Two-Factor Authentication (2FA)
						</h3>
						<p className="text-xs" style={{ color: "var(--text-secondary)" }}>
							Protect your BeastCode account with an additional verification layer during sign-in.
						</p>
					</div>

					<div className="space-y-4">
						{/* Method 1: Authenticator App */}
						<div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-dark-fill-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-dark-layer-1 flex items-center justify-center text-brand-orange">
									<FaLock size={18} />
								</div>
								<div>
									<h4 className="text-xs font-bold text-white block">Authenticator Application</h4>
									<p className="text-[10px] mt-0.5 text-dark-gray-8">Use Google Authenticator, Authy, or Duo to retrieve timed OTP codes.</p>
								</div>
							</div>
							<button
								onClick={handleMfaConfigure}
								className={`text-xs font-bold px-4 py-2 rounded-xl transition ${
									mfaType === "authenticator" ? "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20" : "bc-btn-brand"
								}`}
							>
								{mfaType === "authenticator" ? "Disable App" : "Configure App"}
							</button>
						</div>

						{/* Method 2: Email OTP */}
						<div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-dark-fill-3 opacity-60">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-dark-layer-1 flex items-center justify-center text-dark-gray-8">
									<FaLock size={18} />
								</div>
								<div>
									<h4 className="text-xs font-bold text-white block">Email OTP Delivery</h4>
									<p className="text-[10px] mt-0.5 text-dark-gray-8">Sends dynamic 6-digit codes to your verified email account.</p>
								</div>
							</div>
							<span className="text-[10px] font-bold text-dark-gray-7 uppercase tracking-wider">Preview/Coming Soon</span>
						</div>

						{/* Method 3: Passkeys */}
						<div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-dark-fill-3 opacity-60">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-dark-layer-1 flex items-center justify-center text-dark-gray-8">
									<FaLock size={18} />
								</div>
								<div>
									<h4 className="text-xs font-bold text-white block">Biometric Passkeys</h4>
									<p className="text-[10px] mt-0.5 text-dark-gray-8">Use Windows Hello, TouchID, FaceID, or hardware security keys.</p>
								</div>
							</div>
							<span className="text-[10px] font-bold text-dark-gray-7 uppercase tracking-wider">Preview/Coming Soon</span>
						</div>
					</div>

					{/* Authenticator App Mock Dialog */}
					{showMfaSetup && (
						<div className="border border-border-accent rounded-xl p-5 bg-brand-glow/10 space-y-4 animate-slide-up">
							<div className="flex justify-between items-start">
								<h4 className="text-sm font-bold text-white">Configure Authenticator App</h4>
								<button onClick={() => setShowMfaSetup(false)} className="text-dark-gray-8 hover:text-white"><FaTimes /></button>
							</div>
							
							<div className="flex flex-col sm:flex-row gap-5 items-center">
								{/* Mock QR Code */}
								<div className="w-28 h-28 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 border border-gray-200">
									<FaQrcode className="text-black" size={80} />
									<span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Scan Code</span>
								</div>

								<div className="space-y-3 flex-1">
									<p className="text-xs text-dark-gray-8">
										Scan the QR code with your authenticator application or enter the configuration secret key manually:
									</p>
									<div className="flex items-center gap-2 bg-dark-fill-3 px-3 py-2 rounded-lg border border-border-subtle justify-between font-mono text-xs">
										<span className="text-brand-orange font-bold tracking-widest">{mfaSecret}</span>
										<button
											onClick={() => {
												navigator.clipboard.writeText(mfaSecret);
												showFeedback("success", "Secret key copied!");
											}}
											className="text-dark-gray-8 hover:text-white"
										>
											<FaCopy />
										</button>
									</div>

									<div className="flex gap-2 items-center">
										<input
											type="text"
											aria-label="6-digit verification code"
											value={mfaSetupCode}
											onChange={(e) => setMfaSetupCode(e.target.value)}
											maxLength={6}
											autoComplete="one-time-code"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="outline-none py-2 px-3 bg-dark-fill-3 border border-border-subtle rounded-lg text-xs font-mono text-white focus:border-brand-orange w-48"
										/>
										<button onClick={verifyMfaSetup} className="bc-btn-brand py-2 px-4 rounded-lg font-bold text-xs">
											Verify Code
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Recovery Codes List */}
					{recoveryCodes.length > 0 && (
						<div className="border border-color-success-border rounded-xl p-5 bg-color-success-bg/5 space-y-4">
							<div>
								<h4 className="text-sm font-bold text-color-success">Backup Recovery Codes</h4>
								<p className="text-xs text-dark-gray-8 mt-1">
									Save these codes securely. You can use these to recover access if you lose your authenticator device.
								</p>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs font-bold text-white">
								{recoveryCodes.map((code, idx) => (
									<div key={idx} className="bg-dark-fill-3 py-2 px-3 rounded-lg border border-border-subtle text-center">
										{code}
									</div>
								))}
							</div>

							<button
								onClick={() => {
									navigator.clipboard.writeText(recoveryCodes.join("\n"));
									showFeedback("success", "Recovery codes copied!");
								}}
								className="flex items-center gap-2 text-xs font-bold text-brand-orange hover:underline pt-1"
							>
								<FaCopy /> Copy all codes to clipboard
							</button>
						</div>
					)}
				</div>
			)}

			{/* 4. ACTIVE SESSIONS TAB */}
			{activeTab === "sessions" && (
				<div
					className="rounded-lg p-6 sm:p-8 border space-y-6"
					style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
				>
					<div className="flex justify-between items-start gap-4 flex-wrap">
						<div>
							<h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
								Active User Sessions
							</h3>
							<p className="text-xs" style={{ color: "var(--text-secondary)" }}>
								These are the devices currently logged in to your BeastCode account. Revoke unrecognized devices immediately.
							</p>
						</div>
						<button
							onClick={handleRevokeAllOther}
							className="text-xs bg-red-500/10 border border-red-500/35 text-red-400 hover:bg-red-500/20 font-bold py-2 px-4 rounded-xl transition duration-200"
						>
							Logout Other Devices
						</button>
					</div>

					<div className="space-y-4">
						{sessions.map((s) => {
							const isCurrent = s.sessionId === currentSessionId;
							return (
								<div
									key={s.id}
									className={`flex items-center justify-between p-4 rounded-xl border ${
										isCurrent ? "border-brand-orange/40 bg-brand-glow/5" : "border-border-subtle bg-dark-fill-3"
									}`}
								>
									<div className="flex items-start gap-3">
										<div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
											isCurrent ? "bg-brand-orange/10 text-brand-orange" : "bg-dark-layer-1 text-dark-gray-8"
										}`}>
											<FaLaptop size={18} />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold text-white block">
													{s.browser} on {s.os}
												</span>
												{isCurrent && (
													<span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20">
														Current Session
													</span>
												)}
											</div>
											<span className="text-[10px] text-dark-gray-8 block mt-1">
												IP: {s.ip} &bull; Country: {s.country}
											</span>
											<span className="text-[10px] text-dark-gray-8 block mt-0.5">
												Last active: {new Date(s.lastActive).toLocaleString()}
											</span>
										</div>
									</div>

									<button
										onClick={() => handleRevokeSession(s.sessionId)}
										className={`text-[10px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg border transition ${
											isCurrent
												? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
												: "border-border-subtle bg-dark-layer-1 text-dark-gray-7 hover:border-red-500/40 hover:text-red-400"
										}`}
									>
										Revoke
									</button>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* 5. LOGIN HISTORY TAB */}
			{activeTab === "history" && (
				<div
					className="rounded-lg p-6 sm:p-8 border space-y-5"
					style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
				>
					<div>
						<h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
							Login History Audit Log
						</h3>
						<p className="text-xs" style={{ color: "var(--text-secondary)" }}>
							Recent authentication operations recorded on your account credentials.
						</p>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								<tr className="border-b border-border-subtle text-dark-gray-8">
									<th className="py-3 px-2 font-bold uppercase tracking-wider">Status</th>
									<th className="py-3 px-2 font-bold uppercase tracking-wider">Time</th>
									<th className="py-3 px-2 font-bold uppercase tracking-wider">Location</th>
									<th className="py-3 px-2 font-bold uppercase tracking-wider">IP Address</th>
									<th className="py-3 px-2 font-bold uppercase tracking-wider">Device</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border-subtle text-white font-medium">
								{history.map((h) => {
									const isSuccess = h.status === "Successful Login";
									return (
										<tr key={h.id} className="hover:bg-dark-fill-3/50 transition">
											<td className="py-3.5 px-2">
												<span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
													isSuccess ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
												}`}>
													{isSuccess ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
													{isSuccess ? "Success" : "Failed"}
												</span>
											</td>
											<td className="py-3.5 px-2 text-dark-gray-8">
												{new Date(h.timestamp).toLocaleString()}
											</td>
											<td className="py-3.5 px-2">
												<span className="flex items-center gap-1.5">
													<FaGlobe size={11} className="text-dark-gray-6" />
													{h.country}
												</span>
											</td>
											<td className="py-3.5 px-2 font-mono text-dark-gray-8">{h.ip}</td>
											<td className="py-3.5 px-2 truncate max-w-[200px]" title={`${h.browser} on ${h.os}`}>
												{h.browser} on {h.os}
											</td>
										</tr>
									);
								})}
								{history.length === 0 && (
									<tr>
										<td colSpan={5} className="py-8 text-center text-dark-gray-7">
											No login logs found.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* 6. VERIFICATION CODE MODAL (GLASSMORPHIC) */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
					<div
						className="relative w-full max-w-md rounded-lg p-6 sm:p-8 border shadow-2xl animate-scale-up"
						style={{ background: "var(--bg-surface)", border: "1px solid var(--border-accent)" }}
					>
						{/* Close */}
						<button
							onClick={() => setShowModal(false)}
							disabled={modalLoading || pwdVerifySuccess}
							className="absolute top-4 right-4 text-dark-gray-8 hover:text-white disabled:opacity-30"
						>
							<FaTimes size={16} />
						</button>

						<div className="flex flex-col items-center text-center space-y-4 mb-6">
							<div className={`w-12 h-12 rounded-full border flex items-center justify-center transition duration-300 ${
								pwdVerifySuccess
									? "bg-green-500/10 border-green-500/30 text-green-400"
									: codeExpiresIn === 0
										? "bg-red-500/10 border-red-500/30 text-red-400"
										: "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
							}`}>
								{pwdVerifySuccess ? (
									<FaCheckCircle size={22} className="animate-bounce" />
								) : (
									<FaShieldAlt size={22} />
								)}
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">Verify Your Identity</h3>
								<p className="text-xs text-dark-gray-8 mt-1.5 leading-relaxed">
									A 6-digit confirmation code has been emailed to:
									<strong className="block text-white mt-0.5">{user?.email}</strong>
									{codeExpiresIn > 0 && !pwdVerifySuccess && (
										<span className="block text-[11px] text-brand-orange mt-1.5">
											Code expires in: <strong className="font-mono bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20 text-brand-orange ml-1">{formatExpirationTime(codeExpiresIn)}</strong>
										</span>
									)}
								</p>
							</div>
						</div>

						{codeExpiresIn === 0 && !pwdVerifySuccess ? (
							<div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/35 rounded-xl text-red-400 text-xs font-bold mb-5">
								<FaExclamationCircle size={14} className="shrink-0" />
								Verification code has expired. Please request a new one.
							</div>
						) : modalError ? (
							<div className="flex items-center gap-2 p-3 bg-color-error-bg border border-color-error-border rounded-xl text-color-error text-xs font-bold mb-5">
								<FaExclamationCircle size={14} className="shrink-0" />
								{modalError}
							</div>
						) : null}

						{/* Code inputs */}
						<div className="flex justify-between gap-2.5 mb-6" onPaste={handleCodePaste}>
							{verificationCode.map((digit, idx) => (
								<input
									key={idx}
									ref={(el) => { if (el) codeInputsRef.current[idx] = el; }}
									type="text"
									maxLength={1}
									value={digit}
									onChange={(e) => handleCodeChange(idx, e.target.value)}
									onKeyDown={(e) => handleCodeKeyDown(idx, e)}
									autoComplete={idx === 0 ? "one-time-code" : "off"}
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									disabled={modalLoading || codeExpiresIn === 0 || pwdVerifySuccess}
									className="w-12 h-14 bg-dark-fill-3 border border-border-subtle rounded-xl text-center text-xl font-bold font-mono text-white outline-none focus:border-brand-orange transition duration-200 disabled:opacity-40"
								/>
							))}
						</div>

						<div className="space-y-3.5">
							{pwdVerifySuccess ? (
								<div className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-600/20">
									<FaCheckCircle size={14} />
									<span>Password Updated Successfully</span>
								</div>
							) : (
								<button
									onClick={handlePwdVerify}
									disabled={modalLoading || codeExpiresIn === 0 || verificationCode.some(d => !d)}
									className="w-full bc-btn-brand py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
								>
									{modalLoading ? (
										<>
											<FaSpinner className="animate-spin" size={14} />
											<span>Updating Password...</span>
										</>
									) : (
										<>
											<FaLock size={12} />
											<span>Verify Code</span>
										</>
									)}
								</button>
							)}

							<button
								onClick={() => setShowModal(false)}
								disabled={modalLoading || pwdVerifySuccess}
								className="w-full bg-dark-fill-3 border border-border-subtle hover:bg-dark-fill-2 text-dark-gray-6 hover:text-white py-2.5 rounded-xl font-bold text-xs transition duration-200 disabled:opacity-30"
							>
								Cancel
							</button>

							<div className="text-center pt-2">
								{resendCooldown > 0 ? (
									<span className="text-[11px] text-dark-gray-7 block">
										Resend code in <strong className="text-white">{resendCooldown}s</strong>
									</span>
								) : (
									<button
										onClick={handleResendCode}
										disabled={modalLoading || pwdVerifySuccess}
										className="text-[11px] font-bold text-brand-orange hover:underline focus:outline-none disabled:opacity-50"
									>
										Resend verification code
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
