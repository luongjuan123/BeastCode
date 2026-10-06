import React, { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { threadComposerState } from "@/atoms/threadComposerAtom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { collection, addDoc, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { clientSendNotification } from "@/utils/clientNotificationService";
import {
	FaTimes,
	FaImage,
	FaPaperclip,
	FaCode,
	FaSmile,
	FaPlus,
	FaTrash,
	FaSpinner,
	FaPollH,
	FaBold,
	FaItalic,
	FaLink,
	FaKeyboard,
	FaEdit,
	FaEye,
	FaUndo
} from "react-icons/fa";
import GifPicker from "./GifPicker";
import EmojiPicker from "./EmojiPicker";
import Avatar from "./Avatar";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import TagSelect from "@/components/Admin/TagSelect";

interface AttachmentFile {
	name: string;
	size: number;
	type: string;
	data: string; // Base64 data URI
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

interface PollDraft {
	question: string;
	options: string[];
}

interface ThreadDraft {
	content: string;
	photos: string[]; // Base64 images
	files: AttachmentFile[];
	poll: PollDraft | null;
	gif: string | null;
	submittedProblem: AttachmentProblem | null;
	showPollBuilder?: boolean;
	showGifPicker?: boolean;
	showEmojiPicker?: boolean;
	previewMode?: boolean;
}

// XSS-Safe simple markdown parser
const escapeHtml = (text: string) => {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
};

const parseMarkdown = (rawText: string) => {
	if (!rawText) return "";
	let html = escapeHtml(rawText);

	// Headers
	html = html.replace(/^### (.*?)$/gm, "<h5 class='text-xs font-bold uppercase tracking-wider mt-2 mb-1'>$1</h5>");
	html = html.replace(/^## (.*?)$/gm, "<h4 class='text-sm font-bold mt-3 mb-1.5'>$1</h4>");
	html = html.replace(/^# (.*?)$/gm, "<h3 class='text-base font-black mt-4 mb-2'>$1</h3>");

	// Code blocks
	html = html.replace(/```([\s\S]*?)```/gm, "<pre class='bg-[var(--bg-code)] border border-[var(--border-code)] p-3 rounded-xl font-mono text-xs text-[var(--text-code)] overflow-x-auto my-2.5 whitespace-pre'><code>$1</code></pre>");

	// Inline code
	html = html.replace(/`([^`\n]+)`/g, "<code class='bg-[var(--bg-code)] text-[var(--brand-orange)] font-mono text-xs px-1.5 py-0.5 rounded'>$1</code>");

	// Bold
	html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='font-black text-[var(--text-primary)]'>$1</strong>");

	// Italic
	html = html.replace(/\*([^*]+)\*/g, "<em class='italic'>$1</em>");

	// Links
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-[var(--brand-orange)] hover:underline font-bold'>$1</a>");

	// Linebreaks
	html = html.replace(/\n/g, "<br />");

	return html;
};

const ThreadComposer: React.FC = () => {
	const [composer, setComposer] = useRecoilState(threadComposerState);
	const [user] = useAuthState(auth);

	const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
	const [allUsers, setAllUsers] = useState<any[]>([]);

	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [tags, setTags] = useState<string[]>([]);

	const [quotedThread, setQuotedThread] = useState<any>(null);
	const [loadingQuoted, setLoadingQuoted] = useState(false);

	const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false);

	// Textarea refs mapping to support cursor formatting insertions
	const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

	// Thread Chain Drafts
	const [drafts, setDrafts] = useState<ThreadDraft[]>([
		{
			content: "",
			photos: [],
			files: [],
			poll: null,
			gif: null,
			submittedProblem: null,
		},
	]);

	const [submitting, setSubmitting] = useState(false);

	// Mentions Autocomplete State
	const [mentionSearch, setMentionSearch] = useState("");
	const [activeDraftIdx, setActiveDraftIdx] = useState<number>(-1);
	const [mentionTriggerPos, setMentionTriggerPos] = useState<number>(-1);

	// Leetcode Submissions Selector State
	const [showSubmissionSelectorFor, setShowSubmissionSelectorFor] = useState<number | null>(null);
	const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
	const [loadingSubmissions, setLoadingSubmissions] = useState(false);
	const [selectedProblemId, setSelectedProblemId] = useState("");
	const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1);

	// Refs for inputs
	const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
	const photoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

	// Check if there is an autosaved draft in localStorage on mount
	useEffect(() => {
		if (user) {
			const saved = localStorage.getItem(`beastcode_composer_draft_${user.uid}`);
			if (saved) {
				setHasRecoverableDraft(true);
			}
		}
	}, [user, composer.isOpen]);

	// Autosave drafts to localStorage whenever they change
	useEffect(() => {
		if (user && composer.isOpen && drafts.some(d => d.content.trim() || d.photos.length > 0 || d.gif)) {
			localStorage.setItem(
				`beastcode_composer_draft_${user.uid}`,
				JSON.stringify(drafts)
			);
		}
	}, [drafts, user, composer.isOpen]);

	// Recover saved draft
	const recoverDraft = () => {
		if (!user) return;
		try {
			const saved = localStorage.getItem(`beastcode_composer_draft_${user.uid}`);
			if (saved) {
				setDrafts(JSON.parse(saved));
				setHasRecoverableDraft(false);
				setSuccess("Draft restored successfully!");
				setTimeout(() => setSuccess(null), 2000);
			}
		} catch (e) {
			console.error("Failed to recover draft:", e);
		}
	};

	// Clear saved draft from localStorage
	const clearSavedDraft = () => {
		if (user) {
			localStorage.removeItem(`beastcode_composer_draft_${user.uid}`);
			setHasRecoverableDraft(false);
		}
	};

	// Clear error and success when the composer opens or closes
	useEffect(() => {
		if (composer.isOpen) {
			setError(null);
			setSuccess(null);

			// Load quote if any
			const pendingId = sessionStorage.getItem("pendingQuoteId");
			if (pendingId) {
				setLoadingQuoted(true);
				const fetchQuoted = async () => {
					try {
						const docSnap = await getDoc(doc(firestore, "threads", pendingId));
						if (docSnap.exists()) {
							setQuotedThread({ id: docSnap.id, ...docSnap.data() });
						}
					} catch (e) {
						console.error(e);
					} finally {
						setLoadingQuoted(false);
					}
				};
				fetchQuoted();
			} else {
				setQuotedThread(null);
			}
		} else {
			setQuotedThread(null);
			sessionStorage.removeItem("pendingQuoteId");
		}
	}, [composer.isOpen]);

	// Auto-attach user's latest submission for the workspace problem discussions
	useEffect(() => {
		if (composer.isOpen && composer.problemId && user) {
			const fetchAndAttachLatest = async () => {
				setError(null);
				try {
					const querySnapshot = await getDocs(
						query(
							collection(firestore, "submissions"),
							where("uid", "==", user.uid),
							where("problemId", "==", composer.problemId)
						)
					);
					const list: any[] = [];
					querySnapshot.forEach((docSnap) => {
						list.push({ id: docSnap.id, ...docSnap.data() });
					});
					
					if (list.length > 0) {
						list.sort((a, b) => b.timestamp - a.timestamp);
						const latestSub = list[0];
						
						// Get problem stats
						let attempts = 0;
						let solved = 0;
						const probDoc = await getDoc(doc(firestore, "problems", composer.problemId!));
						if (probDoc.exists()) {
							const probData = probDoc.data();
							attempts = probData.attempts || 0;
							solved = probData.solved || 0;
						}

						const formatted: AttachmentProblem = {
							problemId: composer.problemId!,
							problemTitle: latestSub.problemTitle || composer.problemTitle || composer.problemId!,
							submissionId: latestSub.id,
							submissionIndex: 1,
							code: latestSub.code || "",
							language: latestSub.language || "",
							status: latestSub.status || "",
							timestamp: latestSub.timestamp || Date.now(),
							attempts,
							solved,
						};

						setDrafts([
							{
								content: "",
								photos: [],
								files: [],
								poll: null,
								gif: null,
								submittedProblem: formatted,
							}
						]);
					} else {
						setError(`You haven't submitted any solutions for this problem yet. Please submit a solution first to start a thread!`);
					}
				} catch (e) {
					console.error("Error auto-attaching submission:", e);
				}
			};
			fetchAndAttachLatest();
		}
	}, [composer.isOpen, composer.problemId, user]);

	// Reset drafts when composer is closed
	useEffect(() => {
		if (!composer.isOpen) {
			setDrafts([
				{
					content: "",
					photos: [],
					files: [],
					poll: null,
					gif: null,
					submittedProblem: null,
				},
			]);
		}
	}, [composer.isOpen]);

	// Fetch current user details and users list for autocomplete
	useEffect(() => {
		if (user && composer.isOpen) {
			const fetchProfileAndUsers = async () => {
				try {
					const userSnap = await getDoc(doc(firestore, "users", user.uid));
					if (userSnap.exists()) {
						setCurrentUserProfile(userSnap.data());
					}

					const usersSnap = await getDocs(collection(firestore, "users"));
					const list: any[] = [];
					usersSnap.forEach((d) => {
						const data = d.data();
						list.push({
							uid: d.id,
							displayName: data.displayName || "Anonymous User",
							avatarUrl: data.avatarUrl || null,
							username: data.displayName?.toLowerCase().replace(/\s+/g, "_") || d.id.substring(0, 6),
						});
					});
					setAllUsers(list);
				} catch (e) {
					console.error("Error fetching composer users:", e);
				}
			};
			fetchProfileAndUsers();
		}
	}, [user, composer.isOpen]);

	// Auto-expand textarea
	const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
		if (!element) return;
		element.style.height = "auto";
		element.style.height = `${element.scrollHeight}px`;
	};

	const addDraftToChain = () => {
		setDrafts((prev) => [
			...prev,
			{
				content: "",
				photos: [],
				files: [],
				poll: null,
				gif: null,
				submittedProblem: null,
			},
		]);
	};

	const removeDraftFromChain = (index: number) => {
		if (drafts.length === 1) return;
		setDrafts((prev) => prev.filter((_, idx) => idx !== index));
	};

	const handleContentChange = (index: number, val: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setError(null);
		setSuccess(null);
		adjustTextareaHeight(e.target);
		setDrafts((prev) => {
			const copy = [...prev];
			copy[index].content = val;
			return copy;
		});

		// Autocomplete Mentions logic
		const cursorPosition = e.target.selectionStart;
		const textBeforeCursor = val.slice(0, cursorPosition);
		const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

		if (lastAtSymbol !== -1 && lastAtSymbol >= textBeforeCursor.search(/\s|^/)) {
			const queryText = textBeforeCursor.slice(lastAtSymbol + 1);
			if (!queryText.includes(" ")) {
				setMentionSearch(queryText);
				setActiveDraftIdx(index);
				setMentionTriggerPos(lastAtSymbol);
				return;
			}
		}

		setMentionSearch("");
		setActiveDraftIdx(-1);
		setMentionTriggerPos(-1);
	};

	// Markdown Insertion Helper
	const formatText = (index: number, type: "bold" | "italic" | "link" | "code") => {
		const txtArea = textareaRefs.current[index];
		if (!txtArea) return;

		const start = txtArea.selectionStart;
		const end = txtArea.selectionEnd;
		const text = txtArea.value;
		const selectedText = text.substring(start, end);

		let formatted = "";
		let cursorOffset = 0;

		switch (type) {
			case "bold":
				formatted = `**${selectedText || "bold text"}**`;
				cursorOffset = selectedText ? formatted.length : 2;
				break;
			case "italic":
				formatted = `*${selectedText || "italic text"}*`;
				cursorOffset = selectedText ? formatted.length : 1;
				break;
			case "link":
				formatted = `[${selectedText || "link text"}](https://)`;
				cursorOffset = selectedText ? formatted.length + 10 : 1;
				break;
			case "code":
				formatted = selectedText.includes("\n")
					? `\`\`\`\n${selectedText}\n\`\`\``
					: `\`${selectedText || "code"}\``;
				cursorOffset = selectedText ? formatted.length : 1;
				break;
		}

		const newText = text.substring(0, start) + formatted + text.substring(end);
		setDrafts((prev) => {
			const copy = [...prev];
			copy[index].content = newText;
			return copy;
		});

		// Refocus and place cursor correctly
		setTimeout(() => {
			txtArea.focus();
			txtArea.setSelectionRange(start + cursorOffset, start + cursorOffset);
		}, 50);
	};

	const handleInsertMention = (user: any) => {
		if (activeDraftIdx === -1 || mentionTriggerPos === -1) return;
		const draft = drafts[activeDraftIdx];
		const before = draft.content.slice(0, mentionTriggerPos);
		const after = draft.content.slice(mentionTriggerPos + mentionSearch.length + 1);
		const newContent = `${before}@${user.username} ${after}`;

		setDrafts((prev) => {
			const copy = [...prev];
			copy[activeDraftIdx].content = newContent;
			return copy;
		});

		setMentionSearch("");
		setActiveDraftIdx(-1);
		setMentionTriggerPos(-1);
	};

	// Image compression
	const compressImageFile = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (readerEvent) => {
				const image = new Image();
				image.onload = () => {
					const canvas = document.createElement("canvas");
					const max_size = 1200; // higher fidelity
					let width = image.width;
					let height = image.height;
					if (width > height) {
						if (width > max_size) {
							height *= max_size / width;
							width = max_size;
						}
					} else {
						if (height > max_size) {
							width *= max_size / height;
							height = max_size;
						}
					}
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					ctx?.drawImage(image, 0, 0, width, height);
					const dataUrl = canvas.toDataURL("image/jpeg", 0.75); // higher quality
					resolve(dataUrl);
				};
				image.src = readerEvent.target?.result as string;
			};
			reader.readAsDataURL(file);
		});
	};

	// Clipboard Paste Event
	const handlePaste = async (index: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of Array.from(items)) {
			if (item.type.indexOf("image") !== -1) {
				const file = item.getAsFile();
				if (!file) continue;
				e.preventDefault();
				try {
					setError(null);
					const compressed = await compressImageFile(file);
					setDrafts((prev) => {
						const copy = [...prev];
						copy[index].photos = [...copy[index].photos, compressed];
						return copy;
					});
					setSuccess("Image pasted from clipboard!");
					setTimeout(() => setSuccess(null), 2000);
				} catch (err) {
					console.error("Paste image error:", err);
				}
			}
		}
	};

	// Drag & Drop
	const handleDrop = async (index: number, e: React.DragEvent<HTMLTextAreaElement>) => {
		e.preventDefault();
		const files = e.dataTransfer?.files;
		if (!files) return;
		setError(null);
		setSuccess(null);
		for (const file of Array.from(files)) {
			if (file.type.startsWith("image/")) {
				try {
					const compressed = await compressImageFile(file);
					setDrafts((prev) => {
						const copy = [...prev];
						copy[index].photos = [...copy[index].photos, compressed];
						return copy;
					});
				} catch (err) {
					console.error("Drop image error:", err);
				}
			} else {
				// Attach file
				if (file.size > 2 * 1024 * 1024) { // limit file size to 2MB
					setError("File size must be under 2MB.");
					continue;
				}
				const reader = new FileReader();
				reader.onload = (ev) => {
					if (ev.target?.result) {
						setDrafts((prev) => {
							const copy = [...prev];
							copy[index].files = [
								...copy[index].files,
								{
									name: file.name,
									size: file.size,
									type: file.type,
									data: ev.target!.result as string,
								},
							];
							return copy;
						});
					}
				};
				reader.readAsDataURL(file);
			}
		}
	};

	// File attachments change
	const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		setError(null);
		setSuccess(null);
		Array.from(files).forEach((file) => {
			if (file.size > 2 * 1024 * 1024) {
				setError("File size must be under 2MB.");
				return;
			}
			const reader = new FileReader();
			reader.onload = (ev) => {
				if (ev.target?.result) {
					setDrafts((prev) => {
						const copy = [...prev];
						copy[index].files = [
							...copy[index].files,
							{
								name: file.name,
								size: file.size,
								type: file.type,
								data: ev.target!.result as string,
							},
						];
						return copy;
					});
				}
			};
			reader.readAsDataURL(file);
		});
	};

	// Photo select change
	const handlePhotoSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		setError(null);
		setSuccess(null);
		for (const file of Array.from(files)) {
			if (!file.type.startsWith("image/")) {
				setError("Please select an image file.");
				continue;
			}
			try {
				const compressed = await compressImageFile(file);
				setDrafts((prev) => {
					const copy = [...prev];
					copy[index].photos = [...copy[index].photos, compressed];
					return copy;
				});
			} catch (err) {
				console.error("Photo compress error:", err);
			}
		}
	};

	// Poll builder state managers
	const handleOpenPollBuilder = (index: number) => {
		setDrafts((prev) => {
			const copy = [...prev];
			copy[index].poll = { question: "", options: ["", ""] };
			copy[index].showPollBuilder = true;
			return copy;
		});
	};

	const handleRemovePoll = (index: number) => {
		setDrafts((prev) => {
			const copy = [...prev];
			copy[index].poll = null;
			copy[index].showPollBuilder = false;
			return copy;
		});
	};

	const handlePollQuestionChange = (index: number, q: string) => {
		setDrafts((prev) => {
			const copy = [...prev];
			if (copy[index].poll) {
				copy[index].poll!.question = q;
			}
			return copy;
		});
	};

	const handlePollOptionChange = (index: number, optionIdx: number, val: string) => {
		setDrafts((prev) => {
			const copy = [...prev];
			if (copy[index].poll) {
				copy[index].poll!.options[optionIdx] = val;
			}
			return copy;
		});
	};

	const handleAddPollOption = (index: number) => {
		setDrafts((prev) => {
			const copy = [...prev];
			if (copy[index].poll && copy[index].poll!.options.length < 4) {
				copy[index].poll!.options.push("");
			}
			return copy;
		});
	};

	const handleRemovePollOption = (index: number, optionIdx: number) => {
		setDrafts((prev) => {
			const copy = [...prev];
			if (copy[index].poll && copy[index].poll!.options.length > 2) {
				copy[index].poll!.options = copy[index].poll!.options.filter((_, idx) => idx !== optionIdx);
			}
			return copy;
		});
	};

	// Leetcode Submissions Loader
	const handleOpenSubmissionSelector = async (index: number) => {
		if (!user) return;
		setShowSubmissionSelectorFor(index);
		if (userSubmissions.length === 0) {
			setLoadingSubmissions(true);
			try {
				const querySnapshot = await getDocs(collection(firestore, "submissions"));
				const list: any[] = [];
				querySnapshot.forEach((docSnap) => {
					const data = docSnap.data();
					if (data.uid === user.uid) {
						list.push({ id: docSnap.id, ...data });
					}
				});
				list.sort((a, b) => b.timestamp - a.timestamp);
				setUserSubmissions(list);
			} catch (e) {
				console.error(e);
			} finally {
				setLoadingSubmissions(false);
			}
		}
	};

	const handleAttachSubmission = async () => {
		if (showSubmissionSelectorFor === null || !selectedProblemId || selectedSubIndex === -1) {
			setError("Please select a problem and attempt.");
			return;
		}

		setError(null);
		setSuccess(null);
		const problemSubs = userSubmissions.filter((s) => s.problemId === selectedProblemId);
		const targetSub = problemSubs[selectedSubIndex];

		let attempts = 0;
		let solved = 0;
		try {
			const probDoc = await getDoc(doc(firestore, "problems", selectedProblemId));
			if (probDoc.exists()) {
				const probData = probDoc.data();
				attempts = probData.attempts || 0;
				solved = probData.solved || 0;
			}
		} catch (e) {
			console.error("Error fetching problem stats for attachment:", e);
		}

		const formatted: AttachmentProblem = {
			problemId: selectedProblemId,
			problemTitle: targetSub.problemTitle || selectedProblemId,
			submissionId: targetSub.id,
			submissionIndex: selectedSubIndex + 1,
			code: targetSub.code || "",
			language: targetSub.language || "",
			status: targetSub.status || "",
			timestamp: targetSub.timestamp || Date.now(),
			attempts,
			solved,
		};

		setDrafts((prev) => {
			const copy = [...prev];
			copy[showSubmissionSelectorFor] = {
				...copy[showSubmissionSelectorFor],
				submittedProblem: formatted,
			};
			return copy;
		});

		setShowSubmissionSelectorFor(null);
		setSelectedProblemId("");
		setSelectedSubIndex(-1);
	};

	// Submits notifications trigger helper
	const triggerNotification = async (toUid: string, type: "like" | "repost" | "reply", threadId: string) => {
		if (!user || toUid === user.uid) return;
		try {
			const authorName = user.displayName || user.email?.split("@")[0] || "Anonymous";
			await clientSendNotification("THREAD_REPLY", toUid, {
				placeholders: {
					threadTitle: "your thread",
					replierName: authorName,
				},
				ctaUrl: `/threads?threadId=${threadId}`,
				metadata: { threadId }
			});
		} catch (error) {
			console.error("Notification trigger error:", error);
		}
	};

	// Publish entire chain
	const handlePublish = async () => {
		setError(null);
		setSuccess(null);

		if (!user) {
			setError("Please sign in to publish!");
			return;
		}

		// Validation
		const hasContent = drafts.some(
			(d) =>
				d.content.trim() ||
				d.photos.length > 0 ||
				d.files.length > 0 ||
				d.poll ||
				d.gif ||
				d.submittedProblem
		);

		if (!hasContent) {
			setError("Thread content cannot be empty.");
			return;
		}

		// Check limits
		if (drafts.some((d) => d.content.length > 280)) {
			setError("A single post in the thread cannot exceed 280 characters.");
			return;
		}

		setSubmitting(true);
		try {
			const authorName = currentUserProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Anonymous";
			const authorAvatar = currentUserProfile?.avatarUrl || user.photoURL || "";

			let previousThreadId: string | null = composer.parentThreadId || null;

			for (let i = 0; i < drafts.length; i++) {
				const draft = drafts[i];

				// Skip empty draft slots unless it's the only one
				if (
					i > 0 &&
					!draft.content.trim() &&
					draft.photos.length === 0 &&
					draft.files.length === 0 &&
					!draft.poll &&
					!draft.gif &&
					!draft.submittedProblem
				) {
					continue;
				}

				// Format poll
				let formattedPoll: any = null;
				if (draft.poll && draft.poll.question.trim()) {
					const filledOptions = draft.poll.options.filter((o) => o.trim() !== "");
					if (filledOptions.length >= 2) {
						formattedPoll = {
							question: draft.poll.question.trim(),
							options: filledOptions.map((opt) => ({ text: opt.trim(), votes: [] })),
						};
					}
				}

				// Parse Hashtags and Mentions
				const hashRegex = /#(\w+)/g;
				const hashtags: string[] = [];
				let match;
				while ((match = hashRegex.exec(draft.content)) !== null) {
					hashtags.push(match[1].toLowerCase());
				}

				const mentionRegex = /@(\w+)/g;
				const mentions: string[] = [];
				while ((match = mentionRegex.exec(draft.content)) !== null) {
					mentions.push(match[1]);
				}

				const pendingQuoteId = sessionStorage.getItem("pendingQuoteId");
				const postData: any = {
					uid: user.uid,
					displayName: authorName,
					avatarUrl: authorAvatar,
					content: draft.content.trim(),
					createdAt: Date.now() + i, // slight offset to maintain sorting order
					likes: [],
					replies: [],
					photos: draft.photos,
					files: draft.files,
					gif: draft.gif || null,
					poll: formattedPoll,
					hashtags,
					mentions,
					parentThreadId: previousThreadId || "", // empty string if top level
					quotedThreadId: (i === 0 && pendingQuoteId) ? pendingQuoteId : "",
					tags: (i === 0 && !composer.parentThreadId) ? tags : [],
				};

				if (draft.submittedProblem) {
					postData.submittedProblem = draft.submittedProblem;
				}

				// If it's a reply and it's the first post, check parent info
				if (i === 0 && composer.parentThreadId) {
					postData.parentThreadId = composer.parentThreadId;
				}

				const docRef = await addDoc(collection(firestore, "threads"), postData);
				previousThreadId = docRef.id;

				// If this is a reply, trigger notifications
				if (i === 0 && composer.parentThreadId) {
					// Fetch parent thread to get owner UID
					const parentSnap = await getDoc(doc(firestore, "threads", composer.parentThreadId));
					if (parentSnap.exists()) {
						await triggerNotification(parentSnap.data().uid, "reply", docRef.id);
					}
				}
			}

			// Clear draft since it is successfully published
			clearSavedDraft();

			setSuccess("Published successfully!");
			sessionStorage.removeItem("pendingQuoteId");
			setTimeout(() => {
				setComposer({ isOpen: false });
				// Reset drafts
				setDrafts([
					{
						content: "",
						photos: [],
						files: [],
						poll: null,
						gif: null,
						submittedProblem: null,
					},
				]);
				setTags([]);
				setSuccess(null);
			}, 1000);
		} catch (e) {
			console.error("Composer publish error:", e);
			setError("Failed to post thread chain.");
		} finally {
			setSubmitting(false);
		}
	};

	if (!composer.isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			setComposer({ isOpen: false });
		}
	};

	// Global shortcut handling inside textareas
	const handleTextareaKeyDown = (idx: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Ctrl + Enter or Cmd + Enter to publish
		if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
			e.preventDefault();
			handlePublish();
		}
	};

	return (
		<div
			onClick={handleOverlayClick}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
		>
			<div className="bg-bg-surface border border-border-default rounded-lg w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
				{/* Header */}
				<div className="flex justify-between items-center px-5 py-3 border-b border-border-default select-none">
					<div className="flex items-center gap-2">
						<h3 className="text-xs font-mono font-semibold tracking-wider text-text-primary uppercase">
							{composer.parentThreadId ? `Reply to @${composer.replyToDisplayName}` : "New Discussion Thread"}
						</h3>
						<span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
							<FaKeyboard size={10} /> Ctrl+Enter
						</span>
					</div>
					<div className="flex items-center gap-2">
						{hasRecoverableDraft && (
							<button
								onClick={recoverDraft}
								className="flex items-center gap-1 text-[11px] font-mono text-accent-brand border border-accent-brand/30 hover:border-accent-brand px-2.5 py-1 rounded transition-colors bg-accent-brand/10"
								title="Restore previous draft"
							>
								<FaUndo size={9} />
								<span>Recover Draft</span>
							</button>
						)}
						<button
							onClick={() => setComposer({ isOpen: false })}
							className="text-text-muted hover:text-text-primary transition-colors p-1 bg-bg-base hover:bg-bg-surface-elevated rounded border border-border-default"
						>
							<FaTimes size={11} />
						</button>
					</div>
				</div>

				{error && (
					<div className="mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs px-4 py-2.5 rounded-xl animate-fade-in shrink-0">
						{error}
					</div>
				)}
				{success && (
					<div className="mx-6 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 text-xs px-4 py-2.5 rounded-xl animate-fade-in shrink-0">
						{success}
					</div>
				)}

				{/* Chain Area */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
					{drafts.map((draft, idx) => {
						const isLast = idx === drafts.length - 1;
						const count = draft.content.length;
						const nearLimit = count > 200;
						const percentage = Math.min((count / 280) * 100, 100);

						return (
							<div key={idx} className="relative flex gap-4 items-start">
								{/* Left Column (Avatar & line connector) */}
								<div className="flex flex-col items-center shrink-0 h-full relative">
									<Avatar
										src={currentUserProfile?.avatarUrl}
										displayName={currentUserProfile?.displayName || user?.displayName || "Me"}
										size={40}
									/>

									{/* Connector line connecting chain items */}
									{!isLast && (
										<div className="absolute top-[40px] bottom-[-30px] w-[2px] bg-[var(--border-strong)] z-0" />
									)}
								</div>

								{/* Right Column (Draft details) */}
								<div className="flex-grow min-w-0 space-y-3">
									<div className="flex items-center justify-between mb-1">
										<span className="font-bold text-sm text-[var(--text-primary)]">
											{currentUserProfile?.displayName || user?.displayName || "Me"}
										</span>
										<div className="flex items-center gap-2">
											{/* Edit / Preview Tabs */}
											<div className="flex rounded-lg bg-[var(--bg-dark-fill-3)] p-0.5 border border-[var(--border-subtle)]">
												<button
													type="button"
													onClick={() => setDrafts(prev => {
														const c = [...prev];
														c[idx].previewMode = false;
														return c;
													})}
													className={`p-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition ${!draft.previewMode ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
												>
													<FaEdit size={10} /> Edit
												</button>
												<button
													type="button"
													onClick={() => setDrafts(prev => {
														const c = [...prev];
														c[idx].previewMode = true;
														return c;
													})}
													className={`p-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition ${draft.previewMode ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
												>
													<FaEye size={10} /> Preview
												</button>
											</div>

											{drafts.length > 1 && (
												<button
													type="button"
													onClick={() => removeDraftFromChain(idx)}
													className="text-[var(--text-muted)] hover:text-red-400 transition p-1.5 hover:bg-[var(--bg-hover)] rounded-lg"
													title="Remove from chain"
												>
													<FaTrash size={11} />
												</button>
											)}
										</div>
									</div>

									{/* Thread Tags Selector (only on first post of a new thread) */}
									{idx === 0 && !composer.parentThreadId && (
										<div className="w-full mb-3">
											<TagSelect
												type="thread"
												selectedTags={tags}
												onChange={setTags}
												maxTags={5}
												placeholder="Select thread tags (max 5)"
											/>
										</div>
									)}

									{/* Formatting helper bar (only in Edit mode) */}
									{!draft.previewMode && (
										<div className="flex items-center gap-1.5 bg-[var(--bg-dark-fill-3)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] w-fit">
											<button
												type="button"
												onClick={() => formatText(idx, "bold")}
												className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[var(--text-muted)] rounded transition"
												title="Bold (Ctrl+B)"
											>
												<FaBold size={10} />
											</button>
											<button
												type="button"
												onClick={() => formatText(idx, "italic")}
												className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[var(--text-muted)] rounded transition"
												title="Italic (Ctrl+I)"
											>
												<FaItalic size={10} />
											</button>
											<button
												type="button"
												onClick={() => formatText(idx, "link")}
												className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[var(--text-muted)] rounded transition"
												title="Insert Link"
											>
												<FaLink size={10} />
											</button>
											<button
												type="button"
												onClick={() => formatText(idx, "code")}
												className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[var(--text-muted)] rounded transition"
												title="Code Block"
											>
												<FaCode size={10} />
											</button>
										</div>
									)}

									{/* Input box / Preview container */}
									<div className="relative">
										{draft.previewMode ? (
											<div
												className="w-full bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] p-3 rounded-xl min-h-[70px] text-sm text-[var(--text-primary)] overflow-y-auto select-text"
												dangerouslySetInnerHTML={{ __html: parseMarkdown(draft.content) || "<span class='text-[var(--text-muted)] italic'>Nothing to preview.</span>" }}
											/>
										) : (
											<textarea
												ref={(el) => {
													textareaRefs.current[idx] = el;
												}}
												value={draft.content}
												onChange={(e) => handleContentChange(idx, e.target.value, e)}
												onKeyDown={(e) => handleTextareaKeyDown(idx, e)}
												onPaste={(e) => handlePaste(idx, e)}
												onDragOver={(e) => e.preventDefault()}
												onDrop={(e) => handleDrop(idx, e)}
												placeholder={idx === 0 ? (composer.parentThreadId ? "Post a reply..." : "What's new? Support Markdown formatting...") : "Add to thread..."}
												rows={2}
												className="w-full !bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] !border-0 !p-0 !ring-0 !outline-none !shadow-none text-[14.5px] leading-relaxed resize-none"
											/>
										)}

										{/* Mentions Dropdown */}
										{activeDraftIdx === idx && mentionSearch !== "" && (
											<div className="absolute z-50 left-0 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-56 max-h-40 overflow-y-auto mt-1 p-1 scrollbar-thin select-none">
												{allUsers
													.filter(
														(u) =>
															u.displayName.toLowerCase().includes(mentionSearch.toLowerCase()) ||
															u.username.includes(mentionSearch.toLowerCase())
													)
													.slice(0, 5)
													.map((u) => (
														<div
															key={u.uid}
															onClick={() => handleInsertMention(u)}
															className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer transition text-xs font-semibold"
														>
															<Avatar
																src={u.avatarUrl}
																displayName={u.displayName}
																size={22}
															/>
															<div className="truncate">
																<p className="text-[var(--text-primary)]">{u.displayName}</p>
																<p className="text-[10px] text-[var(--text-muted)]">@{u.username}</p>
															</div>
														</div>
													))}
											</div>
										)}
									</div>

									{/* circular char counter */}
									<div className="flex justify-end items-center gap-2 select-none">
										{nearLimit && (
											<span className={`text-[10px] font-mono ${count > 280 ? "text-red-500 font-bold" : "text-[var(--text-muted)]"}`}>
												{count} / 280
											</span>
										)}
										<div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
											<svg className="w-full h-full" viewBox="0 0 20 20">
												<circle cx="10" cy="10" r="7.5" fill="none" stroke="var(--border-subtle)" strokeWidth="1.5" />
												<circle
													cx="10"
													cy="10"
													r="7.5"
													fill="none"
													stroke={count > 280 ? "var(--color-error)" : count > 240 ? "var(--color-warning)" : "var(--brand-orange)"}
													strokeWidth="1.5"
													strokeDasharray={2 * Math.PI * 7.5}
													strokeDashoffset={2 * Math.PI * 7.5 * (1 - percentage / 100)}
													transform="rotate(-90 10 10)"
													className="transition-all duration-150"
												/>
											</svg>
										</div>
									</div>

									{/* Photos Grid */}
									{draft.photos.length > 0 && (
										<div className="grid grid-cols-3 gap-2 border border-[var(--border-subtle)] p-2 rounded-xl bg-[var(--bg-dark-fill-3)]">
											{draft.photos.map((photo, pIdx) => (
												<div key={pIdx} className="relative group aspect-video rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-dark-fill-3)]">
													<img src={photo} className="w-full h-full object-cover" />
													<button
														type="button"
														onClick={() =>
															setDrafts((prev) => {
																const copy = [...prev];
																copy[idx].photos = copy[idx].photos.filter((_, pI) => pI !== pIdx);
																return copy;
															})
														}
														className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 shadow-lg transition duration-150"
													>
														<FaTimes size={8} />
													</button>
												</div>
											))}
										</div>
									)}

									{/* GIF Embedded */}
									{draft.gif && (
										<div className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-dark-fill-3)] max-w-sm aspect-video">
											<img src={draft.gif} className="w-full h-full object-cover" />
											<button
												type="button"
												onClick={() =>
													setDrafts((prev) => {
														const copy = [...prev];
														copy[idx].gif = null;
														return copy;
													})
												}
												className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition"
											>
												<FaTimes size={10} />
											</button>
										</div>
									)}

									{/* Files Attachments */}
									{draft.files.length > 0 && (
										<div className="flex flex-wrap gap-2 border border-[var(--border-subtle)] p-2 rounded-xl bg-[var(--bg-dark-fill-3)]">
											{draft.files.map((file, fIdx) => (
												<div key={fIdx} className="flex items-center gap-1.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-full text-[10px] text-[var(--text-secondary)]">
													<FaPaperclip size={10} className="text-[var(--brand-orange)]" />
													<span className="truncate max-w-[80px]">{file.name}</span>
													<button
														type="button"
														onClick={() =>
															setDrafts((prev) => {
																const copy = [...prev];
																copy[idx].files = copy[idx].files.filter((_, fI) => fI !== fIdx);
																return copy;
															})
														}
														className="text-[var(--text-muted)] hover:text-red-400 ml-1"
													>
														<FaTimes size={10} />
													</button>
												</div>
											))}
										</div>
									)}

									{/* Quoted Post Preview in Composer */}
									{idx === 0 && quotedThread && (
										<div className="relative border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-dark-fill-3)] overflow-hidden w-full mt-1">
											{loadingQuoted ? (
												<div className="h-12 bg-[var(--bg-dark-fill-2)] rounded animate-pulse w-full" />
											) : (
												<div className="space-y-2 w-full pr-6">
													<div className="flex items-center gap-2 min-w-0">
														<Avatar src={quotedThread.avatarUrl} displayName={quotedThread.displayName} size={20} />
														<span className="font-bold text-xs text-[var(--text-primary)] truncate">{quotedThread.displayName}</span>
													</div>
													{quotedThread.content && (
														<p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed break-words max-w-full">
															{quotedThread.content}
														</p>
													)}
												</div>
											)}
											<button
												type="button"
												onClick={() => {
													sessionStorage.removeItem("pendingQuoteId");
													setQuotedThread(null);
												}}
												className="absolute top-3.5 right-3.5 text-[var(--text-muted)] hover:text-red-400 transition"
												title="Remove Quote"
											>
												<FaTimes size={14} />
											</button>
										</div>
									)}

									{/* Problem Submission Card */}
									{draft.submittedProblem && (
										<div className="flex items-center justify-between bg-[var(--brand-glow)] border border-[var(--brand-orange)]/25 px-3.5 py-2.5 rounded-xl text-xs text-[var(--text-secondary)]">
											<div className="flex items-center gap-2 flex-wrap">
												<FaCode className="text-[var(--brand-orange)]" />
												<span className="font-semibold">{draft.submittedProblem.problemTitle}</span>
												<span className="text-[10px] bg-[var(--brand-orange)]/15 text-[var(--brand-orange)] px-2 py-0.5 rounded font-bold font-mono">
													Attempt {draft.submittedProblem.submissionIndex}
												</span>
												{draft.submittedProblem.attempts !== undefined && draft.submittedProblem.attempts > 0 && (
													<span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono border border-emerald-500/20">
														{Math.round(((draft.submittedProblem.solved ?? 0) / draft.submittedProblem.attempts) * 100)}% success
													</span>
												)}
											</div>
											<button
												type="button"
												onClick={() =>
													setDrafts((prev) => {
														const copy = [...prev];
														copy[idx].submittedProblem = null;
														return copy;
													})
												}
												className="text-[var(--text-muted)] hover:text-red-400 transition"
											>
												<FaTimes size={14} />
											</button>
										</div>
									)}

									{/* Poll Builder View */}
									{draft.showPollBuilder && draft.poll && (
										<div className="bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-3 max-w-sm animate-fade-in">
											<div className="flex justify-between items-center mb-1">
												<span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Create Poll</span>
												<button
													type="button"
													onClick={() => handleRemovePoll(idx)}
													className="text-[9px] font-bold text-red-400 hover:underline uppercase"
												>
													Remove Poll
												</button>
											</div>
											<input
												type="text"
												value={draft.poll.question}
												onChange={(e) => handlePollQuestionChange(idx, e.target.value)}
												placeholder="Ask a question..."
												className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg p-2 text-xs outline-none focus:border-[var(--brand-orange)]"
											/>
											<div className="space-y-2">
												{draft.poll.options.map((opt, oIdx) => (
													<div key={oIdx} className="flex gap-2 items-center">
														<input
															type="text"
															value={opt}
															onChange={(e) => handlePollOptionChange(idx, oIdx, e.target.value)}
															placeholder={`Choice ${oIdx + 1}`}
															className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg p-2 text-xs outline-none focus:border-[var(--brand-orange)] font-medium"
														/>
														{draft.poll!.options.length > 2 && (
															<button
																type="button"
																onClick={() => handleRemovePollOption(idx, oIdx)}
																className="text-[var(--text-muted)] hover:text-red-400 transition"
															>
																<FaTimes size={11} />
															</button>
														)}
													</div>
												))}
											</div>
											{draft.poll.options.length < 4 && (
												<button
													type="button"
													onClick={() => handleAddPollOption(idx)}
													className="text-[10px] text-[var(--brand-orange)] hover:underline font-bold flex items-center gap-1 mt-1"
												>
													<FaPlus size={8} /> Add Choice
												</button>
											)}
										</div>
									)}

									{/* Inline Submission Selector */}
									{showSubmissionSelectorFor === idx && (
										<div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl p-4 space-y-3 animate-fade-in">
											<h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Attach Problem Submission</h4>
											{loadingSubmissions ? (
												<p className="text-xs text-[var(--text-muted)] italic animate-pulse">Loading attempts...</p>
											) : userSubmissions.length === 0 ? (
												<p className="text-xs text-[var(--text-muted)] italic">No submissions found.</p>
											) : (
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
													<div>
														<label className="block text-[10px] text-[var(--text-muted)] font-bold mb-1.5 uppercase">Select Problem</label>
														<BeastCodeSelect
															options={Array.from(new Set(userSubmissions.map((s) => s.problemId))).map((pid) => {
																const sub = userSubmissions.find((s) => s.problemId === pid);
																return {
																	value: pid,
																	label: sub?.problemTitle || pid,
																};
															})}
															value={selectedProblemId}
															onChange={(val) => {
																setSelectedProblemId(val);
																setSelectedSubIndex(-1);
															}}
															placeholder="-- Choose --"
															searchable
														/>
													</div>
													{selectedProblemId && (
														<div>
															<label className="block text-[10px] text-[var(--text-muted)] font-bold mb-1.5 uppercase">Select Attempt</label>
															<BeastCodeSelect
																options={userSubmissions
																	.filter((s) => s.problemId === selectedProblemId)
																	.map((sub, sIdx) => ({
																		value: String(sIdx),
																		label: `Attempt ${sIdx + 1} (${sub.status})`,
																	}))
																}
																value={selectedSubIndex === -1 ? "" : String(selectedSubIndex)}
																onChange={(val) => {
																	setSelectedSubIndex(val === "" ? -1 : parseInt(val));
																}}
																placeholder="-- Choose --"
															/>
														</div>
													)}
												</div>
											)}
											<div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
												<button
													type="button"
													onClick={() => {
														setShowSubmissionSelectorFor(null);
														setSelectedProblemId("");
														setSelectedSubIndex(-1);
													}}
													className="px-3.5 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-dark-fill-3)] hover:bg-[var(--bg-hover)] transition font-semibold"
												>
													Cancel
												</button>
												<button
													type="button"
													onClick={handleAttachSubmission}
													disabled={!selectedProblemId || selectedSubIndex === -1}
													className="px-4 py-1.5 rounded-lg bc-btn-brand transition disabled:bg-[var(--bg-dark-fill-3)] disabled:text-[var(--text-muted)] font-semibold"
												>
													Attach Code
												</button>
											</div>
										</div>
									)}

									{/* Action Row */}
									<div className="flex items-center gap-3.5 text-[var(--text-muted)] pt-1 select-none">
										{/* Attach Photo Button */}
										<label className="cursor-pointer hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition" title="Add Photo">
											<FaImage size={14} />
											<input
												ref={(el) => {
													photoInputRefs.current[idx] = el;
												}}
												type="file"
												accept="image/*"
												multiple
												className="hidden"
												onChange={(e) => handlePhotoSelect(idx, e)}
											/>
										</label>

										{/* Attach File Button */}
										<label className="cursor-pointer hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition" title="Add File">
											<FaPaperclip size={14} />
											<input
												ref={(el) => {
													fileInputRefs.current[idx] = el;
												}}
												type="file"
												multiple
												className="hidden"
												onChange={(e) => handleFileSelect(idx, e)}
											/>
										</label>

										{/* Emoji Picker Trigger */}
										<div className="relative">
											<button
												type="button"
												onClick={() =>
													setDrafts((prev) => {
														const copy = [...prev];
														copy[idx].showEmojiPicker = !copy[idx].showEmojiPicker;
														copy[idx].showGifPicker = false;
														return copy;
													})
												}
												className="hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition"
												title="Insert Emoji"
											>
												<FaSmile size={14} />
											</button>
											{draft.showEmojiPicker && (
												<EmojiPicker
													onSelect={(emoji) => {
														setDrafts((prev) => {
															const copy = [...prev];
															const txtArea = textareaRefs.current[idx];
															const cursor = txtArea ? txtArea.selectionStart : copy[idx].content.length;
															const text = copy[idx].content;
															copy[idx].content = text.substring(0, cursor) + emoji + text.substring(cursor);
															copy[idx].showEmojiPicker = false;
															return copy;
														});
													}}
													onClose={() =>
														setDrafts((prev) => {
															const copy = [...prev];
															copy[idx].showEmojiPicker = false;
															return copy;
														})
													}
												/>
											)}
										</div>

										{/* GIF Picker Trigger */}
										<div className="relative">
											<button
												type="button"
												onClick={() =>
													setDrafts((prev) => {
														const copy = [...prev];
														copy[idx].showGifPicker = !copy[idx].showGifPicker;
														copy[idx].showEmojiPicker = false;
														return copy;
													})
												}
												className="hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition text-xs font-black"
												title="Add GIF"
											>
												GIF
											</button>
											{draft.showGifPicker && (
												<GifPicker
													onSelect={(url) => {
														setDrafts((prev) => {
															const copy = [...prev];
															copy[idx].gif = url;
															copy[idx].showGifPicker = false;
															return copy;
														});
													}}
													onClose={() =>
														setDrafts((prev) => {
															const copy = [...prev];
															copy[idx].showGifPicker = false;
															return copy;
														})
													}
												/>
											)}
										</div>

										{/* Poll Creator Trigger */}
										<button
											type="button"
											onClick={() => handleOpenPollBuilder(idx)}
											disabled={!!draft.poll}
											className="hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition disabled:opacity-30"
											title="Add Poll"
										>
											<FaPollH size={14} />
										</button>

										{/* Attach solved problem */}
										<button
											type="button"
											onClick={() => handleOpenSubmissionSelector(idx)}
											className="hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition"
											title="Attach Leetcode Solution"
										>
											<FaCode size={14} />
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Footer Options & Post Button */}
				<div className="px-5 py-3 bg-bg-base border-t border-border-default flex justify-between items-center select-none">
					{/* Add thread to chain button */}
					{!composer.parentThreadId ? (
						<button
							onClick={addDraftToChain}
							className="flex items-center gap-1.5 text-xs font-mono text-accent-brand hover:underline transition-colors"
						>
							<FaPlus size={9} />
							<span>Add to thread chain</span>
						</button>
					) : (
						<div />
					)}

					<div className="flex gap-2">
						<button
							onClick={() => setComposer({ isOpen: false })}
							className="bg-bg-surface hover:bg-bg-surface-elevated text-text-secondary border border-border-default text-xs font-mono px-3.5 py-1.5 rounded-md transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handlePublish}
							disabled={submitting}
							className="bg-accent-brand hover:bg-accent-hover text-bg-base font-mono text-xs font-medium px-4 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40"
						>
							{submitting ? (
								<>
									<FaSpinner className="animate-spin" size={11} />
									<span>Posting...</span>
								</>
							) : (
								<span>Publish</span>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ThreadComposer;
