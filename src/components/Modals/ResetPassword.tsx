import { authModalState } from "@/atoms/authModalAtom";
import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { FaSpinner, FaArrowLeft } from "react-icons/fa";

type ResetPasswordProps = {};

const ResetPassword: React.FC<ResetPasswordProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const [email, setEmail] = useState("");
	const [successMsg, setSuccessMsg] = useState("");
	const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
	const [shake, setShake] = useState(false);
	const [sending, setSending] = useState(false);

	const validateForm = (): boolean => {
		if (!email) {
			setErrors({ email: "Email is required." });
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}
		if (!/\S+@\S+\.\S+/.test(email)) {
			setErrors({ email: "Please enter a valid email address." });
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}
		return true;
	};

	const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!validateForm() || sending) return;

		setSuccessMsg("");
		setErrors({});
		setSending(true);

		try {
			const res = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email })
			});

			const data = await res.json();
			if (res.ok && data.success) {
				setSuccessMsg("If an account exists, a password reset email has been sent.");
			} else {
				setErrors({ general: data.message || "Unable to send reset email. Please try again later." });
			}
		} catch (err: any) {
			console.error("Forgot password client error:", err);
			setErrors({ general: "Unable to send reset email. Please try again later." });
		} finally {
			setSending(false);
		}
	};

	return (
		<form className={`space-y-5 px-4 pb-4 transition-all duration-200 ${sending ? "opacity-50 pointer-events-none" : ""}`} onSubmit={handleReset}>
			<div>
				<h3 className="text-xl font-bold text-dark-gray-8 tracking-tight">Reset Password</h3>
				<p className="text-xs text-dark-gray-7 mt-1">
					Enter your email address below, and we will send a password reset link to your inbox.
				</p>
			</div>

			<div className={shake ? "animate-shake" : ""}>
				<label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block mb-1.5">
					Your email
				</label>
				<input
					type="email"
					name="email"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						setErrors({});
						setSuccessMsg("");
					}}
					id="email"
					autoComplete="username"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					disabled={sending}
					className={`w-full bc-input-shell rounded-lg py-2.5 px-3.5 text-xs placeholder:text-bc-muted transition-all duration-200 ${
						errors.email ? "border-bc-error focus:border-bc-error" : ""
					}`}
					placeholder="name@company.com"
				/>
				{errors.email && <p className="text-bc-error text-[10px] mt-1.5 font-medium">{errors.email}</p>}
			</div>

			{errors.general && (
				<div className="p-3 bg-bc-error/10 border border-bc-error/20 rounded-lg text-bc-error text-xs font-medium leading-relaxed">
					{errors.general}
				</div>
			)}

			{successMsg && (
				<div className="p-3 bg-bc-success/10 border border-bc-success/20 rounded-lg text-bc-success text-xs font-medium leading-relaxed">
					{successMsg}
				</div>
			)}

			<button
				type="submit"
				disabled={sending}
				className="w-full bc-btn-brand disabled:opacity-50 font-semibold py-2.5 px-4 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
			>
				{sending ? (
					<>
						<FaSpinner className="animate-spin" size={14} />
						<span>Sending Link...</span>
					</>
				) : (
					<span>Reset Password</span>
				)}
			</button>

			<div className="text-center pt-1">
				<button
					type="button"
					disabled={sending}
					onClick={() => setAuthModalState((prev) => ({ ...prev, type: "login" }))}
					className="text-xs text-bc-muted hover:text-dark-gray-8 flex items-center justify-center gap-1.5 mx-auto transition duration-150 focus:outline-none"
				>
					<FaArrowLeft size={10} />
					<span>Back to Sign In</span>
				</button>
			</div>
		</form>
	);
};

export default ResetPassword;
