import React from "react";
import { FaBell } from "react-icons/fa";

export interface PreferencesMap {
	reminders: boolean;
	achievements: boolean;
	editorials: boolean;
	upsolve: boolean;
	social: boolean;
	university: boolean;
	announcements: boolean;
	marketing: boolean;
	digest: boolean;
}

interface NotificationPreferencesProps {
	preferences: PreferencesMap;
	onChange: (updatedPreferences: PreferencesMap) => void;
}

const PREF_ITEMS = [
	{ id: "reminders", label: "Contest Reminders", desc: "Get notified 24h, 1h, and 15m before a contest starts." },
	{ id: "achievements", label: "Achievements & Badges", desc: "Receive notifications when you earn a badge or rank high." },
	{ id: "editorials", label: "Editorials & Solutions", desc: "Get notified when a contest editorial has been published." },
	{ id: "upsolve", label: "Upsolving Reminders", desc: "Gentle reminders to solve problems you missed in past contests." },
	{ id: "social", label: "Social Activity", desc: "Get notified when a friend challenges you or registers." },
	{ id: "university", label: "University Contests", desc: "Updates on exclusive department, class, or university challenges." },
	{ id: "announcements", label: "Contest Announcements", desc: "Schedule shifts, rule modifications, and event announcements." },
	{ id: "marketing", label: "Product & Marketing", desc: "Receive information about new features and updates on BeastCode." },
	{ id: "digest", label: "Weekly Digest", desc: "A curated summary of your coding progress, stats, and upcoming arenas." }
];

export default function NotificationPreferences({ preferences, onChange }: NotificationPreferencesProps) {
	const handleToggle = (id: keyof PreferencesMap) => {
		const updated = {
			...preferences,
			[id]: !preferences[id]
		};
		onChange(updated);
	};

	return (
		<div className="col-span-1 md:col-span-2 pt-6 mt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
			<h3 className="text-md font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
				<FaBell className="text-emerald-500" />
				Email Notification Preferences
			</h3>
			<p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
				Customize when BeastCode sends notifications to your registered email. Actionable updates keep you competitive without cluttering your inbox.
			</p>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{PREF_ITEMS.map((pref) => {
					const isChecked = preferences[pref.id as keyof PreferencesMap] !== false;
					return (
						<div
							key={pref.id}
							className="flex items-center justify-between p-3.5 rounded-xl transition hover:bg-white/[0.02]"
							style={{ background: "var(--bg-dark-fill-3)", border: "1px solid var(--border-subtle)" }}
						>
							<div className="pr-4 overflow-hidden">
								<label
									className="text-sm font-semibold block cursor-pointer select-none"
									htmlFor={`pref-${pref.id}`}
									style={{ color: "var(--text-primary)" }}
								>
									{pref.label}
								</label>
								<p className="text-[10px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
									{pref.desc}
								</p>
							</div>
							<button
								type="button"
								id={`pref-${pref.id}`}
								onClick={() => handleToggle(pref.id as keyof PreferencesMap)}
								className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
									isChecked ? "bg-emerald-500" : "bg-gray-700"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
										isChecked ? "translate-x-4" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
