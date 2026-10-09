import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { Badge } from "@/components/UI/Badge";
import JSZip from "jszip";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore, auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import { FaChevronLeft, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaCloudUploadAlt, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import MarkdownEditor from "@/components/Admin/MarkdownEditor";
import { slugify } from "@/utils/slugify";
import TagSelect from "@/components/Admin/TagSelect";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";

interface Example {
	id: number;
	inputText: string;
	outputText: string;
	explanation?: string;
	img?: string;
	isSample?: boolean;
	isAdditional?: boolean;
	strength?: number;
}

const EditProblem: React.FC = () => {
	const router = useRouter();
	const { pid } = router.query;
	const [isAdmin, loadingAdmin] = useAdmin();
	const [user] = useAuthState(auth);

	const [activeTab, setActiveTab] = useState("details");
	const [loadingProblem, setLoadingProblem] = useState(true);

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

	// Details fields
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [language, setLanguage] = useState("English");
	const [difficulty, setDifficulty] = useState("Medium");
	const [problemStatement, setProblemStatement] = useState("");
	const [inputFormat, setInputFormat] = useState("");
	const [constraints, setConstraints] = useState("");
	const [outputFormat, setOutputFormat] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	// Moderators fields
	const [moderators, setModerators] = useState<string[]>([]);
	const [newModEmail, setNewModEmail] = useState("");

	// Test Cases fields
	const [examples, setExamples] = useState<Example[]>([]);
	const [initialExamplesCount, setInitialExamplesCount] = useState<number | null>(null);
	const [autofillSample, setAutofillSample] = useState(true);
	
	// Test Case Editing state
	const [isEditingTestCase, setIsEditingTestCase] = useState(false);
	const [editingTestCaseIndex, setEditingTestCaseIndex] = useState<number | null>(null);
	const [tcInput, setTcInput] = useState("");
	const [tcOutput, setTcOutput] = useState("");
	const [tcExplanation, setTcExplanation] = useState("");
	const [tcImg, setTcImg] = useState("");
	const [tcIsSample, setTcIsSample] = useState(false);
	const [tcIsAdditional, setTcIsAdditional] = useState(false);
	const [tcStrength, setTcStrength] = useState(1);

	// Code Stubs fields
	const [starterCode, setStarterCode] = useState("");
	const [starterFunctionName, setStarterFunctionName] = useState("");

	// Settings fields
	const [videoId, setVideoId] = useState("");
	const [link, setLink] = useState("");
	const [handlerFunction, setHandlerFunction] = useState("");

	// Execution policy fields
	const [executionProfile, setExecutionProfile] = useState("normal");
	const [customTimeoutMs, setCustomTimeoutMs] = useState(5000);
	const [customMemoryLimitMb, setCustomMemoryLimitMb] = useState(256);
	const [customMaxOutputSizeChars, setCustomMaxOutputSizeChars] = useState(65536);
	const [customCpuCount, setCustomCpuCount] = useState(1);
	const [customDiskLimitMb, setCustomDiskLimitMb] = useState(50);
	const [customProcessLimit, setCustomProcessLimit] = useState(15);

	// Custom Checker fields
	const [customCheckerType, setCustomCheckerType] = useState("exact");
	const [customCheckerEpsilon, setCustomCheckerEpsilon] = useState(1e-6);
	const [customCheckerLang, setCustomCheckerLang] = useState("python");
	const [customCheckerCode, setCustomCheckerCode] = useState("");

	// Editorial fields
	const [editorialMarkdown, setEditorialMarkdown] = useState("");
	const [editorialVideoUrl, setEditorialVideoUrl] = useState("");

	// File Input ref for zip/json import
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!loadingAdmin && !isAdmin) {
			router.push("/");
		}
	}, [isAdmin, loadingAdmin, router]);

	useEffect(() => {
		const loadProblemData = async () => {
			if (!pid) return;
			setLoadingProblem(true);
			try {
				const docRef = doc(firestore, "problems", pid as string);
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					const data = docSnap.data();
					setTitle(data.title || "");
					setDescription(data.description || "");
					setLanguage(data.language || "English");
					setDifficulty(data.difficulty || "Medium");
					setProblemStatement(data.problemStatement || "");
					setInputFormat(data.inputFormat || "");
					setConstraints(data.constraints || "");
					setOutputFormat(data.outputFormat || "");
					const dbTags = data.tags && Array.isArray(data.tags)
						? data.tags
						: [];
					setTags(dbTags);
					
					// moderators
					if (data.moderators && Array.isArray(data.moderators)) {
						setModerators(data.moderators);
					} else {
						// Fallback to current user if empty
						setModerators(user?.email ? [user.email] : []);
					}

					setStarterCode(data.starterCode || "");
					setStarterFunctionName(data.starterFunctionName || "");
					setVideoId(data.videoId || "");
					setLink(data.link || "");
					setHandlerFunction(data.handlerFunction || "");
					setExecutionProfile(data.executionProfile || "normal");
					setCustomTimeoutMs(data.customTimeoutMs || 5000);
					setCustomMemoryLimitMb(data.customMemoryLimitMb || 256);
					setCustomMaxOutputSizeChars(data.customMaxOutputSizeChars || 65536);
					setCustomCpuCount(data.customCpuCount || 1);
					setCustomDiskLimitMb(data.customDiskLimitMb || 50);
					setCustomProcessLimit(data.customProcessLimit || 15);
					const loadedExamples = Array.isArray(data.examples) ? data.examples : [];
					setExamples(loadedExamples);
					setInitialExamplesCount(loadedExamples.length);
					setCustomCheckerType(data.customChecker?.type || "exact");
					setCustomCheckerEpsilon(data.customChecker?.epsilon || 1e-6);
					setCustomCheckerLang(data.customChecker?.scriptLanguage || "python");
					setCustomCheckerCode(data.customChecker?.scriptCode || "");
					setEditorialMarkdown(data.editorial?.markdown || "");
					setEditorialVideoUrl(data.editorial?.videoUrl || "");
				} else {
					triggerStatusRibbon("error", "Problem not found in Firestore.");
					router.push("/admin");
				}
			} catch (error: any) {
				console.error("Error loading problem data:", error);
				triggerStatusRibbon("error", "Failed to load problem data.");
			} finally {
				setLoadingProblem(false);
			}
		};

		if (isAdmin && pid) {
			loadProblemData();
		}
	}, [isAdmin, pid, router, user]);

	// Moderators logic
	const handleAddModerator = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newModEmail.trim().toLowerCase();
		if (!trimmed) return;
		if (moderators.includes(trimmed)) {
			triggerStatusRibbon("error", "Moderator already added.");
			return;
		}
		setModerators((prev) => [...prev, trimmed]);
		setNewModEmail("");
		triggerStatusRibbon("success", `Added ${trimmed} to moderators list (save to apply changes).`);
	};

	const handleRemoveModerator = (emailToRemove: string) => {
		if (moderators.indexOf(emailToRemove) === 0) {
			triggerStatusRibbon("error", "Cannot remove the owner.");
			return;
		}
		setModerators((prev) => prev.filter((email) => email !== emailToRemove));
		triggerStatusRibbon("info", `Removed ${emailToRemove} (save to apply changes).`);
	};

	// Test Cases logic
	const handleAddTestCaseClick = () => {
		setIsEditingTestCase(true);
		setEditingTestCaseIndex(null);
		setTcInput("");
		setTcOutput("");
		setTcExplanation("");
		setTcImg("");
		setTcIsSample(false);
		setTcIsAdditional(false);
		setTcStrength(1);
	};

	const handleEditTestCaseClick = (index: number) => {
		const tc = examples[index];
		setIsEditingTestCase(true);
		setEditingTestCaseIndex(index);
		setTcInput(tc.inputText);
		setTcOutput(tc.outputText);
		setTcExplanation(tc.explanation || "");
		setTcImg(tc.img || "");
		setTcIsSample(!!tc.isSample);
		setTcIsAdditional(!!tc.isAdditional);
		setTcStrength(tc.strength || 1);
	};

	const handleSaveTestCase = () => {
		if (!tcInput.trim() || !tcOutput.trim()) {
			triggerStatusRibbon("error", "Input and Output fields are required for a test case.");
			return;
		}

		const newTc: Example = {
			id: editingTestCaseIndex !== null ? examples[editingTestCaseIndex].id : examples.length + 1,
			inputText: tcInput,
			outputText: tcOutput,
			explanation: tcExplanation.trim() || undefined,
			img: tcImg.trim() || undefined,
			isSample: tcIsSample,
			isAdditional: tcIsAdditional,
			strength: Number(tcStrength) || 1,
		};

		if (editingTestCaseIndex !== null) {
			// Update existing
			setExamples((prev) => {
				const updated = [...prev];
				updated[editingTestCaseIndex] = newTc;
				return updated;
			});
			triggerStatusRibbon("success", "Test case updated locally.");
		} else {
			// Create new
			setExamples((prev) => [...prev, newTc]);
			triggerStatusRibbon("success", "Test case added locally.");
		}

		setIsEditingTestCase(false);
	};

	const handleRemoveTestCase = (index: number) => {
		const newExamples = examples.filter((_, idx) => idx !== index);
		// re-index
		const reindexed = newExamples.map((ex, idx) => ({ ...ex, id: idx + 1 }));
		setExamples(reindexed);
		triggerStatusRibbon("info", "Test case removed locally.");
	};

	// File Upload / Import logic
	const handleFileUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.name.endsWith(".zip")) {
			const reader = new FileReader();
			reader.onload = async (event) => {
				try {
					const arrayBuffer = event.target?.result as ArrayBuffer;
					const zip = await JSZip.loadAsync(arrayBuffer);
					
					const fileMap: Record<string, string> = {};
					const fileNames: string[] = [];

					const promises: Promise<void>[] = [];
					zip.forEach((relativePath, fileInfo) => {
						if (!fileInfo.dir && !relativePath.includes("__MACOSX")) {
							promises.push(
								fileInfo.async("string").then((content) => {
									fileMap[relativePath] = content;
									fileNames.push(relativePath);
								})
							);
						}
					});

					await Promise.all(promises);

					const inputFiles: { name: string; key: string; num: string }[] = [];
					const outputFiles: { name: string; key: string; num: string }[] = [];

					fileNames.forEach((name) => {
						const lowerName = name.toLowerCase();
						const filenameOnly = name.split("/").pop() || "";
						
						const numbers = filenameOnly.match(/\d+/);
						const num = numbers ? numbers[0] : filenameOnly;

						const isInput = lowerName.includes("input") || lowerName.endsWith(".in") || lowerName.includes("/in/") || filenameOnly.startsWith("in");
						const isOutput = lowerName.includes("output") || lowerName.includes("expected") || lowerName.endsWith(".out") || lowerName.endsWith(".ans") || lowerName.includes("/out/") || filenameOnly.startsWith("out") || filenameOnly.startsWith("ans");

						if (isInput) {
							inputFiles.push({ name: filenameOnly, key: name, num });
						} else if (isOutput) {
							outputFiles.push({ name: filenameOnly, key: name, num });
						}
					});

					const importedCases: Example[] = [];
					
					inputFiles.forEach((inF) => {
						const outF = outputFiles.find((o) => o.num === inF.num) || 
									 outputFiles.find((o) => o.name.replace(/output|expected|ans/i, "input") === inF.name);

						if (outF) {
							importedCases.push({
								id: 0,
								inputText: fileMap[inF.key],
								outputText: fileMap[outF.key],
								explanation: "",
								img: "",
								isSample: inF.key.toLowerCase().includes("sample") || false,
								isAdditional: false,
								strength: 1,
							});
						}
					});

					if (importedCases.length === 0) {
						triggerStatusRibbon("error", "Could not automatically pair any input/output files in the ZIP. Ensure files have matching numbers (e.g. input_1.txt & output_1.txt).");
						return;
					}

					importedCases.sort((a, b) => {
						const numA = Number(a.inputText.match(/\d+/) || 0);
						const numB = Number(b.inputText.match(/\d+/) || 0);
						return numA - numB;
					});

					const finalCases = importedCases.map((tc, idx) => ({
						...tc,
						id: examples.length + idx + 1,
						isSample: tc.isSample || (examples.length + idx < 3)
					}));

					setExamples((prev) => [...prev, ...finalCases]);
					triggerStatusRibbon("success", `Successfully imported and paired ${finalCases.length} test cases from ZIP!`);
				} catch (err: any) {
					triggerStatusRibbon("error", `Error reading ZIP archive: ${err.message}`);
				}
			};
			reader.readAsArrayBuffer(file);
			e.target.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const parsed = JSON.parse(content);
				
				if (!Array.isArray(parsed)) {
					throw new Error("JSON file must contain an array of test cases.");
				}

				const importedCases = parsed.map((item: any, idx: number) => {
					return {
						id: examples.length + idx + 1,
						inputText: item.inputText || item.input || "",
						outputText: item.outputText || item.output || "",
						explanation: item.explanation || "",
						img: item.img || "",
						isSample: !!item.isSample || !!item.sample,
						isAdditional: !!item.isAdditional || !!item.additional,
						strength: Number(item.strength) || 1,
					};
				});

				const invalid = importedCases.some((tc: any) => !tc.inputText || !tc.outputText);
				if (invalid) {
					triggerStatusRibbon("error", "Imported cases must contain non-empty Input and Output fields.");
					return;
				}

				setExamples((prev) => [...prev, ...importedCases]);
				triggerStatusRibbon("success", `Successfully imported ${importedCases.length} test cases!`);
			} catch (err: any) {
				triggerStatusRibbon("error", `Error parsing JSON: ${err.message}`);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	// Main submit handler
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim() || !problemStatement.trim()) {
			triggerStatusRibbon("error", "Please fill in all required fields (Challenge Name, Problem Statement).");
			return;
		}

		setSubmitting(true);
		triggerStatusRibbon("info", "Saving changes...", 0);

		try {
			const problemData: Record<string, any> = {
				id: pid as string,
				slug: pid as string,
				updatedAt: Date.now(),
				title: title.trim(),
				difficulty,
				videoId: videoId.trim() || null,
				link: link.trim() || null,
				problemStatement,
				description: description.trim() || "",
				language,
				inputFormat: inputFormat.trim() || "",
				outputFormat: outputFormat.trim() || "",
				constraints: constraints.trim() || "",
				tags,
				moderators,
				starterCode: starterCode.trim() || "",
				starterFunctionName: starterFunctionName.trim() || "",
				handlerFunction: handlerFunction.trim() || "",
				executionProfile,
				customTimeoutMs: Number(customTimeoutMs) || 5000,
				customMemoryLimitMb: Number(customMemoryLimitMb) || 256,
				customMaxOutputSizeChars: Number(customMaxOutputSizeChars) || 65536,
				customCpuCount: Number(customCpuCount) || 1,
				customDiskLimitMb: Number(customDiskLimitMb) || 50,
				customProcessLimit: Number(customProcessLimit) || 15,
				customChecker: {
					type: customCheckerType,
					epsilon: Number(customCheckerEpsilon) || 1e-6,
					scriptLanguage: customCheckerLang,
					scriptCode: customCheckerCode.trim(),
				},
				editorial: {
					markdown: editorialMarkdown.trim(),
					videoUrl: editorialVideoUrl.trim() || null,
				}
			};

			// ONLY overwrite examples if the admin is actively editing the testcases tab.
			// This prevents accidental wiping of testcases when editing Details/Settings/etc.
			if (activeTab === "testcases") {
				if (initialExamplesCount !== null && initialExamplesCount > 0 && examples.length === 0) {
					const confirmed = window.confirm(
						`Warning: You are about to delete all ${initialExamplesCount} test cases for this challenge. Are you sure you want to proceed?`
					);
					if (!confirmed) {
						setSubmitting(false);
						triggerStatusRibbon("info", "Save cancelled.");
						return;
					}
				}
				problemData.examples = examples;
			}

			const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
			if (!idToken) {
				throw new Error("You must be logged in to save changes.");
			}

			const res = await fetch(`/api/admin/problems/${pid}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify(problemData),
			});

			const result = await res.json();
			if (!res.ok || !result.success) {
				throw new Error(result.error || "Failed to save changes. Please try again.");
			}

			triggerStatusRibbon("success", "Problem updated successfully!");
			setTimeout(() => {
				router.push("/admin");
			}, 1500);
		} catch (error: any) {
			console.error("Error updating problem:", error);
			triggerStatusRibbon("error", error?.message || "Failed to save changes. Please try again.");
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

	const tabs = [
		{ id: "details", label: "Details" },
		{ id: "moderators", label: "Moderators" },
		{ id: "testcases", label: "Test Cases" },
		{ id: "codestubs", label: "Code Stubs" },
		{ id: "languages", label: "Languages", disabled: true },
		{ id: "settings", label: "Settings" },
		{ id: "editorial", label: "Editorial" },
		{ id: "customchecker", label: "Custom Checker" },
	];

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title={title || (pid as string)}
				description="Edit challenge statement, constraints, starter code, test suites, and grading specifications."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Problems", href: "/admin?tab=problems" },
					{ label: (pid as string) || "Edit Problem" },
				]}
				badge={difficulty ? (
					<Badge
						variant={difficulty.toLowerCase() === "easy" ? "success" : difficulty.toLowerCase() === "medium" ? "warning" : "error"}
						size="sm"
						className="font-mono uppercase"
					>
						{difficulty}
					</Badge>
				) : undefined}
				actions={
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting}
						className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
					>
						{submitting ? <FaSpinner className="animate-spin" size={11} /> : <FaCheck size={11} />}
						Save Changes
					</button>
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
					onChange={(id) => {
						setActiveTab(id);
						setIsEditingTestCase(false);
					}}
					className="mb-6"
				/>

				{/* Tab content area */}
				<div className='border rounded shadow-sm p-8' style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
					
					{loadingProblem ? (
						<div className='flex flex-col justify-center items-center py-20 gap-4'>
							<div className='w-12 h-12 border-4 rounded-full animate-spin' style={{ borderColor: "var(--brand-orange)", borderTopColor: "transparent" }}></div>
							<div className='font-semibold' style={{ color: "var(--text-secondary)" }}>Loading challenge details...</div>
						</div>
					) : (
						<>
							{/* DETAILS TAB */}
							{activeTab === "details" && (
								<div className='space-y-6'>
									<p className='text-sm italic border-b pb-4' style={{ color: "var(--text-muted)", borderBottomColor: "var(--border-subtle)" }}>
										This is the basic information that describes your challenge.
									</p>

									{/* Language */}
									<div className='grid grid-cols-12 gap-4 items-center'>
										<label htmlFor='language' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
											Language
										</label>
										<div className='col-span-6'>
									<BeastCodeSelect
										options={[
											{ value: "English", label: "English" },
											{ value: "Vietnamese", label: "Vietnamese" },
											{ value: "Spanish", label: "Spanish" },
											{ value: "Japanese", label: "Japanese" }
										]}
										value={language}
										onChange={(val) => setLanguage(val)}
										size="sm"
									/>
										</div>
									</div>

									{/* Difficulty */}
									<div className='grid grid-cols-12 gap-4 items-center'>
										<label htmlFor='difficulty' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
											Challenge Difficulty
										</label>
										<div className='col-span-6'>
									<BeastCodeSelect
										options={[
											{ value: "Easy", label: "Easy" },
											{ value: "Medium", label: "Medium" },
											{ value: "Hard", label: "Hard" }
										]}
										value={difficulty}
										onChange={(val) => setDifficulty(val)}
										size="sm"
									/>
										</div>
									</div>

									{/* Challenge Name */}
									<div className='grid grid-cols-12 gap-4 items-center'>
										<label htmlFor='title' className='col-span-3 text-right pr-6 font-semibold text-sm' style={{ color: "var(--text-secondary)" }}>
											Challenge Name
										</label>
										<div className='col-span-7'>
											<input
												type='text'
												id='title'
												value={title}
												onChange={(e) => setTitle(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition shadow-sm'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
												required
											/>
										</div>
									</div>

									{/* Challenge Slug */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<div className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Challenge Slug
										</div>
										<div className='col-span-7'>
											<input
												type='text'
												value={`https://leetcode-yt.com/problems/${pid}`}
												disabled
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-sm w-full font-mono select-all cursor-not-allowed'
												style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
											/>
											<span className='text-[11px] mt-1 block italic font-semibold' style={{ color: "var(--text-muted)" }}>
												Slug can only be updated within 48 hours after creation of a challenge.
											</span>
										</div>
									</div>

									{/* Description */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label htmlFor='description' className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Description
										</label>
										<div className='col-span-9'>
											<textarea
												id='description'
												value={description}
												onChange={(e) => setDescription(e.target.value.slice(0, 140))}
												rows={3}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange transition shadow-sm font-sans resize-y'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											/>
											<div className='text-right text-xs mt-1 font-semibold' style={{ color: "var(--text-muted)" }}>
												Characters left: {140 - description.length}
											</div>
										</div>
									</div>

									{/* Problem Statement */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Problem Statement
										</label>
										<div className='col-span-9'>
											<MarkdownEditor
												value={problemStatement}
												onChange={setProblemStatement}
												height='220px'
											/>
										</div>
									</div>

									{/* Input Format */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Input Format
										</label>
										<div className='col-span-9'>
											<MarkdownEditor
												value={inputFormat}
												onChange={setInputFormat}
												height='150px'
											/>
										</div>
									</div>

									{/* Constraints */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Constraints
										</label>
										<div className='col-span-9'>
											<MarkdownEditor
												value={constraints}
												onChange={setConstraints}
												height='150px'
											/>
										</div>
									</div>

									{/* Output Format */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Output Format
										</label>
										<div className='col-span-9'>
											<MarkdownEditor
												value={outputFormat}
												onChange={setOutputFormat}
												height='150px'
											/>
										</div>
									</div>

									{/* Tags */}
									<div className='grid grid-cols-12 gap-4 items-start'>
										<label className='col-span-3 text-right pr-6 font-semibold text-sm pt-2' style={{ color: "var(--text-secondary)" }}>
											Tags
										</label>
										<div className='col-span-9'>
											<TagSelect type="problem" selectedTags={tags} onChange={setTags} />
										</div>
									</div>
								</div>
							)}

							{/* MODERATORS TAB */}
							{activeTab === "moderators" && (
								<div className='space-y-6'>
									<div>
										<h3 className='text-lg font-semibold mb-1' style={{ color: "var(--text-primary)" }}>Moderators</h3>
										<p className='text-xs mb-4' style={{ color: "var(--text-muted)" }}>
											Moderators can edit this challenge and manage its settings.
										</p>
									</div>

									{/* Add moderator form */}
									<form onSubmit={handleAddModerator} className='flex gap-3 max-w-xl items-start'>
										<div className='flex-1'>
											<input
												type='email'
												value={newModEmail}
												onChange={(e) => setNewModEmail(e.target.value)}
												aria-label="Moderator email address"
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											/>
											<span className='text-[10px] mt-1 block font-semibold' style={{ color: "var(--text-muted)" }}>
												Enter moderator email. Moderators can edit this challenge.
											</span>
										</div>
										<button
											type='submit'
											className='hover:bg-dark-hover px-4 py-2 rounded font-semibold text-sm transition border border-border-default font-sans'
											style={{ background: "var(--bg-dark-layer-1)", color: "var(--text-primary)" }}
										>
											Add
										</button>
									</form>

									{/* Moderators List */}
									<div className='mt-8 max-w-2xl'>
										<h4 className='text-sm font-semibold mb-3 border-b pb-2' style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
											Current Access
										</h4>

										<div className='space-y-3'>
											{moderators.map((email, idx) => (
												<div key={idx} className='flex justify-between items-center p-3 rounded border hover:bg-dark-hover transition' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-subtle)" }}>
													<div className='flex items-center gap-3'>
														<div className='w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm' style={{ background: "color-mix(in srgb, var(--brand-orange) 15%, transparent)", color: "var(--brand-orange)" }}>
															{email.charAt(0).toUpperCase()}
														</div>
														<div>
															<p className='text-sm font-semibold' style={{ color: "var(--text-primary)" }}>{email}</p>
															<p className='text-xs' style={{ color: "var(--text-muted)" }}>{idx === 0 ? "owner" : "moderator"}</p>
														</div>
													</div>

													{idx !== 0 && (
														<button
															type='button'
															onClick={() => handleRemoveModerator(email)}
															className='text-xs font-semibold hover:underline bg-transparent'
															style={{ color: "var(--color-error)" }}
														>
															Revoke Access
														</button>
													)}
													
													{idx === 0 && (
														<span className='text-[10px] font-bold px-2 py-0.5 rounded uppercase select-none border' style={{ background: "var(--bg-surface)", color: "var(--text-muted)", borderColor: "var(--border-default)" }}>
															Owner
														</span>
													)}
												</div>
											))}
										</div>
									</div>
								</div>
							)}

							{/* TEST CASES TAB */}
							{activeTab === "testcases" && (
								<div className='space-y-6'>
									<div>
										<h3 className='text-lg font-semibold mb-1' style={{ color: "var(--text-primary)" }}>Test Cases</h3>
										<p className='text-xs leading-relaxed' style={{ color: "var(--text-secondary)" }}>
											Add test cases to judge the correctness of a user&apos;s code. Refer to these{" "}
											<a href='#' style={{ color: "var(--brand-orange)" }} className='hover:underline'>instructions</a> to write a good test case.
											<br />
											<button type="button" onClick={handleFileUploadClick} className='hover:underline inline-flex items-center gap-1 font-semibold text-[11px] mt-1 bg-transparent' style={{ color: "var(--brand-orange)" }}>
												Import test cases (.json or paired .zip)
											</button>
											<input
												ref={fileInputRef}
												type='file'
												accept='.json,.zip'
												onChange={handleFileChange}
												className='hidden'
											/>
										</p>
									</div>

									{/* Total Test Cases Status Summary */}
									<div className='flex items-center gap-3 py-1 text-xs'>
										<span className='px-2.5 py-1 rounded font-medium border' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
											Total Test Cases: <strong className='font-bold' style={{ color: "var(--brand-orange)" }}>{examples.length}</strong>
										</span>
										<span className='px-2.5 py-1 rounded font-medium border' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
											Sample: <strong>{examples.filter((ex) => !!ex.isSample).length}</strong>
										</span>
										<span className='px-2.5 py-1 rounded font-medium border' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
											Hidden: <strong>{examples.filter((ex) => !ex.isSample).length}</strong>
										</span>
									</div>

									{/* Alert when empty */}
									{examples.length === 0 && (
										<div className='border-l-4 border-brand-orange bg-brand-orange/10 p-4 rounded-r flex gap-3 items-start max-w-4xl shadow-sm'>
											<FaExclamationTriangle size={16} className='text-brand-orange mt-0.5' />
											<div>
												<p className='text-sm font-semibold' style={{ color: "var(--text-primary)" }}>
													You do not have any test cases for this challenge.
												</p>
												<p className='text-xs font-medium mt-1' style={{ color: "var(--text-secondary)" }}>
													Add at least one test case to allow users to submit solutions.
												</p>
											</div>
										</div>
									)}

									{/* Action buttons */}
									{!isEditingTestCase && (
										<div className='flex justify-between items-center max-w-5xl pt-2'>
											<div className='flex items-center gap-2'>
												<input
													type='checkbox'
													id='autofill'
													checked={autofillSample}
													onChange={(e) => setAutofillSample(e.target.checked)}
													className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shadow-sm'
												/>
												<label htmlFor='autofill' className='text-xs font-semibold select-none cursor-pointer' style={{ color: "var(--text-secondary)" }}>
													Autofill Sample Input, Sample Output, and Explanation fields for all test cases marked as Sample.
												</label>
											</div>

											<div className='flex gap-2.5'>
												<button
													type='button'
													onClick={handleFileUploadClick}
													className='hover:bg-dark-hover px-4 py-2 rounded font-semibold text-xs transition border flex items-center gap-1.5'
													style={{ background: "var(--bg-dark-layer-1)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
												>
													<FaCloudUploadAlt size={14} style={{ color: "var(--text-muted)" }} />
													Upload JSON
												</button>
												<button
													type='button'
													onClick={handleAddTestCaseClick}
													className='hover:opacity-90 px-4 py-2 rounded font-semibold text-xs transition shadow flex items-center gap-1'
													style={{ background: "var(--color-success)", color: "var(--bg-surface)" }}
												>
													<FaPlus size={10} />
													Add Test Case
												</button>
											</div>
										</div>
									)}

									{/* Test Case Editor (Form) */}
									{isEditingTestCase && (
										<div className='border p-6 rounded-lg max-w-4xl space-y-4 shadow relative' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-default)" }}>
											<h4 className='text-sm font-bold border-b pb-2 mb-2' style={{ color: "var(--brand-orange)", borderBottomColor: "var(--border-subtle)" }}>
												{editingTestCaseIndex !== null ? `Edit Test Case ${editingTestCaseIndex + 1}` : "Add New Test Case"}
											</h4>

											<button
												type='button'
												onClick={() => setIsEditingTestCase(false)}
												className='absolute top-4 right-4'
												style={{ color: "var(--text-muted)" }}
												title='Cancel'
											>
												<FaTimes size={16} />
											</button>

											<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
												<div>
													<label className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>Input (stdin) <span style={{ color: "var(--color-error)" }}>*</span></label>
													<textarea
														value={tcInput}
														onChange={(e) => setTcInput(e.target.value)}
														rows={5}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none text-xs rounded block w-full p-2.5 font-mono focus:border-brand-orange shadow-sm'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
														required
													/>
												</div>
												<div>
													<label className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>Output (stdout) <span style={{ color: "var(--color-error)" }}>*</span></label>
													<textarea
														value={tcOutput}
														onChange={(e) => setTcOutput(e.target.value)}
														rows={5}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none text-xs rounded block w-full p-2.5 font-mono focus:border-brand-orange shadow-sm'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
														required
													/>
												</div>
												<div className='col-span-1 md:col-span-2'>
													<label className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>Explanation (Optional)</label>
													<textarea
														value={tcExplanation}
														onChange={(e) => setTcExplanation(e.target.value)}
														rows={2}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none text-xs rounded block w-full p-2.5 focus:border-brand-orange shadow-sm'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>
												<div className='col-span-1 md:col-span-2'>
													<label className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>Image URL (Optional)</label>
													<input
														type='text'
														value={tcImg}
														onChange={(e) => setTcImg(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none text-xs rounded block w-full p-2 focus:border-brand-orange shadow-sm'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>
											</div>

											<div className='flex flex-wrap gap-6 pt-2 items-center'>
												<div className='flex items-center gap-2'>
													<input
														type='checkbox'
														id='tcSample'
														checked={tcIsSample}
														onChange={(e) => setTcIsSample(e.target.checked)}
														className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shadow-sm'
													/>
													<label htmlFor='tcSample' className='text-xs font-bold select-none cursor-pointer' style={{ color: "var(--text-secondary)" }}>
														Is Sample Case
													</label>
												</div>

												<div className='flex items-center gap-2'>
													<input
														type='checkbox'
														id='tcAdditional'
														checked={tcIsAdditional}
														onChange={(e) => setTcIsAdditional(e.target.checked)}
														className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shadow-sm'
													/>
													<label htmlFor='tcAdditional' className='text-xs font-bold select-none cursor-pointer' style={{ color: "var(--text-secondary)" }}>
														Is Additional Case
													</label>
												</div>

												<div className='flex items-center gap-2'>
													<label htmlFor='tcStrength' className='text-xs font-bold select-none' style={{ color: "var(--text-secondary)" }}>
														Strength:
													</label>
													<input
														type='number'
														id='tcStrength'
														value={tcStrength}
														onChange={(e) => setTcStrength(Number(e.target.value) || 1)}
														min={1}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border rounded px-2 py-1 text-xs w-16 outline-none focus:border-brand-orange shadow-sm'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>
											</div>

											<div className='flex justify-end gap-2 pt-2'>
												<button
													type='button'
													onClick={() => setIsEditingTestCase(false)}
													className='hover:bg-dark-hover px-4 py-2 rounded font-semibold text-xs transition border'
													style={{ background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
												>
													Cancel
												</button>
												<button
													type='button'
													onClick={handleSaveTestCase}
													className='hover:opacity-90 px-5 py-2 rounded font-bold text-xs transition shadow'
													style={{ background: "var(--brand-orange)", color: "var(--bg-base)" }}
												>
													Save Case
												</button>
											</div>
										</div>
									)}

									{/* Test Cases Table */}
									{examples.length > 0 && (
										<div className='border rounded overflow-hidden max-w-5xl shadow' style={{ borderColor: "var(--border-default)" }}>
											<table className='w-full text-left border-collapse text-xs' style={{ background: "var(--bg-surface)" }}>
												<thead>
													<tr className='font-bold border-b uppercase text-[10px] select-none' style={{ background: "var(--bg-dark-layer-1)", color: "var(--text-secondary)", borderBottomColor: "var(--border-default)" }}>
														<th className='px-4 py-3 w-16 text-center'>Order</th>
														<th className='px-4 py-3'>Input</th>
														<th className='px-4 py-3'>Output</th>
														<th className='px-4 py-3 w-28'>Tag</th>
														<th className='px-4 py-3 w-20 text-center'>Sample</th>
														<th className='px-4 py-3 w-20 text-center'>Additional</th>
														<th className='px-4 py-3 w-20 text-center'>Strength</th>
														<th className='px-4 py-3 w-24 text-center'>Actions</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-border-subtle'>
													{examples.map((tc, idx) => (
														<tr key={idx} className='hover:bg-dark-hover transition'>
															<td className='px-4 py-3 font-mono font-semibold text-center' style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
															<td className='px-4 py-3 font-mono max-w-[150px] truncate' style={{ color: "var(--text-primary)" }} title={tc.inputText}>
																{tc.inputText.substring(0, 40)}{tc.inputText.length > 40 ? "..." : ""}
															</td>
															<td className='px-4 py-3 font-mono max-w-[150px] truncate' style={{ color: "var(--text-primary)" }} title={tc.outputText}>
																{tc.outputText.substring(0, 40)}{tc.outputText.length > 40 ? "..." : ""}
															</td>
															<td className='px-4 py-3 font-semibold' style={{ color: "var(--text-secondary)" }}>
																{tc.explanation ? "With explanation" : "Standard"}
															</td>
															<td className='px-4 py-3 text-center'>
																<input
																	type='checkbox'
																	checked={!!tc.isSample}
																	onChange={(e) => {
																		setExamples((prev) => {
																			const updated = [...prev];
																			updated[idx] = { ...updated[idx], isSample: e.target.checked };
																			return updated;
																		});
																	}}
																	className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shadow-sm'
																/>
															</td>
															<td className='px-4 py-3 text-center'>
																<input
																	type='checkbox'
																	checked={!!tc.isAdditional}
																	onChange={(e) => {
																		setExamples((prev) => {
																			const updated = [...prev];
																			updated[idx] = { ...updated[idx], isAdditional: e.target.checked };
																			return updated;
																		});
																	}}
																	className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shadow-sm'
																/>
															</td>
															<td className='px-4 py-3 text-center font-mono font-semibold' style={{ color: "var(--text-primary)" }}>{tc.strength || 1}</td>
															<td className='px-4 py-3 text-center'>
																<div className='flex gap-1 justify-center'>
																	<button
																		type='button'
																		onClick={() => handleEditTestCaseClick(idx)}
																		className='p-1.5 hover:bg-dark-hover rounded transition text-blue-600 hover:text-blue-800'
																		title='Edit case'
																	>
																		<FaEdit size={13} />
																	</button>
																	<button
																		type='button'
																		onClick={() => handleRemoveTestCase(idx)}
																		className='p-1.5 hover:bg-dark-hover rounded transition text-red-500 hover:text-red-700'
																		title='Delete case'
																	>
																		<FaTrash size={12} />
																	</button>
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>

											<div className='p-4 border-t select-none' style={{ background: "var(--bg-dark-layer-1)", borderTopColor: "var(--border-default)" }}>
												<span className='text-xs font-semibold' style={{ color: "var(--text-muted)" }}>
													You will get <span className='rounded px-1.5 py-0.5 font-bold font-mono border' style={{ color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 12%, transparent)", borderColor: "color-mix(in srgb, var(--color-success) 25%, transparent)" }}>100.00%</span> of the maximum score if you pass the selected test cases.
												</span>
											</div>
										</div>
									)}
								</div>
							)}

							{/* CODE STUBS TAB */}
							{activeTab === "codestubs" && (
								<div className='space-y-6'>
									<h3 className='text-lg font-semibold border-b pb-3' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
										Starter Code Templates
									</h3>
									
									<div>
										<label htmlFor='starterFunctionName' className='text-sm font-semibold block mb-2' style={{ color: "var(--text-secondary)" }}>
											Starter Function Signature Prefix (Optional)
										</label>
										<input
											type='text'
											id='starterFunctionName'
											value={starterFunctionName}
											onChange={(e) => setStarterFunctionName(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange transition font-mono'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										/>
										<span className='text-xs mt-1 block' style={{ color: "var(--text-muted)" }}>
											Leave empty for standard CP-style (stdin/stdout) problems.
										</span>
									</div>

									<div>
										<label htmlFor='starterCode' className='text-sm font-semibold block mb-2' style={{ color: "var(--text-secondary)" }}>
											Starter Code Template (Optional)
										</label>
										<textarea
											id='starterCode'
											value={starterCode}
											onChange={(e) => setStarterCode(e.target.value)}
											rows={10}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange transition font-mono'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										/>
									</div>
								</div>
							)}

							{/* SETTINGS TAB */}
							{activeTab === "settings" && (
								<div className='space-y-6'>
									<h3 className='text-lg font-semibold border-b pb-3' style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
										Integration & Extra Settings
									</h3>

									<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
										<div>
											<label htmlFor='videoId' className='text-sm font-semibold block mb-2' style={{ color: "var(--text-secondary)" }}>
												YouTube Video ID (Optional)
											</label>
											<input
												type='text'
												id='videoId'
												value={videoId}
												onChange={(e) => setVideoId(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											/>
										</div>

										<div>
											<label htmlFor='link' className='text-sm font-semibold block mb-2' style={{ color: "var(--text-secondary)" }}>
												External Original Link (Optional)
											</label>
											<input
												type='url'
												id='link'
												value={link}
												onChange={(e) => setLink(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-sm w-full focus:border-brand-orange'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											/>
										</div>
									</div>

									<div>
										<label htmlFor='handlerFunction' className='text-sm font-semibold block mb-2' style={{ color: "var(--text-secondary)" }}>
											JavaScript Handler Function (Legacy execution scripts)
										</label>
										<textarea
											id='handlerFunction'
											value={handlerFunction}
											onChange={(e) => setHandlerFunction(e.target.value)}
											rows={8}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className='border outline-none rounded p-3 text-sm w-full focus:border-brand-orange font-mono'
											style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
										/>
									</div>

									{/* Execution Policy Settings */}
									<div className='mt-8 pt-6 border-t border-border-subtle' style={{ borderTopColor: "var(--border-subtle)" }}>
										<h4 className='text-md font-semibold mb-3' style={{ color: "var(--text-primary)" }}>
											Execution Policy & Resource Limits
										</h4>
										<p className='text-xs mb-4' style={{ color: "var(--text-muted)" }}>
											Select an execution profile to define sandbox resource constraints. Custom limits can be specified if needed.
										</p>

										<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
											<div>
												<label htmlFor='executionProfile' className='text-xs font-bold block mb-2' style={{ color: "var(--text-secondary)" }}>
													Execution Profile
												</label>
												<BeastCodeSelect
													options={[
														{ value: "fast", label: "Fast (Short algorithmic problems)" },
														{ value: "normal", label: "Normal (Standard competitive programming)" },
														{ value: "long", label: "Long (Heavy computations)" },
														{ value: "machine_learning", label: "Machine Learning (Model training / AI challenges)" },
														{ value: "custom", label: "Custom (Expose individual limits)" }
													]}
													value={executionProfile}
													onChange={(val) => setExecutionProfile(val)}
													size="sm"
												/>
											</div>

											{/* Effective Limits Preview Panel */}
											<div className='p-4 rounded-lg border' style={{ background: "var(--bg-dark-layer-1)", borderColor: "var(--border-default)" }}>
												<span className='text-xs font-bold uppercase block mb-3' style={{ color: "var(--brand-orange)" }}>
													Effective Limits Preview
												</span>
												<div className='grid grid-cols-2 gap-y-2 text-xs'>
													<div style={{ color: "var(--text-secondary)" }}>Timeout:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customTimeoutMs : (executionProfile === "fast" ? 1000 : (executionProfile === "long" ? 15000 : (executionProfile === "machine_learning" ? 60000 : 5000)))} ms
													</div>
													
													<div style={{ color: "var(--text-secondary)" }}>Memory Limit:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customMemoryLimitMb : (executionProfile === "fast" ? 64 : (executionProfile === "long" ? 512 : (executionProfile === "machine_learning" ? 2048 : 256)))} MB
													</div>

													<div style={{ color: "var(--text-secondary)" }}>Max Output Size:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customMaxOutputSizeChars : (executionProfile === "fast" ? 16384 : (executionProfile === "long" ? 262144 : (executionProfile === "machine_learning" ? 1048576 : 65536)))} characters
													</div>

													<div style={{ color: "var(--text-secondary)" }}>CPU Count:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customCpuCount : (executionProfile === "machine_learning" ? 2 : 1)}
													</div>

													<div style={{ color: "var(--text-secondary)" }}>Disk Limit:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customDiskLimitMb : (executionProfile === "fast" ? 10 : (executionProfile === "long" ? 100 : (executionProfile === "machine_learning" ? 1024 : 50)))} MB
													</div>

													<div style={{ color: "var(--text-secondary)" }}>Process Limit:</div>
													<div className='font-mono font-bold' style={{ color: "var(--text-primary)" }}>
														{executionProfile === "custom" ? customProcessLimit : (executionProfile === "fast" ? 5 : (executionProfile === "long" ? 30 : (executionProfile === "machine_learning" ? 100 : 15)))}
													</div>
												</div>
											</div>
										</div>

										{executionProfile === "custom" && (
											<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-4 rounded-lg border animate-scale-up' style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
												<div>
													<label htmlFor='customTimeoutMs' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Execution Timeout (ms)
													</label>
													<input
														type='number'
														id='customTimeoutMs'
														value={customTimeoutMs}
														onChange={(e) => setCustomTimeoutMs(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>

												<div>
													<label htmlFor='customMemoryLimitMb' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Memory Limit (MB)
													</label>
													<input
														type='number'
														id='customMemoryLimitMb'
														value={customMemoryLimitMb}
														onChange={(e) => setCustomMemoryLimitMb(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>

												<div>
													<label htmlFor='customMaxOutputSizeChars' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Max Output Size (chars)
													</label>
													<input
														type='number'
														id='customMaxOutputSizeChars'
														value={customMaxOutputSizeChars}
														onChange={(e) => setCustomMaxOutputSizeChars(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>

												<div>
													<label htmlFor='customCpuCount' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														CPU Count
													</label>
													<input
														type='number'
														id='customCpuCount'
														value={customCpuCount}
														onChange={(e) => setCustomCpuCount(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>

												<div>
													<label htmlFor='customDiskLimitMb' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Disk Limit (MB)
													</label>
													<input
														type='number'
														id='customDiskLimitMb'
														value={customDiskLimitMb}
														onChange={(e) => setCustomDiskLimitMb(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>

												<div>
													<label htmlFor='customProcessLimit' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Process Limit
													</label>
													<input
														type='number'
														id='customProcessLimit'
														value={customProcessLimit}
														onChange={(e) => setCustomProcessLimit(Number(e.target.value) || 0)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
														style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* EDITORIAL TAB */}
							{activeTab === "editorial" && (
								<div className='space-y-6'>
									<div>
										<h3 className='text-lg font-semibold mb-1' style={{ color: "var(--text-primary)" }}>Editorial / Official Solution</h3>
										<p className='text-xs mb-4' style={{ color: "var(--text-muted)" }}>
											Provide detailed explanations, hints, analysis, or walk-through videos to help users.
										</p>
									</div>

									<div className='space-y-4'>
										<div>
											<label htmlFor='editorialVideoUrl' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
												Video Solution URL (Optional YouTube or Vimeo link)
											</label>
											<input
												type='url'
												id='editorialVideoUrl'
												value={editorialVideoUrl}
												onChange={(e) => setEditorialVideoUrl(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className='border outline-none rounded p-2 text-xs w-full focus:border-brand-orange'
												style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
											/>
										</div>

										<div>
											<label className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
												Editorial Content (Markdown Format)
											</label>
											<MarkdownEditor
												value={editorialMarkdown}
												onChange={setEditorialMarkdown}
												height='350px'
											/>
										</div>
									</div>
								</div>
							)}

							{/* CUSTOM CHECKER TAB */}
							{activeTab === "customchecker" && (
								<div className='space-y-6'>
									<div>
										<h3 className='text-lg font-semibold mb-1' style={{ color: "var(--text-primary)" }}>Custom Output Verification</h3>
										<p className='text-xs mb-4' style={{ color: "var(--text-muted)" }}>
											Configure how submission results are verified against testcase expected outputs.
										</p>
									</div>

									<div className='grid grid-cols-12 gap-6 items-start'>
										<div className='col-span-12 md:col-span-6 space-y-4'>
											<div>
												<label htmlFor='checkerType' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
													Checker Logic Type
												</label>
												<BeastCodeSelect
													options={[
														{ value: "exact", label: "Exact Token Matching" },
														{ value: "whitespace", label: "Ignore Extra Whitespaces & Case Insensitive" },
														{ value: "float_tolerance", label: "Floating Point Tolerance" },
														{ value: "special_judge", label: "Special Judge (Code execution validator)" }
													]}
													value={customCheckerType}
													onChange={(val) => setCustomCheckerType(val)}
													size="sm"
												/>
											</div>

											{customCheckerType === "float_tolerance" && (
												<div>
													<label htmlFor='checkerEpsilon' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Epsilon Tolerance (Float delta threshold)
													</label>
													<input
														type='number'
														id='checkerEpsilon'
														step='any'
														value={customCheckerEpsilon}
														onChange={(e) => setCustomCheckerEpsilon(Number(e.target.value) || 1e-6)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className='border outline-none rounded p-2 text-xs w-full font-mono focus:border-brand-orange'
														style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
													/>
													<span className='text-[10px] mt-1 block italic font-semibold' style={{ color: "var(--text-muted)" }}>
														Accepts solutions if absolute or relative error is smaller than epsilon.
													</span>
												</div>
											)}

											{customCheckerType === "special_judge" && (
												<div>
													<label htmlFor='checkerLang' className='text-xs font-bold block mb-1' style={{ color: "var(--text-secondary)" }}>
														Judge script language
													</label>
													<BeastCodeSelect
														options={[
															{ value: "python", label: "Python 3" },
															{ value: "cpp", label: "C++20" }
														]}
														value={customCheckerLang}
														onChange={(val) => setCustomCheckerLang(val)}
														size="sm"
													/>
												</div>
											)}
										</div>

										{customCheckerType === "special_judge" && (
											<div className='col-span-12 md:col-span-6 space-y-2'>
												<label htmlFor='checkerCode' className='text-xs font-bold block' style={{ color: "var(--text-secondary)" }}>
													Judge Script Code
												</label>
												<textarea
													id='checkerCode'
													value={customCheckerCode}
													onChange={(e) => setCustomCheckerCode(e.target.value)}
													rows={12}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className='border outline-none rounded p-3 text-xs w-full font-mono focus:border-brand-orange'
													style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
												/>
											</div>
										)}
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Footer buttons */}
				{!loadingProblem && (
					<div className='flex justify-end gap-3 mt-6'>
						<Link
							href="/admin?tab=problems"
							className="px-4 py-1.5 rounded-md text-xs font-medium transition bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default"
						>
							Cancel
						</Link>
						<button
							type="button"
							onClick={handleSubmit}
							className="bg-accent-brand hover:bg-accent-hover text-black px-4 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5"
						>
							Save Changes
						</button>
					</div>
				)}
		</AppShell>
	);
};

export default EditProblem;
