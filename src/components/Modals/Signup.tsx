import { authModalState } from "@/atoms/authModalAtom";
import { auth } from "@/firebase/firebase";
import { useEffect, useState, useRef } from "react";
import { useSetRecoilState } from "recoil";
import { useSignInWithGoogle, useSignInWithGithub } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import { sendEmailVerification, updateProfile, createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword } from "firebase/auth";
import { translateFirebaseError } from "@/utils/authErrors";
import { sanitizeAutofilledEmail } from "@/utils/sanitizeEmail";
import { getSafeRedirectUrl } from "@/utils/sanitizeUrl";

type SignupProps = {};

const Signup: React.FC<SignupProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const [inputs, setInputs] = useState({
		email: "",
		displayName: "",
		password: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; displayName?: string; password?: string; general?: string }>({});
	const [shakeFields, setShakeFields] = useState<{ email?: boolean; displayName?: boolean; password?: boolean }>({});

	const router = useRouter();
	const oauthHandledRef = useRef(false);
	const [manualLoading, setManualLoading] = useState(false);
	const [signInWithGoogle, googleUser, googleLoading, googleError] = useSignInWithGoogle(auth);
	const [signInWithGithub, githubUser, githubLoading, githubError] = useSignInWithGithub(auth);

	const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		let val = e.target.value;
		if (e.target.name === "email") {
			val = sanitizeAutofilledEmail(val);
		}
		setInputs((prev) => ({ ...prev, [e.target.name]: val }));
		setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined }));
	};

	const validateForm = (): boolean => {
		const nextErrors: typeof errors = {};
		const nextShake: typeof shakeFields = {};
		let isValid = true;

		if (!inputs.email) {
			nextErrors.email = "Email is required.";
			nextShake.email = true;
			isValid = false;
		} else if (!/\S+@\S+\.\S+/.test(inputs.email)) {
			nextErrors.email = "Please enter a valid email address.";
			nextShake.email = true;
			isValid = false;
		}

		if (!inputs.displayName.trim()) {
			nextErrors.displayName = "Display name is required.";
			nextShake.displayName = true;
			isValid = false;
		}

		if (!inputs.password) {
			nextErrors.password = "Password is required.";
			nextShake.password = true;
			isValid = false;
		} else if (inputs.password.length < 6) {
			nextErrors.password = "Password must be at least 6 characters.";
			nextShake.password = true;
			isValid = false;
		}

		setErrors(nextErrors);
		setShakeFields(nextShake);

		if (!isValid) {
			setTimeout(() => {
				setShakeFields({});
			}, 500);
		}

		return isValid;
	};

	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!validateForm() || manualLoading || googleLoading || githubLoading) return;

		setManualLoading(true);
		setErrors({});

		try {
			let newUser;
			try {
				newUser = await fbCreateUserWithEmailAndPassword(auth, inputs.email, inputs.password);
			} catch (err: any) {
				if (err.code === "auth/email-already-in-use") {
					// Check and clean up if old account was unverified and unprovisioned
					try {
						const cleanupRes = await fetch("/api/auth/cleanup-unverified", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ email: inputs.email }),
						});
						const cleanupData = await cleanupRes.json().catch(() => ({}));
						if (cleanupData.success && cleanupData.cleaned) {
							// Retry creation
							newUser = await fbCreateUserWithEmailAndPassword(auth, inputs.email, inputs.password);
						} else {
							throw err;
						}
					} catch (cleanupErr) {
						// Throw original err if cleanup failed
						throw err;
					}
				} else {
					throw err;
				}
			}

			if (!newUser) return;

			// Update display name in Firebase Auth immediately
			try {
				await updateProfile(newUser.user, { displayName: inputs.displayName.trim() });
			} catch (profileErr) {
				console.error("Error updating profile display name:", profileErr);
			}

			// Send verification email via backend API (with template styling & SMTP check)
			try {
				const token = await newUser.user.getIdToken(true);
				const res = await fetch("/api/auth/send-verification", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body.message || "Failed to deliver verification email.");
				}
			} catch (emailErr: any) {
				// Rollback: delete the Firebase Auth user since email verification delivery failed
				try {
					await newUser.user.delete();
				} catch (deleteErr) {
					console.error("Rollback failed: could not delete auth user", deleteErr);
				}
				throw emailErr;
			}

			setAuthModalState((prev) => ({ ...prev, isOpen: false }));
			router.push("/auth/verify-email");
		} catch (err: any) {
			const msg = err.code ? translateFirebaseError(err.code) : (err.message || "An unexpected error occurred.");
			setErrors((prev) => ({ ...prev, general: msg }));
		} finally {
			setManualLoading(false);
		}
	};

	useEffect(() => {
		// Handle OAuth sign-in completion (Google / GitHub)
		const currUser = googleUser?.user || githubUser?.user;
		if (!currUser || oauthHandledRef.current) return;
		oauthHandledRef.current = true;

		// For OAuth providers the email is always pre-verified — call provision directly.
		const provisionOAuthUser = async () => {
			try {
				const token = await currUser.getIdToken(true);
				await fetch("/api/auth/provision", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				});
			} catch (provErr) {
				console.error("OAuth provision error:", provErr);
			}
			setAuthModalState((prev) => ({ ...prev, isOpen: false }));
			const destination = getSafeRedirectUrl(router.query.prev);
			if (destination !== "/" && router.pathname !== destination) {
				router.push(destination);
			}
		};

		provisionOAuthUser();
	}, [googleUser, githubUser, router, setAuthModalState]);

	useEffect(() => {
		const firebaseErr = googleError || githubError;
		if (firebaseErr) {
			const code = (firebaseErr as any).code || "auth/unknown";
			const msg = translateFirebaseError(code);
			setErrors((prev) => ({ ...prev, general: msg }));
		}
	}, [googleError, githubError]);

	const isActionLoading = manualLoading || googleLoading || githubLoading;

	return (
		<form className={`space-y-4 px-4 pb-4 transition-all duration-200 ${isActionLoading ? "opacity-50 pointer-events-none" : ""}`} onSubmit={handleRegister}>
			<div>
				<h3 className="text-xl font-bold text-dark-gray-8 tracking-tight">Register to BeastCode</h3>
				<p className="text-xs text-dark-gray-7 mt-1">Create your unified developer credentials.</p>
			</div>

			{/* Social Providers */}
			<div className="grid grid-cols-2 gap-3">
				<button
					type="button"
					onClick={() => signInWithGoogle()}
					disabled={isActionLoading}
					className="flex items-center justify-center gap-2 bc-btn-ghost font-medium py-2.5 px-4 rounded-lg text-xs transition duration-200 disabled:opacity-50"
				>
					<FaGoogle className="text-bc-error" size={14} />
					<span>Google</span>
				</button>
				<button
					type="button"
					onClick={() => signInWithGithub()}
					disabled={isActionLoading}
					className="flex items-center justify-center gap-2 bc-btn-ghost font-medium py-2.5 px-4 rounded-lg text-xs transition duration-200 disabled:opacity-50"
				>
					<FaGithub size={14} />
					<span>GitHub</span>
				</button>
			</div>

			{/* Divider */}
			<div className="flex items-center gap-3 py-1">
				<div className="flex-1 h-px bg-gray-850" />
				<span className="text-[10px] font-semibold text-dark-gray-7 uppercase tracking-wider">or continue with email</span>
				<div className="flex-1 h-px bg-gray-850" />
			</div>

			{/* Email Input */}
			<div className={shakeFields.email ? "animate-shake" : ""}>
				<label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block mb-1.5">
					Email
				</label>
				<input
					onChange={handleChangeInput}
					value={inputs.email}
					type="email"
					name="email"
					id="email"
					autoComplete="username"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					disabled={isActionLoading}
					className={`w-full bc-input-shell rounded-lg py-2 px-3.5 text-xs placeholder:text-bc-muted transition-all duration-200 ${
						errors.email ? "border-bc-error focus:border-bc-error" : ""
					}`}
				/>
				{errors.email && <p className="text-bc-error text-[10px] mt-1.5 font-medium">{errors.email}</p>}
			</div>

			{/* Display Name Input */}
			<div className={shakeFields.displayName ? "animate-shake" : ""}>
				<label htmlFor="displayName" className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block mb-1.5">
					Display Name
				</label>
				<input
					onChange={handleChangeInput}
					value={inputs.displayName}
					type="text"
					name="displayName"
					id="displayName"
					autoComplete="name"
					autoCorrect="off"
					spellCheck={false}
					disabled={isActionLoading}
					className={`w-full bc-input-shell rounded-lg py-2 px-3.5 text-xs placeholder:text-bc-muted transition-all duration-200 ${
						errors.displayName ? "border-bc-error focus:border-bc-error" : ""
					}`}
				/>
				{errors.displayName && <p className="text-bc-error text-[10px] mt-1.5 font-medium">{errors.displayName}</p>}
			</div>

			{/* Password Input */}
			<div className={shakeFields.password ? "animate-shake" : ""}>
				<label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-dark-gray-7 block mb-1.5">
					Password
				</label>
				<div className="relative">
					<input
						onChange={handleChangeInput}
						value={inputs.password}
						type={showPassword ? "text" : "password"}
						name="password"
						id="password"
						autoComplete="new-password"
						disabled={isActionLoading}
						className={`w-full bc-input-shell rounded-lg py-2 px-3.5 pr-10 text-xs placeholder:text-bc-muted transition-all duration-200 ${
							errors.password ? "border-bc-error focus:border-bc-error" : ""
						}`}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						disabled={isActionLoading}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-gray-7 hover:text-dark-gray-8 focus:outline-none"
					>
						{showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
					</button>
				</div>
				{errors.password && <p className="text-bc-error text-[10px] mt-1.5 font-medium">{errors.password}</p>}
			</div>

			{errors.general && (
				<div className="p-3 bg-bc-error/10 border border-bc-error/20 rounded-lg text-bc-error text-xs font-medium leading-relaxed">
					{errors.general}
				</div>
			)}

			<button
				type="submit"
				disabled={isActionLoading}
				className="w-full mt-2 bc-btn-brand disabled:opacity-50 font-semibold py-2.5 px-4 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
			>
				{isActionLoading ? (
					<>
						<FaSpinner className="animate-spin" size={14} />
						<span>Provisioning Node...</span>
					</>
				) : (
					<span>Register Workspace</span>
				)}
			</button>

			<div className="text-xs text-dark-gray-7 text-center pt-1">
				Already have an account?{" "}
				<button
					type="button"
					disabled={isActionLoading}
					className="text-brand-orange hover:opacity-80 hover:underline font-semibold focus:outline-none"
					onClick={() => setAuthModalState((prev) => ({ ...prev, type: "login" }))}
				>
					Log In
				</button>
			</div>
		</form>
	);
};

export default Signup;
