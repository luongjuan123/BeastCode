import React, { useState, useId } from "react";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
	FaEye, FaEyeSlash, FaLock, FaCheck, FaSpinner,
	FaExclamationCircle, FaShieldAlt, FaLightbulb,
} from "react-icons/fa";
import { analysePassword, strengthColor, PasswordStrengthLevel } from "@/utils/passwordPolicy";
import type { PasswordRequirement } from "@/utils/passwordPolicy";

// ─── Sub-components ───────────────────────────────────────────────────────────
interface PasswordInputProps {
	id: string;
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: string | null;
	hint?: string;
	autoComplete?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
	id, label, value, onChange, placeholder = "••••••••••",
	disabled, error, hint, autoComplete = "current-password",
}) => {
	const [show, setShow] = useState(false);
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-secondary)" }}>
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					type={show ? "text" : "password"}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					autoComplete={autoComplete}
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					placeholder={placeholder}
					className={`w-full bc-input-shell rounded-lg py-2.5 px-3.5 pr-11 text-sm transition-all duration-200 outline-none ${
						error ? "border-bc-error focus:border-bc-error" : "focus:border-brand-orange"
					}`}
					aria-invalid={!!error}
					aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
				/>
				<button
					type="button"
					onClick={() => setShow((s) => !s)}
					disabled={disabled}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-6 hover:text-dark-gray-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded transition-colors duration-150"
					aria-label={show ? "Hide password" : "Show password"}
				>
					{show ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
				</button>
			</div>
			{error && (
				<p id={`${id}-error`} className="text-[11px] font-semibold flex items-center gap-1.5 text-bc-error" role="alert">
					<FaExclamationCircle size={10} />
					{error}
				</p>
			)}
			{!error && hint && (
				<p id={`${id}-hint`} className="text-[11px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
			)}
		</div>
	);
};

// Strength Bar
const StrengthBar: React.FC<{ level: PasswordStrengthLevel; label: string; score: number }> = ({ level, label, score }) => {
	const color = strengthColor(level);
	const segments = [1, 2, 3, 4, 5];

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
				<span>Strength</span>
				<span style={{ color: color || "var(--text-muted)", transition: "color 0.3s" }}>{label}</span>
			</div>
			<div className="flex gap-1 h-1.5" aria-hidden="true">
				{segments.map((seg) => (
					<div
						key={seg}
						className="flex-1 rounded-full transition-all duration-300"
						style={{ background: seg <= score ? color : "var(--border-subtle)" }}
					/>
				))}
			</div>
		</div>
	);
};

// Requirements checklist
const RequirementsChecklist: React.FC<{ requirements: PasswordRequirement[] }> = ({ requirements }) => (
	<ul className="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-1.5">
		{requirements.map((req) => (
			<li
				key={req.id}
				className={`flex items-center gap-2 text-xs font-medium transition-colors duration-200 ${
					req.met ? "text-color-success" : ""
				}`}
				style={!req.met ? { color: "var(--text-muted)" } : undefined}
			>
				<span
					className={`flex-shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
						req.met ? "bg-color-success-bg border-color-success-border" : "border-gray-700"
					}`}
				>
					{req.met && <FaCheck size={7} className="text-color-success" />}
				</span>
				{req.label}
			</li>
		))}
	</ul>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChangePasswordForm() {
	const [user] = useAuthState(auth);
	const uid = useId(); // for aria IDs only

	const [current,  setCurrent]  = useState("");
	const [newPwd,   setNewPwd]   = useState("");
	const [confirm,  setConfirm]  = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [success,  setSuccess]  = useState(false);
	const [errors,   setErrors]   = useState<{ current?: string; new?: string; confirm?: string; general?: string }>({});

	const analysis = analysePassword(newPwd, {
		email:       user?.email ?? "",
		displayName: user?.displayName ?? "",
	});

	const confirmMismatch = confirm.length > 0 && newPwd !== confirm;
	const canSubmit = analysis.isValid && !confirmMismatch && current.length > 0 && !submitting;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit || !user) return;

		const nextErrors: typeof errors = {};

		if (!current) {
			nextErrors.current = "Current password is required.";
		}
		if (!analysis.isValid) {
			nextErrors.new = analysis.firstError ?? "Password does not meet requirements.";
		}
		if (newPwd !== confirm) {
			nextErrors.confirm = "Passwords do not match.";
		}

		if (Object.keys(nextErrors).length) {
			setErrors(nextErrors);
			return;
		}

		setErrors({});
		setSubmitting(true);

		try {
			const res = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					uid:             user.uid,
					currentPassword: current,
					newPassword:     newPwd,
					confirmPassword: confirm,
				}),
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setSuccess(true);
				setCurrent("");
				setNewPwd("");
				setConfirm("");
				// Auto-dismiss success after 6s
				setTimeout(() => setSuccess(false), 6000);
			} else {
				// Map specific messages to correct field errors
				const msg: string = data.message || data.error?.message || "Something went wrong. Please try again.";
				if (msg.toLowerCase().includes("current password")) {
					setErrors({ current: msg });
				} else if (msg.toLowerCase().includes("do not match") || msg.toLowerCase().includes("confirm")) {
					setErrors({ confirm: msg });
				} else if (msg.toLowerCase().includes("recently used")) {
					setErrors({ new: msg });
				} else if (msg.toLowerCase().includes("password")) {
					setErrors({ new: msg });
				} else {
					setErrors({ general: msg });
				}
			}
		} catch {
			setErrors({ general: "Network error. Please try again later." });
		} finally {
			setSubmitting(false);
		}
	};

	if (!user) return null;

	return (
		<div
			className="rounded-lg p-6 sm:p-8"
			style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
		>
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<div
					className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0"
					style={{ background: "var(--brand-glow)", border: "1px solid var(--border-accent)" }}
				>
					<FaShieldAlt size={16} className="text-brand-orange" />
				</div>
				<div>
					<h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
						Change Password
					</h2>
					<p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
						Keep your account secure with a strong password.
					</p>
				</div>
			</div>

			{/* Success banner */}
			{success && (
				<div
					className="flex items-start gap-3 p-4 rounded-xl mb-5 border"
					style={{ background: "var(--color-success-bg)", borderColor: "var(--color-success-border)" }}
					role="status"
				>
					<FaCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-success-text)" }} />
					<div>
						<p className="text-sm font-semibold" style={{ color: "var(--color-success-text)" }}>
							Password changed successfully!
						</p>
						<p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
							All other sessions have been signed out. A confirmation email has been sent.
						</p>
					</div>
				</div>
			)}

			{/* General error */}
			{errors.general && (
				<div
					className="flex items-center gap-2 p-3 rounded-xl mb-5 border text-sm font-semibold"
					style={{ background: "var(--color-error-bg)", borderColor: "var(--color-error-border)", color: "var(--color-error-text)" }}
					role="alert"
				>
					<FaExclamationCircle size={13} className="flex-shrink-0" />
					{errors.general}
				</div>
			)}

			<form onSubmit={handleSubmit} noValidate className="space-y-5">
				{/* Current Password */}
				<PasswordInput
					id="current-password"
					label="Current Password"
					value={current}
					onChange={(v) => { setCurrent(v); setErrors((e) => ({ ...e, current: undefined, general: undefined })); }}
					disabled={submitting}
					error={errors.current}
					hint="Enter your existing password to confirm your identity."
					autoComplete="current-password"
				/>

				{/* Divider */}
				<div className="relative flex items-center gap-3 py-1">
					<div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
					<span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--text-muted)" }}>
						new password
					</span>
					<div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
				</div>

				{/* New Password */}
				<PasswordInput
					id="new-password"
					label="New Password"
					value={newPwd}
					onChange={(v) => { setNewPwd(v); setErrors((e) => ({ ...e, new: undefined })); }}
					disabled={submitting}
					error={errors.new}
					autoComplete="new-password"
					placeholder="Create a strong password"
				/>

				{/* Live strength + checklist (shown when typing) */}
				{newPwd.length > 0 && (
					<div
						className="rounded-xl p-4 space-y-4"
						style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
					>
						<StrengthBar level={analysis.level} label={analysis.label} score={analysis.score} />

						<div className="pt-1">
							<p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Requirements</p>
							<RequirementsChecklist requirements={analysis.requirements} />
						</div>

						{analysis.suggestions.length > 0 && (
							<div className="pt-1">
								<p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
									<FaLightbulb size={9} /> Suggestions
								</p>
								<ul className="space-y-1">
									{analysis.suggestions.map((s, i) => (
										<li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>• {s}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				{/* Confirm Password */}
				<PasswordInput
					id="confirm-new-password"
					label="Confirm New Password"
					value={confirm}
					onChange={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
					disabled={submitting}
					error={confirmMismatch ? "Passwords do not match." : errors.confirm}
					autoComplete="new-password"
					placeholder="Re-enter your new password"
				/>

				{/* Match indicator */}
				{confirm.length > 0 && !confirmMismatch && newPwd.length > 0 && (
					<p className="text-[11px] font-semibold flex items-center gap-1.5 text-color-success -mt-2">
						<FaCheck size={10} /> Passwords match
					</p>
				)}

				{/* Submit */}
				<div className="pt-2">
					<button
						type="submit"
						disabled={!canSubmit}
						className="w-full bc-btn-brand disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
					>
						{submitting ? (
							<>
								<FaSpinner className="animate-spin" size={14} />
								<span>Updating password...</span>
							</>
						) : (
							<>
								<FaLock size={12} />
								<span>Update Password</span>
							</>
						)}
					</button>

					{!canSubmit && !submitting && current.length > 0 && !analysis.isValid && (
						<p className="text-center text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
							Satisfy all requirements above to continue.
						</p>
					)}
				</div>
			</form>
		</div>
	);
}
