import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	onSnapshot,
	addDoc,
	doc,
	getDoc,
	startAfter,
	getDocs,
} from "firebase/firestore";
import { useRecoilState } from "recoil";
import { threadComposerState } from "@/atoms/threadComposerAtom";
import { threadCommentFeedbackAtom } from "@/atoms/threadCommentFeedbackAtom";
import { authModalState } from "@/atoms/authModalAtom";
import ThreadCard from "./ThreadCard";
import ThreadComposer from "./ThreadComposer";
import Avatar from "./Avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useThreadTags } from "@/hooks/useThreadTags";
import SecondaryNav from "../TabsNavigation/SecondaryNav";
import {
	FaArrowLeft,
	FaPaperPlane,
	FaImage,
	FaSpinner,
	FaHeart,
	FaSearch,
	FaFilter,
	FaTimes,
	FaSortAmountDown,
	FaAngleDown,
	FaAngleUp
} from "react-icons/fa";
import { getFriendlyErrorMessage } from "@/utils/errorFilter";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import PageHeader from "@/components/UI/PageHeader";

interface AttachmentFile {
	name: string;
	size: number;
	type: string;
	data: string;
}

interface AttachmentProblem {
	problemId: string;
	problemTitle: string;
	submissionId: string;
	submissionIndex: number;
	code: string;
	language: string;
	status: string;
	timestamp: number;
	attempts?: number;
	solved?: number;
}

interface Thread {
	id: string;
	uid: string;
	displayName: string;
	avatarUrl?: string;
	content: string;
	createdAt: number;
	likes: string[];
	replies: any[]; // legacy
	photos?: string[];
	files?: AttachmentFile[];
	gif?: string | null;
	poll?: any | null;
	submittedProblem?: AttachmentProblem;
	parentThreadId?: string;
	quotedThreadId?: string;
	repostedThreadId?: string;
	hashtags?: string[];
	mentions?: string[];
	viewCount?: number;
	bookmarkCount?: number;
	tags?: string[];
}

interface VirtualizedThreadItemProps {
	children: React.ReactNode;
}

const VirtualizedThreadItem: React.FC<VirtualizedThreadItemProps> = ({ children }) => {
	const [isVisible, setIsVisible] = useState(true);
	const [height, setHeight] = useState<number | string>("auto");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				setIsVisible(entry.isIntersecting);
				if (entry.isIntersecting && entry.boundingClientRect.height > 0) {
					setHeight(entry.boundingClientRect.height);
				}
			},
			{
				rootMargin: "800px 0px 800px 0px",
			}
		);

		intersectionObserver.observe(container);

		const resizeObserver = new ResizeObserver((entries) => {
			const [entry] = entries;
			if (entry && entry.contentRect.height > 0) {
				setHeight(entry.target.getBoundingClientRect().height);
			}
		});

		resizeObserver.observe(container);

		return () => {
			intersectionObserver.disconnect();
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div ref={containerRef} style={{ minHeight: height }}>
			{isVisible ? children : <div style={{ height }} className="bc-surface rounded-lg opacity-10" />}
		</div>
	);
};

interface ThreadsBoardProps {
	problemId?: string;
	problemTitle?: string;
	profileUid?: string;
	postFeedOnly?: boolean;
	repostFeedOnly?: boolean;
}

const ThreadsBoard: React.FC<ThreadsBoardProps> = ({
	problemId,
	problemTitle,
	profileUid,
	postFeedOnly = false,
	repostFeedOnly = false,
}) => {
	const [user] = useAuthState(auth);
	const router = useRouter();
	const [, setComposer] = useRecoilState(threadComposerState);
	const [commentFeedback, setCommentFeedback] = useRecoilState(threadCommentFeedbackAtom);
	const [, setAuthModal] = useRecoilState(authModalState);

	// Fetch current user's profile to display the latest updated avatar/displayName
	const { profile: loggedInProfile } = useUserProfile(user?.uid);
	const currentUserAvatar = loggedInProfile?.avatarUrl || user?.photoURL;
	const currentUserDisplayName = loggedInProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";

	// Core State
	const [threads, setThreads] = useState<Thread[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [lastDoc, setLastDoc] = useState<any>(null);
	const [hasMore, setHasMore] = useState(true);
	const [activeTab, setActiveTab] = useState<"forYou" | "following">("forYou");

	// Search & Sort filters
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"latest" | "popular" | "replies" | "likes" | "trending">("latest");
	const [searchLanguage, setSearchLanguage] = useState("");
	const [searchProblem, setSearchProblem] = useState("");
	const [searchAuthor, setSearchAuthor] = useState("");
	const [searchHashtag, setSearchHashtag] = useState("");
	const [searchTag, setSearchTag] = useState("");
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

	const { tags: threadTags } = useThreadTags();

	// Collapsed subreplies state
	const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});

	// Detailed View State
	const [focusedThreadId, setFocusedThreadId] = useState<string | null>(null);
	const [focusedThread, setFocusedThread] = useState<Thread | null>(null);
	const [conversationThreads, setConversationThreads] = useState<Thread[]>([]);

	// Following state list of uids
	const [followingUids, setFollowingUids] = useState<string[]>([]);

	// Quick inline reply state (for detail page)
	const [inlineReplyText, setInlineReplyText] = useState("");
	const [inlinePhotos, setInlinePhotos] = useState<string[]>([]);
	const [postingReply, setPostingReply] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const handleCreateThread = () => {
		if (!user) {
			setAuthModal({ isOpen: true, type: "login" });
			return;
		}
		setComposer({
			isOpen: true,
			problemId,
			problemTitle
		});
	};

	// Sync deep links with router query ?threadId=XYZ
	useEffect(() => {
		if (router.query.threadId) {
			setFocusedThreadId(router.query.threadId as string);
		} else {
			setFocusedThreadId(null);
			setFocusedThread(null);
		}
	}, [router.query.threadId]);

	// Automatically open reply composer if query param reply=true is detected
	useEffect(() => {
		if (focusedThread && router.query.reply === "true") {
			setComposer({
				isOpen: true,
				parentThreadId: focusedThread.id,
				replyToDisplayName: focusedThread.displayName,
			});
			const { reply, ...rest } = router.query;
			router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
		}
	}, [focusedThread, router.query.reply, setComposer]);

	// Fetch target thread details when focusedThreadId changes
	useEffect(() => {
		if (!focusedThreadId) return;
		const unsub = onSnapshot(doc(firestore, "threads", focusedThreadId), (snap) => {
			if (snap.exists()) {
				setFocusedThread({ id: snap.id, ...snap.data() } as Thread);
			} else {
				setFocusedThread(null);
			}
		});
		return () => unsub();
	}, [focusedThreadId]);

	// Subscribe to followed user IDs
	useEffect(() => {
		if (!user) {
			setFollowingUids([]);
			return;
		}
		const q = query(
			collection(firestore, "follows"),
			where("followerId", "==", user.uid)
		);
		const unsub = onSnapshot(q, (snap) => {
			const uids: string[] = [];
			snap.forEach((d) => {
				uids.push(d.data().followingId);
			});
			setFollowingUids(uids);
		});
		return () => unsub();
	}, [user]);

	// Subscribe to conversation replies in detail view
	useEffect(() => {
		if (!focusedThreadId) {
			setConversationThreads([]);
			return;
		}

		const q = query(
			collection(firestore, "threads"),
			where("parentThreadId", "==", focusedThreadId)
		);

		const unsub = onSnapshot(q, (snap) => {
			const directList: Thread[] = [];
			snap.forEach((d) => {
				directList.push({ id: d.id, ...d.data() } as Thread);
			});

			if (directList.length === 0) {
				setConversationThreads([]);
				return;
			}

			const directIds = directList.map((d) => d.id);
			const targetIds = [focusedThreadId, ...directIds.slice(0, 9)];

			const qSub = query(
				collection(firestore, "threads"),
				where("parentThreadId", "in", targetIds)
			);

			const unsubCombined = onSnapshot(qSub, (subSnap) => {
				const allReplies: Thread[] = [];
				subSnap.forEach((d) => {
					allReplies.push({ id: d.id, ...d.data() } as Thread);
				});
				setConversationThreads(allReplies);
			});

			return () => unsubCombined();
		});

		return () => unsub();
	}, [focusedThreadId]);

	// Subscribe to main feed in real-time
	useEffect(() => {
		setLoading(true);
		setThreads([]);
		setLastDoc(null);
		setHasMore(true);

		let q = query(
			collection(firestore, "threads"),
			orderBy("createdAt", "desc"),
			limit(40)
		);

		if (profileUid) {
			q = query(
				collection(firestore, "threads"),
				where("uid", "==", profileUid),
				orderBy("createdAt", "desc"),
				limit(40)
			);
		} else if (problemId) {
			q = query(
				collection(firestore, "threads"),
				where("submittedProblem.problemId", "==", problemId),
				orderBy("createdAt", "desc"),
				limit(40)
			);
		} else {
			q = query(
				collection(firestore, "threads"),
				where("parentThreadId", "==", ""),
				orderBy("createdAt", "desc"),
				limit(40)
			);
		}

		const unsub = onSnapshot(
			q,
			(snapshot) => {
				const list: Thread[] = [];
				snapshot.forEach((docSnap) => {
					list.push({ id: docSnap.id, ...docSnap.data() } as Thread);
				});
				setThreads(list);
				setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
				setHasMore(snapshot.docs.length >= 40);
				setLoading(false);
			},
			(err) => {
				console.error(err);
				setLoading(false);
			}
		);

		return () => unsub();
	}, [profileUid, problemId]);

	// Load more pagination
	const loadMoreThreads = useCallback(async () => {
		if (!lastDoc || !hasMore || loadingMore) return;
		setLoadingMore(true);

		let q = query(
			collection(firestore, "threads"),
			orderBy("createdAt", "desc"),
			startAfter(lastDoc),
			limit(20)
		);

		if (profileUid) {
			q = query(
				collection(firestore, "threads"),
				where("uid", "==", profileUid),
				orderBy("createdAt", "desc"),
				startAfter(lastDoc),
				limit(20)
			);
		} else if (problemId) {
			q = query(
				collection(firestore, "threads"),
				where("submittedProblem.problemId", "==", problemId),
				orderBy("createdAt", "desc"),
				startAfter(lastDoc),
				limit(20)
			);
		} else {
			q = query(
				collection(firestore, "threads"),
				where("parentThreadId", "==", ""),
				orderBy("createdAt", "desc"),
				startAfter(lastDoc),
				limit(20)
			);
		}

		try {
			const snap = await getDocs(q);
			const list: Thread[] = [];
			snap.forEach((docSnap) => {
				list.push({ id: docSnap.id, ...docSnap.data() } as Thread);
			});
			setThreads((prev) => [...prev, ...list]);
			setLastDoc(snap.docs[snap.docs.length - 1] || null);
			setHasMore(snap.docs.length >= 20);
		} catch (e) {
			console.error("Load more error:", e);
		} finally {
			setLoadingMore(false);
		}
	}, [lastDoc, hasMore, loadingMore, profileUid, problemId]);

	// Infinite Scroll sentinel detection
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
					loadMoreThreads();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [lastDoc, hasMore, loading, loadingMore, loadMoreThreads]);

	// Algorithmic feed scoring
	const scoredThreads = useMemo(() => {
		return threads.map((t) => {
			const likesCount = t.likes?.length || 0;
			const repliesCount = t.replies?.length || 0;
			const viewsCount = t.viewCount || 0;
			const timeDiffHours = (Date.now() - t.createdAt) / (1000 * 60 * 60);

			const engagement = likesCount * 10 + repliesCount * 15 + viewsCount * 1;
			const recency = 1 / (1 + Math.pow(timeDiffHours, 1.4));

			const score = engagement * recency;
			return { thread: t, score };
		});
	}, [threads]);

	// Basic filtering top-level
	const filteredThreads = useMemo(() => {
		if (profileUid) {
			if (repostFeedOnly) {
				return threads.filter((t) => t.uid === profileUid && !!t.repostedThreadId);
			}
			if (postFeedOnly) {
				return threads.filter((t) => t.uid === profileUid && !t.repostedThreadId && !t.parentThreadId);
			}
			return threads.filter((t) => t.uid === profileUid && !t.parentThreadId);
		}

		if (problemId) {
			return threads.filter(
				(t) => t.submittedProblem?.problemId === problemId && !t.parentThreadId
			);
		}

		const topLevelOnly = threads.filter((t) => !t.parentThreadId);

		if (activeTab === "following") {
			return topLevelOnly.filter((t) => followingUids.includes(t.uid) || t.uid === user?.uid);
		}

		const topScored = scoredThreads.filter((st) => !st.thread.parentThreadId);
		topScored.sort((a, b) => b.score - a.score);
		return topScored.map((st) => st.thread);
	}, [threads, profileUid, problemId, activeTab, followingUids, user, scoredThreads, postFeedOnly, repostFeedOnly]);

	// Search & Sort filters runner
	const processedThreads = useMemo(() => {
		let list = [...filteredThreads];

		// General search query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((t) => {
				const contentMatch = t.content?.toLowerCase().includes(q);
				const authorMatch = t.displayName?.toLowerCase().includes(q);
				const hashtagsMatch = t.hashtags?.some((h) => h.toLowerCase().includes(q)) || false;
				const mentionsMatch = t.mentions?.some((m) => m.toLowerCase().includes(q)) || false;
				const problemMatch = t.submittedProblem?.problemTitle?.toLowerCase().includes(q) || false;
				const langMatch = t.submittedProblem?.language?.toLowerCase().includes(q) || false;

				return contentMatch || authorMatch || hashtagsMatch || mentionsMatch || problemMatch || langMatch;
			});
		}

		// Advanced search filter options
		if (searchLanguage) {
			list = list.filter((t) => t.submittedProblem?.language?.toLowerCase() === searchLanguage.toLowerCase());
		}
		if (searchProblem) {
			const qP = searchProblem.toLowerCase().trim();
			list = list.filter((t) => t.submittedProblem?.problemTitle?.toLowerCase().includes(qP) || t.submittedProblem?.problemId?.toLowerCase().includes(qP));
		}
		if (searchAuthor) {
			const qA = searchAuthor.toLowerCase().trim();
			list = list.filter((t) => t.displayName?.toLowerCase().includes(qA));
		}
		if (searchHashtag) {
			const qH = searchHashtag.toLowerCase().replace("#", "").trim();
			list = list.filter((t) => t.hashtags?.some((h) => h.toLowerCase() === qH));
		}
		if (searchTag) {
			list = list.filter((t) => t.tags?.includes(searchTag));
		}

		// Sorting
		if (sortBy === "latest") {
			list.sort((a, b) => b.createdAt - a.createdAt);
		} else if (sortBy === "likes") {
			list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
		} else if (sortBy === "replies") {
			list.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
		} else if (sortBy === "popular" || sortBy === "trending") {
			list.sort((a, b) => {
				const scoreA = (a.likes?.length || 0) * 10 + (a.replies?.length || 0) * 15 + (a.viewCount || 0);
				const scoreB = (b.likes?.length || 0) * 10 + (b.replies?.length || 0) * 15 + (b.viewCount || 0);
				return scoreB - scoreA;
			});
		}

		return list;
	}, [filteredThreads, searchQuery, sortBy, searchLanguage, searchProblem, searchAuthor, searchHashtag, searchTag]);

	const directReplies = useMemo(() => {
		if (!focusedThreadId) return [];
		return conversationThreads.filter((t) => t.parentThreadId === focusedThreadId);
	}, [conversationThreads, focusedThreadId]);

	// Toggle collapse replies state
	const toggleReplyCollapse = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setCollapsedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// Recursive nested replies tree rendering helper
	const renderRepliesTree = (parentId: string, depth = 0) => {
		const replies = conversationThreads.filter((t) => t.parentThreadId === parentId);
		replies.sort((a, b) => a.createdAt - b.createdAt);

		if (replies.length === 0) return null;

		return (
			<div className={`space-y-4 ${depth > 0 ? "pl-5 border-l border-[var(--border-subtle)] mt-3 ml-4 hover:border-[var(--brand-orange)] transition duration-200" : ""}`}>
				{replies.map((reply) => {
					const hasSubReplies = conversationThreads.some((t) => t.parentThreadId === reply.id);
					const isCollapsed = collapsedReplies[reply.id];

					return (
						<div key={reply.id} className="relative group">
							<div className="flex items-center justify-between mb-0.5">
								{hasSubReplies && (
									<button
										onClick={(e) => toggleReplyCollapse(reply.id, e)}
										className="text-[10px] font-black text-[var(--brand-orange)] hover:underline ml-4 select-none"
									>
										{isCollapsed ? `[+] Expand Thread` : `[-] Collapse Thread`}
									</button>
								)}
							</div>

							<div className={`transition-all duration-200 ${isCollapsed ? "opacity-45 scale-[0.98] pointer-events-none origin-left" : ""}`}>
								<ThreadCard
									thread={reply}
									isDetailView={false}
									showConnectorLine={hasSubReplies && !isCollapsed}
								/>
							</div>

							{/* Render up to depth 3 to prevent extreme indentation */}
							{!isCollapsed && depth < 3 && renderRepliesTree(reply.id, depth + 1)}

							{/* Open deeper subtrees as focused threads */}
							{!isCollapsed && depth >= 3 && hasSubReplies && (
								<div className="pl-6 mt-2 text-[11px] font-black text-[var(--text-muted)] hover:text-[var(--brand-orange)] transition cursor-pointer select-none">
									<button onClick={() => router.push(`/threads?threadId=${reply.id}`)}>
										↳ View deeper replies...
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	// Inline quick reply post
	const handlePostInlineReply = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !focusedThreadId || !focusedThread) return;
		if (!inlineReplyText.trim() && inlinePhotos.length === 0) {
			setCommentFeedback({
				isSubmitting: false,
				error: "Reply content cannot be empty.",
				justPosted: null,
			});
			return;
		}

		setPostingReply(true);
		setCommentFeedback({
			isSubmitting: true,
			error: "",
			justPosted: null,
		});

		const tempId = "temp-" + Date.now();

		try {
			const userSnap = await getDoc(doc(firestore, "users", user.uid));
			const profile = userSnap.exists() ? userSnap.data() : null;
			const authorName = profile?.displayName || user.displayName || user.email?.split("@")[0] || "Anonymous";
			const authorAvatar = profile?.avatarUrl || user.photoURL || "";

			// Parse hashtags & mentions
			const hashRegex = /#(\w+)/g;
			const hashtags: string[] = [];
			let match;
			while ((match = hashRegex.exec(inlineReplyText)) !== null) {
				hashtags.push(match[1].toLowerCase());
			}

			const mentionRegex = /@(\w+)/g;
			const mentions: string[] = [];
			while ((match = mentionRegex.exec(inlineReplyText)) !== null) {
				mentions.push(match[1]);
			}

			const newReplyObj: Thread = {
				id: tempId,
				uid: user.uid,
				displayName: authorName,
				avatarUrl: authorAvatar,
				content: inlineReplyText.trim(),
				createdAt: Date.now(),
				likes: [],
				replies: [],
				photos: inlinePhotos,
				parentThreadId: focusedThreadId,
				quotedThreadId: "",
				hashtags,
				mentions,
			};
			setConversationThreads((prev) => [...prev, newReplyObj]);

			const docRef = await addDoc(collection(firestore, "threads"), {
				uid: user.uid,
				displayName: authorName,
				avatarUrl: authorAvatar,
				content: inlineReplyText.trim(),
				createdAt: Date.now(),
				likes: [],
				replies: [],
				photos: inlinePhotos,
				parentThreadId: focusedThreadId,
				quotedThreadId: "",
				hashtags,
				mentions,
			});

			if (focusedThread.uid !== user.uid) {
				await addDoc(collection(firestore, "notifications"), {
					toUid: focusedThread.uid,
					fromUid: user.uid,
					fromDisplayName: authorName,
					fromAvatarUrl: authorAvatar,
					type: "reply",
					threadId: focusedThreadId,
					createdAt: Date.now(),
					read: false,
				});
			}

			setCommentFeedback({
				isSubmitting: false,
				error: "",
				justPosted: { id: docRef.id, timestamp: Date.now() },
			});

			setInlineReplyText("");
			setInlinePhotos([]);

			setTimeout(() => {
				setCommentFeedback((prev) =>
					prev.justPosted?.id === docRef.id ? { ...prev, justPosted: null } : prev
				);
			}, 2500);
		} catch (err: any) {
			console.error("Inline reply post error:", err);
			setConversationThreads((prev) => prev.filter((t) => t.id !== tempId));
			setCommentFeedback({
				isSubmitting: false,
				error: getFriendlyErrorMessage(err, "Failed to post reply. Please try again."),
				justPosted: null,
			});
		} finally {
			setPostingReply(false);
		}
	};

	const handleInlinePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		for (const file of Array.from(files)) {
			if (!file.type.startsWith("image/")) continue;
			const reader = new FileReader();
			reader.onload = (ev) => {
				if (ev.target?.result) {
					setInlinePhotos((prev) => [...prev, ev.target!.result as string]);
				}
			};
			reader.readAsDataURL(file);
		}
	};

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto space-y-4 pt-2">
				{[1, 2, 3].map((n) => (
					<div
						key={n}
						className="bg-bg-surface border border-border-default rounded-lg p-4 flex gap-3 animate-pulse"
					>
						<div className="w-8 h-8 bg-bg-surface-elevated rounded-full shrink-0" />
						<div className="flex-1 space-y-2.5">
							<div className="h-3 bg-bg-surface-elevated rounded w-1/4" />
							<div className="h-2.5 bg-bg-surface-elevated rounded w-3/4" />
							<div className="h-2.5 bg-bg-surface-elevated rounded w-5/6" />
							<div className="h-16 bg-bg-surface-elevated rounded w-full" />
						</div>
					</div>
				))}
			</div>
		);
	}

	// ----------------------------------------------------
	// 1. DETAIL CONVERSATION TREE RENDER
	// ----------------------------------------------------
	if (focusedThreadId && focusedThread) {
		const hasReplies = directReplies.length > 0;
		return (
			<div className="w-full max-w-3xl mx-auto space-y-4 pt-2">
				{/* Back Button */}
				<button
					onClick={() => {
						router.push("/threads", undefined, { shallow: true });
					}}
					className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors py-1.5 px-3 rounded-md border border-border-default bg-bg-surface hover:bg-bg-surface-elevated"
				>
					<FaArrowLeft size={9} />
					<span>Back to Discussions</span>
				</button>

				{/* Parent Thread Card */}
				<ThreadCard
					thread={focusedThread}
					isDetailView={true}
					showConnectorLine={hasReplies}
					highlighted={true}
				/>

				{/* Conversation replies tree */}
				<div className="space-y-3">
					{renderRepliesTree(focusedThreadId)}
					{!hasReplies && (
						<p className="text-center text-xs text-text-muted font-mono py-6 border border-border-default rounded-lg bg-bg-surface">
							No replies yet in this conversation thread.
						</p>
					)}
				</div>

				{/* Sticky Inline reply box */}
				{user ? (
					<div className="sticky bottom-4 w-full z-20 flex flex-col gap-1.5">
						{commentFeedback.error && (
							<div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-md font-mono self-start backdrop-blur-sm">
								{commentFeedback.error}
							</div>
						)}
						<form
							onSubmit={handlePostInlineReply}
							className="bg-bg-surface border border-border-default p-2.5 rounded-lg flex gap-2.5 items-center shadow-lg w-full"
						>
							<label className="cursor-pointer text-text-muted hover:text-text-primary p-2 hover:bg-bg-surface-elevated rounded-md transition-colors shrink-0">
								<FaImage size={13} />
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={handleInlinePhotoSelect}
								/>
							</label>

							<input
								type="text"
								value={inlineReplyText}
								onChange={(e) => setInlineReplyText(e.target.value)}
								placeholder={`Reply to @${focusedThread.displayName}...`}
								className="flex-grow bg-transparent border-0 p-0 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-0"
							/>

							{inlinePhotos.length > 0 && (
								<div className="flex gap-1.5 shrink-0 select-none">
									{inlinePhotos.map((photo, pIdx) => (
										<div key={pIdx} className="relative w-8 h-8 rounded overflow-hidden border border-border-default bg-bg-base">
											<img src={photo} alt="" className="w-full h-full object-cover" />
											<button
												type="button"
												onClick={() => setInlinePhotos((p) => p.filter((_, idx) => idx !== pIdx))}
												className="absolute inset-0 bg-red-600/80 hover:opacity-100 opacity-0 flex items-center justify-center text-white text-[8px] font-mono transition-opacity"
											>
												Delete
											</button>
										</div>
									))}
								</div>
							)}

							<button
								type="submit"
								disabled={postingReply || (!inlineReplyText.trim() && inlinePhotos.length === 0)}
								className="px-3 py-1.5 rounded-md font-mono text-xs font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors disabled:opacity-40 shrink-0 flex items-center justify-center"
							>
								{postingReply ? (
									<FaSpinner className="animate-spin" size={11} />
								) : (
									<FaPaperPlane size={11} />
								)}
							</button>
						</form>
					</div>
				) : (
					<p className="text-center text-xs text-text-muted font-mono py-2.5 bg-bg-surface rounded-md border border-border-default">
						Sign in to post technical responses to this thread.
					</p>
				)}
				<ThreadComposer />
			</div>
		);
	}

	// ----------------------------------------------------
	// 2. MAIN FEED LIST VIEW RENDER
	// ----------------------------------------------------
	return (
		<div className="w-full max-w-3xl mx-auto space-y-4">
			{!profileUid && !problemId && (
				<PageHeader
					title="Developer Discussions"
					description="Technical discourse, solution post-mortems, algorithm breakdowns, and peer discussions."
					breadcrumbs={[{ label: "Threads" }]}
					actions={
						user ? (
							<button
								onClick={handleCreateThread}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors"
							>
								<FaPaperPlane size={10} /> New Discussion
							</button>
						) : undefined
					}
				/>
			)}

			{/* Advanced Search & Sort Control Panel */}
			<div className="p-3.5 rounded-lg border border-border-default bg-bg-surface space-y-3">
				{/* Main search bar */}
				<div className="flex gap-2 items-center">
					<div className="relative flex-1 flex items-center rounded-md px-2.5 py-1.5 bg-bg-base border border-border-default">
						<FaSearch className="text-text-muted mr-2 shrink-0" size={11} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search thread title, content, author, hashtag (#), language..."
							className="bg-transparent text-xs text-text-primary outline-none flex-grow placeholder:text-text-muted border-0 p-0 ring-0"
						/>
						{searchQuery && (
							<button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text-primary">
								<FaTimes size={10} />
							</button>
						)}
					</div>

					{/* Toggle advanced filters */}
					<button
						onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
						className={`px-3 py-1.5 rounded-md border text-xs font-mono flex items-center gap-1.5 transition-colors ${
							showAdvancedFilters || searchLanguage || searchProblem || searchAuthor || searchHashtag
								? "border-accent-brand bg-accent-brand/10 text-accent-brand"
								: "border-border-default bg-bg-base text-text-secondary hover:text-text-primary"
						}`}
						title="Advanced Search Filters"
					>
						<FaFilter size={10} />
						<span>Filters</span>
						{showAdvancedFilters ? <FaAngleUp size={9} /> : <FaAngleDown size={9} />}
					</button>

					{problemId && (
						<button
							onClick={handleCreateThread}
							className="px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-accent-brand hover:bg-accent-hover text-bg-base transition-colors shrink-0 flex items-center gap-1.5"
						>
							<FaPaperPlane size={10} />
							<span>New Thread</span>
						</button>
					)}
				</div>

				{/* Advanced filters drawer */}
				{showAdvancedFilters && (
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-md bg-bg-base border border-border-default text-xs">
						<div>
							<label className="block text-[10px] text-text-muted font-mono uppercase mb-1">Language</label>
							<BeastCodeSelect
								options={[
									{ value: "", label: "Any Language" },
									{ value: "cpp", label: "C++" },
									{ value: "python", label: "Python" },
									{ value: "java", label: "Java" },
									{ value: "javascript", label: "JavaScript" },
								]}
								value={searchLanguage}
								onChange={setSearchLanguage}
								placeholder="Select language"
							/>
						</div>

						<div>
							<label className="block text-[10px] text-text-muted font-mono uppercase mb-1">Problem</label>
							<input
								type="text"
								value={searchProblem}
								onChange={(e) => setSearchProblem(e.target.value)}
								placeholder="Problem title or ID..."
								className="w-full bg-bg-surface border border-border-default text-text-primary placeholder:text-text-muted rounded-md px-2.5 py-1 text-xs outline-none focus:border-accent-brand"
							/>
						</div>

						<div>
							<label className="block text-[10px] text-text-muted font-mono uppercase mb-1">Author</label>
							<input
								type="text"
								value={searchAuthor}
								onChange={(e) => setSearchAuthor(e.target.value)}
								placeholder="Author handle..."
								className="w-full bg-bg-surface border border-border-default text-text-primary placeholder:text-text-muted rounded-md px-2.5 py-1 text-xs outline-none focus:border-accent-brand"
							/>
						</div>

						<div>
							<label className="block text-[10px] text-text-muted font-mono uppercase mb-1">Hashtag</label>
							<input
								type="text"
								value={searchHashtag}
								onChange={(e) => setSearchHashtag(e.target.value)}
								placeholder="e.g. dynamicprogramming"
								className="w-full bg-bg-surface border border-border-default text-text-primary placeholder:text-text-muted rounded-md px-2.5 py-1 text-xs outline-none focus:border-accent-brand"
							/>
						</div>

						<div>
							<label className="block text-[10px] text-text-muted font-mono uppercase mb-1">Thread Tag</label>
							<BeastCodeSelect
								options={[
									{ value: "", label: "Any Tag" },
									...threadTags.map((t) => ({ value: t.id, label: t.name })),
								]}
								value={searchTag}
								onChange={setSearchTag}
								placeholder="Select tag"
							/>
						</div>

						{(searchLanguage || searchProblem || searchAuthor || searchHashtag || searchTag) && (
							<div className="col-span-full flex justify-end">
								<button
									onClick={() => {
										setSearchLanguage("");
										setSearchProblem("");
										setSearchAuthor("");
										setSearchHashtag("");
										setSearchTag("");
									}}
									className="text-[11px] font-mono text-red-400 hover:text-red-300"
								>
									Clear Filters
								</button>
							</div>
						)}
					</div>
				)}

				{/* Sorting selector row */}
				<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs font-mono">
					<div className="flex items-center gap-1.5 text-text-secondary">
						<FaSortAmountDown size={10} className="text-accent-brand" />
						<span>Sort:</span>
					</div>
					<div className="flex gap-1 flex-wrap">
						{[
							{ id: "latest", label: "Latest" },
							{ id: "popular", label: "Popular" },
							{ id: "replies", label: "Replies" },
							{ id: "likes", label: "Likes" },
							{ id: "trending", label: "Trending" },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setSortBy(tab.id as any)}
								className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
									sortBy === tab.id
										? "bg-accent-brand text-bg-base font-semibold"
										: "bg-bg-base border border-border-default text-text-muted hover:text-text-primary"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Feed Switcher Tabs */}
			{!profileUid && !problemId && (
				<div className="flex justify-center mb-1">
					<SecondaryNav
						tabs={[
							{ id: "forYou", label: "All Discussions" },
							{ id: "following", label: "Following" },
						]}
						activeTab={activeTab}
						onChange={setActiveTab}
					/>
				</div>
			)}

			{/* Inline Quick Composer input card */}
			{user && !profileUid && !problemId && (
				<div
					onClick={() => setComposer({ isOpen: true })}
					className="flex items-center gap-3 border border-dashed border-border-default bg-bg-surface hover:bg-bg-surface-elevated transition-colors rounded-lg p-3 cursor-pointer select-none"
				>
					<Avatar
						src={currentUserAvatar}
						displayName={currentUserDisplayName}
						size={30}
					/>
					<span className="text-xs text-text-muted flex-grow font-mono">
						Start a technical discussion or share an algorithmic post-mortem...
					</span>
					<button className="text-xs font-mono font-medium px-3 py-1 rounded-md bg-accent-brand text-bg-base hover:bg-accent-hover transition-colors">
						Draft
					</button>
				</div>
			)}

			{/* Threads Feed list */}
			<div className="space-y-3 pb-12">
				{processedThreads.map((thread) => (
					<VirtualizedThreadItem key={thread.id}>
						<div
							onClick={() => {
								router.push(`/threads?threadId=${thread.id}`, undefined, { shallow: true });
							}}
							className="cursor-pointer"
						>
							<ThreadCard thread={thread} />
						</div>
					</VirtualizedThreadItem>
				))}

				{/* Sentinel for scrolling load */}
				<div ref={sentinelRef} className="h-8 flex items-center justify-center select-none">
					{loadingMore && (
						<FaSpinner className="animate-spin text-accent-brand" size={16} />
					)}
				</div>

				{/* Empty Feed State */}
				{processedThreads.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center select-none bg-bg-surface border border-border-default rounded-lg p-6">
						<FaHeart className="text-text-muted mb-2 animate-pulse" size={20} />
						<p className="text-sm font-semibold text-text-primary">No discussions found</p>
						<p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed mb-4 font-mono">
							{searchQuery || searchLanguage || searchProblem || searchAuthor || searchHashtag || searchTag
								? "No discussions matched the filter criteria."
								: activeTab === "following"
								? "No threads from followed developers yet."
								: problemId
								? `Be the first to discuss ${problemTitle || "this problem"}!`
								: "Start the first technical thread."}
						</p>
						{(problemId || (!searchQuery && !searchLanguage && !searchProblem && !searchAuthor && !searchHashtag && !searchTag)) && (
							<button
								onClick={handleCreateThread}
								className="text-xs font-mono font-medium px-4 py-1.5 rounded-md bg-accent-brand text-bg-base hover:bg-accent-hover transition-colors"
							>
								Create Discussion
							</button>
						)}
					</div>
				)}
			</div>

			<ThreadComposer />
		</div>
	);
};

export default ThreadsBoard;
