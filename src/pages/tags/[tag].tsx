import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import AppShell from "@/components/UI/AppShell";
import Breadcrumb from "@/components/UI/Breadcrumb";
import PageHeader from "@/components/UI/PageHeader";
import { DBProblem } from "@/utils/types/problem";
import { problems as staticProblems } from "@/utils/problems";
import { FaTag, FaArrowLeft, FaSpinner } from "react-icons/fa";

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

export default function TagPage() {
	const router = useRouter();
	const { tag } = router.query;

	const [problems, setProblems] = useState<DBProblem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!tag) return;
		const fetchProblemsByTag = async () => {
			setLoading(true);
			const tagStr = tag as string;

			// Helper to check if problem has matching tag case-insensitively and space/dash-agnostically
			const isTagMatch = (tagsArray: string[]) => {
				const normalizedQuery = tagStr.toLowerCase().replace(/[- ]+/g, "");
				return tagsArray.some(t => {
					const normalizedT = t.toLowerCase().replace(/[- ]+/g, "");
					return normalizedT === normalizedQuery;
				});
			};

			try {
				// Fetch deleted problems
				const deletedSnap = await getDocs(collection(firestore, "deleted_problems"));
				const deletedIds = new Set<string>();
				deletedSnap.forEach((d) => deletedIds.add(d.id));

				// Fetch all problems and filter client-side for case-insensitive and space/dash-agnostic matching
				const q = query(collection(firestore, "problems"));
				const querySnapshot = await getDocs(q);
				const list: DBProblem[] = [];

				querySnapshot.forEach((docSnap) => {
					const data = docSnap.data();
					const dbTags = data.tags && Array.isArray(data.tags)
						? data.tags
						: [];
					
					if (isTagMatch(dbTags)) {
						list.push({ id: docSnap.id, ...data, tags: dbTags } as DBProblem);
					}
				});

				// Fallback to static problems matching the tag for seamless local testing
				const staticMatches = Object.values(staticProblems).filter((p) => {
					if (deletedIds.has(p.id)) return false;
					const pTags = p.tags && Array.isArray(p.tags) ? p.tags : [];
					return isTagMatch(pTags);
				}).map(p => ({
					id: p.id,
					title: p.title,
					difficulty: p.difficulty || "Easy",
					tags: p.tags && Array.isArray(p.tags) ? p.tags : [],
					likes: 0,
					dislikes: 0,
					attempts: 0,
					solved: 0,
				} as DBProblem));

				// Merge database problems and local problems (avoiding duplicates)
				const mergedList = [...list];
				staticMatches.forEach((staticProb) => {
					if (!mergedList.some((p) => p.id === staticProb.id)) {
						mergedList.push(staticProb);
					}
				});

				// Sort by title
				mergedList.sort((a, b) => a.title.localeCompare(b.title));
				setProblems(mergedList);
			} catch (err) {
				console.error("Error fetching tagged problems:", err);
				
				// Fallback purely to local problems on network error
				const staticMatches = Object.values(staticProblems).filter((p) => {
					const pTags = p.tags && Array.isArray(p.tags) ? p.tags : [];
					return isTagMatch(pTags);
				}).map(p => ({
					id: p.id,
					title: p.title,
					difficulty: p.difficulty || "Easy",
					tags: p.tags && Array.isArray(p.tags) ? p.tags : [],
					likes: 0,
					dislikes: 0,
					attempts: 0,
					solved: 0,
				} as DBProblem));
				setProblems(staticMatches);
			} finally {
				setLoading(false);
			}
		};

		fetchProblemsByTag();
	}, [tag]);

	return (
		<AppShell activeNav="Problems" maxWidth="wide">
			<div className="space-y-6">
				<Breadcrumb
					items={[
						{ label: "Problems", href: "/" },
						{ label: "Tags" },
						{ label: String(tag) },
					]}
				/>

				<div className="flex items-center justify-between pb-2 border-b border-border-subtle">
					<div className="flex items-center gap-3">
						<div className="bg-emerald-500/10 p-2.5 rounded-md text-emerald-450 border border-emerald-500/20">
							<FaTag size={14} />
						</div>
						<div>
							<h1 className="text-lg font-bold text-text-primary capitalize">{tag} Problems</h1>
							<p className="text-xs text-text-muted">Browse coding challenges tagged under &ldquo;{tag}&rdquo;.</p>
						</div>
					</div>
					<button
						onClick={() => router.back()}
						className="px-3 py-1.5 bg-bg-surface hover:bg-bg-dark-fill-3 text-text-secondary hover:text-text-primary rounded-md text-xs font-semibold border border-border-subtle transition flex items-center gap-1.5"
					>
						<FaArrowLeft size={10} /> Back
					</button>
				</div>

				{loading ? (
					<div className="flex flex-col justify-center items-center py-20 gap-3">
						<FaSpinner className="animate-spin text-emerald-500" size={24} />
						<div className="text-xs text-text-muted">Loading problems...</div>
					</div>
				) : (
					<div className="rounded-lg overflow-hidden border border-border-subtle bg-bg-surface shadow-sm">
						<table className="w-full text-xs text-left text-text-secondary">
							<thead>
								<tr className="border-b border-border-subtle bg-bg-dark-layer-1">
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-text-muted">Title</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-text-muted w-28">Difficulty</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-text-muted w-32">Success Rate</th>
									<th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-text-muted">Tags</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border-subtle">
								{problems.map((problem) => {
									const diffColor =
										problem.difficulty === "Easy" ? { color: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "color-mix(in srgb, var(--color-success) 25%, transparent)" } :
										problem.difficulty === "Medium" ? { color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "color-mix(in srgb, var(--color-warning) 25%, transparent)" } :
										{ color: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "color-mix(in srgb, var(--color-error) 25%, transparent)" };

									return (
										<tr key={problem.id} className="hover:bg-bg-dark-fill-3/50 transition duration-150">
											<td className="px-5 py-3.5 font-semibold text-xs text-text-primary">
												<Link href={`/problems/${problem.id}`} className="hover:text-emerald-400 transition">
													{problem.title}
												</Link>
											</td>
											<td className="px-5 py-3.5">
												<span
													className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
													style={{
														color: diffColor.color,
														background: diffColor.bg,
														border: `1px solid ${diffColor.border}`,
													}}
												>
													{problem.difficulty}
												</span>
											</td>
											<td className="px-5 py-3.5">
												{problem.attempts && problem.attempts > 0 ? (
													<span className="font-mono text-xs font-semibold text-text-secondary">
														{Math.round(((problem.solved ?? 0) / problem.attempts) * 100)}%
													</span>
												) : (
													<span className="text-xs text-text-muted">—</span>
												)}
											</td>
											<td className="px-5 py-3.5">
												<div className="flex flex-wrap gap-1.5">
													{problem.tags.map((t) => (
														<Link
															key={t}
															href={`/tags/${encodeURIComponent(t.toLowerCase())}`}
															className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold transition hover:opacity-85 border border-border-subtle bg-bg-dark-fill-3 text-text-secondary"
														>
															{t}
														</Link>
													))}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						{problems.length === 0 && (
							<div className="text-center py-16 text-text-muted select-none">
								<FaTag className="mx-auto mb-3 text-text-muted" size={20} />
								<p className="text-xs font-semibold text-text-secondary">No problems found</p>
								<p className="text-[11px] text-text-muted mt-1">
									We couldn&apos;t find any coding challenges tagged with &ldquo;{tag}&rdquo;.
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</AppShell>
	);
}
