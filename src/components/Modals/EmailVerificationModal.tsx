import React, { useState, useEffect } from "react";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { sendEmailVerification, signOut, updateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { FaEnvelopeOpenText, FaSync, FaSignOutAlt, FaPaperPlane, FaPen, FaArrowLeft, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { translateFirebaseError } from "@/utils/authErrors";
import { sanitizeAutofilledEmail } from "@/utils/sanitizeEmail";

interface EmailVerificationModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onClose }) => {
	const [user] = useAuthState(auth);
	const [resending, setResending] = useState(false);
	const [checking, setChecking] = useState(false);
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [updatingEmail, setUpdatingEmail] = useState(false);
	
	// Cooldown and local message boxes
	const [cooldown, setCooldown] = useState(0);
	const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

	useEffect(() => {
		if (user?.email) {
			setNewEmail(user.email);
		}
	}, [user?.email]);

	useEffect(() => {
		if (cooldown === 0) return;
		const interval = setInterval(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [cooldown]);

	if (!isOpen || !user) return null;

	const handleResend = async () => {
		if (cooldown > 0 || resending) return;
		setResending(true);
		setFeedback(null);
		try {
			const token = await user.getIdToken(true);
			const res = await fetch("/api/auth/send-verification", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) {
				throw new Error(data.message || "Failed to deliver verification email via server.");
			}
			setFeedback({
				type: "success",
				text: "Verification link successfully dispatched to your email address!",
			});
			setCooldown(60);
		} catch (error: any) {
			console.error("Error sending verification email:", error);
			setFeedback({ type: "error", text: error.message || "Failed to deliver verification email. Please try again." });
		} finally {
			setResending(false);
		}
	};

	const handleCheckStatus = async () => {
		setChecking(true);
		setFeedback(null);
		try {
			await user.reload();
			if (auth.currentUser?.emailVerified) {
				setFeedback({
					type: "success",
					text: "Email address verified! Re-initializing your workspace session...",
				});
				setTimeout(() => {
					onClose();
				}, 1500);
			} else {
				setFeedback({
					type: "error",
					text: "Email is not verified yet. Please click the link we sent to your address, then try again.",
				});
			}
		} catch (error: any) {
			console.error("Error reloading user:", error);
			setFeedback({
				type: "error",
				text: "Failed to verify email status. Please try again.",
			});
		} finally {
			setChecking(false);
		}
	};

	const handleUpdateEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		const sanitizedEmail = sanitizeAutofilledEmail(newEmail.trim());
		if (!sanitizedEmail || sanitizedEmail === user.email) {
			setIsEditingEmail(false);
			return;
		}

		setUpdatingEmail(true);
		setFeedback(null);
		try {
			await updateEmail(user, sanitizedEmail);

			const userRef = doc(firestore, "users", user.uid);
			await updateDoc(userRef, {
				email: sanitizedEmail,
				updatedAt: Date.now(),
			});

			const token = await user.getIdToken(true);
			const res = await fetch("/api/auth/send-verification", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) {
				throw new Error(data.message || "Failed to dispatch verification email to new address.");
			}

			setFeedback({
				type: "success",
				text: "Email updated successfully. Verification link has been dispatched to your new address.",
			});
			setCooldown(60);
			setIsEditingEmail(false);
		} catch (error: any) {
			console.error("Error updating email:", error);
			if (error.code === "auth/requires-recent-login") {
				setFeedback({
					type: "error",
					text: "Re-authentication required. Please log out, sign in again, and update your email.",
				});
			} else {
				const msg = translateFirebaseError(error.code);
				setFeedback({ type: "error", text: msg });
			}
		} finally {
			setUpdatingEmail(false);
		}
	};

	const handleLogout = async () => {
		try {
			await signOut(auth);
		} catch (error: any) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
			<div className="bc-modal-shell rounded-lg w-full max-w-md p-8 shadow-2xl relative animate-fade-in my-auto text-center">
				{isEditingEmail ? (
					<form onSubmit={handleUpdateEmail} className="space-y-4 mb-6 text-left">
						<div className="text-center mb-4">
							<h2 className="text-lg font-bold text-dark-gray-8">Update Email address</h2>
							<p className="text-xs text-dark-gray-7 mt-1">
								Enter your new email address. We will dispatch a verification link to it.
							</p>
						</div>
						<div>
							<label className="text-[10px] font-bold text-dark-gray-7 uppercase tracking-wider block mb-1.5">New Email Address</label>
							<input
								type="email"
								value={newEmail}
								onChange={(e) => setNewEmail(sanitizeAutofilledEmail(e.target.value))}
								required
								autoComplete="email"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								disabled={updatingEmail}
								className="w-full bc-input-shell rounded-xl py-3 px-4 text-xs placeholder:text-bc-muted transition"
								placeholder="Enter new email"
							/>
						</div>
						<div className="flex gap-3 pt-2">
							<button
								type="submit"
								disabled={updatingEmail}
								className="flex-1 bc-btn-brand py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
							>
								{updatingEmail ? (
									<FaSpinner className="animate-spin" size={14} />
								) : (
									<span>Save & Resend</span>
								)}
							</button>
							<button
								type="button"
								onClick={() => {
									setIsEditingEmail(false);
									setNewEmail(user.email || "");
									setFeedback(null);
								}}
								disabled={updatingEmail}
								className="flex-1 bc-btn-ghost py-2.5 rounded-lg text-xs font-bold transition"
							>
								Cancel
							</button>
						</div>
					</form>
				) : (
					<div className="flex flex-col items-center mb-6">
						<div className="bg-brand-orange/10 p-4 rounded-full text-brand-orange mb-4 border border-brand-orange/20 relative animate-pulse">
							<FaEnvelopeOpenText size={32} />
						</div>
						<h2 className="text-xl font-bold text-dark-gray-8">Verify Your Identity</h2>
						<p className="text-xs text-dark-gray-7 mt-2 px-4 leading-relaxed">
							We have dispatched a verification email to <span className="text-brand-orange font-semibold font-mono">{user.email}</span>.
							Please click the link inside it to proceed.
						</p>
						<p className="text-[11px] text-amber-500 font-semibold mt-3 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-lg animate-pulse max-w-[320px] flex items-center justify-center gap-1.5">
							<FaExclamationTriangle size={12} className="shrink-0" />
							<span>Check your Spam / Junk folder if you don&apos;t see the email within 1-2 minutes!</span>
						</p>
						<button
							onClick={() => {
								setIsEditingEmail(true);
								setFeedback(null);
							}}
							className="mt-3.5 text-xs text-brand-orange hover:opacity-80 font-semibold transition flex items-center gap-1.5 focus:outline-none"
						>
							<FaPen size={10} />
							<span>Change email address</span>
						</button>
					</div>
				)}

				{feedback && (
					<div className={`mb-5 p-3 rounded-lg text-xs font-medium leading-relaxed border ${
						feedback.type === "success" 
							? "bg-bc-success/10 border-bc-success/20 text-bc-success" 
							: feedback.type === "error" 
								? "bg-bc-error/10 border-bc-error/20 text-bc-error" 
								: "bg-brand-orange/10 border-brand-orange/20 text-brand-orange"
					}`}>
						{feedback.text}
					</div>
				)}

				<div className="space-y-3">
					<button
						onClick={handleCheckStatus}
						disabled={checking || isEditingEmail}
						className="w-full bc-btn-brand py-2.5 rounded-lg text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
					>
						{checking ? (
							<FaSpinner className="animate-spin" size={14} />
						) : (
							<FaSync size={12} className={checking ? "animate-spin" : ""} />
						)}
						<span>I have verified my email</span>
					</button>

					<button
						onClick={handleResend}
						disabled={resending || cooldown > 0 || isEditingEmail}
						className="w-full bc-btn-ghost py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
					>
						{resending ? (
							<FaSpinner className="animate-spin" size={14} />
						) : cooldown > 0 ? (
							<span>Resend in {cooldown}s</span>
						) : (
							<>
								<FaPaperPlane size={11} />
								<span>Resend Verification Email</span>
							</>
						)}
					</button>

					<div className="pt-4 border-t border-gray-850 mt-4">
						<button
							onClick={handleLogout}
							className="text-xs text-bc-muted hover:text-bc-error font-semibold transition flex items-center justify-center gap-1.5 mx-auto focus:outline-none"
						>
							<FaSignOutAlt size={12} />
							<span>Log Out</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EmailVerificationModal;
