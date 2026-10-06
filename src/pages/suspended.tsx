import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { FaBan, FaSignOutAlt, FaEnvelope } from "react-icons/fa";

export default function SuspendedPage() {
	const [user, loading] = useAuthState(auth);
	const router = useRouter();
	const [checking, setChecking] = useState(true);
	const [banDetails, setBanDetails] = useState<{
		reason: string;
		duration: string;
		referenceId: string;
	} | null>(null);

	useEffect(() => {
		if (loading) return;

		if (!user) {
			router.replace("/");
			return;
		}

		const verifyStatus = async () => {
			try {
				const idToken = await user.getIdToken(true);
				const res = await fetch("/api/auth/check-status", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${idToken}`
					}
				});

				if (res.ok) {
					// The user is not banned (or ban expired), send back to home page
					router.replace("/");
				} else if (res.status === 403) {
					const data = await res.json();
					if (data.error && data.error.code === "BANNED") {
						setBanDetails({
							reason: data.error.reason || "Violation of community guidelines",
							duration: data.error.duration || "Permanent",
							referenceId: data.error.referenceId || user.uid.substring(0, 8).toUpperCase()
						});
					} else {
						// Other authorization issues, log out
						await signOut(auth);
						router.replace("/");
					}
					setChecking(false);
				} else {
					// Server error or other, default to generic ban details for safety
					setBanDetails({
						reason: "Violation of community guidelines",
						duration: "Permanent",
						referenceId: user.uid.substring(0, 8).toUpperCase()
					});
					setChecking(false);
				}
			} catch (err) {
				console.error("Error verifying suspension status:", err);
				setChecking(false);
			}
		};

		verifyStatus();
	}, [user, loading, router]);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			router.replace("/");
		} catch (err) {
			console.error("Logout error:", err);
		}
	};

	if (loading || checking) {
		return (
			<div className="min-h-screen bg-bg-base flex flex-col items-center justify-center text-text-primary">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-3"></div>
				<p className="text-text-muted text-xs font-mono">Verifying account credentials...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-bg-base flex items-center justify-center p-4 text-text-primary font-sans">
			<div className="w-full max-w-lg bg-bg-surface rounded-lg border border-border-subtle shadow-sm p-8 relative">
				{/* Header */}
				<div className="flex flex-col items-center text-center">
					<div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded-md mb-3">
						<FaBan size={28} />
					</div>
					<h1 className="text-xl font-bold text-text-primary tracking-tight">Access Suspended</h1>
					<p className="text-xs text-text-muted mt-1 max-w-md">
						Your account has been flagged and suspended for violating our platform policy.
					</p>
				</div>

				{/* Suspension Details */}
				<div className="mt-6 bg-bg-dark-fill-3 border border-border-subtle rounded-md p-4 space-y-3 font-mono text-xs">
					<div className="flex justify-between items-center py-1 border-b border-border-subtle">
						<span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Status</span>
						<span className="text-red-400 font-bold px-2 py-0.5 bg-red-950/30 rounded border border-red-900/40 text-[10px]">SUSPENDED</span>
					</div>
					<div className="flex justify-between items-start py-1 border-b border-border-subtle">
						<span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Reason</span>
						<span className="text-text-secondary text-right max-w-[240px] break-words font-sans text-xs">{banDetails?.reason}</span>
					</div>
					<div className="flex justify-between items-center py-1 border-b border-border-subtle">
						<span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Duration</span>
						<span className="text-amber-400 font-bold text-xs">{banDetails?.duration}</span>
					</div>
					<div className="flex justify-between items-center py-1">
						<span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Reference ID</span>
						<span className="text-text-primary font-bold tracking-widest text-xs">{banDetails?.referenceId}</span>
					</div>
				</div>

				{/* Footer Info */}
				<div className="mt-5 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-1.5">
					<div className="flex items-center gap-2 text-emerald-450 hover:underline cursor-pointer">
						<FaEnvelope size={11} />
						<a href="mailto:support@beastcode.codes?subject=Suspension Appeal">
							Contact Support / Appeal Decision
						</a>
					</div>
					<p className="text-[10px] text-text-muted">
						Please quote your Reference ID in any correspondence.
					</p>
				</div>

				{/* Actions */}
				<div className="mt-6 flex justify-center border-t border-border-subtle pt-5">
					<button
						onClick={handleLogout}
						className="flex items-center gap-2 px-5 py-2 bg-bg-dark-fill-3 hover:bg-bg-hover border border-border-subtle text-text-secondary hover:text-text-primary rounded-md transition duration-150 text-xs font-semibold"
					>
						<FaSignOutAlt size={13} />
						Logout & Switch Account
					</button>
				</div>
			</div>
		</div>
	);
}
