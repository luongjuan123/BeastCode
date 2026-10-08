import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "@/hooks/useAdmin";
import AppShell from "@/components/UI/AppShell";
import { PageHeader } from "@/components/UI/PageHeader";
import { LoadingState } from "@/components/UI/LoadingState";
import { Badge } from "@/components/UI/Badge";
import SecondaryNav from "@/components/TabsNavigation/SecondaryNav";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { firestore, auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import { FaChevronLeft, FaPlus, FaCheck, FaSpinner } from "react-icons/fa";
import MarkdownEditor from "@/components/Admin/MarkdownEditor";
import TagSelect from "@/components/Admin/TagSelect";
import { slugify } from "@/utils/slugify";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";

const NewProblem: React.FC = () => {
	const router = useRouter();
	const [isAdmin, loadingAdmin] = useAdmin();
	const [user] = useAuthState(auth);

	const [activeTab, setActiveTab] = useState("details");

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

	// Details fields
	const [id, setId] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [language, setLanguage] = useState("English");
	const [difficulty, setDifficulty] = useState("Medium");
	const [problemStatement, setProblemStatement] = useState("");
	const [inputFormat, setInputFormat] = useState("");
	const [constraints, setConstraints] = useState("");
	const [outputFormat, setOutputFormat] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	// Code Stubs fields
	const [starterCode, setStarterCode] = useState("");
	const [starterFunctionName, setStarterFunctionName] = useState("");

	// Settings fields
	const [videoId, setVideoId] = useState("");
	const [link, setLink] = useState("");
	const [executionProfile, setExecutionProfile] = useState("normal");
	const [customTimeoutMs, setCustomTimeoutMs] = useState(5000);
	const [customMemoryLimitMb, setCustomMemoryLimitMb] = useState(256);
	const [customMaxOutputSizeChars, setCustomMaxOutputSizeChars] = useState(65536);
	const [customCpuCount, setCustomCpuCount] = useState(1);
	const [customDiskLimitMb, setCustomDiskLimitMb] = useState(50);
	const [customProcessLimit, setCustomProcessLimit] = useState(15);
	const [handlerFunction, setHandlerFunction] = useState(
		`(fn, assert) => {
  try {
    // Define test cases here
    // Example:
    // assert.deepStrictEqual(fn(2, 3), 5);
    return true;
  } catch (error: any) {
    throw new Error(error);
  }
}`
	);

	// Custom Checker fields
	const [customCheckerType, setCustomCheckerType] = useState("exact");
	const [customCheckerEpsilon, setCustomCheckerEpsilon] = useState(1e-6);
	const [customCheckerLang, setCustomCheckerLang] = useState("python");
	const [customCheckerCode, setCustomCheckerCode] = useState("");

	// Editorial fields
	const [editorialMarkdown, setEditorialMarkdown] = useState("");
	const [editorialVideoUrl, setEditorialVideoUrl] = useState("");

	// Generate slug from title
	useEffect(() => {
		if (title) {
			setId(slugify(title));
		} else {
			setId("");
		}
	}, [title]);

	const parseMarkdownFile = (text: string) => {
		let problemStatement = "";
		let inputFormat = "";
		let outputFormat = "";
		let constraints = "";

		const sections = text.split(/(?=^#+\s+)/m);
		for (const section of sections) {
			const match = section.match(/^#+\s+(.+)$/m);
			if (!match) continue;
			const header = match[1].trim().toLowerCase();
			const content = section.substring(match[0].length).trim();

			if (header.includes("problem statement") || header.includes("description")) {
				problemStatement = content;
			} else if (header.includes("input format")) {
				inputFormat = content;
			} else if (header.includes("output format")) {
				outputFormat = content;
			} else if (header.includes("constraints")) {
				constraints = content;
			}
		}

		if (!problemStatement && !inputFormat && !outputFormat && !constraints) {
			problemStatement = text;
		}

		return { problemStatement, inputFormat, outputFormat, constraints };
	};

	const handleMdImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			if (text) {
				const parsed = parseMarkdownFile(text);
				if (parsed.problemStatement) setProblemStatement(parsed.problemStatement);
				if (parsed.inputFormat) setInputFormat(parsed.inputFormat);
				if (parsed.outputFormat) setOutputFormat(parsed.outputFormat);
				if (parsed.constraints) setConstraints(parsed.constraints);
				triggerStatusRibbon("success", "Markdown file parsed and fields populated successfully!");
			}
		};
		reader.readAsText(file);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim() || !problemStatement.trim()) {
			triggerStatusRibbon("error", "Please fill in all required fields (Challenge Name, Problem Statement).");
			return;
		}

		if (!id.trim()) {
			triggerStatusRibbon("error", "Challenge slug could not be generated. Please enter a valid name.");
			return;
		}

		setSubmitting(true);
		triggerStatusRibbon("info", "Creating challenge...", 0);

		try {
			// Reserved system keywords validation
			const RESERVED_SLUGS = ["new", "edit", "api", "problems", "contests", "admin", "settings", "profile", "auth", "search", "tags", "threads", "unsubscribe"];
			if (RESERVED_SLUGS.includes(id)) {
				triggerStatusRibbon("error", `The slug "${id}" is a reserved system keyword. Please choose a different title.`);
				setSubmitting(false);
				return;
			}

			// Slug pattern validation
			const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
			if (!slugRegex.test(id)) {
				triggerStatusRibbon("error", `The generated slug "${id}" is invalid. Slugs must only contain lowercase alphanumeric characters and hyphens.`);
				setSubmitting(false);
				return;
			}

			const docRef = doc(firestore, "problems", id);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				triggerStatusRibbon("error", `A problem with slug "${id}" already exists. Please choose a different title.`);
				setSubmitting(false);
				return;
			}

			const problemData = {
				id,
				slug: id,
				title: title.trim(),
				createdAt: Date.now(),
				updatedAt: Date.now(),
				difficulty,
				videoId: videoId.trim() || null,
				link: link.trim() || null,
				problemStatement,
				description: description.trim() || "",
				language,
				inputFormat: inputFormat.trim() || "",
				outputFormat: outputFormat.trim() || "",
				constraints: constraints.trim() || "",
				tags: tags.slice(0, 3),
				moderators: user?.email ? [user.email] : [],
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
				examples: [], // Empty initially, added in Edit page Test Cases tab
				likes: 0,
				dislikes: 0,
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

			await setDoc(docRef, problemData);
			triggerStatusRibbon("success", "Challenge created successfully!");
			setTimeout(() => {
				router.push(`/admin/problems/${id}`);
			}, 1500);
		} catch (error: any) {
			console.error("Error creating challenge:", error);
			triggerStatusRibbon("error", "Failed to create challenge. Please try again.");
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
		{ id: "details", label: "Details", enabled: true },
		{ id: "moderators", label: "Moderators", enabled: false, tooltip: "Save challenge details first to add moderators" },
		{ id: "testcases", label: "Test Cases", enabled: false, tooltip: "Save challenge details first to add test cases" },
		{ id: "codestubs", label: "Code Stubs", enabled: true },
		{ id: "languages", label: "Languages", enabled: false },
		{ id: "settings", label: "Settings", enabled: true },
		{ id: "editorial", label: "Editorial", enabled: true },
		{ id: "customchecker", label: "Custom Checker", enabled: true },
	];

	return (
		<AppShell activeNav="Admin" maxWidth="wide">
			<PageHeader
				title={title || "New Challenge"}
				description="Author a new technical problem definition, constraints, and testcase configuration."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Problems", href: "/admin?tab=problems" },
					{ label: title || "New Challenge" },
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
						Save Challenge
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
				onChange={setActiveTab}
				className="mb-5"
			/>

			{/* Tab content area */}
			<div className="border border-border-default rounded-lg p-6 bg-bg-surface">
				{activeTab === "details" && (
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-3 mb-4">
							<p className="text-xs text-text-muted font-mono">
								Basic metadata and formulation describing this engineering challenge.
							</p>
							<div className="flex items-center gap-2">
								<input
									type="file"
									accept=".md"
									id="md-file-input"
									className="hidden"
									onChange={handleMdImport}
								/>
								<button
									type="button"
									onClick={() => document.getElementById("md-file-input")?.click()}
									className="text-xs font-semibold px-3 py-1.5 rounded-md transition bg-accent-brand hover:bg-accent-hover text-black shadow-none"
								>
									Import from .md File
								</button>
							</div>
						</div>

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

							{/* Challenge Difficulty */}
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
										value={`https://leetcode-yt.com/problems/${id || "..."}`}
										disabled
										autoComplete='off'
										autoCorrect='off'
										autoCapitalize='off'
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
				</div>

				{/* Save button footer */}
				<div className="flex justify-end gap-2.5 mt-6">
					<Link
						href="/admin?tab=problems"
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
						Create Challenge
					</button>
				</div>
		</AppShell>
	);
};

export default NewProblem;
