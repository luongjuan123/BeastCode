import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo/Logo";
import { FaEye, FaEyeSlash, FaSpinner, FaLock, FaCheck, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

// ─────────────────────────────────────────────────────────
// PASSWORD REQUIREMENTS INTERFACE & CHECKER
// ─────────────────────────────────────────────────────────
interface Requirement {
	id: string;
	label: string;
	check: (pwd: string) => boolean;
}

const requirements: Requirement[] = [
	{ id: "length", label: "10+ characters", check: (pwd) => pwd.length >= 10 },
	{ id: "uppercase", label: "uppercase letter", check: (pwd) => /[A-Z]/.test(pwd) },
	{ id: "lowercase", label: "lowercase letter", check: (pwd) => /[a-z]/.test(pwd) },
	{ id: "number", label: "number", check: (pwd) => /[0-9]/.test(pwd) },
	{ id: "symbol", label: "special character", check: (pwd) => /[^A-Za-z0-9]/.test(pwd) },
];

const COMMON_PASSWORDS = [
	"password", "123456789", "1234567890", "password123", 
	"beastcode123", "qwertyuiop", "admin12345", "welcome123",
	"letmein123", "admin123", "welcome", "beastcode"
];

// ─────────────────────────────────────────────────────────
// SKELETON LOADER STATE
// ─────────────────────────────────────────────────────────
export const LoadingState: React.FC = () => (
	<div className="w-full space-y-6 animate-pulse" aria-hidden="true">
		<div className="h-6 w-3/4 bg-gray-800 rounded-md mx-auto" />
		<div className="h-4 w-1/2 bg-gray-800 rounded-md mx-auto" />
		<div className="space-y-4 pt-4">
			<div>
				<div className="h-3 w-1/4 bg-gray-800 rounded-md mb-2" />
				<div className="h-10 bg-gray-800 rounded-lg w-full" />
			</div>
			<div>
				<div className="h-3 w-1/4 bg-gray-800 rounded-md mb-2" />
				<div className="h-10 bg-gray-800 rounded-lg w-full" />
			</div>
		</div>
		<div className="h-10 bg-gray-800 rounded-lg w-full" />
	</div>
);

// ─────────────────────────────────────────────────────────
// CUSTOM ERROR STATE
// ─────────────────────────────────────────────────────────
interface ErrorStateProps {
	message: string;
	onRequestNewLink: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRequestNewLink }) => {
	let title = "Reset Link Expired";
	if (message.toLowerCase().includes("invalid")) {
		title = "Invalid Reset Link";
	} else if (message.toLowerCase().includes("already used") || message.toLowerCase().includes("used")) {
		title = "Reset Link Already Used";
	} else if (message.toLowerCase().includes("expired")) {
		title = "Reset Link Expired";
	}

	return (
		<div className="w-full text-center space-y-6 py-4">
			<div className="flex justify-center">
				<div className="p-3 bg-red-950/30 border border-red-900/30 rounded-full text-red-400">
					<FaExclamationTriangle size={32} />
				</div>
			</div>
			<div>
				<h2 className="text-xl font-bold text-dark-gray-8 tracking-tight">{title}</h2>
				<p className="text-sm text-dark-gray-6 mt-2 leading-relaxed px-4">{message}</p>
			</div>
			<div className="space-y-3 pt-2">
				<button
					onClick={onRequestNewLink}
					className="w-full bc-btn-brand font-semibold py-2.5 px-4 rounded-lg text-xs transition duration-200"
				>
					Send New Reset Email
				</button>
				<Link
					href="/auth?type=login"
					className="w-full flex items-center justify-center gap-2 bc-btn-ghost font-medium py-2.5 px-4 rounded-lg text-xs transition duration-200 text-dark-gray-7 hover:text-dark-gray-8"
				>
					<FaArrowLeft size={10} />
					<span>Back to Login</span>
				</Link>
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────────────────
// SUCCESS ANIMATION (GREEN CHECKMARK)
// ─────────────────────────────────────────────────────────
export const SuccessAnimation: React.FC = () => (
	<div className="w-full text-center space-y-6 py-6 flex flex-col items-center">
		<div className="success-checkmark-wrapper">
			<svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
				<circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
				<path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
			</svg>
		</div>
		<div>
			<h2 className="text-xl font-bold text-dark-gray-8 tracking-tight">Password Updated Successfully</h2>
			<p className="text-sm text-dark-gray-6 mt-2">
				Your password has been changed successfully. Redirecting to login...
			</p>
		</div>
		<div className="pt-2 w-full">
			<Link
				href="/auth?type=login"
				className="w-full flex items-center justify-center gap-2 bc-btn-brand font-semibold py-2.5 px-4 rounded-lg text-xs transition duration-200"
			>
				Go to Login
			</Link>
		</div>
		<style jsx global>{`
			.success-checkmark-wrapper {
				width: 72px;
				height: 72px;
				position: relative;
			}
			.success-checkmark {
				width: 72px;
				height: 72px;
				border-radius: 50%;
				display: block;
				stroke-width: 4;
				stroke: #10b981;
				stroke-miterlimit: 10;
				box-shadow: inset 0px 0px 0px #10b981;
				animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
			}
			.success-checkmark-circle {
				stroke-width: 4;
				stroke-miterlimit: 10;
				stroke: #10b981;
				fill: none;
				stroke-dasharray: 166;
				stroke-dashoffset: 166;
				animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
			}
			.success-checkmark-check {
				transform-origin: 50% 50%;
				stroke-dasharray: 48;
				stroke-dashoffset: 48;
				animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
			}
			@keyframes stroke {
				100% {
					stroke-dashoffset: 0;
				}
			}
			@keyframes fill {
				100% {
					box-shadow: inset 0px 0px 0px 40px rgba(16, 185, 129, 0.08);
				}
			}
			@keyframes scale {
				0%, 100% {
					transform: none;
				}
				50% {
					transform: scale3d(1.1, 1.1, 1);
				}
			}
		`}</style>
	</div>
);

// ─────────────────────────────────────────────────────────
// REQUIREMENTS CHECKLIST
// ─────────────────────────────────────────────────────────
interface PasswordRequirementsProps {
	password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => (
	<div className="bg-dark-layer-2/50 border border-gray-850 rounded-lg p-3.5 space-y-2 mt-4">
		<span className="text-[10px] font-bold uppercase tracking-wider text-dark-gray-7 block mb-1">
			Password Strength Requirements
		</span>
		<ul className="grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-1.5" role="list">
			{requirements.map((req) => {
				const isMet = req.check(password);
				return (
					<li
						key={req.id}
						className={`flex items-center gap-2 text-xs font-medium transition-colors duration-200 ${
							isMet ? "text-color-success" : "text-dark-gray-6"
						}`}
						aria-label={`${req.label}: ${isMet ? "Satisfied" : "Unsatisfied"}`}
					>
						<span
							className={`flex-shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
								isMet 
									? "bg-color-success-bg border-color-success-border text-color-success" 
									: "border-gray-800 text-transparent"
							}`}
						>
							<FaCheck size={7} />
						</span>
						<span>{req.label}</span>
					</li>
				);
			})}
		</ul>
	</div>
);

// ─────────────────────────────────────────────────────────
// PASSWORD STRENGTH METER
// ─────────────────────────────────────────────────────────
interface PasswordStrengthMeterProps {
	score: number;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ score }) => {
	const segments = [1, 2, 3, 4, 5];
	const getSegmentColor = (idx: number) => {
		if (idx > score) return "bg-gray-800";
		if (score <= 1) return "bg-bc-error"; // Weak
		if (score <= 2) return "bg-amber-600"; // Fair
		if (score <= 3) return "bg-amber-500"; // Good
		if (score <= 4) return "bg-emerald-500"; // Strong
		return "bg-color-success"; // Excellent
	};

	const getStrengthText = () => {
		if (score === 0) return "Not Entered";
		if (score <= 1) return "Weak";
		if (score <= 2) return "Fair";
		if (score <= 3) return "Good";
		if (score <= 4) return "Strong";
		return "Excellent";
	};

	return (
		<div className="space-y-1.5 mt-4">
			<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-dark-gray-7">
				<span>Strength Meter</span>
				<span className={`transition-all duration-300 ${
					score === 0 ? "text-dark-gray-7" :
					score <= 1 ? "text-bc-error" :
					score <= 2 ? "text-amber-500" :
					score <= 3 ? "text-amber-400" :
					score <= 4 ? "text-emerald-450" : "text-color-success"
				}`}>{getStrengthText()}</span>
			</div>
			<div className="flex gap-1.5 h-1" aria-hidden="true">
				{segments.map((seg) => (
					<div
						key={seg}
						className={`flex-1 rounded-sm transition-all duration-300 ${getSegmentColor(seg)}`}
					/>
				))}
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────────────────
// RESET PASSWORD CARD CONTAINER
// ─────────────────────────────────────────────────────────
interface ResetPasswordCardProps {
	children: React.ReactNode;
}

export const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({ children }) => (
	<div className="w-full max-w-[440px] bg-bg-surface border border-border-subtle rounded-lg p-6 sm:p-8 relative shadow-sm">
		{children}
	</div>
);

// ─────────────────────────────────────────────────────────
// CORE PAGE COMPONENT
// ─────────────────────────────────────────────────────────
export default function ResetPasswordPage() {
	const router = useRouter();
	const [step, setStep] = useState<"loading" | "form" | "error" | "success">("loading");
	const [tokenStr, setTokenStr] = useState<string>("");
	const [emailVerified, setEmailVerified] = useState<string>("");
	
	// Form inputs
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	
	// Errors and loading states
	const [errorMessage, setErrorMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Verify recovery token on mount
	useEffect(() => {
		if (!router.isReady) return;

		// Note: The URL parameter is now '?token=...'
		const token = router.query.token as string;
		if (!token) {
			setErrorMessage("This link is no longer valid. Request another password reset.");
			setStep("error");
			return;
		}

		setTokenStr(token);

		// Hit backend GET route to verify token status
		fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(router.query.email as string || "")}`)
			.then(async (res) => {
				const data = await res.json();
				if (res.ok && data.success) {
					setEmailVerified(data.email || "your account");
					setStep("form");
				} else {
					setErrorMessage(data.message || "This link is no longer valid. Request another password reset.");
					setStep("error");
				}
			})
			.catch((err) => {
				console.error("[Token Verify Fetch Error]:", err);
				setErrorMessage("This link is no longer valid. Request another password reset.");
				setStep("error");
			});
	}, [router.isReady, router.query]);

	// Handle Submit password change
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		// Client-side validations
		if (password.length < 10) {
			setErrorMessage("Password must be at least 10 characters long.");
			return;
		}
		
		const strengthScore = requirements.filter(req => req.check(password)).length;
		if (strengthScore < 5) {
			setErrorMessage("Please satisfy all password complexity requirements.");
			return;
		}

		if (COMMON_PASSWORDS.includes(password.toLowerCase().trim())) {
			setErrorMessage("This password is too common. Please choose a more secure password.");
			return;
		}

		if (password !== confirmPassword) {
			setErrorMessage("Passwords do not match.");
			return;
		}

		setErrorMessage("");
		setSubmitting(true);

		// Perform API POST submission to save new password
		fetch("/api/auth/reset-password", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				token: tokenStr,
				newPassword: password,
				confirmPassword
			})
		})
			.then(async (res) => {
				const data = await res.json();
				setSubmitting(false);
				if (res.ok && data.success) {
					setStep("success");
					setTimeout(() => {
						router.push("/auth?type=login");
					}, 3000);
				} else {
					setErrorMessage(data.message || "Something went wrong. Please try again later.");
				}
			})
			.catch((err) => {
				console.error("[Reset Submission Fetch Error]:", err);
				setSubmitting(false);
				setErrorMessage("Network error. Please try again later.");
			});
	};

	const strengthScore = requirements.filter(req => req.check(password)).length;

	return (
		<main className="min-h-screen bg-bg-base flex flex-col items-center justify-between p-4 font-sans">
			{/* Header Logo Branding */}
			<header className="w-full max-w-5xl flex items-center justify-between pt-6 pb-2">
				<Link href="/" aria-label="Home page">
					<Logo size={36} />
				</Link>
			</header>

			{/* Main Content Card Container */}
			<section className="flex-1 flex items-center justify-center w-full py-8">
				<ResetPasswordCard>
					{step === "loading" && <LoadingState />}

					{step === "error" && (
						<ErrorState
							message={errorMessage}
							onRequestNewLink={() => router.push("/auth?type=forgotPassword")}
						/>
					)}

					{step === "success" && <SuccessAnimation />}

					{step === "form" && (
						<form className="space-y-4" onSubmit={handleSubmit} noValidate>
							<div>
								<h1 className="text-xl font-bold text-dark-gray-8 tracking-tight">
									Reset Password
								</h1>
								<p className="text-xs text-dark-gray-6 mt-1 font-medium">
									Choose a secure password for <span className="text-dark-gray-8 font-semibold">{emailVerified}</span>
								</p>
							</div>

							{errorMessage && (
								<div 
									className="p-3 bg-bc-error/10 border border-bc-error/20 rounded-lg text-bc-error text-xs font-semibold leading-relaxed"
									role="alert"
								>
									{errorMessage}
								</div>
							)}

							{/* New Password input */}
							<div className="space-y-1.5">
								<label 
									htmlFor="new-password" 
									className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block"
								>
									New Password
								</label>
								<div className="relative">
									<input
										id="new-password"
										type={showPassword ? "text" : "password"}
										name="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										autoComplete="new-password"
										disabled={submitting}
										required
										className="w-full bc-input-shell rounded-md py-2.5 px-3.5 pr-10 text-xs placeholder:text-bc-muted transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
										aria-required="true"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										disabled={submitting}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-7 hover:text-dark-gray-8 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
										aria-label={showPassword ? "Hide password" : "Show password"}
									>
										{showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
									</button>
								</div>
							</div>

							{/* Confirm Password input */}
							<div className="space-y-1.5">
								<label 
									htmlFor="confirm-password" 
									className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block"
								>
									Confirm Password
								</label>
								<div className="relative">
									<input
										id="confirm-password"
										type={showConfirmPassword ? "text" : "password"}
										name="confirmPassword"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										autoComplete="new-password"
										disabled={submitting}
										required
										className="w-full bc-input-shell rounded-md py-2.5 px-3.5 pr-10 text-xs placeholder:text-bc-muted transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
										aria-required="true"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										disabled={submitting}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-7 hover:text-dark-gray-8 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
										aria-label={showConfirmPassword ? "Hide password" : "Show password"}
									>
										{showConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
									</button>
								</div>
							</div>

							{/* Password requirements and strength */}
							<PasswordStrengthMeter score={strengthScore} />
							<PasswordRequirements password={password} />

							{/* Submit Button */}
							<button
								type="submit"
								disabled={submitting}
								className="w-full mt-4 bg-accent hover:bg-accent-hover text-[#080909] disabled:opacity-50 font-semibold py-2.5 px-4 rounded-md text-xs transition-all duration-150 flex items-center justify-center gap-2 outline-none shadow-sm"
							>
								{submitting ? (
									<>
										<FaSpinner className="animate-spin" size={12} />
										<span>Saving password...</span>
									</>
								) : (
									<>
										<FaLock size={11} />
										<span>Update Password</span>
									</>
								)}
							</button>
						</form>
					)}
				</ResetPasswordCard>
			</section>

			{/* Footer Links */}
			<footer className="w-full max-w-5xl py-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-dark-gray-7 border-t border-gray-850 mt-8 gap-4">
				<span>&copy; {new Date().getFullYear()} BeastCode. All rights reserved.</span>
				<div className="flex gap-4">
					<Link href="/" className="hover:text-dark-gray-8 transition-colors duration-200">
						Platform
					</Link>
					<Link href="/settings" className="hover:text-dark-gray-8 transition-colors duration-200">
						Settings
					</Link>
					<Link href="mailto:support@beastcode.codes" className="hover:text-dark-gray-8 transition-colors duration-200">
						Support
					</Link>
				</div>
			</footer>
		</main>
	);
}
