import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { Badge } from "@/components/UI/Badge";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import Link from "next/link";
import { FaChevronLeft, FaCheck, FaSpinner, FaTimes } from "react-icons/fa";
import MarkdownEditor from "@/components/Admin/MarkdownEditor";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";

const NewContest: React.FC = () => {
	const router = useRouter();
	const [isAdmin, loadingAdmin] = useAdmin();

	const [submitting, setSubmitting] = useState(false);
	const [statusRibbon, setStatusRibbon] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

	const triggerStatusRibbon = (type: "success" | "error" | "info", message: string, duration = 4000) => {
		setStatusRibbon({ type, message });
		if (duration > 0) {
			setTimeout(() => {
				setStatusRibbon((prev) => prev?.message === message ? null : prev);
			}, duration);
		}
	};

	useEffect(() => {
		if (!loadingAdmin && !isAdmin) {
			router.replace("/");
		}
	}, [isAdmin, loadingAdmin, router]);

	// Form fields
	const [title, setTitle] = useState("");
	const [id, setId] = useState(""); // Slug
	const [description, setDescription] = useState("");
	const [banner, setBanner] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [duration, setDuration] = useState("120"); // in minutes
	const [timezone, setTimezone] = useState("UTC");
	const [visibility, setVisibility] = useState("public");
	const [password, setPassword] = useState("");
	const [university, setUniversity] = useState("");
	const [virtualEnabled, setVirtualEnabled] = useState(false);
	const [registrationEnabled, setRegistrationEnabled] = useState(true);
	const [leaderboardFreeze, setLeaderboardFreeze] = useState("0");
	const [penaltyMinutes, setPenaltyMinutes] = useState("20");
	const [maxParticipants, setMaxParticipants] = useState("1000");
	const [rules, setRules] = useState("### Contest Rules\n\n1. All submissions must be your own work.\n2. Do not discuss problems during the contest.\n3. Standard penalties apply (20 minutes per incorrect solution).");
	const [securityLevel, setSecurityLevel] = useState("standard"); // casual, standard, strict

	// Generate slug from title
	useEffect(() => {
		if (title) {
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-");
			setId(slug);
		} else {
			setId("");
		}
	}, [title]);

	// Auto-fill duration if start/end times change
	useEffect(() => {
		if (startTime && endTime) {
			const start = new Date(startTime).getTime();
			const end = new Date(endTime).getTime();
			if (end > start) {
				const diffMins = Math.round((end - start) / 60000);
				setDuration(diffMins.toString());
			}
		}
	}, [startTime, endTime]);

	// Initialize timezone
	useEffect(() => {
		try {
			const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (tz) setTimezone(tz);
		} catch (e) {
			// ignore
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim() || !startTime || !endTime) {
			triggerStatusRibbon("error", "Please fill in all required fields (Contest Title, Start Time, End Time).");
			return;
		}

		const startEpoch = new Date(startTime).getTime();
		const endEpoch = new Date(endTime).getTime();

		if (endEpoch <= startEpoch) {
			triggerStatusRibbon("error", "End time must be after the start time.");
			return;
		}

		setSubmitting(true);
		triggerStatusRibbon("info", "Creating contest...", 0);

		try {
			const docRef = doc(firestore, "contests", id);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				triggerStatusRibbon("error", `A contest with slug "${id}" already exists. Please choose a different title.`);
				setSubmitting(false);
				return;
			}

			const finalStatus = startEpoch > Date.now() ? "scheduled" : (endEpoch < Date.now() ? "ended" : "running");
			const contestData = {
				id,
				title,
				description: description.trim(),
				banner: banner.trim() || "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=60",
				startTime: startEpoch,
				endTime: endEpoch,
				duration: Number(duration),
				timezone,
				visibility,
				password: visibility === "password" ? password.trim() : "",
				university: visibility === "university" ? university.trim() : "",
				virtualEnabled,
				registrationEnabled,
				leaderboardFreeze: Number(leaderboardFreeze),
				penaltyRules: {
					minutesPerIncorrect: Number(penaltyMinutes)
				},
				maxParticipants: Number(maxParticipants),
				rules: rules.trim(),
				securityLevel,
				status: finalStatus,
				createdAt: Date.now(),
			};

			await setDoc(docRef, contestData);

			if (finalStatus === "ended") {
				const annRef = collection(firestore, "contest_announcements");
				await addDoc(annRef, {
					contestId: id,
					title: "Contest Ended",
					content: `The contest has ended. The end time was set to ${new Date(endEpoch).toLocaleString()}.`,
					timestamp: Date.now()
				});
			}

			// Initialize blank statistics document
			const statsRef = doc(firestore, "contest_statistics", id);
			await setDoc(statsRef, {
				id,
				participantsCount: 0,
				submissionsCount: 0,
				averageScore: 0,
				solveRates: {},
				mostDifficultProblem: "",
				fastestAccepted: {}
			});

			triggerStatusRibbon("info", "Sending announcement emails...", 0);
			try {
				const userToken = await auth.currentUser?.getIdToken();
				const emailRes = await fetch("/api/send-contest-email", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${userToken}`
					},
					body: JSON.stringify({
						contestId: id,
						title,
						description: description.trim(),
						startTime: startEpoch,
						endTime: endEpoch,
						duration: Number(duration),
						visibility,
						university,
						origin: window.location.origin
					})
				});
				const emailData = await emailRes.json();
				if (emailData.success) {
					let successMsg = `Contest created successfully! ${emailData.message}`;
					if (emailData.previewUrl) {
						successMsg += ` (Preview: ${emailData.previewUrl})`;
					}
					triggerStatusRibbon("success", successMsg);
				} else {
					triggerStatusRibbon("error", `Contest created, but email notifications failed: ${emailData.message}`);
				}
			} catch (emailErr: any) {
				console.error("Failed to send contest emails:", emailErr);
				triggerStatusRibbon("error", "Contest created, but failed to connect to the email service.");
			}

			setTimeout(() => {
				router.push(`/admin/contests/${id}/edit`);
			}, 2500);
		} catch (error: any) {
			console.error("Error creating contest:", error);
			triggerStatusRibbon("error", "Failed to create contest. Please try again.");
			setSubmitting(false);
		}
	};

	if (loadingAdmin || !isAdmin) {
		return (
			<AppShell activeNav="Admin" maxWidth="wide">
				<div className="py-24">
					<LoadingState message="Checking administrator privileges..." />
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title={title || "Create New Contest"}
				description="Configure parameters, timing windows, participation eligibility, and proctoring policy."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Contests", href: "/admin?tab=contests" },
					{ label: title || "New Contest" },
				]}
				badge={id ? <Badge variant="default" size="sm" className="font-mono text-text-muted">{id}</Badge> : undefined}
				actions={
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting}
						className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
					>
						{submitting ? <FaSpinner className="animate-spin" size={11} /> : <FaCheck size={11} />}
						Create Contest
					</button>
				}
			/>

			{statusRibbon && (
				<div
					className={`mb-5 p-3 rounded-md border text-xs font-mono transition-all duration-300 ${
						statusRibbon.type === "success"
							? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
							: statusRibbon.type === "error"
							? "bg-rose-950/30 text-rose-400 border-rose-800/40"
							: "bg-blue-950/30 text-blue-400 border-blue-800/40"
					}`}
				>
					{statusRibbon.message}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6 border border-border-default rounded-lg p-6 bg-bg-surface">
				<h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-text-primary border-b border-border-subtle pb-3">
					Basic Parameters
				</h3>

					{/* Contest Title */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='title' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Contest Title
						</label>
						<div className='col-span-8'>
							<input
								type='text'
								id='title'
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder='e.g. BeastCode Alpha Round 1'
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
								required
							/>
						</div>
					</div>

					{/* Slug */}
					<div className='grid grid-cols-12 gap-4 items-start'>
						<div className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
							Contest Slug
						</div>
						<div className='col-span-8'>
							<input
								type='text'
								value={id}
								disabled
								autoComplete='off'
								autoCorrect='off'
								autoCapitalize='off'
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full font-mono cursor-not-allowed'
								style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
							/>
						</div>
					</div>

					{/* Description */}
					<div className='grid grid-cols-12 gap-4 items-start'>
						<label htmlFor='description' className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
							Short Description
						</label>
						<div className='col-span-9'>
							<textarea
								id='description'
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								placeholder='Brief overview shown on the contest card'
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange transition font-sans resize-y'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
							/>
						</div>
					</div>

					{/* Banner Image */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='banner' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Banner Image URL
						</label>
						<div className='col-span-8'>
							<input
								type='url'
								id='banner'
								value={banner}
								onChange={(e) => setBanner(e.target.value)}
								placeholder='e.g. https://images.unsplash.com/... (Optional)'
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
							/>
						</div>
					</div>

					<h3 className='text-lg font-semibold border-b pb-3 pt-6' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
						Time & Duration
					</h3>

					{/* Start & End Date */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='startTime' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Start Time
						</label>
						<div className='col-span-6'>
							<input
								type='datetime-local'
								id='startTime'
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								autoComplete='off'
								autoCorrect='off'
								autoCapitalize='off'
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
								required
							/>
						</div>
					</div>

					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='endTime' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							End Time
						</label>
						<div className='col-span-6'>
							<input
								type='datetime-local'
								id='endTime'
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								autoComplete='off'
								autoCorrect='off'
								autoCapitalize='off'
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
								required
							/>
						</div>
					</div>

					<div className='grid grid-cols-12 gap-4 items-center'>
						<span className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Calculated Duration
						</span>
						<div className='col-span-4 text-sm font-semibold' style={{ color: "var(--text-secondary)" }}>
							{duration} minutes ({Math.round(Number(duration) / 60 * 10) / 10} hours)
						</div>
					</div>

					<h3 className='text-lg font-semibold border-b pb-3 pt-6' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
						Contest Format & Rules
					</h3>

					{/* Visibility Mode */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='visibility' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Visibility
						</label>
						<div className='col-span-5'>
							<BeastCodeSelect
								options={[
									{ value: "public", label: "Public (Anyone can view & join)" },
									{ value: "private", label: "Private (Invite/Admin only)" },
									{ value: "password", label: "Password Protected" },
									{ value: "university", label: "University Restricted" }
								]}
								value={visibility}
								onChange={(val) => setVisibility(val)}
								size="md"
							/>
						</div>
					</div>

					{/* Password field */}
					{visibility === "password" && (
						<div className='grid grid-cols-12 gap-4 items-center animate-fade-in'>
							<label htmlFor='password' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
								Contest Password
							</label>
							<div className='col-span-4'>
								<input
									type='text'
									id='password'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder='Enter join password'
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition font-mono'
									style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									required
								/>
							</div>
						</div>
					)}

					{/* University Restricted field */}
					{visibility === "university" && (
						<div className='grid grid-cols-12 gap-4 items-center animate-fade-in'>
							<label htmlFor='university' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
								Required University Domain
							</label>
							<div className='col-span-5'>
								<input
									type='text'
									id='university'
									value={university}
									onChange={(e) => setUniversity(e.target.value)}
									placeholder='e.g. st.vju.ac.vn'
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
									style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									required
								/>
								<span className='text-[10px] mt-1 block italic font-semibold' style={{ color: "var(--text-muted)" }}>
									Filters participants whose email address domain matches.
								</span>
							</div>
						</div>
					)}

					{/* Security (Casual, Standard, Strict) */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='securityLevel' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Anti-Cheat Security
						</label>
						<div className='col-span-5'>
							<BeastCodeSelect
								options={[
									{ value: "casual", label: "Casual (Unmonitored, flexible tabs)" },
									{ value: "standard", label: "Standard (Fullscreen check, 3 warning limits)" },
									{ value: "strict", label: "Strict (Fullscreen, immediate auto-submit/lock on tab switch)" }
								]}
								value={securityLevel}
								onChange={(val) => setSecurityLevel(val)}
								size="md"
							/>
						</div>
					</div>

					{/* Parameters */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='penaltyMinutes' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Wrong Submission Penalty
						</label>
						<div className='col-span-3'>
							<div className='relative'>
								<input
									type='number'
									id='penaltyMinutes'
									value={penaltyMinutes}
									onChange={(e) => setPenaltyMinutes(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition pr-16'
									style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									min='0'
								/>
								<span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold' style={{ color: "var(--text-muted)" }}>minutes</span>
							</div>
						</div>
					</div>

					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='leaderboardFreeze' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Standings Freeze Period
						</label>
						<div className='col-span-3'>
							<div className='relative'>
								<input
									type='number'
									id='leaderboardFreeze'
									value={leaderboardFreeze}
									onChange={(e) => setLeaderboardFreeze(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition pr-16'
									style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									min='0'
								/>
								<span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold' style={{ color: "var(--text-muted)" }}>minutes</span>
							</div>
						</div>
						<div className='col-span-6 text-xs' style={{ color: "var(--text-muted)" }}>
							Freeze leaderboard X minutes before contest end. (0 = no freeze)
						</div>
					</div>

					<div className='grid grid-cols-12 gap-4 items-center'>
						<label htmlFor='maxParticipants' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
							Participant Limit
						</label>
						<div className='col-span-3'>
							<input
								type='number'
								id='maxParticipants'
								value={maxParticipants}
								onChange={(e) => setMaxParticipants(e.target.value)}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
								style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
								min='1'
							/>
						</div>
					</div>

					{/* Flags */}
					<div className='grid grid-cols-12 gap-4 items-center'>
						<div className='col-span-3'></div>
						<div className='col-span-9 space-y-2'>
							<label className='flex items-center gap-2 cursor-pointer font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
								<input
									type='checkbox'
									checked={virtualEnabled}
									onChange={(e) => setVirtualEnabled(e.target.checked)}
									className='accent-brand-orange w-4 h-4'
								/>
								Enable Virtual Participation (allows users to take the contest asynchronously after it ends)
							</label>

							<label className='flex items-center gap-2 cursor-pointer font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
								<input
									type='checkbox'
									checked={registrationEnabled}
									onChange={(e) => setRegistrationEnabled(e.target.checked)}
									className='accent-brand-orange w-4 h-4'
								/>
								Require Pre-Registration (users must register before starting)
							</label>
						</div>
					</div>

					{/* Rules Markdown */}
					<div className='grid grid-cols-12 gap-4 items-start pt-4'>
						<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
							Contest Rules
						</label>
						<div className='col-span-9'>
							<MarkdownEditor
								value={rules}
								onChange={setRules}
								placeholder='Write general regulations or rules...'
								height='200px'
							/>
						</div>
					</div>
				</form>

				<div className="flex justify-end gap-2.5 mt-5">
					<Link
						href="/admin?tab=contests"
						className="px-4 py-1.5 rounded-md text-xs font-medium transition bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
					>
						Cancel
					</Link>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting}
						className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
					>
						{submitting && <FaSpinner className="animate-spin" size={11} />}
						Create Contest
					</button>
				</div>
		</AppShell>
	);
};

export default NewContest;
