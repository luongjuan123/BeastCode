import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { Badge } from "@/components/UI/Badge";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { getServerTime, getContestStatus } from "@/utils/contestStatusService";
import {
	doc, getDoc, setDoc, deleteDoc, updateDoc, collection,
	getDocs, query, where, orderBy, writeBatch, addDoc
} from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import Link from "next/link";
import {
	FaChevronLeft, FaCheck, FaSpinner, FaPlus, FaTrash,
	FaArrowUp, FaArrowDown, FaEdit, FaVolumeUp, FaQuestionCircle,
	FaFileAlt, FaChartBar, FaExclamationTriangle, FaBell, FaSearch
} from "react-icons/fa";
import MarkdownEditor from "@/components/Admin/MarkdownEditor";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import SearchableProblemPicker from "@/components/UI/SearchableProblemPicker";

interface ContestProblem {
	id: string; // contestId_problemId
	contestId: string;
	problemId: string;
	label: string; // A, B, C...
	points: number;
	difficulty: string;
	order: number;
	customConstraints: string;
	title?: string;
}

interface DBProblemItem {
	id: string;
	title: string;
	difficulty: string;
	tags: string[];
	attempts?: number;
	solved?: number;
}

interface Announcement {
	id: string;
	title: string;
	content: string;
	timestamp: number;
}

interface Clarification {
	id: string;
	uid: string;
	username: string;
	question: string;
	answer: string;
	isPublic: boolean;
	askedAt: number;
	answeredAt?: number;
}

interface IntegrityLog {
	id: string;
	uid: string;
	username?: string;
	type: string;
	timestamp: number;
	details: string;
}

const EditContest: React.FC = () => {
	const router = useRouter();
	const { cid } = router.query;
	const [isAdmin, loadingAdmin] = useAdmin();

	const [activeTab, setActiveTab] = useState("details");
	const [loading, setLoading] = useState(true);
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

	// --- CONTEST DATA STATE ---
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [banner, setBanner] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [duration, setDuration] = useState(120);
	const [timezone, setTimezone] = useState("UTC");
	const [visibility, setVisibility] = useState("public");
	const [password, setPassword] = useState("");
	const [university, setUniversity] = useState("");
	const [virtualEnabled, setVirtualEnabled] = useState(false);
	const [registrationEnabled, setRegistrationEnabled] = useState(true);
	const [leaderboardFreeze, setLeaderboardFreeze] = useState(0);
	const [penaltyMinutes, setPenaltyMinutes] = useState(20);
	const [maxParticipants, setMaxParticipants] = useState(1000);
	const [rules, setRules] = useState("");
	const [securityLevel, setSecurityLevel] = useState("standard");
	const [status, setStatus] = useState("draft");
	const [sendingEmail, setSendingEmail] = useState(false);

	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		setNow(getServerTime());
		const interval = setInterval(() => {
			setNow(getServerTime());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// --- SUB-COLLECTIONS STATE ---
	const [contestProblems, setContestProblems] = useState<ContestProblem[]>([]);
	const [allDbProblems, setAllDbProblems] = useState<DBProblemItem[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [clarifications, setClarifications] = useState<Clarification[]>([]);
	const [integrityLogs, setIntegrityLogs] = useState<IntegrityLog[]>([]);
	const [editorialMarkdown, setEditorialMarkdown] = useState("");

	// --- ADD PROBLEM STATE ---
	const [selectedDbProblem, setSelectedDbProblem] = useState("");
	const [newProbLabel, setNewProbLabel] = useState("A");
	const [newProbPoints, setNewProbPoints] = useState("500");
	const [newProbConstraints, setNewProbConstraints] = useState("");
	const [isPickerOpen, setIsPickerOpen] = useState(false);

	// --- ANNOUNCEMENT FORM STATE ---
	const [announceTitle, setAnnounceTitle] = useState("");
	const [announceContent, setAnnounceContent] = useState("");

	// --- CLARIFICATION ANSWER STATE ---
	const [answeringId, setAnsweringId] = useState<string | null>(null);
	const [clarAnswerText, setClarAnswerText] = useState("");
	const [clarIsPublic, setClarIsPublic] = useState(false);

	// Fetch Contest Data
	const fetchContestData = useCallback(async () => {
		if (!cid) return;
		setLoading(true);
		try {
			const contestDoc = await getDoc(doc(firestore, "contests", cid as string));
			if (!contestDoc.exists()) {
				triggerStatusRibbon("error", "Contest not found.");
				setLoading(false);
				return;
			}

			const data = contestDoc.data();
			setTitle(data.title || "");
			setDescription(data.description || "");
			setBanner(data.banner || "");
			setDuration(data.duration || 120);
			setTimezone(data.timezone || "UTC");
			setVisibility(data.visibility || "public");
			setPassword(data.password || "");
			setUniversity(data.university || "");
			setVirtualEnabled(!!data.virtualEnabled);
			setRegistrationEnabled(data.registrationEnabled !== false);
			setLeaderboardFreeze(data.leaderboardFreeze || 0);
			setPenaltyMinutes(data.penaltyRules?.minutesPerIncorrect || 20);
			setMaxParticipants(data.maxParticipants || 1000);
			setRules(data.rules || "");
			setSecurityLevel(data.securityLevel || "standard");
			setStatus(data.status || "draft");

			// Format epoch back to ISO date for local input
			if (data.startTime) {
				const startLocal = new Date(data.startTime - new Date().getTimezoneOffset() * 60000)
					.toISOString()
					.slice(0, 16);
				setStartTime(startLocal);
			}
			if (data.endTime) {
				const endLocal = new Date(data.endTime - new Date().getTimezoneOffset() * 60000)
					.toISOString()
					.slice(0, 16);
				setEndTime(endLocal);
			}

			// Fetch editorial
			try {
				const edDoc = await getDoc(doc(firestore, "contest_editorial", cid as string));
				if (edDoc.exists()) {
					setEditorialMarkdown(edDoc.data().markdown || "");
				}
			} catch (edErr) {
				console.error("Error loading editorial:", edErr);
			}

			// Get all available DB problems first
			const probTitles: Record<string, string> = {};
			let problemsSnapshot;
			try {
				problemsSnapshot = await getDocs(collection(firestore, "problems"));
				problemsSnapshot.forEach((d) => {
					probTitles[d.id] = d.data().title || d.id;
				});
			} catch (pErr) {
				console.error("Error loading base problems:", pErr);
			}

			// Fetch contest problems
			let cpList: ContestProblem[] = [];
			try {
				const cpSnap = await getDocs(
					query(collection(firestore, "contest_problems"), where("contestId", "==", cid), orderBy("order", "asc"))
				);
				cpSnap.forEach((d) => {
					const cpData = d.data();
					cpList.push({
						id: d.id,
						contestId: cpData.contestId,
						problemId: cpData.problemId,
						label: cpData.label,
						points: cpData.points,
						difficulty: cpData.difficulty,
						order: cpData.order,
						customConstraints: cpData.customConstraints || "",
						title: probTitles[cpData.problemId] || cpData.problemId
					});
				});
				setContestProblems(cpList);
			} catch (cpErr: any) {
				console.error("Error loading contest problems:", cpErr);
				triggerStatusRibbon("error", getFriendlyErrorMessage(cpErr, "Error loading contest problems."));
			}

			// Populate all available DB problems for the select dropdown
			if (problemsSnapshot) {
				const allProbs: DBProblemItem[] = [];
				problemsSnapshot.forEach((d) => {
					allProbs.push({
						id: d.id,
						title: d.data().title || d.id,
						difficulty: d.data().difficulty || "Medium",
						tags: d.data().tags || [],
						attempts: d.data().attempts || 0,
						solved: d.data().solved || 0
					});
				});
				setAllDbProblems(allProbs);
			}

			// Fetch announcements
			try {
				const announceSnap = await getDocs(
					query(collection(firestore, "contest_announcements"), where("contestId", "==", cid), orderBy("timestamp", "desc"))
				);
				const annList: Announcement[] = [];
				announceSnap.forEach((d) => {
					annList.push({ id: d.id, ...d.data() } as Announcement);
				});
				setAnnouncements(annList);
			} catch (annErr: any) {
				console.error("Error loading announcements:", annErr);
			}

			// Fetch clarifications
			try {
				const clarSnap = await getDocs(
					query(collection(firestore, "contest_clarifications"), where("contestId", "==", cid), orderBy("askedAt", "desc"))
				);
				const clarList: Clarification[] = [];
				clarSnap.forEach((d) => {
					clarList.push({ id: d.id, ...d.data() } as Clarification);
				});
				setClarifications(clarList);
			} catch (clarErr: any) {
				console.error("Error loading clarifications:", clarErr);
			}

			// Fetch integrity events
			try {
				const integritySnap = await getDocs(
					query(collection(firestore, "contest_integrity_events"), where("contestId", "==", cid), orderBy("timestamp", "desc"))
				);
				const logList: IntegrityLog[] = [];
				integritySnap.forEach((d) => {
					logList.push({ id: d.id, ...d.data() } as IntegrityLog);
				});
				setIntegrityLogs(logList);
			} catch (intErr: any) {
				console.error("Error loading integrity logs:", intErr);
			}

		} catch (err: any) {
			console.error("Error loading contest details:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Error loading data."));
		} finally {
			setLoading(false);
		}
	}, [cid]);

	useEffect(() => {
		if (isAdmin && cid) {
			fetchContestData();
		}
	}, [isAdmin, cid, fetchContestData]);

	// Auto calculate duration on editing times
	useEffect(() => {
		if (startTime && endTime) {
			const start = new Date(startTime).getTime();
			const end = new Date(endTime).getTime();
			if (end > start) {
				setDuration(Math.round((end - start) / 60000));
			}
		}
	}, [startTime, endTime]);

	// Save Contest Details
	const handleSaveDetails = async () => {
		if (!cid) return;
		setSubmitting(true);
		triggerStatusRibbon("info", "Saving details...", 0);

		try {
			const startEpoch = new Date(startTime).getTime();
			const endEpoch = new Date(endTime).getTime();

			if (endEpoch <= startEpoch) {
				triggerStatusRibbon("error", "End time must be after the start time.");
				setSubmitting(false);
				return;
			}

			const contestRef = doc(firestore, "contests", cid as string);
			const contestDoc = await getDoc(contestRef);
			const currentDBData = contestDoc.data();
			const wasAlreadyEnded = currentDBData?.status === "ended";
			const wasVirtualEnabled = !!currentDBData?.virtualEnabled;

			let finalStatus = status;
			const now = Date.now();
			if (endEpoch <= now) {
				finalStatus = "ended";
				setStatus("ended");
			}

			const updateData = {
				title,
				description: description.trim(),
				banner: banner.trim(),
				startTime: startEpoch,
				endTime: endEpoch,
				duration,
				timezone,
				visibility,
				password: visibility === "password" ? password.trim() : "",
				university: visibility === "university" ? university.trim() : "",
				virtualEnabled,
				registrationEnabled,
				leaderboardFreeze,
				penaltyRules: {
					minutesPerIncorrect: penaltyMinutes
				},
				maxParticipants,
				rules: rules.trim(),
				securityLevel,
				status: finalStatus
			};

			await updateDoc(contestRef, updateData);

			if (endEpoch <= now && !wasAlreadyEnded) {
				const annRef = collection(firestore, "contest_announcements");
				await addDoc(annRef, {
					contestId: cid,
					title: "Contest Ended Early",
					content: `The contest has been ended by the administrator. The end time was updated to ${new Date(endEpoch).toLocaleString()}.`,
					timestamp: Date.now()
				});
			}

			triggerStatusRibbon("success", "Contest details updated successfully!");

			// Check if Virtual Mode changed
			const isVirtualChanged = !!virtualEnabled !== wasVirtualEnabled;
			if (isVirtualChanged) {
				try {
					const userToken = await auth.currentUser?.getIdToken();
					const virtualRes = await fetch("/api/send-virtual-mode-email", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${userToken}`
						},
						body: JSON.stringify({
							contestId: cid,
							title,
							action: virtualEnabled ? "enabled" : "disabled",
							visibility,
							university,
							origin: window.location.origin
						})
					});
					const virtualData = await virtualRes.json();
					if (virtualData.success && virtualData.previewUrl) {
						console.log(`Virtual mode email generated. Preview at: ${virtualData.previewUrl}`);
					}
				} catch (virtualEmailErr) {
					console.error("Failed to send virtual mode email:", virtualEmailErr);
				}
			}
		} catch (err: any) {
			console.error("Error updating details:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Failed to update details."));
		} finally {
			setSubmitting(false);
		}
	};


	// Save Editorial
	const handleSaveEditorial = async () => {
		if (!cid) return;
		setSubmitting(true);
		triggerStatusRibbon("info", "Saving editorial...", 0);

		try {
			const edRef = doc(firestore, "contest_editorial", cid as string);
			await setDoc(edRef, {
				id: cid,
				markdown: editorialMarkdown.trim(),
				releasedAt: Date.now()
			});
			triggerStatusRibbon("success", "Contest editorial updated successfully!");
		} catch (err: any) {
			console.error("Error updating editorial:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Failed to save editorial."));
		} finally {
			setSubmitting(false);
		}
	};

	// Add problem to contest
	const handleAddProblem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cid || !selectedDbProblem) return;

		setSubmitting(true);
		const previousContestProblems = [...contestProblems];
		try {
			const probItem = allDbProblems.find(p => p.id === selectedDbProblem);
			if (!probItem) return;

			const newOrder = contestProblems.length + 1;
			const targetId = `${cid}_${selectedDbProblem}`;
			const cpRef = doc(firestore, "contest_problems", targetId);

			const newProb: ContestProblem = {
				id: targetId,
				contestId: cid as string,
				problemId: selectedDbProblem,
				label: newProbLabel.toUpperCase(),
				points: Number(newProbPoints) || 500,
				difficulty: probItem.difficulty,
				order: newOrder,
				customConstraints: newProbConstraints.trim(),
				title: probItem.title || probItem.id
			};

			setContestProblems(prev => [...prev, newProb]);
			setSelectedDbProblem("");
			setNewProbConstraints("");
			triggerStatusRibbon("success", `Problem ${probItem.title} added successfully!`);

			await setDoc(cpRef, {
				id: targetId,
				contestId: cid,
				problemId: selectedDbProblem,
				label: newProbLabel.toUpperCase(),
				points: Number(newProbPoints) || 500,
				difficulty: probItem.difficulty,
				order: newOrder,
				customConstraints: newProbConstraints.trim()
			});
		} catch (err: any) {
			console.error("Error adding problem:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Error adding problem."));
			setContestProblems(previousContestProblems);
		} finally {
			setSubmitting(false);
		}
	};

	// Delete problem from contest
	const handleDeleteProblem = async (problemId: string) => {
		if (!cid) return;
		const previousContestProblems = [...contestProblems];
		const remaining = previousContestProblems
			.filter((p) => p.problemId !== problemId)
			.map((p, index) => ({ ...p, order: index + 1 }));
		setContestProblems(remaining);
		triggerStatusRibbon("success", "Problem removed from contest");

		try {
			const targetId = `${cid}_${problemId}`;
			await deleteDoc(doc(firestore, "contest_problems", targetId));

			// Recalculate orders of remaining problems
			const batch = writeBatch(firestore);
			remaining.forEach((p) => {
				const cpRef = doc(firestore, "contest_problems", p.id);
				batch.update(cpRef, { order: p.order });
			});
			await batch.commit();
		} catch (err: any) {
			console.error("Error removing problem:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Failed to remove problem."));
			setContestProblems(previousContestProblems);
		}
	};

	const handleAddProblemsModal = async (ids: string[]) => {
		if (!cid) return;
		const previousContestProblems = [...contestProblems];
		try {
			const batch = writeBatch(firestore);
			let currentCount = contestProblems.length;
			const newItems: ContestProblem[] = [];

			for (const id of ids) {
				if (contestProblems.some((p) => p.problemId === id)) continue;
				const probItem = allDbProblems.find((p) => p.id === id);
				const label = String.fromCharCode(65 + currentCount);
				const points =
					probItem?.difficulty === "Easy"
						? 100
						: probItem?.difficulty === "Medium"
						? 300
						: 500;
				const targetId = `${cid}_${id}`;
				const cpRef = doc(firestore, "contest_problems", targetId);
				const problemData = {
					id: targetId,
					contestId: cid as string,
					problemId: id,
					label,
					points,
					difficulty: probItem?.difficulty || "Medium",
					order: currentCount + 1,
					customConstraints: "",
				};
				batch.set(cpRef, problemData);
				newItems.push({
					...problemData,
					title: probItem?.title || id
				});
				currentCount++;
			}

			if (newItems.length > 0) {
				setContestProblems(prev => [...prev, ...newItems]);
			}
			triggerStatusRibbon("success", `${ids.length} problem(s) added successfully.`);

			await batch.commit();
		} catch (err: any) {
			console.error("Error adding problems:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Failed to add problems."));
			setContestProblems(previousContestProblems);
		}
	};

	const handleRemoveProblemsModal = async (ids: string[]) => {
		if (!cid) return;
		const previousContestProblems = [...contestProblems];
		const remaining = previousContestProblems
			.filter((p) => !ids.includes(p.problemId))
			.map((p, index) => ({ ...p, order: index + 1 }));
		setContestProblems(remaining);
		triggerStatusRibbon("success", "Problems removed successfully.");

		try {
			const batch = writeBatch(firestore);
			for (const id of ids) {
				const targetId = `${cid}_${id}`;
				batch.delete(doc(firestore, "contest_problems", targetId));
			}

			remaining.forEach((p) => {
				const cpRef = doc(firestore, "contest_problems", p.id);
				batch.update(cpRef, { order: p.order });
			});

			await batch.commit();
		} catch (err: any) {
			console.error("Error removing problems:", err);
			triggerStatusRibbon("error", getFriendlyErrorMessage(err, "Failed to remove problems."));
			setContestProblems(previousContestProblems);
		}
	};

	const handleReorderProblemsModal = async (orderedIds: string[]) => {
		if (!cid) return;
		const previousContestProblems = [...contestProblems];
		const reordered: ContestProblem[] = [];
		orderedIds.forEach((id, index) => {
			const existing = previousContestProblems.find(p => p.problemId === id);
			if (existing) {
				reordered.push({ ...existing, order: index + 1 });
			}
		});
		setContestProblems(reordered);

		try {
			const batch = writeBatch(firestore);
			orderedIds.forEach((id, index) => {
				const targetId = `${cid}_${id}`;
				const cpRef = doc(firestore, "contest_problems", targetId);
				batch.update(cpRef, { order: index + 1 });
			});
			await batch.commit();
		} catch (err: any) {
			console.error("Error updating order:", err);
			setContestProblems(previousContestProblems);
		}
	};

	// Move problem order Up or Down
	const handleMoveProblem = async (index: number, direction: "up" | "down") => {
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === contestProblems.length - 1) return;

		const previousContestProblems = [...contestProblems];
		const swapIndex = direction === "up" ? index - 1 : index + 1;
		const current = previousContestProblems[index];
		const target = previousContestProblems[swapIndex];

		const updated = [...previousContestProblems];
		updated[index] = { ...target, order: current.order };
		updated[swapIndex] = { ...current, order: target.order };
		setContestProblems(updated);

		try {
			const batch = writeBatch(firestore);
			batch.update(doc(firestore, "contest_problems", current.id), { order: target.order });
			batch.update(doc(firestore, "contest_problems", target.id), { order: current.order });
			await batch.commit();
		} catch (err: any) {
			console.error("Error reordering:", err);
			setContestProblems(previousContestProblems);
		}
	};

	// Create new Announcement
	const handleCreateAnnouncement = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cid || !announceTitle.trim() || !announceContent.trim()) return;

		try {
			const annRef = collection(firestore, "contest_announcements");
			const now = Date.now();
			const titleText = announceTitle.trim();
			const contentText = announceContent.trim();
			const docRef = await addDoc(annRef, {
				contestId: cid,
				title: titleText,
				content: contentText,
				timestamp: now
			});

			setAnnouncements(prev => [
				{
					id: docRef.id,
					contestId: cid as string,
					title: titleText,
					content: contentText,
					timestamp: now
				},
				...prev
			]);

			setAnnounceTitle("");
			setAnnounceContent("");
			triggerStatusRibbon("success", "Announcement posted!");
		} catch (err: any) {
			console.error("Error posting announcement:", err);
			triggerStatusRibbon("error", "Failed to post announcement.");
		}
	};

	// Answer Clarification query
	const handleAnswerClarification = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cid || !answeringId || !clarAnswerText.trim()) return;

		const prevClarifications = [...clarifications];
		const now = Date.now();
		const answerText = clarAnswerText.trim();
		const isPublic = clarIsPublic;
		const targetId = answeringId;

		setClarifications(prev => prev.map(c => c.id === targetId ? {
			...c,
			answer: answerText,
			isPublic,
			answeredAt: now
		} : c));

		try {
			const clarRef = doc(firestore, "contest_clarifications", targetId);
			await updateDoc(clarRef, {
				answer: answerText,
				isPublic,
				answeredAt: now
			});

			setAnsweringId(null);
			setClarAnswerText("");
			triggerStatusRibbon("success", "Clarification answered!");
		} catch (err: any) {
			console.error("Error answering clarification:", err);
			triggerStatusRibbon("error", "Failed to submit answer.");
			setClarifications(prevClarifications);
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

	if (loading) {
		return (
			<AppShell activeNav="Admin" maxWidth="wide">
				<div className="py-24">
					<LoadingState message="Loading contest details..." />
				</div>
			</AppShell>
		);
	}

	const tabs = [
		{ id: "details", label: "Contest Details", icon: <FaEdit /> },
		{ id: "problems", label: "Problem Set", icon: <FaPlus /> },
		{ id: "announcements", label: "Announcements", icon: <FaVolumeUp /> },
		{ id: "clarifications", label: "Clarifications", icon: <FaQuestionCircle /> },
		{ id: "editorial", label: "Editorial", icon: <FaFileAlt /> },
		{ id: "statistics", label: "Integrity & Stats", icon: <FaChartBar /> },
	];

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title={title || "Edit Contest"}
				description={`Contest ID: ${cid} · Manage schedule, problem roster, announcements, and clar response queue.`}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Contests", href: "/admin?tab=contests" },
					{ label: title || (cid as string) },
				]}
				badge={
					<Badge
						variant={status === "active" ? "accent" : status === "upcoming" ? "warning" : "default"}
						size="sm"
						className="font-mono uppercase"
					>
						{status}
					</Badge>
				}
				actions={
					<div className="flex items-center gap-2">
						<Link
							href={`/contests/${cid}`}
							target="_blank"
							className="px-3.5 py-1.5 rounded-md text-xs font-medium transition bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
						>
							Preview Contest
						</Link>
						{activeTab === "details" && (
							<button
								type="button"
								onClick={handleSaveDetails}
								disabled={submitting}
								className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
							>
								{submitting ? <FaSpinner className="animate-spin" size={11} /> : <FaCheck size={11} />}
								Save Details
							</button>
						)}
						{activeTab === "editorial" && (
							<button
								type="button"
								onClick={handleSaveEditorial}
								disabled={submitting}
								className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
							>
								{submitting ? <FaSpinner className="animate-spin" size={11} /> : <FaCheck size={11} />}
								Save Editorial
							</button>
						)}
					</div>
				}
			/>

			{/* Status Ribbon */}
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

			{/* Tabs Navigation */}
				<SecondaryNav
					tabs={tabs}
					activeTab={activeTab}
					onChange={setActiveTab}
					className="mb-6"
				/>

				<div className='border rounded shadow-sm p-8' style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
					
					{/* DETAILS TAB */}
					{activeTab === "details" && (
						<div className='space-y-6'>
							<h3 className='text-lg font-semibold border-b pb-3' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
								Contest Settings
							</h3>

							{/* Centralized Contest State Engine Preview Block */}
							{(() => {
								const contestDataForState = {
									id: cid as string,
									startTime: startTime ? new Date(startTime).getTime() : 0,
									endTime: endTime ? new Date(endTime).getTime() : 0,
									leaderboardFreeze: leaderboardFreeze || 0,
									status: status,
									registrationEnabled: registrationEnabled !== false,
								};
								const computedStatus = getContestStatus(contestDataForState, now);
								return (
									<div className='p-4 rounded-xl border space-y-3' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)" }}>
										<div className='flex items-center justify-between'>
											<h4 className='text-xs font-bold uppercase tracking-wider text-brand-orange'>
												Contest State Engine Live Preview
											</h4>
											<span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
												computedStatus === "running" ? "text-emerald-400 bg-emerald-400/10" :
												computedStatus === "frozen" ? "text-cyan-400 bg-cyan-400/10" :
												computedStatus === "scheduled" || computedStatus === "registration_open" ? "text-blue-400 bg-blue-400/10" :
												computedStatus === "draft" ? "text-gray-400 bg-gray-400/10" :
												"text-amber-400 bg-amber-400/10"
											}`}>
												Status: {computedStatus}
											</span>
										</div>
										
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs' style={{ color: "var(--text-secondary)" }}>
											<div className='space-y-1'>
												<p><span className='font-semibold text-white'>Effective State:</span> The contest is computed as <span className='capitalize font-bold text-white'>{computedStatus}</span> based on synced server time.</p>
												<p><span className='font-semibold text-white'>Synced Server Clock:</span> {new Date(now).toLocaleString()} (UTC offset)</p>
											</div>
											<div className='space-y-1 border-t md:border-t-0 md:border-l pt-2 md:pt-0 md:pl-4 border-border-subtle'>
												<p className='font-semibold text-white mb-1'>Transition Roadmap Preview:</p>
												{contestDataForState.startTime > 0 && (
													<p className={now < contestDataForState.startTime ? "text-blue-400 font-medium" : "text-gray-500 line-through"}>
														• Starts/Open: {new Date(contestDataForState.startTime).toLocaleString()} 
														{now < contestDataForState.startTime && ` (in ${Math.round((contestDataForState.startTime - now) / 60000)} mins)`}
													</p>
												)}
												{contestDataForState.endTime > 0 && contestDataForState.leaderboardFreeze > 0 && (
													<p className={now >= contestDataForState.startTime && now < (contestDataForState.endTime - contestDataForState.leaderboardFreeze * 60000) ? "text-cyan-400 font-medium" : now >= (contestDataForState.endTime - contestDataForState.leaderboardFreeze * 60000) ? "text-gray-500 line-through" : "text-gray-400"}>
														• Freeze Start: {new Date(contestDataForState.endTime - contestDataForState.leaderboardFreeze * 60000).toLocaleString()}
														{now < (contestDataForState.endTime - contestDataForState.leaderboardFreeze * 60000) && ` (in ${Math.round(((contestDataForState.endTime - contestDataForState.leaderboardFreeze * 60000) - now) / 60000)} mins)`}
													</p>
												)}
												{contestDataForState.endTime > 0 && (
													<p className={now < contestDataForState.endTime ? "text-amber-400 font-medium" : "text-gray-500 line-through"}>
														• Ends: {new Date(contestDataForState.endTime).toLocaleString()}
														{now < contestDataForState.endTime && ` (in ${Math.round((contestDataForState.endTime - now) / 60000)} mins)`}
													</p>
												)}
											</div>
										</div>
									</div>
								);
							})()}

							<div className='grid grid-cols-12 gap-4 items-center'>
								<label htmlFor='status' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
									Lifecycle Status
								</label>
								<div className='col-span-4'>
									<BeastCodeSelect
										options={[
											{ value: "draft", label: "Draft (Hidden from lists)" },
											{ value: "scheduled", label: "Scheduled (Visible, registering)" },
											{ value: "running", label: "Running (Active solving)" },
											{ value: "ended", label: "Ended (Free standings, editorial open)" },
											{ value: "archived", label: "Archived (Past standings read-only)" }
										]}
										value={status}
										onChange={(val) => setStatus(val)}
										size="md"
									/>
								</div>
							</div>

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
										className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										required
									/>
								</div>
							</div>

							<div className='grid grid-cols-12 gap-4 items-start'>
								<label htmlFor='description' className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
									Description
								</label>
								<div className='col-span-9'>
									<textarea
										id='description'
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										rows={2}
										className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange transition font-sans'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									/>
								</div>
							</div>

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
										className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									/>
								</div>
							</div>

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
										className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										required
									/>
								</div>
							</div>

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

							{visibility === "password" && (
								<div className='grid grid-cols-12 gap-4 items-center'>
									<label htmlFor='password' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
										Password
									</label>
									<div className='col-span-4'>
										<input
											type='text'
											id='password'
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										/>
									</div>
								</div>
							)}

							{visibility === "university" && (
								<div className='grid grid-cols-12 gap-4 items-center'>
									<label htmlFor='university' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
										Required Domain
									</label>
									<div className='col-span-4'>
										<input
											type='text'
											id='university'
											value={university}
											onChange={(e) => setUniversity(e.target.value)}
											className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										/>
									</div>
								</div>
							)}

							<div className='grid grid-cols-12 gap-4 items-center'>
								<label htmlFor='securityLevel' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
									Anti-Cheat Security
								</label>
								<div className='col-span-5'>
									<BeastCodeSelect
										options={[
											{ value: "casual", label: "Casual" },
											{ value: "standard", label: "Standard (Fullscreen check)" },
											{ value: "strict", label: "Strict (Fullscreen + immediate lock)" }
										]}
										value={securityLevel}
										onChange={(val) => setSecurityLevel(val)}
										size="md"
									/>
								</div>
							</div>

							<div className='grid grid-cols-12 gap-4 items-center'>
								<label htmlFor='penaltyMinutes' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
									Penalty per Wrong Submission
								</label>
								<div className='col-span-3'>
									<input
										type='number'
										id='penaltyMinutes'
										value={penaltyMinutes}
										onChange={(e) => setPenaltyMinutes(Number(e.target.value))}
										className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									/>
								</div>
							</div>

							<div className='grid grid-cols-12 gap-4 items-center'>
								<label htmlFor='leaderboardFreeze' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
									Leaderboard Freeze period (mins)
								</label>
								<div className='col-span-3'>
									<input
										type='number'
										id='leaderboardFreeze'
										value={leaderboardFreeze}
										onChange={(e) => setLeaderboardFreeze(Number(e.target.value))}
										className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									/>
								</div>
							</div>

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
										Enable Virtual Mode
									</label>
									<label className='flex items-center gap-2 cursor-pointer font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
										<input
											type='checkbox'
											checked={registrationEnabled}
											onChange={(e) => setRegistrationEnabled(e.target.checked)}
											className='accent-brand-orange w-4 h-4'
										/>
									</label>
								</div>
							</div>

							<div className='grid grid-cols-12 gap-4 items-start'>
								<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
									Contest Rules
								</label>
								<div className='col-span-9'>
									<MarkdownEditor
										value={rules}
										onChange={setRules}
										height='200px'
									/>
								</div>
							</div>

							<div className='flex justify-end gap-3 pt-4 border-t border-border-subtle'>
								<button
									type='button'
									onClick={handleSaveDetails}
									disabled={submitting}
									className='hover:opacity-90 px-6 py-2.5 rounded font-bold text-sm transition shadow flex items-center gap-2'
									style={{ background: "var(--brand-orange)", color: "var(--bg-base)" }}
								>
									{submitting && <FaSpinner className='animate-spin' size={12} />}
									Save Details
								</button>
							</div>
						</div>
					)}

					{/* PROBLEMS TAB */}
					{activeTab === "problems" && (
						<div className='space-y-6'>
							<div className='flex justify-between items-center border-b pb-4'>
								<div>
									<h3 className='text-lg font-semibold' style={{ color: "var(--text-primary)" }}>Manage Contest Problems</h3>
									<p className='text-xs' style={{ color: "var(--text-muted)" }}>
										Sequenced problems to render inside the workspace. Include point scoring and constraints.
									</p>
								</div>
								<div className='flex gap-2.5'>
									<button
										onClick={() => setIsPickerOpen(true)}
										className='flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors'
									>
										<FaSearch size={12} /> Open Advanced Search / Picker
									</button>
									<Link
										href='/admin/problems/new'
										className='flex items-center gap-1.5 bg-surface-elevated border border-border-subtle hover:bg-surface-hover text-text-primary text-xs font-medium px-3 py-1.5 rounded-md transition-colors'
									>
										<FaPlus size={10} /> Create New Problem
									</Link>
								</div>
							</div>

							{/* Add problem form */}
							<div className='p-4 border rounded-lg grid grid-cols-12 gap-4 items-end' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)" }}>
								<div className='col-span-12 md:col-span-4'>
									<label className='text-xs font-bold block mb-1.5' style={{ color: "var(--text-secondary)" }}>
										Select Problem to Import
									</label>
									<BeastCodeSelect
										options={allDbProblems
											.filter(p => !contestProblems.some(cp => cp.problemId === p.id))
											.map(p => ({
												value: p.id,
												label: p.title,
												subLabel: p.difficulty
											}))
										}
										value={selectedDbProblem}
										onChange={setSelectedDbProblem}
										placeholder="-- Choose Algorithmic Problem --"
										searchable
									/>
								</div>

								<div className='col-span-4 md:col-span-2'>
									<label htmlFor='newProbLabel' className='text-xs font-bold block mb-1.5' style={{ color: "var(--text-secondary)" }}>
										Label (e.g. A)
									</label>
									<input
										type='text'
										id='newProbLabel'
										value={newProbLabel}
										onChange={(e) => setNewProbLabel(e.target.value)}
										className='border outline-none rounded p-2.5 text-xs w-full focus:border-brand-orange text-center'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										required
									/>
								</div>

								<div className='col-span-4 md:col-span-2'>
									<label htmlFor='newProbPoints' className='text-xs font-bold block mb-1.5' style={{ color: "var(--text-secondary)" }}>
										Points
									</label>
									<input
										type='number'
										id='newProbPoints'
										value={newProbPoints}
										onChange={(e) => setNewProbPoints(e.target.value)}
										className='border outline-none rounded p-2.5 text-xs w-full focus:border-brand-orange text-center'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										min='0'
										required
									/>
								</div>

								<div className='col-span-4 md:col-span-3'>
									<label htmlFor='newProbCon' className='text-xs font-bold block mb-1.5' style={{ color: "var(--text-secondary)" }}>
										Custom Constraints override
									</label>
									<input
										type='text'
										id='newProbCon'
										value={newProbConstraints}
										onChange={(e) => setNewProbConstraints(e.target.value)}
										placeholder='e.g. 1.0s, 256MB'
										className='border outline-none rounded p-2.5 text-xs w-full focus:border-brand-orange'
										style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
									/>
								</div>

								<div className='col-span-12 md:col-span-1'>
									<button
										onClick={(e) => {
											e.preventDefault();
											handleAddProblem(e);
										}}
										className='w-full py-2.5 rounded font-bold text-xs hover:opacity-90 flex items-center justify-center'
										style={{ background: "var(--color-success)", color: "var(--bg-surface)" }}
									>
										Add
									</button>
								</div>
							</div>

							{/* Problems Table */}
							{contestProblems.length === 0 ? (
								<p className='text-sm text-center py-6 text-gray-500'>No problems added to this contest yet.</p>
							) : (
								<div className='overflow-x-auto border rounded-xl' style={{ borderColor: "var(--border-default)" }}>
									<table className='w-full text-sm text-left' style={{ color: "var(--text-secondary)" }}>
										<thead className='bg-dark-layer-1'>
											<tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
												<th className='px-4 py-3 w-16 text-center'>Label</th>
												<th className='px-4 py-3'>Problem Title</th>
												<th className='px-4 py-3 w-28'>Difficulty</th>
												<th className='px-4 py-3 w-24 text-center'>Points</th>
												<th className='px-4 py-3 w-32'>Constraints</th>
												<th className='px-4 py-3 w-32 text-center'>Ordering</th>
												<th className='px-4 py-3 w-20 text-center'>Remove</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-border-subtle'>
											{contestProblems.map((cp, idx) => (
												<tr key={cp.id} className='hover:bg-dark-fill-3 transition'>
													<td className='px-4 py-3 text-center font-bold text-brand-orange'>{cp.label}</td>
													<td className='px-4 py-3 font-semibold text-white'>{cp.title || cp.problemId}</td>
													<td className='px-4 py-3'>
														{(() => {
															const diffColor =
																cp.difficulty === "Easy"
																	? { color: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "color-mix(in srgb, var(--color-success) 25%, transparent)" }
																	: cp.difficulty === "Medium"
																	? { color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "color-mix(in srgb, var(--color-warning) 25%, transparent)" }
																	: { color: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "color-mix(in srgb, var(--color-error) 25%, transparent)" };
															return (
																<span
																	className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border'
																	style={{
																		color: diffColor.color,
																		background: diffColor.bg,
																		borderColor: diffColor.border,
																	}}
																>
																	{cp.difficulty}
																</span>
															);
														})()}
													</td>
													<td className='px-4 py-3 text-center font-bold'>{cp.points}</td>
													<td className='px-4 py-3 text-xs font-mono'>{cp.customConstraints || "Default"}</td>
													<td className='px-4 py-3 text-center'>
														<div className='flex items-center justify-center gap-1.5'>
															<button
																type='button'
																onClick={() => handleMoveProblem(idx, "up")}
																disabled={idx === 0}
																className='p-1.5 hover:bg-dark-fill-2 text-gray-400 disabled:opacity-30 rounded'
															>
																<FaArrowUp size={10} />
															</button>
															<button
																type='button'
																onClick={() => handleMoveProblem(idx, "down")}
																disabled={idx === contestProblems.length - 1}
																className='p-1.5 hover:bg-dark-fill-2 text-gray-400 disabled:opacity-30 rounded'
															>
																<FaArrowDown size={10} />
															</button>
														</div>
													</td>
													<td className='px-4 py-3 text-center'>
														<button
															type='button'
															onClick={() => handleDeleteProblem(cp.problemId)}
															className='p-1.5 hover:bg-rose-950 text-rose-500 rounded'
														>
															<FaTrash size={10} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{/* ANNOUNCEMENTS TAB */}
					{activeTab === "announcements" && (
						<div className='space-y-6'>
							<h3 className='text-lg font-semibold border-b pb-3' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
								Broadcast Announcements
							</h3>

							<form onSubmit={handleCreateAnnouncement} className='space-y-4 border p-6 rounded-lg' style={{ borderColor: "var(--border-subtle)", background: "var(--bg-dark-layer-1)" }}>
								<div className='grid grid-cols-12 gap-4 items-center'>
									<label htmlFor='annTitle' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
										Title
									</label>
									<div className='col-span-8'>
										<input
											type='text'
											id='annTitle'
											value={announceTitle}
											onChange={(e) => setAnnounceTitle(e.target.value)}
											placeholder='e.g. Clarification on Problem B constraints'
											className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											required
										/>
									</div>
								</div>

								<div className='grid grid-cols-12 gap-4 items-start'>
									<label htmlFor='annContent' className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
										Content
									</label>
									<div className='col-span-9'>
										<textarea
											id='annContent'
											value={announceContent}
											onChange={(e) => setAnnounceContent(e.target.value)}
											rows={4}
											placeholder='Announcement detail markdown...'
											className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange transition font-sans'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											required
										/>
									</div>
								</div>

								<div className='flex justify-end'>
									<button
										type='submit'
										className='hover:opacity-90 px-6 py-2 rounded font-bold text-xs'
										style={{ background: "var(--brand-orange)", color: "var(--bg-base)" }}
									>
										Publish Announcement
									</button>
								</div>
							</form>

							<div className='space-y-3 pt-4'>
								<h4 className='text-sm font-bold uppercase tracking-wider text-gray-400'>Published Logs</h4>
								{announcements.length === 0 ? (
									<p className='text-xs text-gray-500 italic'>No announcements posted yet.</p>
								) : (
									<div className='space-y-3'>
										{announcements.map((a) => (
											<div key={a.id} className='p-4 border rounded-lg' style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
												<div className='flex justify-between items-center mb-1'>
													<span className='font-bold text-white'>{a.title}</span>
													<span className='text-[10px] font-semibold text-gray-500'>
														{new Date(a.timestamp).toLocaleString()}
													</span>
												</div>
												<p className='text-xs text-gray-300 whitespace-pre-wrap'>{a.content}</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* CLARIFICATIONS TAB */}
					{activeTab === "clarifications" && (
						<div className='space-y-6'>
							<h3 className='text-lg font-semibold border-b pb-3' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
								Participant Clarifications
							</h3>

							{clarifications.length === 0 ? (
								<p className='text-sm text-center py-6 text-gray-500'>No clarification requests submitted yet.</p>
							) : (
								<div className='space-y-4'>
									{clarifications.map((c) => (
										<div key={c.id} className='border rounded-lg p-4' style={{ borderColor: "var(--border-subtle)", background: "var(--bg-dark-layer-1)" }}>
											<div className='flex justify-between items-center mb-2'>
												<span className='text-xs font-bold text-brand-orange'>From: {c.username}</span>
												<span className='text-[10px] font-semibold text-gray-500'>{new Date(c.askedAt).toLocaleString()}</span>
											</div>
											<div className='mb-3'>
												<span className='text-xs font-bold block text-gray-400'>Question:</span>
												<p className='text-sm text-white italic pl-2 border-l-2 border-brand-orange/40'>{c.question}</p>
											</div>

											{c.answer ? (
												<div className='pl-4 border-l-2 border-emerald-500/50 bg-emerald-950/10 py-2 rounded-r'>
													<span className='text-xs font-bold block text-emerald-400'>Answer ({c.isPublic ? "Public" : "Private"}):</span>
													<p className='text-sm text-gray-200'>{c.answer}</p>
													{c.answeredAt && (
														<span className='text-[9px] text-gray-500 font-semibold mt-1 block'>
															Answered at: {new Date(c.answeredAt).toLocaleString()}
														</span>
													)}
												</div>
											) : answeringId === c.id ? (
												<form onSubmit={handleAnswerClarification} className='mt-3 p-3 border rounded space-y-3 bg-dark-fill-3' style={{ borderColor: "var(--border-default)" }}>
													<textarea
														value={clarAnswerText}
														onChange={(e) => setClarAnswerText(e.target.value)}
														placeholder='Type answer here...'
														rows={3}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
														required
													/>
													<div className='flex items-center justify-between'>
														<label className='flex items-center gap-1.5 text-xs text-gray-300 font-semibold cursor-pointer'>
															<input
																type='checkbox'
																checked={clarIsPublic}
																onChange={(e) => setClarIsPublic(e.target.checked)}
																className='accent-brand-orange'
															/>
															Broadcast to all participants (Public)
														</label>
														<div className='flex gap-2'>
															<button
																type='button'
																onClick={() => setAnsweringId(null)}
																className='px-3 py-1.5 rounded text-xs bg-dark-fill-2 text-gray-300 border border-border-default'
															>
																Cancel
															</button>
															<button
																type='submit'
																className='px-4 py-1.5 rounded text-xs font-bold text-white bg-brand-orange'
															>
																Submit Answer
															</button>
														</div>
													</div>
												</form>
											) : (
												<button
													type='button'
													onClick={() => { setAnsweringId(c.id); setClarAnswerText(""); setClarIsPublic(false); }}
													className='mt-2 px-4 py-1.5 rounded text-xs font-bold hover:opacity-90'
													style={{ background: "var(--brand-orange)", color: "var(--bg-base)" }}
												>
													Answer Query
												</button>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* EDITORIAL TAB */}
					{activeTab === "editorial" && (
						<div className='space-y-6'>
							<div>
								<h3 className='text-lg font-semibold mb-1' style={{ color: "var(--text-primary)" }}>Official Solution & Editorial</h3>
								<p className='text-xs mb-4' style={{ color: "var(--text-muted)" }}>
									This content will automatically unlock for participants once the contest ends.
								</p>
							</div>

							<MarkdownEditor
								value={editorialMarkdown}
								onChange={setEditorialMarkdown}
								placeholder='Write algorithmic approaches, dynamic stubs, time/space limits explanations...'
								height='400px'
							/>

							<div className='flex justify-end pt-4 border-t border-border-subtle'>
								<button
									type='button'
									onClick={handleSaveEditorial}
									disabled={submitting}
									className='hover:opacity-90 px-6 py-2.5 rounded font-bold text-sm transition shadow flex items-center gap-2'
									style={{ background: "var(--brand-orange)", color: "var(--bg-base)" }}
								>
									{submitting && <FaSpinner className='animate-spin' size={12} />}
									Save Editorial
								</button>
							</div>
						</div>
					)}

					{/* STATISTICS TAB */}
					{activeTab === "statistics" && (
						<div className='space-y-6'>
							<div className='border-b pb-4'>
								<h3 className='text-lg font-semibold' style={{ color: "var(--text-primary)" }}>Security Logs & Integrity Logs</h3>
								<p className='text-xs' style={{ color: "var(--text-muted)" }}>
									Tracks cheating, fullscreen escapes, tab switching, and connection anomalies.
								</p>
							</div>

							{integrityLogs.length === 0 ? (
								<p className='text-sm text-center py-6 text-gray-500 italic'>No integrity issues logged. Secure Mode is active.</p>
							) : (
								<div className='overflow-x-auto border rounded-xl' style={{ borderColor: "var(--border-default)" }}>
									<table className='w-full text-sm text-left' style={{ color: "var(--text-secondary)" }}>
										<thead className='bg-dark-layer-1'>
											<tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
												<th className='px-4 py-3'>Timestamp</th>
												<th className='px-4 py-3'>Username</th>
												<th className='px-4 py-3'>Event Type</th>
												<th className='px-4 py-3'>Details</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-border-subtle'>
											{integrityLogs.map((log) => (
												<tr key={log.id} className='hover:bg-dark-fill-3 transition'>
													<td className='px-4 py-3 text-xs text-gray-500 font-mono'>
														{new Date(log.timestamp).toLocaleString()}
													</td>
													<td className='px-4 py-3 font-semibold text-white'>{log.username || log.uid}</td>
													<td className='px-4 py-3'>
														<span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1.5 w-fit ${
															log.type === "fullscreen_exit" ? "text-red-400 bg-red-950/20" :
															log.type === "tab_switch" ? "text-yellow-400 bg-yellow-950/20" :
															"text-blue-400 bg-blue-950/20"
														}`}>
															<FaExclamationTriangle size={10} />
															{log.type.replace("_", " ")}
														</span>
													</td>
													<td className='px-4 py-3 text-xs text-gray-300'>{log.details}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}
				</div>

			<SearchableProblemPicker
				isOpen={isPickerOpen}
				onClose={() => setIsPickerOpen(false)}
				availableProblems={allDbProblems}
				currentContestProblemIds={contestProblems.map((p) => p.problemId)}
				onAddProblems={handleAddProblemsModal}
				onRemoveProblems={handleRemoveProblemsModal}
				onReorderProblems={handleReorderProblemsModal}
			/>
		</AppShell>
	);
};

export default EditContest;
