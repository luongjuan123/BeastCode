import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { RecoilRoot } from "recoil";
import React, { useEffect, useState, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import ErrorBoundary from "@/components/ErrorBoundary/ErrorBoundary";
import { RealtimeNotificationProvider } from "@/context/RealtimeNotificationProvider";
import { isUserOnboarded } from "@/utils/onboarding";

import { apiClient } from "@/utils/apiClient";

const ProfileSetupModal = dynamic(() => import("@/components/Modals/ProfileSetupModal"), { ssr: false });
const AuthModal = dynamic(() => import("@/components/Modals/AuthModal"), { ssr: false });

const isProduction = process.env.NODE_ENV === "production";

if (typeof window !== "undefined" && isProduction) {
	console.log = () => {};
	console.info = () => {};
	console.debug = () => {};
	console.warn = () => {};
	console.error = (...args) => {
		(window as any).__developer_errors = (window as any).__developer_errors || [];
		(window as any).__developer_errors.push({ type: "console_error", args, timestamp: Date.now() });
	};
	window.addEventListener("error", (e) => e.preventDefault());
	window.addEventListener("unhandledrejection", (e) => e.preventDefault());
}

// Setup global fetch interceptor to guarantee JSON outputs and wrap with apiClient logic
if (typeof window !== "undefined" && !(window as any).__fetchIntercepted) {
	(window as any).__fetchIntercepted = true;
	const originalFetch = window.fetch;
	(window as any).__originalFetch = originalFetch;

	window.fetch = async function (input, init) {
		const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

		// We only intercept requests to organization module APIs
		const isOrgApi = url.startsWith("/api/organizations") ||
			url.startsWith("/api/orgs") ||
			url.startsWith("/api/users/invitations") ||
			url.startsWith("/api/invite-links");

		const isApiClient = init?.headers && (
			(init.headers instanceof Headers && init.headers.has("x-api-client")) ||
			(typeof init.headers === "object" && (init.headers as any)["x-api-client"])
		);

		if (isOrgApi && !isApiClient) {
			console.log(`[Fetch Interceptor] Routing organization request via apiClient: ${url}`);
			try {
				const data = await apiClient.request(url, {
					...init,
				});

				// Return a valid JSON Response
				return new Response(JSON.stringify(data), {
					status: 200,
					statusText: "OK",
					headers: {
						"Content-Type": "application/json"
					}
				});
			} catch (err: any) {
				console.error(`[Fetch Interceptor Error] Failed request for ${url}:`, err);
				
				const status = err.status || 500;
				const errorPayload = {
					success: false,
					error: err.message || "Internal Server Error",
					code: err.code || "API_ERROR",
					details: err.details
				};

				return new Response(JSON.stringify(errorPayload), {
					status: status,
					statusText: err.message || "Error",
					headers: {
						"Content-Type": "application/json"
					}
				});
			}
		}

		return originalFetch(input, init);
	};
}

function GlobalAuthAndProfileCheck() {
	const [user, loading] = useAuthState(auth);
	const router = useRouter();
	const [showProfileModal, setShowProfileModal] = useState(false);
	const isProvisioningRef = useRef(false);

	// Routes exempt from all auth guards
	const isVerifyPage = router.pathname === "/auth/verify-email" || router.pathname === "/verify-email";
	const isExemptPage =
		router.pathname === "/auth" ||
		router.pathname === "/suspended" ||
		router.pathname === "/account-appeal" ||
		isVerifyPage ||
		router.pathname === "/unsubscribe" ||
		router.pathname === "/reset-password" ||
		router.pathname === "/error";

	// ── Session & Email Verification Guard ────────────────────────────────────
	useEffect(() => {
		if (loading) return;

		// If authenticated but email is unverified, restrict from protected pages
		if (user && !user.emailVerified && !isExemptPage) {
			router.replace("/auth/verify-email");
			return;
		}

		// When signed out or on exempt pages, ensure setup modal is closed
		if (!user || isExemptPage) {
			setShowProfileModal(false);
		}
	}, [user, loading, isExemptPage, router]);

	// ── Authoritative Profile, Moderation & Onboarding Coordinator ───────────
	useEffect(() => {
		if (loading || !user || !user.emailVerified || isExemptPage) {
			return;
		}

		// 1. Set up real-time listener for user moderation status
		const modRef = doc(firestore, "userModeration", user.uid);
		let unsubMod = () => {};
		try {
			unsubMod = onSnapshot(modRef, async (modSnap) => {
				if (!modSnap.exists()) return;
				const modData = modSnap.data();

				if (modData.status === "BANNED") {
					// Check if temporary ban has expired
					if (modData.expiresAt && Date.now() > modData.expiresAt) {
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
								window.location.reload();
								return;
							}
						} catch (e) {
							console.error("Failed to recheck status:", e);
						}
					}
					if (router.pathname !== "/suspended") {
						router.push("/suspended");
					}
					return;
				}

				if (modData.status === "PENDING_DELETION" || modData.status === "APPEALED") {
					if (router.pathname !== "/account-appeal") {
						router.push("/account-appeal");
					}
					return;
				}
			}, (err) => {
				console.error("Moderation listener error:", err);
			});
		} catch (e) {
			console.error("Error setting up moderation listener:", e);
		}

		// 2. Set up real-time listener for user profile/onboarding completeness
		const userRef = doc(firestore, "users", user.uid);
		let unsubUser = () => {};
		try {
			unsubUser = onSnapshot(userRef, async (userSnap) => {
				if (!userSnap.exists()) {
					// User document missing in Firestore.
					// Trigger idempotent provisioning in the background.
					// DO NOT open the setup modal here: the modal must only appear after
					// provisioning has succeeded and confirmed onboarding is required.
					if (!isProvisioningRef.current) {
						isProvisioningRef.current = true;
						try {
							const token = await user.getIdToken(true);
							await fetch("/api/auth/provision", {
								method: "POST",
								headers: { Authorization: `Bearer ${token}` },
							});
						} catch (e) {
							console.error("Failed to call provision endpoint:", e);
						} finally {
							isProvisioningRef.current = false;
						}
					}
					return;
				}

				const data = userSnap.data();

				// Direct account status checks
				if (data.status === "PENDING_DELETION" || data.status === "APPEALED") {
					if (router.pathname !== "/account-appeal") {
						router.push("/account-appeal");
					}
					return;
				}

				// Canonical onboarding evaluation:
				// Correctly differentiates completed accounts, genuinely new accounts,
				// and established legacy accounts without academic profile fields.
				const isComplete = isUserOnboarded(data);

				// For established legacy accounts that lack the new flag, backfill
				// in the background so future reads are instantaneous.
				if (isComplete && data.isOnboarded === undefined) {
					try {
						setDoc(userRef, { isOnboarded: true }, { merge: true }).catch(() => {});
					} catch {
						// Non-fatal background backfill
					}
				}

				setShowProfileModal(!isComplete);
			}, (err) => {
				console.error("User listener error:", err);
			});
		} catch (e) {
			console.error("Error setting up user listener:", e);
		}

		return () => {
			unsubMod();
			unsubUser();
		};
	}, [user, loading, isExemptPage, router]);

	// ── Periodic Security Session Sync ────────────────────────────────────────
	useEffect(() => {
		if (loading || !user || !user.emailVerified || isExemptPage) return;

		let isCancelled = false;

		const syncSession = async () => {
			try {
				let sessionId = localStorage.getItem("bc_session_id");
				if (!sessionId) {
					sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
					localStorage.setItem("bc_session_id", sessionId);
				}

				const idToken = await user.getIdToken();
				const res = await fetch("/api/security/sessions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${idToken}`
					},
					body: JSON.stringify({ sessionId })
				});

				if (isCancelled) return;

				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					if (res.status === 401) {
						// Attempt token refresh before treating session as truly invalid
						try {
							const refreshedToken = await user.getIdToken(true);
							const retryRes = await fetch("/api/security/sessions", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									"Authorization": `Bearer ${refreshedToken}`
								},
								body: JSON.stringify({ sessionId })
							});
							if (retryRes.ok || isCancelled) return;
						} catch (refreshErr) {
							console.warn("Token refresh failed during session sync:", refreshErr);
						}

						// Token is definitively expired or invalid
						localStorage.removeItem("bc_session_id");
						await auth.signOut();
					} else if (res.status === 403) {
						if (data?.error?.code === "BANNED") {
							if (router.pathname !== "/suspended") {
								router.push("/suspended");
							}
						} else if (data?.error?.code === "PENDING_DELETION") {
							if (router.pathname !== "/account-appeal") {
								router.push("/account-appeal");
							}
						}
					}
				}
			} catch (err) {
				console.error("Session sync failed:", err);
			}
		};

		syncSession();
		const interval = setInterval(syncSession, 2 * 60 * 1000);
		return () => {
			isCancelled = true;
			clearInterval(interval);
		};
	}, [user, loading, isExemptPage, router]);

	return (
		<>
			{showProfileModal && (
				<ProfileSetupModal
					isOpen={showProfileModal}
					onClose={() => setShowProfileModal(false)}
				/>
			)}
		</>
	);
}

export default function App({ Component, pageProps }: AppProps) {
	useEffect(() => {
		if (typeof window !== "undefined") {
			document.documentElement.setAttribute("data-theme", "default");
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "default");
		}
	}, []);

	return (
		<RecoilRoot>
			<Head>
				<title>BeastCode</title>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon-default.svg' />
				<meta name='description' content='BeastCode — Online Judge platform with coding problems, contests, and video solutions.' />
				<meta property='og:type' content='website' />
				<meta property='og:title' content='BeastCode' />
				<meta property='og:description' content='BeastCode — Online Judge platform with coding problems, contests, and video solutions.' />
				<meta property='og:site_name' content='BeastCode' />
				<meta name='twitter:card' content='summary' />
				<meta name='twitter:title' content='BeastCode' />
				<meta name='twitter:description' content='BeastCode — Online Judge platform with coding problems, contests, and video solutions.' />
			</Head>
			<GlobalAuthAndProfileCheck />
			<AuthModal />
			<ErrorBoundary>
				<RealtimeNotificationProvider>
					<Component {...pageProps} />
				</RealtimeNotificationProvider>
			</ErrorBoundary>
		</RecoilRoot>
	);
}
