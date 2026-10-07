import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
	collection,
	getDocs,
	doc,
	getDoc,
	setDoc,
	deleteDoc,
	query,
	orderBy,
	writeBatch,
	updateDoc,
	where
} from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { getServerTime, getContestStatus, syncContestStatus } from "@/utils/contestStatusService";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import {
	FaEdit,
	FaTrash,
	FaPlus,
	FaClone,
	FaArchive,
	FaSpinner,
	FaLock,
	FaGlobe,
	FaSearch
} from "react-icons/fa";
import { ConfirmationModal } from "./AdminShared";

interface ContestListItem {
	id: string; // Slug
	title: string;
	description: string;
	startTime: number;
	endTime: number;
	duration: number;
	visibility: string;
	securityLevel: string;
	status: string;
	createdAt: number;
	leaderboardFreeze: number;
	registrationEnabled: boolean;
}

interface ContestsTabProps {
	triggerStatusMessage: (type: "success" | "error" | "info", msg: string) => void;
}

export const ContestsTab: React.FC<ContestsTabProps> = ({ triggerStatusMessage }) => {
	const [contests, setContests] = useState<ContestListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [cloningId, setCloningId] = useState<string | null>(null);
	const [contestToDelete, setContestToDelete] = useState<ContestListItem | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	const fetchContests = useCallback(async () => {
		setLoading(true);
		try {
			const q = query(collection(firestore, "contests"), orderBy("createdAt", "desc"));
			const querySnapshot = await getDocs(q);
			const list: ContestListItem[] = [];
			const now = getServerTime();
			querySnapshot.forEach((docSnap) => {
				const data = docSnap.data();
				const contestData = {
					id: docSnap.id,
					startTime: data.startTime || 0,
					endTime: data.endTime || 0,
					leaderboardFreeze: data.leaderboardFreeze || 0,
					status: data.status || "draft",
					registrationEnabled: data.registrationEnabled !== false,
				};

				const computedStatus = getContestStatus(contestData, now);

				// Sync database in background if status drifted
				if (data.status !== computedStatus) {
					syncContestStatus(docSnap.id, data.status || "draft", computedStatus);
				}

				list.push({
					id: docSnap.id,
					title: data.title || docSnap.id,
					description: data.description || "",
					startTime: contestData.startTime,
					endTime: contestData.endTime,
					duration: data.duration || 120,
					visibility: data.visibility || "public",
					securityLevel: data.securityLevel || "standard",
					status: computedStatus,
					createdAt: data.createdAt || 0,
					leaderboardFreeze: contestData.leaderboardFreeze,
					registrationEnabled: contestData.registrationEnabled
				});
			});
			setContests(list);
		} catch (error: any) {
			console.error("Error fetching contests:", error);
			triggerStatusMessage("error", "Failed to load contests.");
		} finally {
			setLoading(false);
		}
	}, [triggerStatusMessage]);

	useEffect(() => {
		fetchContests();
	}, [fetchContests]);

	// Auto-transition contests dynamically in-memory every 5 seconds
	useEffect(() => {
		if (contests.length === 0) return;

		const interval = setInterval(() => {
			const now = getServerTime();
			let hasChanges = false;
			const updated = contests.map((c) => {
				const contestData = {
					id: c.id,
					startTime: c.startTime,
					endTime: c.endTime,
					leaderboardFreeze: c.leaderboardFreeze || 0,
					status: c.status,
					registrationEnabled: c.registrationEnabled,
				};
				const computed = getContestStatus(contestData, now);
				if (computed !== c.status) {
					hasChanges = true;
					syncContestStatus(c.id, c.status, computed);
					return { ...c, status: computed };
				}
				return c;
			});

			if (hasChanges) {
				setContests(updated);
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [contests]);

	// Archive Contest
	const handleArchive = async (id: string) => {
		try {
			const contestRef = doc(firestore, "contests", id);
			await updateDoc(contestRef, { status: "archived" });
			setContests((prev) => prev.map((c) => (c.id === id ? { ...c, status: "archived" } : c)));
			triggerStatusMessage("success", "Contest status set to Archived");
		} catch (error: any) {
			console.error("Error archiving contest:", error);
			triggerStatusMessage("error", "Failed to archive contest.");
		}
	};

	// Clone Contest
	const handleClone = async (original: ContestListItem) => {
		setCloningId(original.id);
		triggerStatusMessage("info", `Cloning contest "${original.title}"...`);

		try {
			const uniqueId = Math.random().toString(36).substring(2, 6);
			const newId = `${original.id}-clone-${uniqueId}`;
			const newTitle = `${original.title} (Clone)`;

			const originalDoc = await getDoc(doc(firestore, "contests", original.id));
			if (!originalDoc.exists()) {
				triggerStatusMessage("error", "Original contest not found.");
				setCloningId(null);
				return;
			}

			const origData = originalDoc.data();
			const clonedContestData = {
				...origData,
				id: newId,
				title: newTitle,
				status: "draft",
				createdAt: Date.now()
			};

			// 1. Save new contest
			await setDoc(doc(firestore, "contests", newId), clonedContestData);

			// 2. Clone associated contest problems
			const cpQuery = query(collection(firestore, "contest_problems"), where("contestId", "==", original.id));
			const cpSnapshot = await getDocs(cpQuery);

			const batch = writeBatch(firestore);
			cpSnapshot.forEach((docSnap) => {
				const cpData = docSnap.data();
				const newCpId = `${newId}_${cpData.problemId}`;
				const cpRef = doc(firestore, "contest_problems", newCpId);
				batch.set(cpRef, {
					...cpData,
					id: newCpId,
					contestId: newId
				});
			});
			await batch.commit();

			// 3. Initialize blank statistics
			const statsRef = doc(firestore, "contest_statistics", newId);
			await setDoc(statsRef, {
				id: newId,
				participantsCount: 0,
				submissionsCount: 0,
				averageScore: 0,
				solveRates: {},
				mostDifficultProblem: "",
				fastestAccepted: {}
			});

			const clonedItem: ContestListItem = {
				id: newId,
				title: newTitle,
				description: origData.description || "",
				startTime: origData.startTime || 0,
				endTime: origData.endTime || 0,
				duration: origData.duration || 120,
				visibility: origData.visibility || "public",
				securityLevel: origData.securityLevel || "standard",
				status: "draft",
				createdAt: Date.now(),
				leaderboardFreeze: origData.leaderboardFreeze || 0,
				registrationEnabled: origData.registrationEnabled !== false
			};
			setContests((prev) => [clonedItem, ...prev]);
			triggerStatusMessage("success", `Contest cloned successfully as "${newTitle}"!`);
		} catch (error: any) {
			console.error("Error cloning contest:", error);
			triggerStatusMessage("error", getFriendlyErrorMessage(error, "Cloning failed. Please try again."));
		} finally {
			setCloningId(null);
		}
	};

	// Delete Contest
	const handleConfirmDelete = async () => {
		if (!contestToDelete) return;
		const deletedId = contestToDelete.id;
		try {
			// 1. Delete contest doc
			await deleteDoc(doc(firestore, "contests", deletedId));

			// 2. Delete contest problems mapping
			const cpQuery = query(collection(firestore, "contest_problems"), where("contestId", "==", deletedId));
			const cpSnapshot = await getDocs(cpQuery);
			const batch = writeBatch(firestore);
			cpSnapshot.forEach((docSnap) => {
				batch.delete(doc(firestore, "contest_problems", docSnap.id));
			});
			await batch.commit();

			// 3. Delete statistics
			await deleteDoc(doc(firestore, "contest_statistics", deletedId));

			setContests((prev) => prev.filter((c) => c.id !== deletedId));
			triggerStatusMessage("success", "Contest deleted successfully");
			setContestToDelete(null);
		} catch (error: any) {
			console.error("Error deleting contest:", error);
			triggerStatusMessage("error", "Failed to delete contest.");
		}
	};

	// Filter and Search logic
	const filteredContests = contests.filter((c) => {
		const matchesSearch =
			c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.id.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === "all" || c.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	return (
		<div className="flex flex-col gap-6">
			{/* Top Panel Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-base font-bold text-[var(--text-primary)]">Manage Contests</h2>
					<p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
						Create, configure, clone, and monitor competitive programming contests.
					</p>
				</div>

				<div className="flex gap-3">
					<Link
						href="/admin/contests/new"
						className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-black px-4 py-2 rounded-md font-semibold text-xs transition duration-200 shadow-sm"
					>
						<FaPlus size={10} />
						Create Contest
					</Link>
				</div>
			</div>

			{/* Search & Filter bar */}
			<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
				{/* Search */}
				<div className="relative w-full sm:max-w-xs">
					<FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={10} />
					<input
						type="text"
						placeholder="Search contests..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						className="w-full pl-9 pr-4 py-2 text-xs rounded-md outline-none border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:border-emerald-500"
					/>
				</div>

				{/* Filter status */}
				<div className="flex gap-1.5 w-full sm:w-auto justify-end overflow-x-auto">
					{["all", "draft", "scheduled", "running", "ended", "archived"].map((st) => (
						<button
							key={st}
							onClick={() => setStatusFilter(st)}
							className={`px-3 py-1.5 rounded-md text-[10px] font-bold capitalize border transition ${
								statusFilter === st
									? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450"
									: "border-[var(--border-subtle)] bg-[var(--bg-dark-fill-3)] text-[var(--text-muted)] hover:text-white"
							}`}
						>
							{st}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="flex flex-col justify-center items-center py-20 gap-4">
					<div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
					<div className="text-[10px] text-[var(--text-muted)]">Loading contests...</div>
				</div>
			) : filteredContests.length === 0 ? (
				<div className="text-center py-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
					<p className="text-xs mb-4 text-[var(--text-secondary)]">No contests found.</p>
					<Link
						href="/admin/contests/new"
						className="bg-emerald-500 hover:bg-emerald-450 text-black px-4 py-2 rounded-md text-xs font-semibold transition inline-block shadow-sm"
					>
						Create First Contest
					</Link>
				</div>
			) : (
				<div className="rounded-lg overflow-hidden shadow-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
					<div className="overflow-x-auto">
						<table className="w-full text-xs text-left text-[var(--text-secondary)]">
							<thead>
								<tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-dark-layer-1)]">
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Title</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-44">Schedule</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-28">Visibility</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-28">Security</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-28">Status</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] w-40 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-subtle)]">
								{filteredContests.map((c) => {
									const statusColor =
										c.status === "running" ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" :
										c.status === "frozen" ? "text-cyan-400 bg-cyan-400/10 border-cyan-500/20" :
										c.status === "scheduled" || c.status === "registration_open" ? "text-blue-400 bg-blue-400/10 border-blue-500/20" :
										c.status === "draft" ? "text-[var(--text-muted)] bg-[var(--bg-dark-fill-3)] border-[var(--border-subtle)]" :
										"text-amber-400 bg-amber-400/10 border-amber-500/20";
									return (
										<tr key={c.id} className="hover:bg-[var(--bg-hover)] transition">
											<td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
												<Link
													href={`/admin/contests/${c.id}/edit`}
													className="hover:text-emerald-400 transition"
												>
													{c.title}
												</Link>
												<p className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">{c.id}</p>
											</td>
											<td className="px-5 py-3.5 text-[10px] space-y-0.5">
												<p><span className="text-[var(--text-muted)]">Start:</span> {new Date(c.startTime).toLocaleDateString()} {new Date(c.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
												<p><span className="text-[var(--text-muted)]">Dur:</span> {c.duration} mins</p>
											</td>
											<td className="px-5 py-3.5">
												<span className="flex items-center gap-1.5 text-[10px] font-bold capitalize">
													{c.visibility === "public" ? <FaGlobe className="text-emerald-400" size={10} /> : <FaLock className="text-yellow-400" size={10} />}
													{c.visibility}
												</span>
											</td>
											<td className="px-5 py-3.5 text-[10px] font-bold capitalize">{c.securityLevel}</td>
											<td className="px-5 py-3.5">
												<span className={`px-2 py-0.5 rounded text-[9px] font-bold capitalize border ${statusColor}`}>
													{c.status}
												</span>
											</td>
											<td className="px-5 py-3.5 text-right">
												<div className="flex justify-end gap-1.5">
													<Link
														href={`/admin/contests/${c.id}/edit`}
														className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-blue-400 hover:text-blue-300 rounded-lg transition border border-[var(--border-subtle)]"
														title="Edit Contest"
													>
														<FaEdit size={11} />
													</Link>
													<button
														type="button"
														onClick={() => handleClone(c)}
														disabled={cloningId === c.id}
														className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-indigo-400 hover:text-indigo-300 rounded-lg transition disabled:opacity-50 border border-[var(--border-subtle)]"
														title="Clone Contest"
													>
														{cloningId === c.id ? <FaSpinner className="animate-spin" size={11} /> : <FaClone size={11} />}
													</button>
													{c.status !== "archived" && c.status !== "draft" && (
														<button
															type="button"
															onClick={() => handleArchive(c.id)}
															className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-amber-400 hover:text-amber-300 rounded-lg transition border border-[var(--border-subtle)]"
															title="Archive Contest"
														>
															<FaArchive size={11} />
														</button>
													)}
													<button
														type="button"
														onClick={() => setContestToDelete(c)}
														className="p-1.5 hover:bg-[var(--bg-dark-fill-3)] text-red-400 hover:text-red-300 rounded-lg transition border border-[var(--border-subtle)]"
														title="Delete Contest"
													>
														<FaTrash size={11} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Delete Contest Modal */}
			<ConfirmationModal
				isOpen={!!contestToDelete}
				onClose={() => setContestToDelete(null)}
				onConfirm={handleConfirmDelete}
				title="Delete Contest"
				message={`Are you sure you want to delete contest "${contestToDelete?.title}"? This will remove the contest and all associated problem parameters and submissions. This action is permanent.`}
				confirmText="Delete Contest"
				isDanger={true}
			/>
		</div>
	);
};
