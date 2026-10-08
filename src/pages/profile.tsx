import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, query, where, onSnapshot, limit } from "firebase/firestore";

import Link from "next/link";
import {
	FaGraduationCap,
	FaIdCard,
	FaSchool,
	FaBookOpen,
	FaUser,
	FaCheckCircle,
	FaSave,
	FaCamera,
	FaInfoCircle,
	FaCopy,
	FaCommentDots,
} from "react-icons/fa";
import ThreadsBoard from "@/components/Threads/Threads";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { calculateExperience } from "@/utils/experienceConfig";
import { getCountryName } from "@/utils/countryData";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { Badge } from "@/components/UI/Badge";
import { LoadingState } from "@/components/UI/LoadingState";

interface UserProfile {
	displayName: string;
	username: string;
	experienceLevel: string;
	studentId: string;
	school: string;
	class: string;
	faculty: string;
	bio: string;
	solvedProblems: string[];
	avatarUrl?: string;
	email?: string;
	showStudentInfo?: boolean;
	usernameLastChangedAt?: number;
	easyCount?: number;
	mediumCount?: number;
	hardCount?: number;
	mlCount?: number;
	contestParticipation?: number;
	contestWins?: number;
	xp?: number;
	country?: string;
	createdAt?: number;
}

const ProfilePage: React.FC = () => {
	const [user, loadingAuth] = useAuthState(auth);
	const router = useRouter();
	const { uid } = router.query;
	const isReadOnly = !!uid && uid !== user?.uid;
	const avatarInputRef = useRef<HTMLInputElement>(null);

	const [copyToast, setCopyToast] = useState<string | null>(null);
	const triggerCopyToast = (msg: string) => {
		setCopyToast(msg);
		setTimeout(() => {
			setCopyToast((prev) => prev === msg ? null : prev);
		}, 3000);
	};

	const [loadingProfile, setLoadingProfile] = useState(true);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [saving, setSaving] = useState(false);
	const [originalUsername, setOriginalUsername] = useState("");
	const [profile, setProfile] = useState<UserProfile>({
		displayName: "",
		username: "",
		experienceLevel: "",
		studentId: "",
		school: "BeastCode University",
		class: "",
		faculty: "",
		bio: "",
		solvedProblems: [],
		avatarUrl: "",
		email: "",
		showStudentInfo: true,
		usernameLastChangedAt: 0,
	});

	// Stats counts
	const [stats, setStats] = useState({
		easy: { solved: 0, total: 0 },
		medium: { solved: 0, total: 0 },
		hard: { solved: 0, total: 0 },
		total: { solved: 0, total: 0 },
	});

	// Follow System States
	const [followerCount, setFollowerCount] = useState(0);
	const [followingCount, setFollowingCount] = useState(0);
	const [isFollowing, setIsFollowing] = useState(false);

	// Trust & Safety Report States
	const [showReportModal, setShowReportModal] = useState(false);
	const [reportReason, setReportReason] = useState("");
	const [reportDesc, setReportDesc] = useState("");
	const [reportFiles, setReportFiles] = useState<{ name: string; base64: string }[]>([]);
	const [reportFeedback, setReportFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [submittingReport, setSubmittingReport] = useState(false);
	const [acceptReportTerms, setAcceptReportTerms] = useState(false);

	const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		if (reportFiles.length + files.length > 3) {
			setReportFeedback({ type: "error", text: "You can upload a maximum of 3 evidence files." });
			return;
		}

		Array.from(files).forEach((file) => {
			if (file.size > 5 * 1024 * 1024) {
				setReportFeedback({ type: "error", text: `${file.name} is too large. Max size is 5MB per file.` });
				return;
			}

			const reader = new FileReader();
			reader.onload = (ev) => {
				const base64 = ev.target?.result as string;
				setReportFiles((prev) => [...prev, { name: file.name, base64 }]);
			};
			reader.readAsDataURL(file);
		});
	};

	const handleReportSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submittingReport) return;
		if (!reportReason) {
			setReportFeedback({ type: "error", text: "Please select a reason." });
			return;
		}
		if (reportDesc.length < 30) {
			setReportFeedback({ type: "error", text: "Description must be at least 30 characters." });
			return;
		}
		if (!acceptReportTerms) {
			setReportFeedback({ type: "error", text: "You must accept the terms to submit a report." });
			return;
		}

		setSubmittingReport(true);
		setReportFeedback(null);

		try {
			const idToken = await auth.currentUser?.getIdToken(true);
			const res = await fetch("/api/moderation/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${idToken}`
				},
				body: JSON.stringify({
					targetUid: uid,
					reason: reportReason,
					description: reportDesc,
					files: reportFiles,
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error?.message || data.message || "Failed to submit report.");
			}

			setReportFeedback({ type: "success", text: "Report submitted successfully." });
			setTimeout(() => {
				setShowReportModal(false);
				setReportReason("");
				setReportDesc("");
				setReportFiles([]);
				setReportFeedback(null);
				setAcceptReportTerms(false);
			}, 3000);
		} catch (err: any) {
			setReportFeedback({ type: "error", text: err.message });
		} finally {
			setSubmittingReport(false);
		}
	};

	useEffect(() => {
		if (!loadingAuth && !user && !isReadOnly) {
			router.push("/");
		}
	}, [user, loadingAuth, router, isReadOnly]);

	useEffect(() => {
		const loadProfileAndStats = async () => {
			const targetUid = isReadOnly ? uid : user?.uid;
			if (!targetUid) return;
			setLoadingProfile(true);
			try {
				const userRef = doc(firestore, "users", targetUid as string);
				const userSnap = await getDoc(userRef);

				let fetchedProfile: UserProfile = {
					displayName: "",
					username: "",
					experienceLevel: "",
					studentId: "",
					school: "BeastCode University",
					class: "",
					faculty: "",
					bio: "",
					solvedProblems: [],
					avatarUrl: "",
					email: "",
					showStudentInfo: true,
					usernameLastChangedAt: 0,
					easyCount: 0,
					mediumCount: 0,
					hardCount: 0,
					mlCount: 0,
					contestParticipation: 0,
					contestWins: 0,
					xp: 0,
				};

				if (userSnap.exists()) {
					const data = userSnap.data();
					fetchedProfile = {
						displayName: data.displayName || "",
						username: data.username || "",
						experienceLevel: data.experienceLevel || "",
						studentId: data.studentId || "",
						school: data.school || "BeastCode University",
						class: data.class || "",
						faculty: data.faculty || "",
						bio: data.bio || "",
						solvedProblems: data.solvedProblems || [],
						avatarUrl: data.avatarUrl || "",
						email: data.email || "",
						showStudentInfo: data.showStudentInfo !== false,
						usernameLastChangedAt: data.usernameLastChangedAt || 0,
						easyCount: data.easyCount || 0,
						mediumCount: data.mediumCount || 0,
						hardCount: data.hardCount || 0,
						mlCount: data.mlCount || 0,
						contestParticipation: data.contestParticipation || 0,
						contestWins: data.contestWins || 0,
						xp: data.xp || 0,
						country: data.country || "",
						createdAt: data.createdAt || 0,
					};
					setOriginalUsername(data.username || "");
					if (data.avatarUrl) {
						setAvatarPreview(data.avatarUrl);
					} else {
						setAvatarPreview(null);
					}
				} else {
					if (!isReadOnly && user) {
						fetchedProfile.displayName = user.displayName || "";
						fetchedProfile.email = user.email || "";
					}
				}
				setProfile(fetchedProfile);

				// Compute stats — Firestore is the single source of truth.
				// Only problems that currently exist in the DB count toward totals.
				const querySnapshot = await getDocs(collection(firestore, "problems"));
				const allProblemsMap = new Map<string, string>();
				querySnapshot.forEach((doc) => {
					const data = doc.data();
					if (data.difficulty) {
						allProblemsMap.set(doc.id, data.difficulty);
					}
				});

				let totalEasy = 0, totalMedium = 0, totalHard = 0;
				let solvedEasy = 0, solvedMedium = 0, solvedHard = 0;

				allProblemsMap.forEach((difficulty, id) => {
					const isSolved = fetchedProfile.solvedProblems.includes(id);
					const diffLower = difficulty.toLowerCase();
					if (diffLower === "easy") { totalEasy++; if (isSolved) solvedEasy++; }
					else if (diffLower === "medium") { totalMedium++; if (isSolved) solvedMedium++; }
					else if (diffLower === "hard") { totalHard++; if (isSolved) solvedHard++; }
				});

				setStats({
					easy: { solved: solvedEasy, total: totalEasy },
					medium: { solved: solvedMedium, total: totalMedium },
					hard: { solved: solvedHard, total: totalHard },
					total: { solved: solvedEasy + solvedMedium + solvedHard, total: totalEasy + totalMedium + totalHard },
				});
			} catch (error: any) {
				console.error("Error loading profile:", error);
				setFeedback({ type: "error", text: "Failed to load profile. Please refresh the page." });
			} finally {
				setLoadingProfile(false);
			}
		};

		if (isReadOnly ? !!uid : !!user) {
			loadProfileAndStats();
		}
	}, [user, uid, isReadOnly]);

	// Subscribe to Follower/Following counts and current Follow status
	useEffect(() => {
		const targetUid = isReadOnly ? uid : user?.uid;
		if (!targetUid) return;

		// Listen to followers count
		const followerQuery = query(collection(firestore, "follows"), where("followingId", "==", targetUid));
		const unsubFollowers = onSnapshot(followerQuery, (snap) => {
			setFollowerCount(snap.size);
		});

		// Listen to following count
		const followingQuery = query(collection(firestore, "follows"), where("followerId", "==", targetUid));
		const unsubFollowing = onSnapshot(followingQuery, (snap) => {
			setFollowingCount(snap.size);
		});

		// Listen to if current user follows target user
		let unsubFollowStatus = () => { };
		if (user && isReadOnly) {
			const followRef = doc(firestore, "follows", `${user.uid}_${targetUid}`);
			unsubFollowStatus = onSnapshot(followRef, (snap) => {
				setIsFollowing(snap.exists());
			});
		}

		return () => {
			unsubFollowers();
			unsubFollowing();
			unsubFollowStatus();
		};
	}, [user, uid, isReadOnly]);

	const handleFollowToggle = async () => {
		if (!user) return;
		const targetUid = uid as string;
		const followId = `${user.uid}_${targetUid}`;
		const followRef = doc(firestore, "follows", followId);

		try {
			if (isFollowing) {
				await deleteDoc(followRef);
			} else {
				await setDoc(followRef, {
					followerId: user.uid,
					followingId: targetUid,
					createdAt: Date.now(),
				});
			}
		} catch (error) {
			console.error("Follow toggle error:", error);
		}
	};

	const handleMessageUser = async () => {
		if (!user || !uid) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch("/api/chat/conversations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ type: "direct", targetUid: uid }),
			});
			const data = await res.json();
			if (data.success && data.conversation) {
				router.push(`/messages/${data.conversation.id}`);
			}
		} catch (error) {
			console.error("Message user error:", error);
		}
	};

	// Handle avatar file selection — compress & convert to base64
	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (isReadOnly) return;
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			setFeedback({ type: "error", text: "Image is too large. Please choose an image under 5MB." });
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const dataUrl = ev.target?.result as string;
			// Compress using canvas
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				const MAX = 200;
				const ratio = Math.min(MAX / img.width, MAX / img.height);
				canvas.width = img.width * ratio;
				canvas.height = img.height * ratio;
				const ctx = canvas.getContext("2d");
				ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
				const compressed = canvas.toDataURL("image/jpeg", 0.8);
				setAvatarPreview(compressed);
				setAvatarBase64(compressed);
				setFeedback(null);
			};
			img.src = dataUrl;
		};
		reader.readAsDataURL(file);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || isReadOnly || saving) return;

		if (!profile.displayName.trim()) {
			setFeedback({ type: "error", text: "Display Name is required." });
			return;
		}

		if (!profile.username.trim()) {
			setFeedback({ type: "error", text: "Username is required." });
			return;
		}

		setSaving(true);
		setFeedback(null);
		try {
			const newUsername = profile.username.trim().toLowerCase();
			const usernameChanged = newUsername !== originalUsername;
			
			if (usernameChanged) {
				const regex = /^[a-zA-Z0-9_]{3,15}$/;
				if (!regex.test(newUsername)) {
					setFeedback({ type: "error", text: "Username must be 3-15 characters, alphanumeric/underscores." });
					setSaving(false);
					return;
				}

				// Check 3 months cooldown rule (90 days)
				const lastChanged = profile.usernameLastChangedAt || 0;
				const cooldownPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
				if (lastChanged > 0 && Date.now() - lastChanged < cooldownPeriod) {
					const daysLeft = Math.ceil((cooldownPeriod - (Date.now() - lastChanged)) / (24 * 60 * 60 * 1000));
					setFeedback({
						type: "error",
						text: `Username cannot be changed yet. You must wait ${daysLeft} more day(s).`,
					});
					setSaving(false);
					return;
				}

				// Check uniqueness
				const q = query(
					collection(firestore, "users"),
					where("username", "==", newUsername),
					limit(1)
				);
				const snap = await getDocs(q);
				if (!snap.empty && snap.docs[0].id !== user.uid) {
					setFeedback({ type: "error", text: "Username is already taken." });
					setSaving(false);
					return;
				}
			}

			const userRef = doc(firestore, "users", user.uid);
			const updateData: any = {
				displayName: profile.displayName.trim(),
				username: newUsername,
				studentId: profile.studentId.trim(),
				school: profile.school.trim(),
				class: profile.class.trim(),
				faculty: profile.faculty.trim(),
				bio: profile.bio.trim(),
				showStudentInfo: profile.showStudentInfo !== false,
				updatedAt: Date.now(),
			};
			if (usernameChanged) {
				updateData.usernameLastChangedAt = Date.now();
			}
			// Only update avatar if a new one was selected
			if (avatarBase64) {
				updateData.avatarUrl = avatarBase64;
			}
			await setDoc(userRef, updateData, { merge: true });
			if (avatarBase64) {
				setProfile((prev) => ({ ...prev, avatarUrl: avatarBase64 }));
			}
			if (usernameChanged) {
				setProfile((prev) => ({ ...prev, usernameLastChangedAt: Date.now() }));
				setOriginalUsername(newUsername);
			}
			setAvatarBase64(null); // reset pending upload
			setFeedback({ type: "success", text: "Profile updated successfully!" });
			setTimeout(() => setFeedback(null), 4000);
		} catch (error: any) {
			console.error("Error saving profile:", error);
			setFeedback({ type: "error", text: "Failed to save changes. Please try again." });
		} finally {
			setSaving(false);
		}
	};

	const lastChanged = profile.usernameLastChangedAt || 0;
	const cooldownPeriod = 90 * 24 * 60 * 60 * 1000;
	const isUsernameLocked = !isReadOnly && lastChanged > 0 && (Date.now() - lastChanged < cooldownPeriod);
	const usernameDaysLeft = isUsernameLocked ? Math.ceil((cooldownPeriod - (Date.now() - lastChanged)) / (24 * 60 * 60 * 1000)) : 0;

	if (loadingAuth || loadingProfile || (!user && !isReadOnly)) {
		return (
			<AppShell activeNav="Profile" maxWidth="wide">
				<div className="py-20">
					<LoadingState message="Loading developer profile..." />
				</div>
			</AppShell>
		);
	}

	const StatBar = ({
		label,
		solved,
		total,
		color,
		barColor,
	}: {
		label: string;
		solved: number;
		total: number;
		color: string;
		barColor: string;
	}) => (
		<div className="pt-2.5 border-t border-border-subtle">
			<div className="flex justify-between text-xs mb-1.5 font-mono">
				<span className={`font-medium ${color}`}>{label}</span>
				<span className="text-text-muted">{solved} / {total}</span>
			</div>
			<div className="w-full bg-bg-base h-1.5 rounded-full overflow-hidden border border-border-subtle/50">
				<div
					className={`h-full rounded-full transition-all duration-500 ${barColor}`}
					style={{ width: `${total > 0 ? (solved / total) * 100 : 0}%` }}
				/>
			</div>
		</div>
	);

	return (
		<AppShell activeNav="Profile" maxWidth="wide">
			<PageHeader
				title={isReadOnly ? `${profile.displayName || "User"}'s Profile` : "Developer Profile"}
				description={
					isReadOnly
						? (profile.username ? `@${profile.username} · Member profile and engineering statistics` : "Public developer profile and statistics")
						: "Manage your public developer identity, academic credentials, and statistics."
				}
				badge={
					profile.username ? (
						<Badge variant="default" size="sm" className="font-mono text-text-secondary">
							@{profile.username}
						</Badge>
					) : undefined
				}
				actions={
					isReadOnly ? (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleFollowToggle}
								className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
									isFollowing
										? "bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
										: "bg-accent-brand hover:bg-accent-hover text-black font-semibold"
								}`}
							>
								{isFollowing ? "Following" : "Follow"}
							</button>
							<button
								type="button"
								onClick={handleMessageUser}
								className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
							>
								<FaCommentDots size={12} className="text-accent-brand" />
								<span>Message</span>
							</button>
							<button
								type="button"
								onClick={() => setShowReportModal(true)}
								className="px-3 py-1.5 rounded-md text-xs font-medium transition bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/40"
							>
								Report
							</button>
						</div>
					) : undefined
				}
				metrics={[
					{ label: "Followers", value: followerCount },
					{ label: "Following", value: followingCount },
					{ label: "Solved", value: `${stats.total.solved} / ${stats.total.total}` },
					{ label: "XP", value: profile.xp || 0 },
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left Column */}
				<div className="col-span-1 lg:col-span-5 space-y-6">
					{/* BeastCode Developer Identity Card */}
					<div className="bg-bg-surface border border-border-default rounded-lg p-5">
						<div className="flex justify-between items-start mb-5">
							<div>
								<span className="text-[10px] font-mono uppercase tracking-wider text-accent-brand font-semibold block">
									Developer Identity
								</span>
								<p className="text-xs text-text-muted mt-0.5 font-mono">Platform ID Card</p>
							</div>
							<div className="p-2 rounded-md bg-bg-base border border-border-default text-accent-brand">
								<FaGraduationCap size={16} />
							</div>
						</div>

						<div className="space-y-4">
							{/* Avatar in card */}
							<div className="flex items-center gap-3.5">
								<div className="relative shrink-0">
									{avatarPreview ? (
										<img
											src={avatarPreview}
											alt="Avatar"
											className="w-14 h-14 rounded-full border border-border-default object-cover"
										/>
									) : (
										<div className="w-14 h-14 rounded-full border border-border-default bg-bg-base flex items-center justify-center">
											<FaUser size={22} className="text-text-muted" />
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-base font-semibold text-text-primary truncate">
										{profile.displayName || "Unset Display Name"}
									</h3>
									{profile.username && (
										<p className="text-xs text-accent-brand font-mono truncate">
											@{profile.username}
										</p>
									)}
									<p className="text-xs text-text-muted font-mono truncate mt-0.5">
										{isReadOnly && profile.showStudentInfo === false ? "••••••••@•••••.••" : isReadOnly ? profile.email : user?.email}
									</p>
									{(() => {
										const expInfo = calculateExperience({
											easySolved: profile.easyCount || 0,
											mediumSolved: profile.mediumCount || 0,
											hardSolved: profile.hardCount || 0,
											mlSolved: profile.mlCount || 0,
											contestParticipation: profile.contestParticipation || 0,
											contestWins: profile.contestWins || 0,
										});

										return (
											<div className="mt-2.5 space-y-1.5">
												{/* Tier badge & XP Info */}
												<div className="flex items-center gap-2">
													<span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${expInfo.currentTier.colorClass}`}>
														{expInfo.currentTier.name}
													</span>
													<span className="text-[11px] font-mono text-text-secondary">
														{expInfo.score} XP
													</span>

													{/* Tooltip */}
													<div className="relative group inline-block cursor-pointer align-middle">
														<FaInfoCircle className="text-text-muted hover:text-accent-brand transition-colors" size={11} />
														<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-bg-surface border border-border-default rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] text-[10px] text-text-secondary pointer-events-none">
															<div className="font-semibold text-text-primary mb-1.5 border-b border-border-subtle pb-1 flex justify-between items-center font-mono">
																<span>Experience Formula</span>
																<span className="text-[9px] text-accent-brand uppercase">Weights</span>
															</div>
															<div className="space-y-1 font-mono text-[9px]">
																<div className="flex justify-between"><span>Easy Solved:</span> <span className="text-text-primary">+1 XP</span></div>
																<div className="flex justify-between"><span>Medium Solved:</span> <span className="text-text-primary">+3 XP</span></div>
																<div className="flex justify-between"><span>Hard Solved:</span> <span className="text-text-primary">+7 XP</span></div>
																<div className="flex justify-between"><span>ML Solved:</span> <span className="text-text-primary">+10 XP</span></div>
																<div className="flex justify-between"><span>Contest Participation:</span> <span className="text-text-primary">+5 XP</span></div>
																<div className="flex justify-between"><span>Contest Win:</span> <span className="text-text-primary">+20 XP</span></div>
															</div>
															<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bg-surface" />
														</div>
													</div>
												</div>

												{/* Progress bar */}
												<div className="w-full max-w-[200px]">
													<div className="w-full h-1 rounded-full bg-bg-base border border-border-subtle/50 overflow-hidden">
														<div
															className="h-full rounded-full transition-all duration-300"
															style={{
																width: `${expInfo.percent}%`,
																backgroundColor: expInfo.currentTier.accentColor,
															}}
														/>
													</div>
													{expInfo.nextTier && (
														<div className="flex justify-between items-center mt-1 text-[8px] font-mono text-text-muted">
															<span>{expInfo.pointsToNext} XP to {expInfo.nextTier.name}</span>
															<span>{Math.round(expInfo.percent)}%</span>
														</div>
													)}
												</div>
											</div>
										);
									})()}
								</div>
							</div>

							{isReadOnly && profile.showStudentInfo === false ? (
								<div className="border-t border-border-subtle pt-3 text-center text-xs text-text-muted italic py-1 font-mono">
									Student card details are hidden by the user.
								</div>
							) : (
								<>
									{!isReadOnly && (
										<div className="text-[10px] text-right font-mono -mt-1 mb-1">
											<span className="text-text-muted">Status: </span>
											<span className={profile.showStudentInfo !== false ? "text-accent-brand font-medium" : "text-amber-400 font-medium"}>
												{profile.showStudentInfo !== false ? "Public" : "Private"}
											</span>
										</div>
									)}
									<div className="border-t border-border-subtle pt-3 grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs">
										<div className="flex items-center gap-2 text-text-secondary">
											<FaSchool className="text-text-muted shrink-0" />
											<span className="truncate" title={profile.school}>{profile.school || "BeastCode"}</span>
										</div>
										<div className="flex items-center gap-2 text-text-secondary">
											<FaIdCard className="text-text-muted shrink-0" />
											<span className="truncate font-mono">{profile.studentId || "ID Unset"}</span>
										</div>
										<div className="flex items-center gap-2 text-text-secondary">
											<FaBookOpen className="text-text-muted shrink-0" />
											<span className="truncate" title={profile.faculty}>{profile.faculty || "Faculty Unset"}</span>
										</div>
										<div className="flex items-center gap-2 text-text-secondary">
											<FaGraduationCap className="text-text-muted shrink-0" />
											<span className="truncate font-mono">{profile.class || "Class Unset"}</span>
										</div>
									</div>
								</>
							)}

							{profile.bio && (
								<div className="mt-3 pt-3 border-t border-border-subtle">
									<p className="text-xs text-text-secondary italic line-clamp-3 leading-relaxed">&ldquo;{profile.bio}&rdquo;</p>
								</div>
							)}
						</div>
					</div>

					{/* User Information Card */}
					<div className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-3.5">
						<h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-semibold border-b border-border-subtle pb-2.5 flex items-center gap-2">
							<FaUser className="text-accent-brand shrink-0" />
							<span>Account Details</span>
						</h3>

						<div className="space-y-3 text-xs">
							{/* UID Section */}
							<div className="flex justify-between items-center bg-bg-base p-2.5 rounded-md border border-border-subtle">
								<div className="space-y-0.5">
									<span className="text-text-muted font-mono uppercase tracking-wider block text-[10px]">User UID</span>
									<span className="font-mono text-text-secondary select-all truncate max-w-[200px] block" title={isReadOnly ? (uid as string) : user?.uid}>
										{isReadOnly ? (uid as string) : user?.uid}
									</span>
								</div>
								<button
									onClick={() => {
										const copyText = isReadOnly ? (uid as string) : user?.uid;
										if (copyText) {
											navigator.clipboard.writeText(copyText);
											triggerCopyToast("UID copied to clipboard!");
										}
									}}
									className="text-text-muted hover:text-text-primary transition p-1.5 hover:bg-bg-elevated rounded-md shrink-0"
									title="Copy UID"
								>
									<FaCopy size={12} />
								</button>
							</div>

							{/* Country Section */}
							<div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50 font-mono">
								<span className="text-text-muted uppercase tracking-wider text-[10px]">Country</span>
								<span className="text-text-primary font-sans text-xs">
									{profile.country ? getCountryName(profile.country) : "Not Specified"}
								</span>
							</div>

							{/* Joined Date Section */}
							<div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50 font-mono">
								<span className="text-text-muted uppercase tracking-wider text-[10px]">Joined Date</span>
								<span className="text-text-primary text-xs">
									{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, {
										year: "numeric",
										month: "short",
										day: "numeric",
									}) : "Not available"}
								</span>
							</div>

							{/* Experience Tier Section */}
							<div className="flex justify-between items-center py-1 font-mono">
								<span className="text-text-muted uppercase tracking-wider text-[10px]">Experience Tier</span>
								{(() => {
									const expInfo = calculateExperience({
										easySolved: profile.easyCount || 0,
										mediumSolved: profile.mediumCount || 0,
										hardSolved: profile.hardCount || 0,
										mlSolved: profile.mlCount || 0,
										contestParticipation: profile.contestParticipation || 0,
										contestWins: profile.contestWins || 0,
									});
									return (
										<span className="font-bold uppercase px-2 py-0.5 rounded text-[10px]" style={{
											color: expInfo.currentTier.accentColor,
											backgroundColor: `color-mix(in srgb, ${expInfo.currentTier.accentColor} 12%, transparent)`,
											border: `1px solid color-mix(in srgb, ${expInfo.currentTier.accentColor} 30%, transparent)`,
										}}>
											{expInfo.currentTier.name}
										</span>
									);
								})()}
							</div>
						</div>
					</div>

					{/* Solved Stats Card */}
					<div className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-3.5">
						<h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-semibold border-b border-border-subtle pb-2.5 flex items-center gap-2">
							<FaCheckCircle className="text-accent-brand" />
							<span>Problem Solvings</span>
						</h3>
						<div>
							<div className="flex justify-between text-xs mb-1.5 font-mono">
								<span className="text-text-secondary">Overall Solved</span>
								<span className="text-text-primary font-medium">{stats.total.solved} / {stats.total.total}</span>
							</div>
							<div className="w-full bg-bg-base h-2 rounded-full overflow-hidden border border-border-subtle/50">
								<div
									className="bg-accent-brand h-full rounded-full transition-all duration-700"
									style={{ width: `${stats.total.total > 0 ? (stats.total.solved / stats.total.total) * 100 : 0}%` }}
								/>
							</div>
						</div>
						<StatBar label="Easy" solved={stats.easy.solved} total={stats.easy.total} color="text-emerald-400" barColor="bg-emerald-500" />
						<StatBar label="Medium" solved={stats.medium.solved} total={stats.medium.total} color="text-amber-400" barColor="bg-amber-500" />
						<StatBar label="Hard" solved={stats.hard.solved} total={stats.hard.total} color="text-rose-400" barColor="bg-rose-500" />
					</div>
				</div>

				{/* Right Column: Edit Form / Profile Details */}
				<div className="col-span-1 lg:col-span-7">
					<form onSubmit={handleSave} className="bg-bg-surface border border-border-default rounded-lg p-6 space-y-5">
						<div className="flex items-center justify-between pb-3 border-b border-border-default">
							<h3 className="text-sm font-mono uppercase tracking-wider text-text-primary font-semibold">
								{isReadOnly ? "Profile Details" : "Edit Profile Details"}
							</h3>
							{!isReadOnly && (
								<span className="text-[11px] font-mono text-text-muted">
									Fields with <span className="text-rose-400">*</span> are required
								</span>
							)}
						</div>

						{/* Avatar Upload */}
						{!isReadOnly ? (
							<div className="flex flex-col items-center gap-2.5 p-4 rounded-md border border-dashed border-border-default bg-bg-base">
								<p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
									Profile Avatar
								</p>
								<div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
									{avatarPreview ? (
										<img
											src={avatarPreview}
											alt="Avatar preview"
											className="w-20 h-20 rounded-full object-cover border border-border-default"
										/>
									) : (
										<div className="w-20 h-20 rounded-full flex items-center justify-center bg-bg-surface border border-border-default">
											<FaUser size={28} className="text-text-muted" />
										</div>
									)}
									<div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
										<FaCamera size={16} className="text-white" />
									</div>
								</div>
								<button
									type="button"
									onClick={() => avatarInputRef.current?.click()}
									className="text-xs text-accent-brand hover:underline font-medium font-mono"
								>
									{avatarPreview ? "Change photo" : "Upload photo"}
								</button>
								<p className="text-[10px] font-mono text-text-muted">JPG, PNG or GIF · Max 5MB</p>
								<input
									ref={avatarInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleAvatarChange}
								/>
								{avatarBase64 && (
									<span className="text-[10px] text-accent-brand font-medium flex items-center gap-1 font-mono">
										<FaCheckCircle size={10} /> New photo ready — save to apply
									</span>
								)}
							</div>
						) : (
							<div className="flex flex-col items-center gap-2 p-4 rounded-md border border-border-subtle bg-bg-base">
								{avatarPreview ? (
									<img
										src={avatarPreview}
										alt="Avatar"
										className="w-20 h-20 rounded-full object-cover border border-border-default"
									/>
								) : (
									<div className="w-20 h-20 rounded-full bg-bg-surface border border-border-default flex items-center justify-center">
										<FaUser size={28} className="text-text-muted" />
									</div>
								)}
								<span className="text-xs text-text-muted font-mono">Registered BeastCode Member</span>
							</div>
						)}

						{/* Form Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="col-span-1 md:col-span-2">
								<label htmlFor="displayName" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
									Display Name {!isReadOnly && <span className="text-rose-400">*</span>}
								</label>
								<input
									value={profile.displayName}
									onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
									type="text"
									id="displayName"
									disabled={isReadOnly}
									autoComplete="name"
									autoCorrect="off"
									spellCheck={false}
									className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
									required
								/>
							</div>

							<div>
								<label htmlFor="username" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
									Username {!isReadOnly && <span className="text-rose-400">*</span>}
								</label>
								<input
									value={profile.username}
									onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
									type="text"
									id="username"
									disabled={isReadOnly || isUsernameLocked}
									autoComplete="username"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted font-mono disabled:opacity-50 disabled:cursor-not-allowed transition"
									required
								/>
								{isUsernameLocked && (
									<p className="text-[10px] text-amber-400 mt-1 font-mono">
										Locked. Can be changed again in {usernameDaysLeft} day(s).
									</p>
								)}
							</div>

							<div>
								<label className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
									Experience Tier (Calculated)
								</label>
								<div className="border border-border-default rounded-md p-2.5 bg-bg-base flex items-center justify-between">
									{(() => {
										const expInfo = calculateExperience({
											easySolved: profile.easyCount || 0,
											mediumSolved: profile.mediumCount || 0,
											hardSolved: profile.hardCount || 0,
											mlSolved: profile.mlCount || 0,
											contestParticipation: profile.contestParticipation || 0,
											contestWins: profile.contestWins || 0,
										});

										return (
											<div className="w-full space-y-1.5">
												<div className="flex items-center gap-1.5 justify-between">
													<div className="flex items-center gap-1.5">
														<span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${expInfo.currentTier.colorClass}`}>
															{expInfo.currentTier.name}
														</span>
														<span className="text-[11px] font-mono text-text-secondary">
															{expInfo.score} XP
														</span>
													</div>

													{/* Tooltip */}
													<div className="relative group inline-block cursor-pointer align-middle">
														<FaInfoCircle className="text-text-muted hover:text-accent-brand transition-colors" size={12} />
														<div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-bg-surface border border-border-default rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] text-xs text-text-secondary pointer-events-none">
															<div className="font-semibold text-text-primary mb-1.5 border-b border-border-subtle pb-1 flex justify-between items-center font-mono">
																<span>Experience Calculation</span>
																<span className="text-[9px] text-accent-brand uppercase">Weights System</span>
															</div>
															<div className="space-y-1 font-mono text-[10px]">
																<div className="flex justify-between"><span>Easy Solved:</span> <span className="text-text-primary">+1 XP</span></div>
																<div className="flex justify-between"><span>Medium Solved:</span> <span className="text-text-primary">+3 XP</span></div>
																<div className="flex justify-between"><span>Hard Solved:</span> <span className="text-text-primary">+7 XP</span></div>
																<div className="flex justify-between"><span>ML Solved:</span> <span className="text-text-primary">+10 XP</span></div>
																<div className="flex justify-between"><span>Contest Participation:</span> <span className="text-text-primary">+5 XP</span></div>
																<div className="flex justify-between"><span>Contest Win:</span> <span className="text-text-primary">+20 XP</span></div>
															</div>
															<div className="absolute top-full right-1.5 border-4 border-transparent border-t-bg-surface" />
														</div>
													</div>
												</div>

												<div className="w-full">
													<div className="w-full h-1 rounded-full bg-bg-surface border border-border-subtle/50 overflow-hidden">
														<div
															className="h-full rounded-full transition-all duration-300"
															style={{
																width: `${expInfo.percent}%`,
																backgroundColor: expInfo.currentTier.accentColor,
															}}
														/>
													</div>
													{expInfo.nextTier && (
														<div className="flex justify-between items-center mt-1 text-[8px] font-mono text-text-muted">
															<span>{expInfo.pointsToNext} XP to {expInfo.nextTier.name}</span>
															<span>{Math.round(expInfo.percent)}%</span>
														</div>
													)}
												</div>
											</div>
										);
									})()}
								</div>
							</div>

							{isReadOnly && profile.showStudentInfo === false ? (
								<div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-8 gap-2 text-center bg-bg-base border border-border-subtle rounded-md">
									<div className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center border border-border-default">
										<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
										</svg>
									</div>
									<p className="text-xs font-semibold text-text-primary font-mono">Profile credentials are private</p>
									<p className="text-xs text-text-muted max-w-xs">This user has chosen to keep their student and institution information hidden.</p>
								</div>
							) : (
								<>
									<div>
										<label htmlFor="studentId" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
											Student ID Code
										</label>
										<input
											value={profile.studentId}
											onChange={(e) => setProfile((p) => ({ ...p, studentId: e.target.value }))}
											type="text"
											id="studentId"
											disabled={isReadOnly}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted font-mono disabled:opacity-50 disabled:cursor-not-allowed transition"
										/>
									</div>

									<div>
										<label htmlFor="school" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
											School / University
										</label>
										<input
											value={profile.school}
											onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
											type="text"
											id="school"
											disabled={isReadOnly}
											autoComplete="organization"
											autoCorrect="off"
											spellCheck={false}
											className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
										/>
									</div>

									<div>
										<label htmlFor="faculty" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
											Faculty / Department
										</label>
										<input
											value={profile.faculty}
											onChange={(e) => setProfile((p) => ({ ...p, faculty: e.target.value }))}
											type="text"
											id="faculty"
											disabled={isReadOnly}
											autoComplete="off"
											autoCorrect="off"
											spellCheck={false}
											className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
										/>
									</div>

									<div>
										<label htmlFor="class" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
											Class / Cohort
										</label>
										<input
											value={profile.class}
											onChange={(e) => setProfile((p) => ({ ...p, class: e.target.value }))}
											type="text"
											id="class"
											disabled={isReadOnly}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition font-mono"
										/>
									</div>

									<div className="col-span-1 md:col-span-2">
										<label htmlFor="bio" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5 font-medium">
											Short Bio
										</label>
										<textarea
											value={profile.bio}
											onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
											id="bio"
											disabled={isReadOnly}
											rows={3}
											autoComplete="off"
											autoCorrect="off"
											spellCheck={false}
											className="border border-border-default outline-none text-sm rounded-md focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/30 block w-full p-2.5 bg-bg-base text-text-primary placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition resize-none"
										/>
									</div>
								</>
							)}

							{!isReadOnly && (
								<div className="col-span-1 md:col-span-2 flex items-center justify-between p-3.5 border border-border-default rounded-md bg-bg-base mt-1">
									<div>
										<label className="text-xs font-semibold block text-text-primary">
											Public Student Information
										</label>
										<p className="text-[11px] text-text-muted mt-0.5">
											Allow other users to see your Student ID, institution, class, and faculty.
										</p>
									</div>
									<button
										type="button"
										onClick={() => setProfile((p) => ({ ...p, showStudentInfo: p.showStudentInfo !== false ? false : true }))}
										className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border-default transition-colors duration-200 ease-in-out focus:outline-none ${
											profile.showStudentInfo !== false ? "bg-accent-brand" : "bg-bg-elevated"
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out mt-0.5 ${
												profile.showStudentInfo !== false ? "translate-x-4" : "translate-x-0.5"
											}`}
										/>
									</button>
								</div>
							)}
						</div>

						<div className="border-t border-border-default pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
							<div>
								{feedback && (
									<span className={`text-xs font-mono font-medium ${feedback.type === "success" ? "text-accent-brand" : "text-rose-400"}`}>
										{feedback.text}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2.5 self-end sm:self-auto">
								{isReadOnly ? (
									<button
										type="button"
										onClick={() => router.push("/rankings")}
										className="bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default px-4 py-2 rounded-md text-xs font-medium transition"
									>
										Back to Leaderboard
									</button>
								) : (
									<>
										<Link
											href="/"
											className="bg-bg-elevated hover:bg-bg-hover border border-border-default text-text-primary px-4 py-2 rounded-md text-xs font-medium transition"
										>
											Cancel
										</Link>
										<button
											type="submit"
											disabled={saving}
											className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
										>
											<FaSave size={12} />
											{saving ? "Saving..." : "Save Changes"}
										</button>
									</>
								)}
							</div>
						</div>
					</form>
				</div>
			</div>

			{/* User Threads Section */}
			<div className="mt-8 border-t border-border-default pt-6 max-w-4xl mx-auto">
				<SecondaryNav
					tabs={[
						{ id: "posted", label: "Posted Threads" },
						{ id: "reposted", label: "Reposted Threads" },
					]}
					activeTab={router.query.tab === "reposted" ? "reposted" : "posted"}
					onChange={(tabId) => {
						router.push(
							{
								pathname: router.pathname,
								query: { ...router.query, tab: tabId },
							},
							undefined,
							{ shallow: true }
						);
					}}
					className="mb-5"
				/>

				<div className="pb-10">
					{router.query.tab === "reposted" ? (
						<ThreadsBoard profileUid={(uid || user?.uid) as string} repostFeedOnly={true} />
					) : (
						<ThreadsBoard profileUid={(uid || user?.uid) as string} postFeedOnly={true} />
					)}
				</div>
			</div>

			{/* Report User Modal */}
			{showReportModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
					<div className="bg-bg-surface border border-border-default rounded-lg max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
						{/* Header */}
						<div className="px-5 py-3.5 border-b border-border-default flex justify-between items-center bg-bg-elevated/40">
							<div className="flex items-center gap-2 text-rose-400">
								<span className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
									Report User: @{profile.username}
								</span>
							</div>
							<button
								onClick={() => {
									setShowReportModal(false);
									setReportFeedback(null);
								}}
								className="text-text-muted hover:text-text-primary transition text-xs font-mono"
							>
								✕
							</button>
						</div>

						{/* Form */}
						<form onSubmit={handleReportSubmit} className="p-5 space-y-4">
							<div>
								<label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-medium">
									Violation Category <span className="text-rose-400">*</span>
								</label>
								<BeastCodeSelect
									options={[
										{ value: "", label: "Select a reason..." },
										{ value: "Cheating / Plagiarism", label: "Cheating / Plagiarism (copying code/solutions)" },
										{ value: "Abusive Behavior", label: "Abusive Behavior (toxic posts/comments)" },
										{ value: "Spam", label: "Spam (advertising/flooding the leaderboard)" },
										{ value: "Impersonation", label: "Impersonation (pretending to be another user/org)" },
										{ value: "Harassment", label: "Harassment (stalking/hate speech)" },
										{ value: "Other", label: "Other (specify below)" }
									]}
									value={reportReason}
									onChange={(val) => setReportReason(val)}
									size="md"
								/>
							</div>

							<div>
								<div className="flex justify-between items-center mb-1.5">
									<label className="block text-xs font-mono uppercase tracking-wider text-text-secondary font-medium">
										Detailed Description <span className="text-rose-400">*</span>
									</label>
									<span className={`text-[10px] font-mono ${reportDesc.length < 30 ? "text-amber-400" : "text-text-muted"}`}>
										{reportDesc.length} / 3000 chars (min 30)
									</span>
								</div>
								<textarea
									value={reportDesc}
									onChange={(e) => setReportDesc(e.target.value)}
									required
									minLength={30}
									maxLength={3000}
									rows={3}
									autoComplete="off"
									autoCorrect="off"
									spellCheck={false}
									className="w-full bg-bg-base border border-border-default text-text-primary rounded-md p-2.5 outline-none focus:border-accent-brand text-xs placeholder:text-text-muted resize-none transition"
								/>
							</div>

							{/* File Upload / Evidence */}
							<div>
								<label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-medium">
									Evidence & Attachments (Optional)
								</label>
								<div className="border border-dashed border-border-default rounded-md p-3.5 bg-bg-base flex flex-col items-center justify-center gap-1.5 text-center">
									<p className="text-xs text-text-secondary">
										Drag & drop or <label className="text-accent-brand cursor-pointer hover:underline font-mono">browse<input type="file" multiple accept="image/*,.pdf,.txt,.zip" onChange={handleReportFileChange} className="hidden" /></label>
									</p>
									<p className="text-[9px] font-mono text-text-muted">Supports: JPG, PNG, PDF, TXT, ZIP · Max 3 files · Max 5MB each</p>
								</div>

								{reportFiles.length > 0 && (
									<div className="mt-2.5 space-y-1.5">
										{reportFiles.map((file, idx) => (
											<div key={idx} className="flex justify-between items-center bg-bg-elevated border border-border-default rounded-md px-3 py-1.5 text-xs text-text-secondary">
												<span className="truncate max-w-[250px] font-mono">{file.name}</span>
												<button
													type="button"
													onClick={() => setReportFiles(prev => prev.filter((_, i) => i !== idx))}
													className="text-rose-400 hover:text-rose-300 transition ml-2 font-mono text-xs"
												>
													✕
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Terms */}
							<label className="flex gap-2 items-start cursor-pointer select-none">
								<input
									type="checkbox"
									checked={acceptReportTerms}
									onChange={(e) => setAcceptReportTerms(e.target.checked)}
									className="mt-0.5 accent-accent-brand"
								/>
								<span className="text-[10px] text-text-muted leading-relaxed">
									I declare under penalty of perjury that this report is true, accurate, and submitted in good faith. I understand that submitting false reports may result in action against my account.
								</span>
							</label>

							{/* Status Feedback */}
							{reportFeedback && (
								<div className={`p-2.5 rounded-md text-xs font-mono font-medium ${
									reportFeedback.type === "success" ? "bg-accent-brand/10 text-accent-brand border border-accent-brand/30" : "bg-rose-950/40 text-rose-400 border border-rose-900/40"
								}`}>
									{reportFeedback.text}
								</div>
							)}

							{/* Footer Actions */}
							<div className="flex justify-end gap-2 pt-2 border-t border-border-default">
								<button
									type="button"
									onClick={() => {
										setShowReportModal(false);
										setReportFeedback(null);
									}}
									className="px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submittingReport}
									className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-bg-elevated disabled:text-text-muted rounded-md transition flex items-center gap-1.5"
								>
									{submittingReport ? "Submitting..." : "Submit Report"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{copyToast && (
				<div className="fixed bottom-5 right-5 bg-bg-surface border border-accent-brand/40 text-accent-brand px-3.5 py-2.5 rounded-md shadow-2xl flex items-center gap-2 z-50 text-xs font-mono">
					<FaCheckCircle className="text-accent-brand" />
					<span>{copyToast}</span>
				</div>
			)}
		</AppShell>
	);
};

export default ProfilePage;

