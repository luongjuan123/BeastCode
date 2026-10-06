import React, { useEffect, useState, useRef } from "react";
import AppShell from "@/components/UI/AppShell";
import PageHeader from "@/components/UI/PageHeader";
import { auth, firestore } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FaUserCog, FaSave, FaUser, FaCamera, FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import useHasMounted from "@/hooks/useHasMounted";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import NotificationPreferences from "@/components/Notification/NotificationPreferences";
import SecuritySettings from "@/components/Settings/SecuritySettings";
import CountrySelector from "@/components/UI/CountrySelector";
import { getCountryCode, COUNTRIES } from "@/utils/countryData";

interface UserProfile {
	displayName: string;
	studentId: string;
	school: string;
	class: string;
	faculty: string;
	bio: string;
	avatarUrl?: string;
	showStudentInfo?: boolean;
	country?: string;
	notificationPreferences?: {
		reminders: boolean;
		achievements: boolean;
		editorials: boolean;
		upsolve: boolean;
		social: boolean;
		university: boolean;
		announcements: boolean;
		marketing: boolean;
		digest: boolean;
	};
}

export default function SettingsPage() {
	const hasMounted = useHasMounted();
	const [user] = useAuthState(auth);
	const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
	const [loading, setLoading] = useState(false);
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

	const [profile, setProfile] = useState<UserProfile>({
		displayName: "",
		studentId: "",
		school: "BeastCode University",
		class: "",
		faculty: "",
		bio: "",
		avatarUrl: "",
		showStudentInfo: true,
		country: "United States",
		notificationPreferences: {
			reminders: true,
			achievements: true,
			editorials: true,
			upsolve: true,
			social: true,
			university: true,
			announcements: true,
			marketing: true,
			digest: true,
		}
	});

	const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

	// Load profile info if logged in
	useEffect(() => {
		if (!user) return;
		const loadProfile = async () => {
			try {
				const userRef = doc(firestore, "users", user.uid);
				const userSnap = await getDoc(userRef);
				if (userSnap.exists()) {
					const data = userSnap.data();
					setProfile({
						displayName: data.displayName || "",
						studentId: data.studentId || "",
						school: data.school || "BeastCode University",
						class: data.class || "",
						faculty: data.faculty || "",
						bio: data.bio || "",
						avatarUrl: data.avatarUrl || "",
						showStudentInfo: data.showStudentInfo !== false,
						country: getCountryCode(data.country || "US"),
						notificationPreferences: {
							reminders: data.notificationPreferences?.reminders !== false,
							achievements: data.notificationPreferences?.achievements !== false,
							editorials: data.notificationPreferences?.editorials !== false,
							upsolve: data.notificationPreferences?.upsolve !== false,
							social: data.notificationPreferences?.social !== false,
							university: data.notificationPreferences?.university !== false,
							announcements: data.notificationPreferences?.announcements !== false,
							marketing: data.notificationPreferences?.marketing !== false,
							digest: data.notificationPreferences?.digest !== false,
						}
					});
					if (data.avatarUrl) {
						setAvatarPreview(data.avatarUrl);
					}
				}
			} catch (e) {
				console.error("Error loading profile:", e);
			}
		};
		loadProfile();
	}, [user]);

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 5 * 1024 * 1024) {
			setFeedback({ type: "error", text: "File size must be less than 5MB" });
			return;
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result as string;
			setAvatarPreview(base64String);
			setAvatarBase64(base64String);
			setFeedback(null);
		};
		reader.readAsDataURL(file);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setLoading(true);
		setFeedback(null);

		// Validate country code
		const countryCode = profile.country || "US";
		if (!COUNTRIES.some((c) => c.code === countryCode.toUpperCase())) {
			setFeedback({ type: "error", text: "Invalid country code selected." });
			setLoading(false);
			return;
		}

		try {
			const userRef = doc(firestore, "users", user.uid);
			const updatedData = {
				...profile,
				avatarUrl: avatarBase64 || profile.avatarUrl || "",
				updatedAt: Date.now(),
			};
			await setDoc(userRef, updatedData, { merge: true });
			setFeedback({ type: "success", text: "Profile settings updated successfully!" });
			setTimeout(() => {
				setFeedback(null);
			}, 4000);
		} catch (error: any) {
			setFeedback({ type: "error", text: getFriendlyErrorMessage(error, "Update failed. Please try again.") });
		} finally {
			setLoading(false);
		}
	};

	if (!hasMounted) return null;

	return (
		<AppShell activeNav="Settings" maxWidth="normal">
			<PageHeader
				title="Developer Settings"
				description="Manage your developer identity, institution affiliations, and platform credentials."
				breadcrumbs={[{ label: "Settings" }]}
			/>

			<div className='grid grid-cols-1 md:grid-cols-4 gap-6 pt-1'>
				{/* Sidebar Navigation */}
				<div className='md:col-span-1 flex md:flex-col gap-1.5 border-b md:border-b-0 border-border-default pb-3 md:pb-0 overflow-x-auto md:overflow-visible shrink-0'>
					<button
						onClick={() => setActiveTab("profile")}
						className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono transition-colors whitespace-nowrap w-full text-left ${
							activeTab === "profile"
								? "bg-bg-surface border border-accent-brand/40 text-accent-brand font-medium"
								: "text-text-muted hover:bg-bg-surface border border-transparent hover:text-text-primary"
						}`}
					>
						<FaUserCog size={13} />
						<span>Profile & Identity</span>
					</button>
					{user && (
						<button
							onClick={() => setActiveTab("security")}
							className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono transition-colors whitespace-nowrap w-full text-left ${
								activeTab === "security"
									? "bg-bg-surface border border-accent-brand/40 text-accent-brand font-medium"
									: "text-text-muted hover:bg-bg-surface border border-transparent hover:text-text-primary"
							}`}
						>
							<FaShieldAlt size={13} />
							<span>Security & Access</span>
						</button>
					)}
				</div>

				{/* Main Content Area */}
				<div className='md:col-span-3 space-y-6 min-w-0'>
					{activeTab === "profile" && (
						<div className='space-y-6'>
							{user ? (
								<form onSubmit={handleSave} className='bg-bg-surface border border-border-default rounded-lg p-5 space-y-5'>
									<div className='flex items-center justify-between pb-3 border-b border-border-default'>
										<h2 className='text-xs font-mono uppercase tracking-wider text-text-muted flex items-center gap-2'>
											<FaUserCog className='text-accent-brand' />
											Identity & Affiliations
										</h2>
										<span className='text-[10px] font-mono text-text-muted'>uid: {user.uid.slice(0, 10)}...</span>
									</div>

									{/* Avatar Uploader */}
									<div className='flex flex-col items-center gap-2.5 p-4 rounded-md bg-bg-base border border-dashed border-border-default'>
										<span className='text-[10px] font-mono uppercase text-text-muted'>Developer Avatar</span>
										<div className='relative group cursor-pointer' onClick={() => avatarInputRef.current?.click()}>
											{avatarPreview ? (
												<img
													src={avatarPreview}
													alt='Avatar preview'
													className='w-16 h-16 rounded-full object-cover border border-border-default'
												/>
											) : (
												<div className='w-16 h-16 rounded-full flex items-center justify-center bg-bg-surface border border-border-default'>
													<FaUser size={22} className='text-text-muted' />
												</div>
											)}
											<div className='absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
												<FaCamera size={14} className='text-white' />
											</div>
										</div>
										<button
											type='button'
											onClick={() => avatarInputRef.current?.click()}
											className='text-xs font-mono text-accent-brand hover:underline'
										>
											Upload new image
										</button>
										<input
											ref={avatarInputRef}
											type='file'
											accept='image/*'
											className='hidden'
											onChange={handleAvatarChange}
										/>
										{avatarBase64 && (
											<span className='text-[11px] font-mono text-accent-brand flex items-center gap-1'>
												<FaCheckCircle size={10} /> Image staged — save to apply
											</span>
										)}
									</div>

									<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
										<div className='col-span-1 md:col-span-2'>
											<label htmlFor='displayName' className='text-xs font-mono text-text-muted block mb-1.5'>
												Display Name
											</label>
											<input
												value={profile.displayName}
												onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
												type='text'
												id='displayName'
												className='w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors'
												placeholder='Your name or handle'
												required
											/>
										</div>

										<div>
											<label htmlFor='studentId' className='text-xs font-mono text-text-muted block mb-1.5'>
												Student / Employee ID
											</label>
											<input
												value={profile.studentId}
												onChange={(e) => setProfile((p) => ({ ...p, studentId: e.target.value }))}
												type='text'
												id='studentId'
												className='w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors font-mono'
												placeholder='e.g. 22010234'
											/>
										</div>

										<div>
											<label htmlFor='school' className='text-xs font-mono text-text-muted block mb-1.5'>
												Institution / University
											</label>
											<input
												value={profile.school}
												onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
												type='text'
												id='school'
												className='w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors'
												placeholder='BeastCode Institute'
											/>
										</div>

										<div>
											<label htmlFor='country' className='text-xs font-mono text-text-muted block mb-1.5'>
												Country / Region
											</label>
											<CountrySelector
												value={profile.country || "US"}
												onChange={(code) => setProfile((p) => ({ ...p, country: code }))}
											/>
										</div>

										<div>
											<label htmlFor='faculty' className='text-xs font-mono text-text-muted block mb-1.5'>
												Faculty / Department
											</label>
											<input
												value={profile.faculty}
												onChange={(e) => setProfile((p) => ({ ...p, faculty: e.target.value }))}
												type='text'
												id='faculty'
												className='w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors'
												placeholder='Computer Science'
											/>
										</div>

										<div>
											<label htmlFor='class' className='text-xs font-mono text-text-muted block mb-1.5'>
												Class / Team
											</label>
											<input
												value={profile.class}
												onChange={(e) => setProfile((p) => ({ ...p, class: e.target.value }))}
												type='text'
												id='class'
												className='w-full px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors'
												placeholder='e.g. CS-2026'
											/>
										</div>

										<div className='col-span-1 md:col-span-2'>
											<label htmlFor='bio' className='text-xs font-mono text-text-muted block mb-1.5'>
												Bio
											</label>
											<textarea
												value={profile.bio}
												onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
												id='bio'
												rows={3}
												className='w-full px-3 py-2 rounded-md border border-border-default bg-bg-base text-xs text-text-primary focus:border-accent-brand outline-none transition-colors resize-none'
												placeholder='Technical bio or research areas...'
											/>
										</div>

										<div className='col-span-1 md:col-span-2 flex items-center justify-between p-3 rounded-md bg-bg-base border border-border-default'>
											<div>
												<span className='text-xs font-medium text-text-primary block'>
													Public Educational Affiliation
												</span>
												<p className='text-[11px] text-text-muted mt-0.5 font-mono'>
													Show university, department, and identifier on your public profile.
												</p>
											</div>
											<button
												type='button'
												onClick={() => setProfile((p) => ({ ...p, showStudentInfo: p.showStudentInfo !== false ? false : true }))}
												className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
													profile.showStudentInfo !== false ? "bg-accent-brand" : "bg-bg-surface-elevated border-border-default"
												}`}
											>
												<span
													className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
														profile.showStudentInfo !== false ? "translate-x-4" : "translate-x-0"
													}`}
												/>
											</button>
										</div>

										<div className='col-span-1 md:col-span-2'>
											<NotificationPreferences
												preferences={profile.notificationPreferences || {
													reminders: true,
													achievements: true,
													editorials: true,
													upsolve: true,
													social: true,
													university: true,
													announcements: true,
													marketing: true,
													digest: true,
												}}
												onChange={(updatedPreferences) => setProfile((p) => ({
													...p,
													notificationPreferences: updatedPreferences
												}))}
											/>
										</div>
									</div>

									<div className='pt-4 border-t border-border-default flex justify-between items-center gap-4'>
										<div>
											{feedback && (
												<span className={`text-xs font-mono ${
													feedback.type === "success" ? "text-accent-brand" : "text-red-400"
												}`}>
													{feedback.text}
												</span>
											)}
										</div>
										<button
											type='submit'
											disabled={loading}
											className='px-4 py-2 rounded-md font-mono text-xs font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed'
										>
											<FaSave size={12} />
											<span>{loading ? "Saving..." : "Save Settings"}</span>
										</button>
									</div>
								</form>
							) : (
								<div className='rounded-lg p-8 border border-border-default bg-bg-surface text-center text-xs text-text-muted font-mono'>
									Sign in to update your developer settings and profile attributes.
								</div>
							)}
						</div>
					)}

					{activeTab === "security" && user && (
						<div>
							<SecuritySettings />
						</div>
					)}
				</div>
			</div>
		</AppShell>
	);
}
