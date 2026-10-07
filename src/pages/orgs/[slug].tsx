import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import AppShell from "@/components/UI/AppShell";
import LoadingState from "@/components/UI/LoadingState";
import Badge from "@/components/UI/Badge";
import { auth } from "@/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";
import OrganizationAvatar from "@/components/Organizations/OrganizationAvatar";
import {
	FaGlobe,
	FaLock,
	FaUsers,
	FaTrophy,
	FaQuestionCircle,
	FaCheckCircle,
	FaTrash,
	FaEdit,
	FaPlus,
	FaFile,
	FaBullhorn,
	FaChartLine,
	FaUserShield,
	FaWrench,
	FaCopy,
	FaSignOutAlt,
	FaUserPlus,
	FaHistory,
	FaMapMarkerAlt,
	FaLink,
	FaCalendarAlt,
	FaUserMinus,
	FaShareAlt,
	FaTimes,
	FaFolderOpen,
	FaFilePdf,
	FaFileImage,
	FaFileVideo,
	FaFileAlt,
	FaCloudUploadAlt,
	FaDownload,
	FaSearch,
	FaInfoCircle,
	FaBriefcase,
	FaGraduationCap,
	FaIdCard,
	FaCertificate,
	FaChevronRight,
	FaCalendarCheck,
	FaClipboardList,
	FaCrown,
	FaShieldAlt,
	FaRegClock,
	FaTimesCircle,
	FaUndoAlt,
	FaStar,
	FaRegStar,
	FaCamera,
	FaBuilding,
	FaUser,
	FaComments,
} from "react-icons/fa";
import { OrgChatTab } from "@/components/Organizations/OrgChatTab";

interface Organization {
	id: string;
	name: string;
	slug: string;
	type: string;
	visibility: string;
	state: string;
	description: string;
	website: string;
	location: string;
	country: string;
	foundedDate: number;
	category: string;
	memberCount: number;
	contestCount: number;
	problemCount: number;
	avatar?: string;
	avatarUrl: string;
	avatarStoragePath?: string;
	avatarUpdatedAt?: number;
	bannerUrl: string;
	verified: boolean;
	contactEmail: string;
	recruitmentStatus: string;
	ownerUid: string;
}

export default function OrgWorkspacePage() {
	const router = useRouter();
	const { slug, tab = "overview" } = router.query;
	const orgSlug = slug as string;

	const [user, loadingAuth] = useAuthState(auth);

	const [org, setOrg] = useState<Organization | null>(null);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	// Tab states
	const [members, setMembers] = useState<any[]>([]);
	const [contests, setContests] = useState<any[]>([]);
	const [problems, setProblems] = useState<any[]>([]);
	const [announcements, setAnnouncements] = useState<any[]>([]);
	const [files, setFiles] = useState<any[]>([]);
	const [auditLogs, setAuditLogs] = useState<any[]>([]);
	const [analytics, setAnalytics] = useState<any | null>(null);
	const [joinRequests, setJoinRequests] = useState<any[]>([]);

	// Gym, Syllabus & Teams states
	const [privateProblems, setPrivateProblems] = useState<any[]>([]);
	const [teams, setTeams] = useState<any[]>([]);
	const [roadmaps, setRoadmaps] = useState<any[]>([]);
	const [assignments, setAssignments] = useState<any[]>([]);

	const [privateProblemSearch, setPrivateProblemSearch] = useState("");
	const [newPrivateProblemTitle, setNewPrivateProblemTitle] = useState("");
	const [newPrivateProblemDesc, setNewPrivateProblemDesc] = useState("");
	const [newPrivateProblemDifficulty, setNewPrivateProblemDifficulty] = useState("Medium");
	const [selectedPrivateProblem, setSelectedPrivateProblem] = useState<any | null>(null);
	const [versionRollbackNumber, setVersionRollbackNumber] = useState(1);
	const [rollbackSummary, setRollbackSummary] = useState("");

	const [generatorScript, setGeneratorScript] = useState("");
	const [validatorScript, setValidatorScript] = useState("");
	const [specialJudgeScript, setSpecialJudgeScript] = useState("");
	const [numTestsToGenerate, setNumTestsToGenerate] = useState(5);
	const [inputTestExample, setInputTestExample] = useState("");
	const [outputTestExample, setOutputTestExample] = useState("");

	const [newRoadmapTitle, setNewRoadmapTitle] = useState("");
	const [newRoadmapDesc, setNewRoadmapDesc] = useState("");

	const [newTeamName, setNewTeamName] = useState("");
	const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

	const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
	const [newAssignmentDesc, setNewAssignmentDesc] = useState("");
	const [newAssignmentProblems, setNewAssignmentProblems] = useState("");
	const [newAssignmentType, setNewAssignmentType] = useState<"all" | "teams" | "members">("all");
	const [newAssignmentAssigneeIds, setNewAssignmentAssigneeIds] = useState("");

	// Search / Filter states
	const [memberSearch, setMemberSearch] = useState("");
	const [memberRoleFilter, setMemberRoleFilter] = useState("");
	const [memberSort, setMemberSort] = useState("newest"); // newest, oldest, rating, alphabetical, activity
	const [problemSearch, setProblemSearch] = useState("");
	const [contestSearch, setContestSearch] = useState("");
	const [fileSearch, setFileSearch] = useState("");

	// V2 Organization features states
	const [inviteSearchInput, setInviteSearchInput] = useState("");
	const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
	const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
	const [selectedInviteUser, setSelectedInviteUser] = useState<any | null>(null);
	const [inviteExpiresDays, setInviteExpiresDays] = useState(7);
	const [invitationsList, setInvitationsList] = useState<any[]>([]);
	const [inviteLinksList, setInviteLinksList] = useState<any[]>([]);

	const [linkRole, setLinkRole] = useState("member");
	const [linkMaxUses, setLinkMaxUses] = useState(-1);
	const [linkExpiresDays, setLinkExpiresDays] = useState(-1);
	const [linkPassword, setLinkPassword] = useState("");

	// Slider Over Drawer State for Member Profile
	const [selectedMember, setSelectedMember] = useState<any | null>(null);
	const [drawerTab, setDrawerTab] = useState("overview");

	// File Preview modal state
	const [previewFile, setPreviewFile] = useState<any | null>(null);

	// Action inputs
	const [linkContestId, setLinkContestId] = useState("");
	const [linkProblemId, setLinkProblemId] = useState("");
	const [newAnnTitle, setNewAnnTitle] = useState("");
	const [newAnnContent, setNewAnnContent] = useState("");
	const [newAnnVisibility, setNewAnnVisibility] = useState("members");
	const [inviteIdentifier, setInviteIdentifier] = useState("");
	const [inviteRole, setInviteRole] = useState("member");
	const [newFileName, setNewFileName] = useState("");
	const [newFileUrl, setNewFileUrl] = useState("");
	const [newFileSize, setNewFileSize] = useState("0");
	const [newFileVisibility, setNewFileVisibility] = useState("members");
	const [joinMsg, setJoinMsg] = useState("");

	// Part 5 recruitment & education states
	const [companyDetails, setCompanyDetails] = useState<any>(null);
	const [jobs, setJobs] = useState<any[]>([]);
	const [applications, setApplications] = useState<any[]>([]);
	const [assessments, setAssessments] = useState<any[]>([]);
	const [courses, setCourses] = useState<any[]>([]);
	const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
	const [gradebook, setGradebook] = useState<any[]>([]);
	const [certificates, setCertificates] = useState<any[]>([]);
	const [activeAssessmentAttempt, setActiveAssessmentAttempt] = useState<any>(null);
	const [selectedCourse, setSelectedCourse] = useState<any>(null);
	const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
	const [candidateSearchResults, setCandidateSearchResults] = useState<any[]>([]);
	const [selectedApplication, setSelectedApplication] = useState<any>(null);
	const [userResume, setUserResume] = useState<any>(null);
	const [candidateResume, setCandidateResume] = useState<any>(null);
	const [selectedJob, setSelectedJob] = useState<any>(null);

	// Job forms
	const [newJobTitle, setNewJobTitle] = useState("");
	const [newJobDesc, setNewJobDesc] = useState("");
	const [newJobType, setNewJobType] = useState("Full-time");
	const [newJobLocation, setNewJobLocation] = useState("Remote");
	const [newJobSalary, setNewJobSalary] = useState("Confidential");
	const [newJobRequirements, setNewJobRequirements] = useState("");
	const [newJobResponsibilities, setNewJobResponsibilities] = useState("");

	// Course forms
	const [newCourseCode, setNewCourseCode] = useState("");
	const [newCourseTitle, setNewCourseTitle] = useState("");
	const [newCourseSemester, setNewCourseSemester] = useState("");
	const [newCourseSyllabus, setNewCourseSyllabus] = useState("");

	// Certificate forms
	const [newCertCandidate, setNewCertCandidate] = useState("");
	const [newCertCriteria, setNewCertCriteria] = useState("");
	const [newCertSignee, setNewCertSignee] = useState("");
	const [newCertSigneeRole, setNewCertSigneeRole] = useState("Representative");

	const [actionLoading, setActionLoading] = useState(false);

	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

	const compressImage = (base64Str: string): Promise<string> => {
		return new Promise((resolve) => {
			const img = new Image();
			img.src = base64Str;
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;
				const maxDim = 512;
				if (width > maxDim || height > maxDim) {
					if (width > height) {
						height = Math.round((height * maxDim) / width);
						width = maxDim;
					} else {
						width = Math.round((width * maxDim) / height);
						height = maxDim;
					}
				}
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.drawImage(img, 0, 0, width, height);
					resolve(canvas.toDataURL("image/jpeg", 0.85));
				} else {
					resolve(base64Str);
				}
			};
			img.onerror = () => {
				resolve(base64Str);
			};
		});
	};

	const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
		if (!allowedTypes.includes(file.type)) {
			triggerFeedback("error", "Only PNG, JPG, JPEG, and WEBP formats are supported.");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			triggerFeedback("error", "File size must be less than 5MB.");
			return;
		}

		const reader = new FileReader();
		reader.onloadend = async () => {
			const base64String = reader.result as string;
			try {
				const compressed = await compressImage(base64String);
				setAvatarPreview(compressed);
				setAvatarBase64(compressed);
			} catch (err) {
				setAvatarPreview(base64String);
				setAvatarBase64(base64String);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleUploadAvatar = async () => {
		if (!user || !org || !avatarBase64) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/avatar`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ avatarBase64 }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Organization avatar updated successfully.");
				setAvatarBase64(null);
				setOrg({
					...org,
					avatar: data.avatarUrl,
					avatarUrl: data.avatarUrl,
				});
				fetchOrgDetails();
			} else {
				triggerFeedback("error", data.error || "Failed to upload avatar.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleRemoveAvatar = async () => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to remove the organization avatar?")) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/avatar`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Organization avatar removed successfully.");
				setAvatarPreview(null);
				setAvatarBase64(null);
				setOrg({
					...org,
					avatar: "",
					avatarUrl: "",
				});
				fetchOrgDetails();
			} else {
				triggerFeedback("error", data.error || "Failed to remove avatar.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const triggerFeedback = (type: "success" | "error", message: any) => {
		const msgStr = typeof message === "object" && message !== null
			? (message.message || message.error || JSON.stringify(message))
			: String(message || "");
		if (type === "success") {
			setSuccessMsg(msgStr);
			setTimeout(() => setSuccessMsg(""), 4000);
		} else {
			setErrorMsg(msgStr);
			setTimeout(() => setErrorMsg(""), 4000);
		}
	};

	const fetchOrgDetails = async () => {
		if (!orgSlug) return;
		setLoading(true);
		try {
			let headers: any = {};
			if (user) {
				const idToken = await user.getIdToken();
				headers["Authorization"] = `Bearer ${idToken}`;
			}
			const res = await fetch(`/api/organizations/${orgSlug}`, { headers });
			const data = await res.json();
			if (data.success) {
				setOrg(data.organization);
				setUserRole(data.userRole);
				setErrorMsg("");
				if (data.organization.avatarUrl || data.organization.avatar) {
					setAvatarPreview(data.organization.avatarUrl || data.organization.avatar);
				} else {
					setAvatarPreview(null);
				}
			} else {
				setOrg(null);
				setUserRole(null);
				const errorVal = data.error;
				const errMsg = typeof errorVal === "object" && errorVal !== null
					? (errorVal.message || errorVal.error || JSON.stringify(errorVal))
					: (errorVal || "Failed to load workspace.");
				setErrorMsg(errMsg);
			}
		} catch (err: any) {
			setErrorMsg(err.message || "An error occurred.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (orgSlug) {
			fetchOrgDetails();
		}
	}, [orgSlug, user]);

	const fetchTabContent = async () => {
		if (!orgSlug || !user || !org) return;
		const idToken = await user.getIdToken();
		const headers = { Authorization: `Bearer ${idToken}` };

		try {
			if (tab === "members" || tab === "leaderboard" || tab === "overview") {
				const res = await fetch(`/api/organizations/${org.id}/members`, { headers });
				const data = await res.json();
				if (data.success) setMembers(data.members || []);

				if (tab === "members" && hasPerm("organization.inviteMember")) {
					const invRes = await fetch(`/api/organizations/${org.id}/invitations`, { headers });
					const invData = await invRes.json();
					if (invData.success) setInvitationsList(invData.invitations || []);

					const linkRes = await fetch(`/api/organizations/${org.id}/invite-links`, { headers });
					const linkData = await linkRes.json();
					if (linkData.success) setInviteLinksList(linkData.inviteLinks || []);
				}
			}
			if (tab === "contests" || tab === "overview") {
				const res = await fetch(`/api/organizations/${org.id}/contests`, { headers });
				const data = await res.json();
				if (data.success) setContests(data.contests || []);
			}
			if (tab === "problems" || tab === "overview") {
				const res = await fetch(`/api/organizations/${org.id}/problems`, { headers });
				const data = await res.json();
				if (data.success) setProblems(data.problems || []);
			}
			if (tab === "announcements" || tab === "overview") {
				const res = await fetch(`/api/organizations/${org.id}/announcements`, { headers });
				const data = await res.json();
				if (data.success) setAnnouncements(data.announcements || []);
			}
			if (tab === "files" || tab === "overview") {
				const res = await fetch(`/api/organizations/${org.id}/files`, { headers });
				const data = await res.json();
				if (data.success) setFiles(data.files || []);
			}
			if (tab === "audit-logs" && hasPerm("organization.viewAuditLogs")) {
				const res = await fetch(`/api/organizations/${org.id}/audit-logs`, { headers });
				const data = await res.json();
				if (data.success) setAuditLogs(data.logs || []);
			}
			if (tab === "analytics" && hasPerm("organization.viewAnalytics")) {
				const res = await fetch(`/api/organizations/${org.id}/analytics`, { headers });
				const data = await res.json();
				if (data.success) setAnalytics(data.analytics);
			}
			if (tab === "recruitment" && hasPerm("organization.manageRecruitment")) {
				const res = await fetch(`/api/organizations/${org.id}/join-requests`, { headers });
				const rdata = await res.json();
				if (rdata.success) setJoinRequests(rdata.requests || []);

				const jobsRes = await fetch(`/api/organizations/${org.id}/jobs`, { headers });
				const jobsData = await jobsRes.json();
				if (jobsData.success) setJobs(jobsData.jobs || []);

				const appsRes = await fetch(`/api/organizations/${org.id}/applications`, { headers });
				const appsData = await appsRes.json();
				if (appsData.success) setApplications(appsData.applications || []);

				const certsRes = await fetch(`/api/organizations/${org.id}/certificates`, { headers });
				const certsData = await certsRes.json();
				if (certsData.success) setCertificates(certsData.certificates || []);

				const assessRes = await fetch(`/api/organizations/${org.id}/assessments`, { headers });
				const assessData = await assessRes.json();
				if (assessData.success) setAssessments(assessData.assessments || []);
			}
			if (tab === "careers" || tab === "overview") {
				const detailsRes = await fetch(`/api/organizations/${org.id}/company-details`, { headers });
				const detailsData = await detailsRes.json();
				if (detailsData.success) setCompanyDetails(detailsData.details);

				const jobsRes = await fetch(`/api/organizations/${org.id}/jobs`, { headers });
				const jobsData = await jobsRes.json();
				if (jobsData.success) setJobs(jobsData.jobs || []);
			}
			if (tab === "courses") {
				const res = await fetch(`/api/organizations/${org.id}/courses`, { headers });
				const data = await res.json();
				if (data.success) setCourses(data.courses || []);
			}
			if (tab === "resume") {
				const res = await fetch(`/api/users/resume`, { headers });
				const data = await res.json();
				if (data.success) setUserResume(data.resume);
			}
			if (tab === "private-problems") {
				const res = await fetch(`/api/organizations/${org.id}/private-problems`, { headers });
				const data = await res.json();
				if (data.success) setPrivateProblems(data.privateProblems || []);
			}
			if (tab === "teams") {
				const res = await fetch(`/api/organizations/${org.id}/teams`, { headers });
				const data = await res.json();
				if (data.success) setTeams(data.teams || []);
			}
			if (tab === "roadmaps") {
				const res = await fetch(`/api/organizations/${org.id}/roadmaps`, { headers });
				const data = await res.json();
				if (data.success) setRoadmaps(data.roadmaps || []);
			}
			if (tab === "assignments") {
				const res = await fetch(`/api/organizations/${org.id}/assignments`, { headers });
				const data = await res.json();
				if (data.success) setAssignments(data.assignments || []);
			}
		} catch (err) {
			console.error(`Error loading tab ${tab}:`, err);
		}
	};

	useEffect(() => {
		if (orgSlug && user && org) {
			fetchTabContent();
		}
	}, [orgSlug, user, tab, org]);

	const hasPerm = (perm: string) => {
		if (!userRole) return false;
		if (userRole === "owner") return true;

		const rolePermissions: Record<string, string[]> = {
			admin: [
				"organization.manageSettings",
				"organization.inviteMember",
				"organization.assignRole",
				"organization.manageRoles",
				"organization.removeMember",
				"organization.manageRecruitment",
				"organization.createAnnouncement",
				"organization.deleteAnnouncement",
				"organization.publishAnnouncement",
				"organization.uploadFile",
				"organization.createContest",
				"organization.deleteContest",
				"organization.createProblem",
				"organization.editProblem",
				"organization.deleteProblem",
				"organization.viewAnalytics",
				"organization.viewAuditLogs",
				"organization.createRoadmap",
				"organization.assignHomework",
				"organization.viewInstructorMetrics",
				"organization.manageTeams",
				"organization.manageCourses",
				"organization.manageCertificates",
				"organization.issueCertificates",
			],
			coach: [
				"organization.createContest",
				"organization.createProblem",
				"organization.editProblem",
				"organization.publishAnnouncement",
				"organization.createRoadmap",
				"organization.assignHomework",
				"organization.viewInstructorMetrics",
				"organization.manageTeams",
				"organization.viewAnalytics",
				"organization.uploadFile",
				"organization.manageCertificates",
				"organization.issueCertificates",
			],
			instructor: [
				"organization.createRoadmap",
				"organization.assignHomework",
				"organization.viewInstructorMetrics",
				"organization.publishAnnouncement",
				"organization.manageCourses",
				"organization.manageCertificates",
				"organization.issueCertificates",
				"organization.uploadFile",
			],
			ta: [
				"organization.assignHomework",
				"organization.viewInstructorMetrics",
				"organization.manageCourses",
			],
			moderator: [
				"organization.inviteMember",
				"organization.assignRole",
				"organization.removeMember",
				"organization.manageRecruitment",
				"organization.createAnnouncement",
				"organization.deleteAnnouncement",
				"organization.uploadFile",
				"organization.viewAnalytics",
				"organization.viewAuditLogs",
			],
			contest_manager: [
				"organization.createContest",
				"organization.deleteContest",
				"organization.uploadFile",
			],
			problem_manager: [
				"organization.createProblem",
				"organization.deleteProblem",
				"organization.uploadFile",
			],
			recruiter: [
				"organization.inviteMember",
				"organization.manageRecruitment",
			],
			announcement_manager: [
				"organization.createAnnouncement",
				"organization.deleteAnnouncement",
			],
			member: [
				"organization.uploadFile",
			],
			guest: [],
		};

		return rolePermissions[userRole]?.includes(perm) || false;
	};

	// Copy Invite Url
	const handleCopyInviteUrl = () => {
		if (!org) return;
		const url = `${window.location.origin}/orgs/${org.slug}`;
		navigator.clipboard.writeText(url);
		triggerFeedback("success", "Organization workspace link copied!");
	};

	// Actions
	const handleRequestJoin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/join`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ message: joinMsg }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Application request submitted!");
				setJoinMsg("");
			} else {
				triggerFeedback("error", data.error || "Failed to submit request.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleInviteSearch = async (val: string) => {
		setInviteSearchInput(val);
		if (!val.trim()) {
			setInviteSearchResults([]);
			return;
		}
		setInviteSearchLoading(true);
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/organizations/${org?.id}/search-invite-users?q=${encodeURIComponent(val)}`, {
				headers: { Authorization: `Bearer ${idToken}` }
			});
			const data = await res.json();
			if (data.success) {
				setInviteSearchResults(data.users || []);
			}
		} catch (err) {
			console.error("Search users error:", err);
		} finally {
			setInviteSearchLoading(false);
		}
	};

	const handleInviteMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const body: any = {
				roleId: inviteRole,
				expiresDays: inviteExpiresDays,
			};

			if (selectedInviteUser) {
				body.targetUid = selectedInviteUser.uid;
			} else if (inviteSearchInput.includes("@")) {
				body.email = inviteSearchInput.trim();
			} else {
				body.username = inviteSearchInput.trim();
			}

			const res = await fetch(`/api/organizations/${org.id}/invitations`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invitation sent successfully!");
				setInviteSearchInput("");
				setSelectedInviteUser(null);
				if (data.invitation) {
					setInvitationsList((prev) => [data.invitation, ...prev]);
				} else {
					setInvitationsList((prev) => [
						{
							id: Math.random().toString(36).substring(2, 9),
							organizationId: org.id,
							userId: selectedInviteUser?.uid || null,
							email: !selectedInviteUser ? inviteSearchInput.trim() : null,
							roleId: inviteRole,
							status: "Pending",
							createdAt: Date.now(),
							expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
							createdBy: user.uid,
						} as any,
						...prev,
					]);
				}
			} else {
				triggerFeedback("error", data.error || "Failed to invite member.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCancelInvite = async (inviteId: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/invitations/${inviteId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invitation cancelled.");
				setInvitationsList((prev) => prev.filter((inv) => inv.id !== inviteId));
			} else {
				triggerFeedback("error", data.error || "Failed to cancel invitation.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleResendInvite = async (inviteId: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/invitations/${inviteId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ action: "resend" }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invitation resent successfully.");
			} else {
				triggerFeedback("error", data.error || "Failed to resend invitation.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleExpireInvite = async (inviteId: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/invitations/${inviteId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ action: "expire" }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invitation force-expired.");
				setInvitationsList((prev) =>
					prev.map((inv) => (inv.id === inviteId ? { ...inv, status: "Expired" } : inv))
				);
			} else {
				triggerFeedback("error", data.error || "Failed to expire invitation.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateInviteLink = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/invite-links`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					roleId: linkRole,
					maxUses: linkMaxUses,
					expiresDays: linkExpiresDays,
					password: linkPassword,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invite link created successfully!");
				setLinkPassword("");
				if (data.inviteLink) {
					setInviteLinksList((prev) => [data.inviteLink, ...prev]);
				} else {
					setInviteLinksList((prev) => [
						{
							token: data.token || Math.random().toString(36).substring(2, 10),
							roleId: linkRole,
							maxUses: linkMaxUses,
							usedCount: 0,
							expiresAt: Date.now() + linkExpiresDays * 24 * 60 * 60 * 1000,
							createdAt: Date.now(),
						} as any,
						...prev,
					]);
				}
			} else {
				triggerFeedback("error", data.error || "Failed to generate link.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleRevokeInviteLink = async (token: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/invite-links/${token}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Invite link revoked.");
				setInviteLinksList((prev) => prev.filter((l) => l.token !== token));
			} else {
				triggerFeedback("error", data.error || "Failed to revoke link.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateJob = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/jobs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					title: newJobTitle,
					description: newJobDesc,
					employmentType: newJobType,
					location: newJobLocation,
					salaryRange: newJobSalary,
					requirements: newJobRequirements.split("\n").filter(Boolean),
					responsibilities: newJobResponsibilities.split("\n").filter(Boolean),
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Job opening created successfully!");
				setJobs((prev) => [data.job, ...prev]);
				setNewJobTitle("");
				setNewJobDesc("");
				setNewJobRequirements("");
				setNewJobResponsibilities("");
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleApplyJob = async (jobId: string, coverLetter: string, github: string, linkedin: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/applications`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					jobId,
					coverLetter,
					githubUrl: github,
					linkedinUrl: linkedin,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Application submitted successfully!");
				setSelectedJob(null);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUpdateApplicationStage = async (appId: string, stage: string, notes: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/applications/${appId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ stage, notes }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", `Application stage updated to: ${stage}`);
				setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, currentStage: stage } : a)));
				setSelectedApplication((prev: any) => prev ? { ...prev, currentStage: stage } : null);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateCourse = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/courses`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					code: newCourseCode,
					title: newCourseTitle,
					semester: newCourseSemester,
					syllabus: newCourseSyllabus,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Course added successfully!");
				setCourses((prev) => [data.course, ...prev]);
				setNewCourseCode("");
				setNewCourseTitle("");
				setNewCourseSemester("");
				setNewCourseSyllabus("");
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUploadCourseMaterial = async (courseId: string, title: string, type: string, url: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/courses/${courseId}/materials`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ title, type, url }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Material added successfully!");
				setCourseMaterials((prev) => [data.material, ...prev]);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUpdateGrade = async (courseId: string, studentUid: string, finalGrade: string, attendanceCount: number) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/courses/${courseId}/gradebook`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ studentUid, finalGrade, attendanceCount }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Grades saved successfully!");
				// Reload gradebook
				const gbRes = await fetch(`/api/organizations/${org.id}/courses/${courseId}/gradebook`, {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				const gbData = await gbRes.json();
				if (gbData.success) setGradebook(gbData.gradebook || []);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleExportGradebook = async (courseId: string) => {
		if (!user || !org) return;
		try {
			window.open(`/api/organizations/${org.id}/courses/${courseId}/gradebook?exportFormat=csv`, "_blank");
			triggerFeedback("success", "Exporting Gradebook as CSV...");
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleIssueCertificate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/certificates`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					candidateUid: newCertCandidate,
					criteria: newCertCriteria,
					signeeName: newCertSignee,
					signeeRole: newCertSigneeRole,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Certificate issued successfully!");
				setCertificates((prev) => [data.certificate, ...prev]);
				setNewCertCandidate("");
				setNewCertCriteria("");
				setNewCertSignee("");
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleSearchCandidates = async () => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/search?type=candidates&q=${candidateSearchQuery}`, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			const data = await res.json();
			if (data.success) {
				setCandidateSearchResults(data.results || []);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleSaveResume = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/users/resume`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify(userResume || {}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Resume saved! Profile Score updated.");
				setUserResume(data.resume);
			} else {
				triggerFeedback("error", data.error);
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleRemoveMember = async (targetUid: string) => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to remove this member?")) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/members/${targetUid}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Member removed from workspace.");
				setMembers((prev) => prev.filter((m) => m.uid !== targetUid));
				if (targetUid === user.uid) {
					router.push("/orgs");
				}
			} else {
				triggerFeedback("error", data.error || "Failed to remove member.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleUpdateMemberRole = async (targetUid: string, newRole: string) => {
		if (!user || !org) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/members/${targetUid}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ roleId: newRole }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Role assigned successfully.");
				setMembers((prev) =>
					prev.map((m) => (m.uid === targetUid ? { ...m, roleId: newRole } : m))
				);
			} else {
				triggerFeedback("error", data.error || "Failed to update role.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleLinkContest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/contests`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ contestId: linkContestId }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Contest mapped successfully!");
				if (data.contest) {
					setContests((prev) => [data.contest, ...prev]);
				} else {
					setContests((prev) => [
						{
							id: linkContestId,
							title: linkContestId,
							status: "ready",
							createdAt: Date.now(),
						} as any,
						...prev,
					]);
				}
				setLinkContestId("");
			} else {
				triggerFeedback("error", data.error || "Failed to link contest.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUnlinkContest = async (contestId: string) => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to unlink this contest?")) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/contests/${contestId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Contest unmapped.");
				setContests((prev) => prev.filter((c) => c.id !== contestId));
			} else {
				triggerFeedback("error", data.error || "Failed to unlink contest.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleLinkProblem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/problems`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ problemId: linkProblemId }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Problem mapped successfully!");
				if (data.problem) {
					setProblems((prev) => [data.problem, ...prev]);
				} else {
					setProblems((prev) => [
						{
							id: linkProblemId,
							title: linkProblemId,
							difficulty: "Medium",
						} as any,
						...prev,
					]);
				}
				setLinkProblemId("");
			} else {
				triggerFeedback("error", data.error || "Failed to link problem.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUnlinkProblem = async (problemId: string) => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to unlink this problem?")) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/problems/${problemId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Problem unmapped.");
				setProblems((prev) => prev.filter((p) => p.id !== problemId));
			} else {
				triggerFeedback("error", data.error || "Failed to unlink problem.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleCreateAnnouncement = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/announcements`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					title: newAnnTitle,
					content: newAnnContent,
					visibility: newAnnVisibility,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Announcement notice posted!");
				const newAnn = data.announcement || {
					id: data.id || Math.random().toString(36).substring(2, 9),
					title: newAnnTitle,
					content: newAnnContent,
					visibility: newAnnVisibility,
					createdAt: Date.now(),
					authorUid: user.uid,
				};
				setAnnouncements((prev) => [newAnn as any, ...prev]);
				setNewAnnTitle("");
				setNewAnnContent("");
			} else {
				triggerFeedback("error", data.error || "Failed to post announcement.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteAnnouncement = async (annId: string) => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to delete this announcement?")) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/announcements/${annId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Announcement removed.");
				setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
			} else {
				triggerFeedback("error", data.error || "Failed to delete announcement.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleShareFile = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/files`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					filename: newFileName,
					mimeType: "text/markdown",
					storagePath: newFileUrl,
					size: parseInt(newFileSize, 10) || 1200,
					visibility: newFileVisibility,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Resource shared successfully!");
				const newFile = data.file || {
					id: data.id || Math.random().toString(36).substring(2, 9),
					filename: newFileName,
					mimeType: "text/markdown",
					storagePath: newFileUrl,
					size: parseInt(newFileSize, 10) || 1200,
					visibility: newFileVisibility,
					createdAt: Date.now(),
				};
				setFiles((prev) => [newFile as any, ...prev]);
				setNewFileName("");
				setNewFileUrl("");
				setNewFileSize("0");
			} else {
				triggerFeedback("error", data.error || "Failed to share resource.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteFile = async (fileId: string) => {
		if (!user || !org) return;
		if (!confirm("Are you sure you want to delete this resource?")) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/files/${fileId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Resource deleted.");
				setFiles((prev) => prev.filter((f) => f.id !== fileId));
			} else {
				triggerFeedback("error", data.error || "Failed to delete resource.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleHandleJoinRequest = async (requestId: string, status: "approved" | "rejected") => {
		if (!user || !org) return;
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/join-requests/${requestId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ status }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", `Application reviewed successfully.`);
				setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
			} else {
				triggerFeedback("error", data.error || "Failed to process request.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		}
	};

	const handleCreatePrivateProblem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/private-problems`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					title: newPrivateProblemTitle,
					description: newPrivateProblemDesc,
					difficulty: newPrivateProblemDifficulty,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Draft private problem created successfully!");
				if (data.problem) {
					setPrivateProblems((prev) => [data.problem, ...prev]);
				}
				setNewPrivateProblemTitle("");
				setNewPrivateProblemDesc("");
			} else {
				triggerFeedback("error", data.error || "Failed to create private problem.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleRollbackVersion = async (problemId: string, versionNum: number) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/private-problems/${problemId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					action: "rollback",
					versionNumber: versionNum,
					summary: rollbackSummary || `Rolled back to v${versionNum}`,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", `Problem rolled back to version ${versionNum}!`);
				setRollbackSummary("");
				if (data.problem) {
					setPrivateProblems((prev) =>
						prev.map((p) => (p.id === problemId ? data.problem : p))
					);
					if (selectedPrivateProblem?.id === problemId) {
						setSelectedPrivateProblem(data.problem);
					}
				}
			} else {
				triggerFeedback("error", data.error || "Failed to rollback version.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUpdateTestcases = async (problemId: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/private-problems/${problemId}/testcases`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					examples: inputTestExample ? [{ input: inputTestExample, output: outputTestExample }] : undefined,
					generatorScript,
					validatorScript,
					specialJudgeScript,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Testcase configuration updated successfully!");
				setInputTestExample("");
				setOutputTestExample("");
				if (data.problem) {
					setPrivateProblems((prev) =>
						prev.map((p) => (p.id === problemId ? data.problem : p))
					);
					if (selectedPrivateProblem?.id === problemId) {
						setSelectedPrivateProblem(data.problem);
					}
				}
			} else {
				triggerFeedback("error", data.error || "Failed to save testcase configs.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleGenerateRandomTests = async (problemId: string) => {
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/private-problems/${problemId}/testcases`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					action: "generate",
					generatorScript,
					numberOfTests: numTestsToGenerate,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", `${numTestsToGenerate} testcases generated successfully!`);
				if (data.problem) {
					setPrivateProblems((prev) =>
						prev.map((p) => (p.id === problemId ? data.problem : p))
					);
					if (selectedPrivateProblem?.id === problemId) {
						setSelectedPrivateProblem(data.problem);
					}
				}
			} else {
				triggerFeedback("error", data.error || "Failed to generate tests.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateTeam = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/teams`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ name: newTeamName }),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Competitor team created successfully!");
				if (data.team) {
					setTeams((prev) => [data.team, ...prev]);
				} else {
					setTeams((prev) => [
						{
							id: data.id || Math.random().toString(36).substring(2, 9),
							name: newTeamName,
							members: [user.uid],
							captainUid: user.uid,
							createdAt: Date.now(),
						} as any,
						...prev,
					]);
				}
				setNewTeamName("");
			} else {
				triggerFeedback("error", data.error || "Failed to create team.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateRoadmap = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/roadmaps`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					title: newRoadmapTitle,
					description: newRoadmapDesc,
					modules: [
						{
							weekNumber: 1,
							title: "Arrays & Dynamic Hashing",
							problemIds: ["two-sum", "contains-duplicate"],
							materials: [{ type: "markdown", title: "Array Operations Guide", url: "https://beastcode.codes/arrays" }],
							assignments: [{ title: "Solve Two Sum", deadline: Date.now() + 86400000, totalPoints: 10 }],
						},
						{
							weekNumber: 2,
							title: "Binary Searching Camp",
							problemIds: ["binary-search", "search-a-2d-matrix"],
							materials: [{ type: "video", title: "Visualizing Binary Search", url: "https://youtube.com/..." }],
							assignments: [{ title: "Complete Binary Search Camp", deadline: Date.now() + 86400000 * 3, totalPoints: 20 }],
						},
					],
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Syllabus roadmap published successfully!");
				if (data.roadmap) {
					setRoadmaps((prev) => [data.roadmap, ...prev]);
				}
				setNewRoadmapTitle("");
				setNewRoadmapDesc("");
			} else {
				triggerFeedback("error", data.error || "Failed to build roadmap.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateAssignment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}/assignments`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					title: newAssignmentTitle,
					description: newAssignmentDesc,
					problemIds: newAssignmentProblems.split(",").map((p) => p.trim()),
					assigneeType: newAssignmentType,
					assigneeIds: newAssignmentAssigneeIds ? newAssignmentAssigneeIds.split(",").map((id) => id.trim()) : [],
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Homework assignment distributed!");
				if (data.assignment) {
					setAssignments((prev) => [data.assignment, ...prev]);
				}
				setNewAssignmentTitle("");
				setNewAssignmentDesc("");
				setNewAssignmentProblems("");
				setNewAssignmentAssigneeIds("");
			} else {
				triggerFeedback("error", data.error || "Failed to distribute assignment.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleUpdateSettings = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !org) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					name: org.name,
					type: org.type,
					visibility: org.visibility,
					description: org.description,
					website: org.website,
					location: org.location,
					country: org.country,
					category: org.category,
					recruitmentStatus: org.recruitmentStatus,
					contactEmail: org.contactEmail,
				}),
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Organization profile settings updated successfully.");
				fetchOrgDetails();
			} else {
				triggerFeedback("error", data.error || "Failed to update settings.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteOrg = async () => {
		if (!user || !org) return;
		if (!confirm("CRITICAL WARNING: This will soft-delete the organization. Are you absolutely sure?")) return;
		setActionLoading(true);
		try {
			const idToken = await user.getIdToken();
			const res = await fetch(`/api/organizations/${org.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
			const data = await res.json();
			if (data.success) {
				triggerFeedback("success", "Organization deleted. Redirecting...");
				setTimeout(() => {
					router.push("/orgs");
				}, 1500);
			} else {
				triggerFeedback("error", data.error || "Failed to delete organization.");
			}
		} catch (err: any) {
			triggerFeedback("error", err.message);
		} finally {
			setActionLoading(false);
		}
	};

	if (loadingAuth || loading) {
		return (
			<AppShell activeNav="Organizations" maxWidth="wide">
				<div className="py-24">
					<LoadingState message="Loading workspace..." />
				</div>
			</AppShell>
		);
	}

	if (errorMsg && !org) {
		return (
			<AppShell activeNav="Organizations" maxWidth="wide">
				<div className="max-w-md mx-auto py-24 text-center">
					<div className="w-12 h-12 rounded-md bg-rose-950/20 text-rose-400 border border-rose-800/40 flex items-center justify-center mx-auto mb-4">
						<FaLock size={20} />
					</div>
					<h3 className="text-base font-semibold text-text-primary">Access Denied</h3>
					<p className="text-xs text-text-muted mt-1">{errorMsg}</p>
					<button
						onClick={() => router.push("/orgs")}
						className="mt-5 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default px-4 py-2 rounded-md font-medium text-xs transition"
					>
						← Back to Directory
					</button>
				</div>
			</AppShell>
		);
	}

	if (!org) return null;
	const isMember = !!userRole;

	// Client-side Filters
	const filteredMembers = members.filter((m) => {
		const searchVal = memberSearch.toLowerCase();
		const nameMatch = m.displayName?.toLowerCase().includes(searchVal) || m.uid?.toLowerCase().includes(searchVal) || m.username?.toLowerCase().includes(searchVal);
		const roleMatch = !memberRoleFilter || m.role === memberRoleFilter;
		return nameMatch && roleMatch;
	});

	// Apply Member Sorting
	filteredMembers.sort((a, b) => {
		if (memberSort === "newest") return (b.joinedAt || 0) - (a.joinedAt || 0);
		if (memberSort === "oldest") return (a.joinedAt || 0) - (b.joinedAt || 0);
		if (memberSort === "rating") return (b.contestRating || 1500) - (a.contestRating || 1500);
		if (memberSort === "activity") return (b.lastActive || 0) - (a.lastActive || 0);
		if (memberSort === "alphabetical") {
			const nameA = (a.displayName || "").toLowerCase();
			const nameB = (b.displayName || "").toLowerCase();
			return nameA.localeCompare(nameB);
		}
		return 0;
	});

	const filteredProblems = problems.filter((p) =>
		p.title?.toLowerCase().includes(problemSearch.toLowerCase()) || p.id?.toLowerCase().includes(problemSearch.toLowerCase())
	);

	const filteredContests = contests.filter((c) =>
		c.title?.toLowerCase().includes(contestSearch.toLowerCase()) || c.id?.toLowerCase().includes(contestSearch.toLowerCase())
	);

	const filteredFiles = files.filter((f) =>
		f.filename?.toLowerCase().includes(fileSearch.toLowerCase())
	);

	return (
		<AppShell activeNav="Organizations" maxWidth="full">
			{/* Status Feedback Toast */}
			{(successMsg || errorMsg) && (
				<div
					className={`fixed top-16 right-6 z-50 p-3 rounded-md border text-xs font-mono transition-all duration-300 ${
						successMsg
							? "bg-emerald-950/90 text-emerald-400 border-emerald-800"
							: "bg-rose-950/90 text-rose-400 border-rose-800"
					}`}
				>
					{successMsg || errorMsg}
				</div>
			)}

			{/* Org Banner & Header */}
			<div className="relative border-b border-border-default bg-bg-surface">
				<div
					className="h-40 md:h-52 bg-cover bg-center relative"
					style={{
						backgroundImage: org.bannerUrl
							? `url(${org.bannerUrl})`
							: `linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(15, 18, 16, 0.95) 100%)`,
					}}
				>
					<div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
				</div>

				<div className="max-w-[1240px] mx-auto px-6 relative z-10 -mt-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-5 pb-5">
					<div className="flex flex-col md:flex-row items-start md:items-end gap-4">
						<OrganizationAvatar
							organization={org}
							size="2xl"
							className="border-2 border-border-default rounded-lg shadow-xl relative shrink-0"
						/>
						<div className="mb-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h1 className="text-xl md:text-2xl font-bold text-text-primary">{org.name}</h1>
								{org.verified && (
									<span className="text-[10px] uppercase font-mono font-medium tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 flex items-center gap-1">
										<FaCheckCircle size={10} /> Verified
									</span>
								)}
								<span className="text-[9px] uppercase font-mono font-medium tracking-wider px-2 py-0.5 rounded bg-bg-elevated text-text-muted border border-border-subtle flex items-center gap-1.5">
									{org.visibility === "public" ? <FaGlobe size={8} /> : <FaLock size={8} />}
									{org.visibility}
								</span>
							</div>
							<p className="text-xs text-text-muted font-mono mt-1">
								slug: <span className="text-accent">@{org.slug}</span>
							</p>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs font-mono text-text-muted">
								{org.location && (
									<span className="flex items-center gap-1.5">
										<FaMapMarkerAlt size={11} className="text-rose-400" /> {org.location},{" "}
										{org.country}
									</span>
								)}
								{org.website && (
									<a
										href={`https://${org.website}`}
										target="_blank"
										rel="noreferrer"
										className="flex items-center gap-1.5 text-text-secondary hover:text-accent transition"
									>
										<FaLink size={11} /> {org.website}
									</a>
								)}
								<span className="flex items-center gap-1.5">
									<FaUsers size={11} className="text-accent" /> {org.memberCount || 0} Members
								</span>
								<span className="flex items-center gap-1.5">
									<FaTrophy size={11} className="text-amber-400" /> {org.contestCount || 0} Contests
								</span>
								<span className="flex items-center gap-1.5">
									<FaQuestionCircle size={11} className="text-text-secondary" /> {org.problemCount || 0} Problems
								</span>
							</div>
						</div>
					</div>

					<div className="flex gap-2 flex-wrap items-center">
						<button
							onClick={handleCopyInviteUrl}
							className="bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border-default px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5"
						>
							<FaShareAlt size={11} /> Share URL
						</button>

						{!isMember ? (
							org.visibility !== "secret" && (
								<form onSubmit={handleRequestJoin} className="flex gap-1.5">
									<input
										type="text"
										placeholder="Optional join message..."
										value={joinMsg}
										onChange={(e) => setJoinMsg(e.target.value)}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="bg-bg-elevated border border-border-default text-xs rounded-md px-3 py-1.5 outline-none w-44 focus:border-accent text-text-primary font-sans"
									/>
									<button
										type="submit"
										disabled={actionLoading}
										className="bg-accent hover:bg-accent-hover text-bg-page px-3.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1"
									>
										<FaUserPlus /> Join Workspace
									</button>
								</form>
							)
						) : (
							<button
								onClick={() => handleRemoveMember(user?.uid as string)}
								className="border border-rose-800/40 hover:bg-rose-950/20 text-rose-400 px-3.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5"
							>
								<FaSignOutAlt size={11} /> Leave Workspace
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Workspace Layout Content */}
			<div className="max-w-[1240px] mx-auto px-6 mt-6 flex flex-col md:flex-row gap-6 pb-12">
				{/* Sidebar Navigation */}
				<aside className="w-full md:w-56 shrink-0 space-y-1">
					<h3 className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-widest px-2.5 mb-2 select-none">
						Workspace Panels
					</h3>

					{[
						{ id: "overview", label: "Overview", icon: <FaGlobe size={12} /> },
						{ id: "chat", label: "Realtime Chat", icon: <FaComments size={12} /> },
						{ id: "members", label: "Members", icon: <FaUsers size={12} /> },
						{ id: "teams", label: "Competitor Teams", icon: <FaUsers size={12} /> },
						{ id: "contests", label: "Contests", icon: <FaTrophy size={12} /> },
						{ id: "problems", label: "Problems", icon: <FaQuestionCircle size={12} /> },
						{ id: "private-problems", label: "Private Gym", icon: <FaQuestionCircle size={12} /> },
						{ id: "roadmaps", label: "Roadmaps & Syllabus", icon: <FaFolderOpen size={12} /> },
						{ id: "assignments", label: "Homework & Tasks", icon: <FaFile size={12} /> },
						{ id: "leaderboard", label: "Leaderboard", icon: <FaChartLine size={12} /> },
						{ id: "announcements", label: "Announcements", icon: <FaBullhorn size={12} /> },
						{ id: "files", label: "Shared Files", icon: <FaFile size={12} /> },
						{ id: "careers", label: "Careers & Jobs", icon: <FaBriefcase size={12} /> },
						{ id: "courses", label: "University Classes", icon: <FaGraduationCap size={12} /> },
						{ id: "resume", label: "My Coding Resume", icon: <FaIdCard size={12} /> },
						{
							id: "recruitment",
							label: "Recruitment Panel",
							icon: <FaUserShield size={12} />,
							reqPerm: "organization.manageRecruitment",
						},
						{ id: "analytics", label: "Analytics", icon: <FaChartLine size={12} />, reqPerm: "organization.viewAnalytics" },
						{ id: "audit-logs", label: "Audit Logs", icon: <FaHistory size={12} />, reqPerm: "organization.viewAuditLogs" },
						{ id: "settings", label: "Settings", icon: <FaWrench size={12} />, reqPerm: "organization.manageSettings" },
					]
						.filter((item) => !item.reqPerm || hasPerm(item.reqPerm))
						.map((item) => (
							<button
								key={item.id}
								onClick={() => router.push(`/orgs/${orgSlug}?tab=${item.id}`, undefined, { shallow: true })}
								className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 transition select-none ${
									tab === item.id
										? "bg-bg-elevated text-accent border border-border-default shadow-xs"
										: "text-text-muted hover:text-text-primary hover:bg-bg-hover/50"
								}`}
							>
								{item.icon}
								{item.label}
							</button>
						))}
				</aside>

				{/* Panel Content Area */}
				<section className="flex-1 min-w-0 bg-bg-surface border border-border-default rounded-lg p-5">
					
					{/* REALTIME CHAT TAB */}
					{tab === "chat" && (
						<div className="animate-fade-in">
							<OrgChatTab org={org as any} user={user} userRole={userRole} />
						</div>
					)}

					{/* OVERVIEW TAB */}
					{tab === "overview" && (
						<div className="space-y-8 animate-fade-in">
							{/* Hero Card */}
							<div className="rounded-lg border border-gray-850 p-6 bg-dark-layer-2/50 relative overflow-hidden">
								<h2 className="text-lg font-bold text-white mb-2">About Our Organization</h2>
								<p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
									{org.description || "Welcome! No description has been uploaded yet for this organization."}
								</p>
							</div>

							{/* Stats Dashboard Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								<div className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl text-center">
									<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Members</p>
									<p className="text-2xl font-extrabold text-white mt-1">{org.memberCount}</p>
								</div>
								<div className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl text-center">
									<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Contests</p>
									<p className="text-2xl font-extrabold text-white mt-1">{org.contestCount}</p>
								</div>
								<div className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl text-center">
									<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Problems</p>
									<p className="text-2xl font-extrabold text-white mt-1">{org.problemCount}</p>
								</div>
								<div className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl text-center">
									<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Workspace Role</p>
									<p className="text-xs font-bold text-brand-orange mt-2 uppercase tracking-wide">
										{userRole || "Guest"}
									</p>
								</div>
							</div>

							{/* Announcements preview */}
							{announcements.length > 0 && (
								<div className="border border-gray-850 rounded-lg p-5 bg-brand-orange/5 relative">
									<div className="flex items-center gap-2 mb-2">
										<span className="bg-brand-orange/20 text-brand-orange text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
											Latest Pinned Notice
										</span>
										<h3 className="font-bold text-white text-xs">{announcements[0].title}</h3>
									</div>
									<p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{announcements[0].content}</p>
								</div>
							)}
						</div>
					)}

					{/* MEMBERS TAB */}
					{tab === "members" && (
						<div className="space-y-10 animate-fade-in">
							{/* Member Directory */}
							<div className="space-y-4">
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div>
										<h2 className="text-lg font-black text-white">Member Directory</h2>
										<p className="text-xs text-gray-500">Manage, filter, and review all members currently registered in this workspace.</p>
									</div>
									<div className="text-xs font-semibold text-gray-400 bg-dark-layer-1 px-3 py-1.5 rounded-lg border border-gray-850">
										Total: {members.length} members
									</div>
								</div>

								{/* Toolbar Filters & Sorters */}
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-dark-layer-2/50 p-4 border border-gray-850 rounded-lg">
									<div className="relative">
										<span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
											<FaSearch size={12} />
										</span>
										<input
											type="text"
											placeholder="Search by name, UID, username..."
											value={memberSearch}
											onChange={(e) => setMemberSearch(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="w-full bg-dark-layer-2 border border-gray-850 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-orange text-white"
										/>
									</div>

									<BeastCodeSelect
										options={[
											{ value: "", label: "All Roles" },
											{ value: "owner", label: "Owner" },
											{ value: "co-owner", label: "Co-Owner" },
											{ value: "admin", label: "Admin" },
											{ value: "coach", label: "Coach" },
											{ value: "instructor", label: "Instructor" },
											{ value: "ta", label: "Teaching Assistant" },
											{ value: "moderator", label: "Moderator" },
											{ value: "contest_manager", label: "Contest Manager" },
											{ value: "problem_manager", label: "Problem Manager" },
											{ value: "recruiter", label: "Recruiter" },
											{ value: "member", label: "Member" }
										]}
										value={memberRoleFilter}
										onChange={(val) => setMemberRoleFilter(val)}
										size="sm"
										className="w-48"
									/>

									<BeastCodeSelect
										options={[
											{ value: "newest", label: "Sort by: Newest Joined" },
											{ value: "oldest", label: "Sort by: Oldest Joined" },
											{ value: "rating", label: "Sort by: Highest Rating" },
											{ value: "alphabetical", label: "Sort by: Alphabetical (A-Z)" },
											{ value: "activity", label: "Sort by: Last Active" }
										]}
										value={memberSort}
										onChange={(val) => setMemberSort(val)}
										size="sm"
										className="w-56"
									/>
								</div>

								{/* Directory Table */}
								<div className="overflow-x-auto border border-gray-850 rounded-lg bg-dark-surface">
									<table className="w-full text-left text-xs text-gray-300">
										<thead>
											<tr className="bg-dark-layer-1 border-b border-gray-850 text-gray-400 font-bold">
												<th className="px-5 py-4">User</th>
												<th className="px-5 py-4">Workspace Role</th>
												<th className="px-5 py-4">Problems Solved</th>
												<th className="px-5 py-4">Contest Rating</th>
												<th className="px-5 py-4">Joined Date</th>
												{hasPerm("organization.assignRole") && <th className="px-5 py-4 text-right">Settings</th>}
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-850/60">
											{filteredMembers.map((m) => (
												<tr
													key={m.uid}
													className="hover:bg-dark-layer-1/50 transition cursor-pointer"
													onClick={() => {
														setSelectedMember(m);
														setDrawerTab("overview");
													}}
												>
													<td className="px-5 py-4 flex items-center gap-3">
														<div className="w-9 h-9 rounded-xl bg-dark-layer-2 shrink-0 overflow-hidden flex items-center justify-center border border-gray-800">
															{m.avatarUrl || m.avatar ? (
																<img src={m.avatarUrl || m.avatar} alt={m.displayName} className="w-full h-full object-cover" />
															) : (
																<span className="text-xs font-bold text-gray-400">
																	{m.displayName?.slice(0, 2).toUpperCase() || "MB"}
																</span>
															)}
														</div>
														<div className="min-w-0">
															<p className="font-bold text-white truncate max-w-[160px]">
																{m.displayName || "Workspace Member"}
															</p>
															<p className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">
																@{m.username || m.uid?.substring(0, 10)}
															</p>
														</div>
													</td>
													<td className="px-5 py-4">
														<span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
															m.role === "owner"
																? "bg-red-500/10 text-red-400 border-red-500/20"
																: m.role === "admin"
																? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
																: "bg-gray-800 text-gray-400 border-gray-800/80"
														}`}>
															{m.role}
														</span>
													</td>
													<td className="px-5 py-4 font-mono font-bold text-gray-400">{m.problemsSolved ?? 0}</td>
													<td className="px-5 py-4 font-mono font-bold text-yellow-500">{m.contestRating ?? 1500}</td>
													<td className="px-5 py-4 text-gray-500">
														{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "N/A"}
													</td>
													{hasPerm("organization.assignRole") && (
														<td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
															<div className="flex justify-end items-center gap-2">
																{m.role !== "owner" && (
																	<BeastCodeSelect
																		options={[
																			{ value: "member", label: "Member" },
																			{ value: "moderator", label: "Moderator" },
																			{ value: "recruiter", label: "Recruiter" },
																			{ value: "contest_manager", label: "Contest Mgr" },
																			{ value: "problem_manager", label: "Problem Mgr" },
																			{ value: "admin", label: "Admin" }
																		]}
																		value={m.role}
																		onChange={(val) => handleUpdateMemberRole(m.uid, val)}
																		size="sm"
																		className="w-32"
																	/>
																)}
																{m.role !== "owner" && m.uid !== user?.uid && (
																	<button
																		onClick={() => handleRemoveMember(m.uid)}
																		className="text-red-500 hover:text-red-400 p-2 transition hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded-xl cursor-pointer"
																		title="Remove member"
																	>
																		<FaUserMinus size={13} />
																	</button>
																)}
															</div>
														</td>
													)}
												</tr>
											))}

											{filteredMembers.length === 0 && (
												<tr>
													<td colSpan={6} className="text-center py-12 text-gray-500 italic">No workspace members matching your criteria.</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>

							{hasPerm("organization.inviteMember") && (
								<>
									{/* Invite Hub */}
									<div className="border-t border-gray-850 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
										{/* Invite user form */}
										<div className="space-y-4">
											<div>
												<h3 className="text-sm font-bold text-white">Invite New Members</h3>
												<p className="text-xs text-gray-500 mt-0.5">Search users by UID or username, select a role, and send direct invitations.</p>
											</div>

											<div className="relative">
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Search Users</label>
												<div className="relative">
													<input
														type="text"
														placeholder="Type UID, Username, or Email..."
														value={inviteSearchInput}
														onChange={(e) => handleInviteSearch(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl pl-4 pr-10 py-3 text-white outline-none transition"
													/>
													{inviteSearchLoading && (
														<span className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></span>
													)}
												</div>

												{/* Search dropdown results */}
												{inviteSearchResults.length > 0 && (
													<div className="absolute left-0 right-0 top-full mt-2 bg-dark-layer-1 border border-gray-850 rounded-xl overflow-hidden shadow-2xl z-30 max-h-60 overflow-y-auto">
														{inviteSearchResults.map((u) => (
															<div
																key={u.uid}
																onClick={() => {
																	setSelectedInviteUser(u);
																	setInviteSearchResults([]);
																}}
																className="p-3 hover:bg-dark-layer-2/80 transition flex items-center gap-3 cursor-pointer border-b border-gray-850/50 last:border-b-0"
															>
																<div className="w-8 h-8 rounded-lg bg-dark-layer-2 overflow-hidden flex items-center justify-center shrink-0 border border-gray-850">
																	{u.avatarUrl ? (
																		<img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
																	) : (
																		<span className="text-[10px] font-bold text-gray-400">U</span>
																	)}
																</div>
																<div className="min-w-0 flex-1">
																	<div className="flex items-center justify-between">
																		<p className="text-xs font-bold text-white truncate">{u.displayName}</p>
																		<span className="text-[9px] text-yellow-500 font-semibold shrink-0">Rating: {u.contestRating || 1500}</span>
																	</div>
																	<div className="flex items-center justify-between mt-0.5 text-[9px] text-gray-500 font-mono">
																		<span>@{u.username}</span>
																		<span className="truncate max-w-[150px]">{u.currentOrg}</span>
																	</div>
																</div>
															</div>
														))}
													</div>
												)}
											</div>

											{/* Selected User Details & Config */}
											{selectedInviteUser && (
												<div className="bg-dark-layer-2 border border-gray-850 rounded-xl p-4 space-y-4 animate-scale-up">
													<div className="flex justify-between items-start">
														<div className="flex gap-3">
															<div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-800 shrink-0">
																{selectedInviteUser.avatarUrl ? (
																	<img src={selectedInviteUser.avatarUrl} alt={selectedInviteUser.displayName} className="w-full h-full object-cover" />
																) : (
																	<div className="w-full h-full bg-dark-layer-1 flex items-center justify-center font-bold text-gray-500 text-sm">U</div>
																)}
															</div>
															<div>
																<h4 className="text-xs font-bold text-white">{selectedInviteUser.displayName}</h4>
																<p className="text-[10px] text-gray-500 font-mono mt-0.5">@{selectedInviteUser.username} | UID: {selectedInviteUser.uid?.substring(0, 8)}...</p>
															</div>
														</div>
														<button
															onClick={() => setSelectedInviteUser(null)}
															className="text-gray-500 hover:text-white transition p-1"
														>
															<FaTimes size={12} />
														</button>
													</div>

													<form onSubmit={handleInviteMember} className="grid grid-cols-2 gap-3 pt-2">
														<div>
															<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Assign Role</label>
															<BeastCodeSelect
																options={[
																	{ value: "member", label: "Member" },
																	{ value: "moderator", label: "Moderator" },
																	{ value: "recruiter", label: "Recruiter" },
																	{ value: "contest_manager", label: "Contest Manager" },
																	{ value: "problem_manager", label: "Problem Manager" },
																	{ value: "coach", label: "Coach" },
																	{ value: "admin", label: "Administrator" }
																]}
																value={inviteRole}
																onChange={(val) => setInviteRole(val)}
																size="sm"
															/>
														</div>

														<div>
															<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Expiration</label>
															<BeastCodeSelect
																options={[
																	{ value: "1", label: "1 Day" },
																	{ value: "3", label: "3 Days" },
																	{ value: "7", label: "7 Days" },
																	{ value: "30", label: "30 Days" }
																]}
																value={String(inviteExpiresDays)}
																onChange={(val) => setInviteExpiresDays(parseInt(val, 10))}
																size="sm"
															/>
														</div>

														<div className="col-span-2 pt-2">
															<button
																type="submit"
																disabled={actionLoading}
																className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs py-2 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
															>
																<FaUserPlus size={12} /> Send Invitation
															</button>
														</div>
													</form>
												</div>
											)}

											{!selectedInviteUser && inviteSearchInput && !inviteSearchInput.includes("@") && (
												<div className="bg-dark-layer-1/50 border border-gray-850 rounded-xl p-3.5 text-center">
													<p className="text-[11px] text-gray-500">Not seeing user in results? You can also invite direct emails by typing a full email.</p>
												</div>
											)}
										</div>

										{/* Active Invitations List */}
										<div className="space-y-4">
											<div>
												<h3 className="text-sm font-bold text-white">Active Sent Invitations ({invitationsList.filter(i => i.status === "Pending").length})</h3>
												<p className="text-xs text-gray-500 mt-0.5 font-sans">Track pending workspaces invitations, resend invitations, or revoke access.</p>
											</div>

											<div className="space-y-3 max-h-64 overflow-y-auto pr-1">
												{invitationsList.filter(i => i.status === "Pending").map((inv) => (
													<div key={inv.inviteId} className="bg-dark-surface border border-gray-850 rounded-xl p-4 flex flex-col justify-between hover:border-gray-800 transition">
														<div className="flex justify-between items-start gap-2">
															<div className="min-w-0">
																<p className="text-xs font-bold text-white truncate">{inv.inviteeName || inv.email || "Recipient"}</p>
																<p className="text-[9px] text-gray-500 font-mono mt-0.5 truncate">
																	Role: <span className="text-brand-orange font-bold uppercase">{inv.roleId}</span> | Expiry: {new Date(inv.expiresAt).toLocaleDateString()}
																</p>
															</div>
															<span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/20 shrink-0">
																Pending
															</span>
														</div>

														<div className="flex justify-end gap-2 border-t border-gray-850 mt-3 pt-2.5">
															<button
																onClick={() => handleCancelInvite(inv.inviteId)}
																disabled={actionLoading}
																className="text-gray-400 hover:text-white border border-gray-800 text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer"
															>
																Revoke
															</button>
															<button
																onClick={() => handleResendInvite(inv.inviteId)}
																disabled={actionLoading}
																className="bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/20 text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
															>
																Resend
															</button>
														</div>
													</div>
												))}

												{invitationsList.filter(i => i.status === "Pending").length === 0 && (
													<div className="text-center py-10 border border-dashed border-gray-850 rounded-xl text-gray-500 italic text-xs">
														No pending invitations active.
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Invite Link Section */}
									<div className="border-t border-gray-850 pt-8 space-y-6">
										<div>
											<h3 className="text-sm font-bold text-white">Invite Links Manager</h3>
											<p className="text-xs text-gray-500 mt-0.5">Generate reusable invitations URLs with limited uses, expiry time, or password protection.</p>
										</div>

										<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
											{/* Link generator form */}
											<form onSubmit={handleCreateInviteLink} className="bg-dark-surface border border-gray-850 rounded-lg p-5 space-y-4 h-fit">
												<h4 className="text-xs font-bold text-white uppercase tracking-wider">Generate Link</h4>

												<div>
													<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Link Default Role</label>
													<BeastCodeSelect
														options={[
															{ value: "member", label: "Member" },
															{ value: "moderator", label: "Moderator" },
															{ value: "coach", label: "Coach" },
															{ value: "contest_manager", label: "Contest Manager" }
														]}
														value={linkRole}
														onChange={(val) => setLinkRole(val)}
														size="sm"
													/>
												</div>

												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Max Uses</label>
														<BeastCodeSelect
															options={[
																{ value: "-1", label: "Unlimited" },
																{ value: "1", label: "1 Use" },
																{ value: "5", label: "5 Uses" },
																{ value: "10", label: "10 Uses" },
																{ value: "50", label: "50 Uses" }
															]}
															value={String(linkMaxUses)}
															onChange={(val) => setLinkMaxUses(parseInt(val, 10))}
															size="sm"
														/>
													</div>

													<div>
														<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Expires In</label>
														<BeastCodeSelect
															options={[
																{ value: "-1", label: "Never" },
																{ value: "1", label: "1 Day" },
																{ value: "3", label: "3 Days" },
																{ value: "7", label: "7 Days" },
																{ value: "30", label: "30 Days" }
															]}
															value={String(linkExpiresDays)}
															onChange={(val) => setLinkExpiresDays(parseInt(val, 10))}
															size="sm"
														/>
													</div>
												</div>

												<div>
													<label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Optional Password</label>
													<input
														type="password"
														placeholder="Require pass to join..."
														value={linkPassword}
														onChange={(e) => setLinkPassword(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-2.5 text-white outline-none transition"
													/>
												</div>

												<button
													type="submit"
													disabled={actionLoading}
													className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
												>
													<FaLink size={11} /> Generate URL
												</button>
											</form>

											{/* Active Links List table */}
											<div className="lg:col-span-2 overflow-x-auto border border-gray-850 rounded-lg bg-dark-surface p-5 h-fit space-y-4">
												<h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Links</h4>

												<div className="space-y-3">
													{inviteLinksList.filter(l => l.status === "active").map((link) => {
														const inviteUrl = `${window.location.origin}/orgs/invite/${link.linkId}`;
														return (
															<div key={link.linkId} className="bg-dark-layer-1 border border-gray-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
																<div className="min-w-0">
																	<div className="flex items-center gap-2">
																		<span className="text-[10px] font-mono text-gray-400 truncate max-w-[150px]">{link.linkId}</span>
																		<span className="text-[8px] uppercase font-bold px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
																			{link.roleId}
																		</span>
																		{link.password && (
																			<span className="text-[8px] uppercase font-bold px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
																				Protected
																			</span>
																		)}
																	</div>
																	<p className="text-[10px] text-gray-500 mt-1">
																		Uses: {link.useCount} / {link.maxUses > 0 ? link.maxUses : "Unlimited"} | Expiry: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : "Never"}
																	</p>
																</div>

																<div className="flex gap-2 w-full sm:w-auto justify-end shrink-0">
																	<button
																		onClick={() => {
																			navigator.clipboard.writeText(inviteUrl);
																			triggerFeedback("success", "Link copied to clipboard!");
																		}}
																		className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white border border-gray-800 text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
																	>
																		<FaCopy size={10} /> Copy Link
																	</button>
																	<button
																		onClick={() => handleRevokeInviteLink(link.linkId)}
																		disabled={actionLoading}
																		className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer"
																	>
																		Revoke
																	</button>
																</div>
															</div>
														);
													})}

													{inviteLinksList.filter(l => l.status === "active").length === 0 && (
														<div className="text-center py-10 border border-dashed border-gray-850 rounded-xl text-gray-500 italic text-xs">
															No active invite links generated yet.
														</div>
													)}
												</div>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					)}

					{/* CONTESTS TAB */}
					{tab === "contests" && (
						<div className="space-y-6 animate-fade-in">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Workspace Contests</h2>
								{hasPerm("organization.createContest") && (
									<form onSubmit={handleLinkContest} className="flex gap-2">
										<input
											type="text"
											placeholder="Global Contest ID..."
											value={linkContestId}
											onChange={(e) => setLinkContestId(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="bg-dark-layer-2 border border-gray-855 text-xs rounded-xl px-3 py-2 outline-none w-52 focus:border-brand-orange"
											required
										/>
										<button
											type="submit"
											disabled={actionLoading}
											className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
											style={{ color: "var(--bg-base)" }}
										>
											<FaPlus /> Link Contest
										</button>
									</form>
								)}
							</div>

							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
									<FaSearch size={11} />
								</span>
								<input
									type="text"
									placeholder="Search linked contests..."
									value={contestSearch}
									onChange={(e) => setContestSearch(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="bg-dark-layer-2 border border-gray-850 text-xs rounded-lg pl-8 pr-3 py-2 w-full outline-none focus:border-brand-orange mb-4"
								/>
							</div>

							{filteredContests.length === 0 ? (
								<p className="text-xs text-gray-500 italic py-6 text-center">No contests linked to this workspace yet.</p>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{filteredContests.map((c) => (
										<div
											key={c.id}
											className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl flex flex-col justify-between"
										>
											<div>
												<h3 className="font-bold text-white text-xs">{c.title}</h3>
												<p className="text-[10px] text-gray-500 font-mono mt-1">ID: {c.id}</p>
												<div className="flex items-center gap-3 text-xs text-gray-400 mt-4">
													<span className="flex items-center gap-1">
														<FaCalendarAlt size={10} className="text-brand-orange" />
														{new Date(c.startTime).toLocaleDateString()}
													</span>
													<span className="capitalize text-[10px] font-semibold">{c.visibility}</span>
												</div>
											</div>
											<div className="flex justify-between items-center mt-5 border-t border-gray-800 pt-3">
												<button
													onClick={() => router.push(`/contests/${c.id}`)}
													className="text-[10px] font-extrabold text-brand-orange hover:text-brand-orange-s transition cursor-pointer"
												>
													Enter Contest →
												</button>
												{hasPerm("organization.deleteContest") && (
													<button
														onClick={() => handleUnlinkContest(c.id)}
														className="text-red-500 hover:text-red-400 p-1.5 transition hover:bg-dark-fill-3 rounded cursor-pointer"
														title="Unlink Contest"
													>
														<FaTrash size={11} />
													</button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* PROBLEMS TAB */}
					{tab === "problems" && (
						<div className="space-y-6 animate-fade-in">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Problem Library</h2>
								{hasPerm("organization.createProblem") && (
									<form onSubmit={handleLinkProblem} className="flex gap-2">
										<input
											type="text"
											placeholder="Global Problem ID..."
											value={linkProblemId}
											onChange={(e) => setLinkProblemId(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="bg-dark-layer-2 border border-gray-855 text-xs rounded-xl px-3 py-2 outline-none w-52 focus:border-brand-orange"
											required
										/>
										<button
											type="submit"
											disabled={actionLoading}
											className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
											style={{ color: "var(--bg-base)" }}
										>
											<FaPlus /> Link Problem
										</button>
									</form>
								)}
							</div>

							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
									<FaSearch size={11} />
								</span>
								<input
									type="text"
									placeholder="Search problem library..."
									value={problemSearch}
									onChange={(e) => setProblemSearch(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="bg-dark-layer-2 border border-gray-850 text-xs rounded-lg pl-8 pr-3 py-2 w-full outline-none focus:border-brand-orange mb-4"
								/>
							</div>

							{filteredProblems.length === 0 ? (
								<p className="text-xs text-gray-500 italic py-6 text-center">No practice problems mapped to this workspace.</p>
							) : (
								<div className="overflow-x-auto border border-gray-850 rounded-xl">
									<table className="w-full text-left text-xs text-gray-300">
										<thead>
											<tr className="bg-dark-layer-1 border-b border-gray-850">
												<th className="px-5 py-3">Problem Title</th>
												<th className="px-5 py-3">Difficulty</th>
												<th className="px-5 py-3 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-850">
											{filteredProblems.map((p) => (
												<tr key={p.id} className="hover:bg-dark-fill-3 transition">
													<td className="px-5 py-3">
														<span
															onClick={() => router.push(`/problems/${p.id}`)}
															className="font-bold text-white hover:text-brand-orange cursor-pointer transition"
														>
															{p.title}
														</span>
														<p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {p.id}</p>
													</td>
													<td className="px-5 py-3">
														<span
															className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
																p.difficulty === "Easy"
																	? "bg-green-500/10 text-green-500"
																	: p.difficulty === "Medium"
																	? "bg-yellow-500/10 text-yellow-500"
																	: "bg-red-500/10 text-red-500"
															}`}
														>
															{p.difficulty}
														</span>
													</td>
													<td className="px-5 py-3 text-right">
														<div className="flex justify-end gap-2">
															<button
																onClick={() => router.push(`/problems/${p.id}`)}
																className="text-[10px] font-extrabold text-brand-orange hover:text-brand-orange-s transition cursor-pointer"
															>
																Solve
															</button>
															{hasPerm("organization.deleteProblem") && (
																<button
																	onClick={() => handleUnlinkProblem(p.id)}
																	className="text-red-500 hover:text-red-400 p-1.5 transition hover:bg-dark-fill-3 rounded cursor-pointer"
																	title="Unlink Problem"
																>
																	<FaTrash size={11} />
																</button>
															)}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{/* LEADERBOARD TAB */}
					{tab === "leaderboard" && (
						<div className="space-y-6 animate-fade-in">
							<h2 className="text-base font-bold text-white">Leaderboard Rankings</h2>
							<p className="text-xs text-gray-500">Global score and solved problem indices computed for active workspace participants.</p>
							
							<div className="overflow-x-auto border border-gray-850 rounded-xl mt-4">
								<table className="w-full text-left text-xs text-gray-300">
									<thead>
										<tr className="bg-dark-layer-1 border-b border-gray-850">
											<th className="px-5 py-3 w-16">Rank</th>
											<th className="px-5 py-3">Competitor</th>
											<th className="px-5 py-3">Problems Solved</th>
											<th className="px-5 py-3">Contest Rating</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-850">
										{members
											.sort((a, b) => (b.contestRating ?? 1500) - (a.contestRating ?? 1500))
											.map((m, idx) => (
												<tr key={m.uid} className="hover:bg-dark-fill-3 transition">
													<td className="px-5 py-3 font-mono font-bold text-brand-orange">#{idx + 1}</td>
													<td className="px-5 py-3 font-bold text-white">{m.displayName || "Anonymous"}</td>
													<td className="px-5 py-3 font-mono">{m.problemsSolved ?? 0}</td>
													<td className="px-5 py-3 font-mono text-yellow-500">{m.contestRating ?? 1500}</td>
												</tr>
											))}

										{members.length === 0 && (
											<tr>
												<td colSpan={4} className="text-center py-6 text-gray-500 italic">No rankings available yet.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ANNOUNCEMENTS TAB */}
					{tab === "announcements" && (
						<div className="space-y-6 animate-fade-in">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Announcements Board</h2>
								{hasPerm("organization.createAnnouncement") && (
									<button
										onClick={() => {
											document.getElementById("ann-form-target")?.scrollIntoView({ behavior: "smooth" });
										}}
										className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
										style={{ color: "var(--bg-base)" }}
									>
										<FaPlus /> Compose Notice
									</button>
								)}
							</div>

							<div className="space-y-4">
								{announcements.map((a) => (
									<div
										key={a.id}
										className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl relative"
									>
										{hasPerm("organization.deleteAnnouncement") && (
											<button
												onClick={() => handleDeleteAnnouncement(a.id)}
												className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition cursor-pointer"
												title="Delete Announcement"
											>
												<FaTrash size={11} />
											</button>
										)}
										<div className="flex items-center gap-2 mb-2">
											<h3 className="font-bold text-white text-xs">{a.title}</h3>
										</div>
										<p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{a.content}</p>
										<div className="flex items-center justify-between text-[9px] text-gray-500 mt-4 pt-3 border-t border-gray-850/60">
											<span>Author: {a.authorName || "Workspace Admin"}</span>
											<span>{new Date(a.createdAt).toLocaleString()}</span>
										</div>
									</div>
								))}

								{announcements.length === 0 && (
									<p className="text-xs text-gray-500 italic py-6 text-center">No announcements posted yet.</p>
								)}
							</div>

							{hasPerm("organization.createAnnouncement") && (
								<div id="ann-form-target" className="border-t border-gray-850 pt-6">
									<h3 className="text-xs font-bold text-white mb-4">Post New Notice</h3>
									<form onSubmit={handleCreateAnnouncement} className="space-y-4">
										<div>
											<input
												type="text"
												placeholder="Notice Title..."
												value={newAnnTitle}
												onChange={(e) => setNewAnnTitle(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
										</div>
										<div>
											<textarea
												placeholder="Compose notice details..."
												value={newAnnContent}
												onChange={(e) => setNewAnnContent(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition h-28"
												required
											/>
										</div>
										<div className="flex items-center justify-between">
											<BeastCodeSelect
												options={[
													{ value: "members", label: "Visible to Members" },
													{ value: "all", label: "Visible to Everyone (Public)" }
												]}
												value={newAnnVisibility}
												onChange={(val) => setNewAnnVisibility(val)}
												size="sm"
												className="w-48"
											/>
											<button
												type="submit"
												disabled={actionLoading}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												{actionLoading ? "Posting..." : "Publish Announcement"}
											</button>
										</div>
									</form>
								</div>
							)}
						</div>
					)}

					{/* SHARED FILES TAB */}
					{tab === "files" && (
						<div className="space-y-6 animate-fade-in">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Shared Resources File Explorer</h2>
								{hasPerm("organization.uploadFile") && (
									<button
										onClick={() => {
											document.getElementById("file-form-target")?.scrollIntoView({ behavior: "smooth" });
										}}
										className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
										style={{ color: "var(--bg-base)" }}
									>
										<FaPlus /> Share File / URL
									</button>
								)}
							</div>

							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
									<FaSearch size={11} />
								</span>
								<input
									type="text"
									placeholder="Search shared files..."
									value={fileSearch}
									onChange={(e) => setFileSearch(e.target.value)}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
									className="bg-dark-layer-2 border border-gray-850 text-xs rounded-lg pl-8 pr-3 py-2 w-full outline-none focus:border-brand-orange mb-4"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{filteredFiles.map((f) => (
									<div
										key={f.id}
										className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl flex items-center justify-between hover:border-gray-800 transition cursor-pointer"
										onClick={() => setPreviewFile(f)}
									>
										<div className="flex items-center gap-3 min-w-0">
											<FaFileAlt className="text-brand-orange shrink-0" size={16} />
											<div className="min-w-0">
												<h4 className="font-bold text-white text-xs truncate max-w-[180px]">{f.filename}</h4>
												<p className="text-[9px] text-gray-500 mt-0.5">Uploaded by: {f.uploaderName || "Workspace Member"}</p>
											</div>
										</div>
										<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
											<a
												href={f.storagePath}
												target="_blank"
												rel="noreferrer"
												className="text-gray-400 hover:text-brand-orange p-1.5 transition"
												title="Download Resource"
											>
												<FaDownload size={12} />
											</a>
											{hasPerm("organization.uploadFile") && (
												<button
													onClick={() => handleDeleteFile(f.id)}
													className="text-red-500 hover:text-red-400 p-1.5 transition hover:bg-dark-fill-3 rounded cursor-pointer"
												>
													<FaTrash size={11} />
												</button>
											)}
										</div>
									</div>
								))}

								{filteredFiles.length === 0 && (
									<p className="text-xs text-gray-500 italic py-6 text-center col-span-2">
										No shared files index found.
									</p>
								)}
							</div>

							{hasPerm("organization.uploadFile") && (
								<div id="file-form-target" className="border-t border-gray-850 pt-6">
									<h3 className="text-xs font-bold text-white mb-4">Share Resource</h3>
									<form onSubmit={handleShareFile} className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<input
												type="text"
												placeholder="Resource Title (e.g. PDF Material)..."
												value={newFileName}
												onChange={(e) => setNewFileName(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
											<input
												type="text"
												placeholder="GCS / Storage URL or Drive URL..."
												value={newFileUrl}
												onChange={(e) => setNewFileUrl(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
										</div>
										<div className="flex items-center justify-between">
											<BeastCodeSelect
												options={[
													{ value: "members", label: "Visible to Members" },
													{ value: "public", label: "Visible to Guest / Everyone" }
												]}
												value={newFileVisibility}
												onChange={(val) => setNewFileVisibility(val)}
												size="sm"
												className="w-48"
											/>
											<button
												type="submit"
												disabled={actionLoading}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												{actionLoading ? "Registering..." : "Upload Material Metadata"}
											</button>
										</div>
									</form>
								</div>
							)}
						</div>
					)}

					{/* RECRUITMENT TAB */}
					{tab === "recruitment" && hasPerm("organization.manageRecruitment") && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center border-b border-gray-850 pb-4">
								<div>
									<h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
										<FaUserShield className="text-brand-orange" /> Workspace Recruitment Suite
									</h2>
									<p className="text-xs text-gray-500">Hire top engineering talent, review coding assessments, manage pipelines, and schedule technical interviews.</p>
								</div>
							</div>

							{/* Inner Navigation tabs */}
							<div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-dark-layer-2/50 p-1.5 rounded-xl border border-gray-850">
								{["applications", "jobs", "candidates", "certificates", "join-requests"].map((sub) => (
									<button
										key={sub}
										onClick={() => {
											setDrawerTab(sub);
										}}
										className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
											drawerTab === sub || (drawerTab === "overview" && sub === "applications")
												? "bg-brand-orange text-bg-base"
												: "text-gray-400 hover:text-white hover:bg-dark-fill-3"
										}`}
									>
										{sub.replace("-", " ")}
									</button>
								))}
							</div>

							{/* 1. APPLICATIONS & PIPELINE SUB-TAB */}
							{(drawerTab === "applications" || drawerTab === "overview" || drawerTab === "") && (
								<div className="space-y-6">
									<div className="flex justify-between items-center">
										<h3 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Application Pipeline</h3>
										<span className="text-[10px] text-gray-500 font-mono">{applications.length} Candidates total</span>
									</div>

									{selectedApplication ? (
										<div className="bg-dark-layer-2 border border-gray-850 p-6 rounded-xl space-y-6 animate-fade-in">
											<div className="flex justify-between items-center border-b border-gray-800 pb-4">
												<div>
													<h4 className="text-sm font-bold text-white">Application #{selectedApplication.id}</h4>
													<p className="text-[10px] text-gray-500 mt-1">Candidate UID: {selectedApplication.candidateUid}</p>
												</div>
												<button
													onClick={() => {
														setSelectedApplication(null);
														setCandidateResume(null);
													}}
													className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
												>
													← Back to Pipeline
												</button>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
												{/* Left Column: Stage Transition & Info */}
												<div className="md:col-span-1 space-y-4">
													<div className="bg-dark-layer-1 border border-gray-850 p-4 rounded-lg space-y-3">
														<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Pipeline Stage</p>
														<span className="inline-block px-3 py-1 text-[10px] font-bold uppercase rounded bg-brand-orange/20 text-brand-orange">
															{selectedApplication.currentStage}
														</span>

														<div className="space-y-2 pt-2">
															<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Promote / Demote Candidate</p>
															<div className="flex flex-wrap gap-1.5">
																{["Applied", "Resume Review", "Online Assessment", "Technical Interview", "Final Review", "Offer", "Accepted", "Rejected"].map((st) => (
																	<button
																		key={st}
																		onClick={() => handleUpdateApplicationStage(selectedApplication.id, st, `Promoted/demoted to ${st} stage`)}
																		className={`px-2 py-1 text-[9px] rounded font-semibold cursor-pointer border ${
																			selectedApplication.currentStage === st
																				? "border-brand-orange bg-brand-orange/10 text-brand-orange"
																				: "border-gray-800 hover:border-gray-600 text-gray-400"
																		}`}
																	>
																		{st}
																	</button>
																))}
															</div>
														</div>
													</div>

													<div className="bg-dark-layer-1 border border-gray-850 p-4 rounded-lg space-y-2">
														<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessment Results</p>
														<div className="flex justify-between items-center">
															<span className="text-gray-400">Score:</span>
															<span className="font-mono font-bold text-white text-xs">
																{selectedApplication.assessmentScore !== null ? `${selectedApplication.assessmentScore}%` : "No Attempt Yet"}
															</span>
														</div>
													</div>
												</div>

												{/* Right Column: Candidate Resume details & cover letter */}
												<div className="md:col-span-2 space-y-4">
													<div className="bg-dark-layer-1 border border-gray-850 p-5 rounded-lg space-y-3">
														<h5 className="font-bold text-white text-xs border-b border-gray-800 pb-2">Cover Letter / Statement</h5>
														<p className="text-gray-300 leading-relaxed italic">&quot;{selectedApplication.coverLetter || "No cover letter submitted."}&quot;</p>
													</div>

													<button
														onClick={async () => {
															if (!user) return;
															try {
																const idToken = await user.getIdToken();
																const res = await fetch(`/api/users/resume?uid=${selectedApplication.candidateUid}&orgId=${org.id}`, {
																	headers: { Authorization: `Bearer ${idToken}` },
																});
																const rdata = await res.json();
																if (rdata.success) {
																	setCandidateResume(rdata.resume);
																} else {
																	triggerFeedback("error", rdata.error);
																}
															} catch (err: any) {
																triggerFeedback("error", err.message);
															}
														}}
														className="w-full bg-dark-fill-3 hover:bg-dark-fill-2 text-white py-2 rounded-lg font-bold text-xs transition cursor-pointer"
													>
														🔍 View Verified BeastCode Resume
													</button>

													{candidateResume && (
														<div className="bg-dark-layer-1 border border-gray-850 p-5 rounded-lg space-y-4 animate-fade-in">
															<div className="flex justify-between items-center border-b border-gray-800 pb-2">
																<h5 className="font-bold text-white text-xs">BeastCode Professional CV</h5>
																<div className="flex items-center gap-1.5">
																	<span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Auto Score:</span>
																	<span className="bg-emerald-600/20 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
																		{candidateResume.autoProfileScore || 0}
																	</span>
																</div>
															</div>

															<div className="space-y-3 text-xs">
																<div>
																	<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Skills & Tech Stack</p>
																	<div className="flex flex-wrap gap-1 mt-1">
																		{candidateResume.skills?.map((s: string) => (
																			<span key={s} className="bg-dark-fill-3 text-gray-300 px-2 py-0.5 rounded text-[9px] font-mono">{s}</span>
																		))}
																	</div>
																</div>
																<div>
																	<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Programming Languages</p>
																	<div className="flex flex-wrap gap-1 mt-1">
																		{candidateResume.programmingLanguages?.map((s: string) => (
																			<span key={s} className="bg-dark-fill-3 text-gray-300 px-2 py-0.5 rounded text-[9px] font-mono">{s}</span>
																		))}
																	</div>
																</div>
																<div>
																	<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Education Details</p>
																	<p className="text-gray-300 font-mono text-[10px]">{candidateResume.educationDescription || "No Education Details Listed"}</p>
																</div>
																<div>
																	<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Experience Details</p>
																	<p className="text-gray-300 font-mono text-[10px]">{candidateResume.experienceDescription || "No Experience Details Listed"}</p>
																</div>
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{applications.map((app) => (
												<div
													key={app.id}
													onClick={() => setSelectedApplication(app)}
													className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl hover:border-brand-orange transition cursor-pointer flex justify-between items-center"
												>
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<span className="font-bold text-white text-xs">ID: {app.id.substring(4)}</span>
															<span className="px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange text-[9px] font-extrabold uppercase">
																{app.currentStage}
															</span>
														</div>
														<p className="text-[9px] text-gray-500 mt-1 font-mono">UID: {app.candidateUid}</p>
														<p className="text-[10px] text-gray-400 mt-2 truncate max-w-[240px] italic">&quot;{app.coverLetter}&quot;</p>
													</div>
													<FaChevronRight className="text-gray-600 shrink-0" size={14} />
												</div>
											))}

											{applications.length === 0 && (
												<p className="text-xs text-gray-500 italic py-6 text-center col-span-2">No candidate applications submitted yet.</p>
											)}
										</div>
									)}
								</div>
							)}

							{/* 2. JOB POSTINGS SUB-TAB */}
							{drawerTab === "jobs" && (
								<div className="space-y-6">
									<div className="flex justify-between items-center">
										<h3 className="text-xs font-bold text-white uppercase tracking-wider">Manage Open Positions</h3>
										<span className="text-[10px] text-gray-500 font-mono">{jobs.length} Positions open</span>
									</div>

									<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
										<h4 className="font-bold text-white text-xs">Create New Job Posting</h4>
										<form onSubmit={handleCreateJob} className="space-y-4">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Job Title</label>
													<input
														type="text"
														placeholder="Software Engineer..."
														value={newJobTitle}
														onChange={(e) => setNewJobTitle(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
														required
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Location</label>
													<input
														type="text"
														placeholder="Remote, San Francisco, etc."
														value={newJobLocation}
														onChange={(e) => setNewJobLocation(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
														required
													/>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Employment Type</label>
													<BeastCodeSelect
														options={[
															{ value: "Full-time", label: "Full-time" },
															{ value: "Part-time", label: "Part-time" },
															{ value: "Contract", label: "Contract" },
															{ value: "Internship", label: "Internship" }
														]}
														value={newJobType}
														onChange={(val) => setNewJobType(val)}
														size="sm"
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Salary Range</label>
													<input
														type="text"
														placeholder="$120k - $150k"
														value={newJobSalary}
														onChange={(e) => setNewJobSalary(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
														required
													/>
												</div>
											</div>

											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Job Description</label>
												<textarea
													placeholder="Describe the role, responsibilities, culture..."
													value={newJobDesc}
													onChange={(e) => setNewJobDesc(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
													required
												/>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Requirements (one per line)</label>
													<textarea
														placeholder="Python, Go, React, SQL..."
														value={newJobRequirements}
														onChange={(e) => setNewJobRequirements(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Responsibilities (one per line)</label>
													<textarea
														placeholder="Develop scalable APIs..."
														value={newJobResponsibilities}
														onChange={(e) => setNewJobResponsibilities(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
													/>
												</div>
											</div>

											<button
												type="submit"
												disabled={actionLoading}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												{actionLoading ? "Creating..." : "Publish Job Opening"}
											</button>
										</form>
									</div>

									<div className="space-y-4">
										{jobs.map((job) => (
											<div key={job.id} className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl flex justify-between items-center">
												<div>
													<h4 className="font-bold text-white text-xs">{job.title}</h4>
													<p className="text-[10px] text-gray-500 mt-1">{job.location} • {job.employmentType} • {job.salaryRange}</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* 3. CANDIDATE SEARCH SUB-TAB */}
							{drawerTab === "candidates" && (
								<div className="space-y-6">
									<div className="flex gap-2">
										<input
											type="text"
											placeholder="Search candidates by UID, university, languages..."
											value={candidateSearchQuery}
											onChange={(e) => setCandidateSearchQuery(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="flex-1 bg-dark-layer-2 border border-gray-850 text-xs rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange transition"
										/>
										<button
											onClick={handleSearchCandidates}
											className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
											style={{ color: "var(--bg-base)" }}
										>
											<FaSearch /> Search
										</button>
									</div>

									<div className="space-y-4">
										{candidateSearchResults.map((cand) => (
											<div key={cand.uid} className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl flex flex-col sm:flex-row justify-between gap-4">
												<div>
													<h4 className="font-bold text-white text-xs">{cand.displayName} ({cand.username})</h4>
													<p className="text-[10px] text-gray-500 mt-0.5">UID: {cand.uid}</p>
													<div className="flex gap-3 mt-2 text-[10px] text-gray-400 font-mono">
														<span>🏆 Rating: {cand.contestRating}</span>
														<span>✅ Solved: {cand.solvedProblems} problems</span>
														{cand.school && <span>🎓 School: {cand.school}</span>}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* 4. CERTIFICATES SUB-TAB */}
							{drawerTab === "certificates" && (
								<div className="space-y-6">
									<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
										<h4 className="font-bold text-white text-xs">Issue Completion Certificate</h4>
										<form onSubmit={handleIssueCertificate} className="space-y-4">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Recipient User UID</label>
													<input
														type="text"
														placeholder="Recipient User UID..."
														value={newCertCandidate}
														onChange={(e) => setNewCertCandidate(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
														required
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Signee Name</label>
													<input
														type="text"
														placeholder="John Doe..."
														value={newCertSignee}
														onChange={(e) => setNewCertSignee(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
														required
													/>
												</div>
											</div>

											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Completion Criteria</label>
												<textarea
													placeholder="Completed CS106B Coding Boot camp and all coding challenges with 100% scores."
													value={newCertCriteria}
													onChange={(e) => setNewCertCriteria(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
													required
												/>
											</div>

											<button
												type="submit"
												disabled={actionLoading}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												{actionLoading ? "Issuing..." : "Issue Verified Certificate"}
											</button>
										</form>
									</div>

									<div className="space-y-4">
										{certificates.map((cert) => (
											<div key={cert.id} className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl flex justify-between items-center">
												<div>
													<h4 className="font-bold text-white text-xs">ID: {cert.id}</h4>
													<p className="text-[10px] text-gray-500 mt-1">Recipient: {cert.candidateUid} | Issued: {new Date(cert.issueDate).toLocaleDateString()}</p>
													<p className="text-[10px] text-gray-400 mt-2 font-mono">{cert.criteria}</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* 5. JOIN REQUESTS SUB-TAB */}
							{drawerTab === "join-requests" && (
								<div className="space-y-4 animate-fade-in">
									{joinRequests.length === 0 ? (
										<p className="text-xs text-gray-500 italic py-6 text-center">No pending join applications.</p>
									) : (
										joinRequests.map((r) => (
											<div
												key={r.id}
												className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in"
											>
												<div>
													<h4 className="font-bold text-white text-xs">Request Application</h4>
													<p className="text-[9px] text-gray-500 mt-0.5">UID: {r.uid}</p>
													<p className="text-xs text-gray-400 mt-2 bg-dark-layer-1 p-3 rounded-lg border border-gray-800 italic">
														&quot;{r.message || "No request message attached."}&quot;
													</p>
												</div>
												<div className="flex gap-2 shrink-0">
													<button
														onClick={() => handleHandleJoinRequest(r.id, "approved")}
														className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
													>
														Approve
													</button>
													<button
														onClick={() => handleHandleJoinRequest(r.id, "rejected")}
														className="bg-red-650 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
													>
														Reject
													</button>
												</div>
											</div>
										))
									)}
								</div>
							)}
						</div>
					)}

					{/* CAREERS & JOBS TAB (FOR CANDIDATES) */}
					{tab === "careers" && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center border-b border-gray-850 pb-4">
								<div>
									<h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
										<FaBriefcase className="text-brand-orange" /> Careers & Opportunities
									</h2>
									<p className="text-xs text-gray-500">Join our engineering department. Apply for open positions and check your application status.</p>
								</div>
							</div>

							{companyDetails && (
								<div className="bg-dark-layer-2/50 border border-gray-850 p-5 rounded-xl space-y-3">
									<h3 className="font-bold text-white text-xs">About {org.name}</h3>
									<p className="text-gray-400 leading-relaxed">{companyDetails.description}</p>
									<div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-mono mt-2">
										<span><FaBuilding className="inline mr-1 text-brand-orange" /> Industry: {companyDetails.industry}</span>
										<span><FaMapMarkerAlt className="inline mr-1 text-brand-orange" /> Headquarters: {companyDetails.headquarters}</span>
										<span><FaGlobe className="inline mr-1 text-brand-orange" /> Website: <a href={companyDetails.website} target="_blank" rel="noreferrer" className="text-brand-orange underline">{companyDetails.website}</a></span>
									</div>
								</div>
							)}

							<div className="space-y-4">
								<h3 className="text-xs font-bold text-white uppercase tracking-wider">Open Roles</h3>
								{selectedJob ? (
									<div className="bg-dark-layer-2 border border-gray-850 p-6 rounded-xl space-y-6 animate-fade-in">
										<div className="flex justify-between items-start border-b border-gray-800 pb-4">
											<div>
												<h4 className="text-sm font-bold text-white">{selectedJob.title}</h4>
												<p className="text-[10px] text-gray-500 mt-1">{selectedJob.location} • {selectedJob.employmentType}</p>
											</div>
											<button
												onClick={() => setSelectedJob(null)}
												className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
											>
												Back to Positions
											</button>
										</div>

										<div className="space-y-4 text-xs">
											<div>
												<h5 className="font-bold text-white mb-1">Role Description</h5>
												<p className="text-gray-400 leading-relaxed">{selectedJob.description}</p>
											</div>

											<div>
												<h5 className="font-bold text-white mb-1">Requirements</h5>
												<ul className="list-disc list-inside text-gray-400 space-y-1">
													{selectedJob.requirements?.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
												</ul>
											</div>

											{/* Apply Form */}
											<div className="border-t border-gray-850 pt-5 space-y-4">
												<h5 className="font-bold text-white text-xs">Submit Application</h5>
												<form
													onSubmit={async (e) => {
														e.preventDefault();
														const form = e.target as any;
														await handleApplyJob(
															selectedJob.id,
															form.coverLetter.value,
															form.githubUrl.value,
															form.linkedinUrl.value
														);
													}}
													className="space-y-4"
												>
													<div>
														<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Cover Letter / Statement</label>
														<textarea
															name="coverLetter"
															placeholder="Introduce yourself..."
															autoComplete="off"
															autoCorrect="off"
															autoCapitalize="off"
															spellCheck={false}
															className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
															required
														/>
													</div>
													<div className="grid grid-cols-2 gap-4">
														<div>
															<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">GitHub Profile URL</label>
															<input
																type="text"
																name="githubUrl"
																placeholder="https://github.com/..."
																autoComplete="off"
																autoCorrect="off"
																autoCapitalize="off"
																spellCheck={false}
																className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
															/>
														</div>
														<div>
															<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">LinkedIn Profile URL</label>
															<input
																type="text"
																name="linkedinUrl"
																placeholder="https://linkedin.com/in/..."
																autoComplete="off"
																autoCorrect="off"
																autoCapitalize="off"
																spellCheck={false}
																className="w-full bg-dark-layer-1 border border-gray-800 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
															/>
														</div>
													</div>
													<button
														type="submit"
														disabled={actionLoading}
														className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
														style={{ color: "var(--bg-base)" }}
													>
														{actionLoading ? "Submitting..." : "Apply to Position"}
													</button>
												</form>
											</div>
										</div>
									</div>
								) : (
									<div className="space-y-4">
										{jobs.map((job) => (
											<div
												key={job.id}
												onClick={() => setSelectedJob(job)}
												className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl hover:border-brand-orange transition cursor-pointer flex justify-between items-center"
											>
												<div>
													<h4 className="font-bold text-white text-xs">{job.title}</h4>
													<p className="text-[10px] text-gray-500 mt-1">{job.location} • {job.employmentType} • {job.salaryRange}</p>
												</div>
												<FaChevronRight className="text-gray-600 shrink-0" size={14} />
											</div>
										))}

										{jobs.length === 0 && (
											<p className="text-xs text-gray-500 italic py-6 text-center">No open careers at this time.</p>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{/* UNIVERSITY CURRICULUM & CLASSES TAB */}
					{tab === "courses" && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center border-b border-gray-850 pb-4">
								<div>
									<h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
										<FaGraduationCap className="text-brand-orange" /> University Classes & Academy
									</h2>
									<p className="text-xs text-gray-500">Access registered classes, view syllabus roadmaps, track gradebooks, and download verifiable certificates.</p>
								</div>
							</div>

							{selectedCourse ? (
								<div className="bg-dark-layer-2 border border-gray-850 p-6 rounded-xl space-y-6 animate-fade-in">
									<div className="flex justify-between items-center border-b border-gray-800 pb-4">
										<div>
											<h3 className="text-sm font-bold text-white">{selectedCourse.code}: {selectedCourse.title}</h3>
											<p className="text-[10px] text-gray-500 mt-1">Semester: {selectedCourse.semester}</p>
										</div>
										<button
											onClick={() => {
												setSelectedCourse(null);
												setGradebook([]);
												setCourseMaterials([]);
											}}
											className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
										>
											← Back to Courses
										</button>
									</div>

									{/* Sub-panels for courses */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										{/* Left: Materials & Syllabus */}
										<div className="md:col-span-2 space-y-4">
											<div className="bg-dark-layer-1 border border-gray-850 p-5 rounded-lg">
												<h4 className="font-bold text-white mb-2">Course Syllabus & Description</h4>
												<p className="text-gray-300 leading-relaxed">{selectedCourse.syllabus || "No syllabus described yet."}</p>
											</div>

											{/* Materials List */}
											<div className="space-y-3">
												<h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Lectures & Learning Materials</h4>
												<button
													onClick={async () => {
														if (!user) return;
														try {
															const idToken = await user.getIdToken();
															const res = await fetch(`/api/organizations/${org.id}/courses/${selectedCourse.id}/materials`, {
																headers: { Authorization: `Bearer ${idToken}` },
															});
															const data = await res.json();
															if (data.success) setCourseMaterials(data.materials || []);
														} catch (err: any) {
															triggerFeedback("error", err.message);
														}
													}}
													className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded text-[10px] transition font-bold"
												>
													🔄 Refresh Materials
												</button>

												<div className="space-y-2">
													{courseMaterials.map((mat) => (
														<a
															key={mat.id}
															href={mat.url}
															target="_blank"
															rel="noreferrer"
															className="bg-dark-layer-1 border border-gray-850 p-3 rounded-lg flex items-center justify-between hover:border-gray-700 transition cursor-pointer"
														>
															<div>
																<p className="font-bold text-white text-xs">{mat.title}</p>
																<p className="text-[9px] text-gray-500 font-mono mt-0.5">Type: {mat.type.toUpperCase()}</p>
															</div>
															<FaDownload className="text-gray-500" size={12} />
														</a>
													))}

													{courseMaterials.length === 0 && (
														<p className="text-[10px] text-gray-500 italic py-4 text-center">No learning materials uploaded yet.</p>
													)}
												</div>
											</div>
										</div>

										{/* Right: Gradebook / Student Records */}
										<div className="md:col-span-1 space-y-4">
											<div className="bg-dark-layer-1 border border-gray-850 p-4 rounded-lg space-y-4">
												<div className="flex justify-between items-center border-b border-gray-800 pb-2">
													<h4 className="font-bold text-white text-[10px] uppercase tracking-wider">Class Gradebook</h4>
													<button
														onClick={() => handleExportGradebook(selectedCourse.id)}
														className="text-brand-orange hover:underline text-[9px] font-bold"
													>
														Export CSV
													</button>
												</div>

												<button
													onClick={async () => {
														if (!user) return;
														try {
															const idToken = await user.getIdToken();
															const res = await fetch(`/api/organizations/${org.id}/courses/${selectedCourse.id}/gradebook`, {
																headers: { Authorization: `Bearer ${idToken}` },
															});
															const data = await res.json();
															if (data.success) {
																setGradebook(data.gradebook || []);
															} else {
																triggerFeedback("error", data.error);
															}
														} catch (err: any) {
															triggerFeedback("error", err.message);
														}
													}}
													className="w-full bg-dark-fill-3 hover:bg-dark-fill-2 text-white py-1.5 rounded text-[10px] transition font-bold"
												>
													📊 Load Gradebook / Roster
												</button>

												<div className="space-y-3 pt-2">
													{gradebook.map((record) => (
														<div key={record.uid} className="border-b border-gray-850 pb-2 space-y-1">
															<div className="flex justify-between items-center">
																<span className="font-bold text-white text-[11px] truncate max-w-[120px]">{record.displayName}</span>
																<span className="font-bold text-brand-orange text-xs">{record.finalGrade}</span>
															</div>
															<p className="text-[9px] text-gray-500 font-mono">UID: {record.uid.substring(0, 10)}...</p>

															{(userRole === "owner" || userRole === "admin") && (
																<div className="flex gap-1.5 pt-1">
																	<input
																		type="text"
																		placeholder="Grade (e.g. A+)"
																		autoComplete="off"
																		autoCorrect="off"
																		autoCapitalize="off"
																		spellCheck={false}
																		className="w-16 bg-dark-layer-2 border border-gray-850 text-[9px] rounded p-1 text-white"
																		onKeyDown={(e) => {
																			if (e.key === "Enter") {
																				handleUpdateGrade(selectedCourse.id, record.uid, (e.target as any).value, record.attendanceCount);
																			}
																		}}
																	/>
																	<input
																		type="number"
																		placeholder="Att"
																		autoComplete="off"
																		autoCorrect="off"
																		autoCapitalize="off"
																		spellCheck={false}
																		className="w-12 bg-dark-layer-2 border border-gray-850 text-[9px] rounded p-1 text-white"
																		onKeyDown={(e) => {
																			if (e.key === "Enter") {
																				handleUpdateGrade(selectedCourse.id, record.uid, record.finalGrade, parseInt((e.target as any).value, 10));
																			}
																		}}
																	/>
																</div>
															)}
														</div>
													))}
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="space-y-6">
									{(userRole === "owner" || userRole === "admin") && (
										<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
											<h3 className="font-bold text-white text-xs">Create New Course Directory</h3>
											<form onSubmit={handleCreateCourse} className="space-y-4">
												<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
													<div>
														<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Course Code</label>
														<input
															type="text"
															placeholder="CS106B..."
															value={newCourseCode}
															onChange={(e) => setNewCourseCode(e.target.value)}
															autoComplete="off"
															autoCorrect="off"
															autoCapitalize="off"
															spellCheck={false}
															className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
															required
														/>
													</div>
													<div>
														<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Course Title</label>
														<input
															type="text"
															placeholder="Data Structures..."
															value={newCourseTitle}
															onChange={(e) => setNewCourseTitle(e.target.value)}
															autoComplete="off"
															autoCorrect="off"
															autoCapitalize="off"
															spellCheck={false}
															className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
															required
														/>
													</div>
													<div>
														<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Semester</label>
														<input
															type="text"
															placeholder="Spring 2027..."
															value={newCourseSemester}
															onChange={(e) => setNewCourseSemester(e.target.value)}
															autoComplete="off"
															autoCorrect="off"
															autoCapitalize="off"
															spellCheck={false}
															className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
															required
														/>
													</div>
												</div>

												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Syllabus Markdown</label>
													<textarea
														placeholder="Enter syllabus details..."
														value={newCourseSyllabus}
														onChange={(e) => setNewCourseSyllabus(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
													/>
												</div>

												<button
													type="submit"
													disabled={actionLoading}
													className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
													style={{ color: "var(--bg-base)" }}
												>
													{actionLoading ? "Adding..." : "Add Course"}
												</button>
											</form>
										</div>
									)}

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{courses.map((course) => (
											<div
												key={course.id}
												onClick={() => setSelectedCourse(course)}
												className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl hover:border-brand-orange transition cursor-pointer flex justify-between items-center"
											>
												<div>
													<span className="bg-brand-orange/20 text-brand-orange text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">
														{course.code}
													</span>
													<h4 className="font-bold text-white text-xs mt-2">{course.title}</h4>
													<p className="text-[10px] text-gray-500 mt-1">Semester: {course.semester}</p>
												</div>
												<FaChevronRight className="text-gray-600 shrink-0" size={14} />
											</div>
										))}

										{courses.length === 0 && (
											<p className="text-xs text-gray-500 italic py-6 text-center col-span-2">No courses registered in this academy.</p>
										)}
									</div>
								</div>
							)}
						</div>
					)}

					{/* MY BEASTCODE RESUME TAB */}
					{tab === "resume" && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center border-b border-gray-850 pb-4">
								<div>
									<h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
										<FaIdCard className="text-brand-orange" /> Verified BeastCode Resume
									</h2>
									<p className="text-xs text-gray-500">Your profile score is calculated dynamically based on verified platform accomplishments and resume details.</p>
								</div>
								{userResume && (
									<div className="text-right">
										<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Auto Profile Score</p>
										<div className="inline-flex items-center gap-1.5 mt-1 bg-emerald-600/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
											<span className="text-emerald-500 font-extrabold text-sm font-mono">{userResume.autoProfileScore || 0}</span>
											<span className="text-[10px] text-emerald-600">/ 100</span>
										</div>
									</div>
								)}
							</div>

							<form onSubmit={handleSaveResume} className="space-y-6">
								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
									<h3 className="font-bold text-white text-xs border-b border-gray-800 pb-2">Skills & Programming Tech Stack</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Key Professional Skills (comma separated)</label>
											<input
												type="text"
												placeholder="React, Next.js, Node.js, GraphQL, PostgreSQL"
												value={userResume?.skills?.join(", ") || ""}
												onChange={(e) => {
													const arr = e.target.value.split(",").map((s) => s.trim());
													setUserResume({ ...userResume, skills: arr });
												}}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
											/>
										</div>
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Programming Languages (comma separated)</label>
											<input
												type="text"
												placeholder="TypeScript, Python, Go, C++, Rust"
												value={userResume?.programmingLanguages?.join(", ") || ""}
												onChange={(e) => {
													const arr = e.target.value.split(",").map((s) => s.trim());
													setUserResume({ ...userResume, programmingLanguages: arr });
												}}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition"
											/>
										</div>
									</div>
								</div>

								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
									<h3 className="font-bold text-white text-xs border-b border-gray-800 pb-2">Experience & Career History</h3>
									<textarea
										placeholder="Describe your current and previous professional engineering roles..."
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-24"
										value={userResume?.experienceDescription || ""}
										onChange={(e) => setUserResume({ ...userResume, experienceDescription: e.target.value })}
									/>
								</div>

								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl space-y-4">
									<h3 className="font-bold text-white text-xs border-b border-gray-800 pb-2">Academic Credentials</h3>
									<textarea
										placeholder="School name, major, degree, graduation year..."
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-1 border border-gray-850 text-xs rounded-xl p-3 text-white outline-none focus:border-brand-orange transition h-20"
										value={userResume?.educationDescription || ""}
										onChange={(e) => setUserResume({ ...userResume, educationDescription: e.target.value })}
									/>
								</div>

								<button
									type="submit"
									disabled={actionLoading}
									className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-6 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
									style={{ color: "var(--bg-base)" }}
								>
									{actionLoading ? "Calculating Score & Saving..." : "Update Resume & Compute Score"}
								</button>
							</form>
						</div>
					)}

					{/* PRIVATE PROBLEMS TAB (PRIVATE GYM) */}
					{tab === "private-problems" && (
						<div className="space-y-6 animate-fade-in text-xs">
							{selectedPrivateProblem ? (
								<div className="bg-dark-layer-2 border border-gray-800 p-6 rounded-xl space-y-6">
									<div className="flex justify-between items-center border-b border-gray-800 pb-4">
										<div>
											<h3 className="text-sm font-bold text-white flex items-center gap-2">
												⚙️ {selectedPrivateProblem.title}
												<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-850 text-gray-400">
													v{selectedPrivateProblem.version}
												</span>
											</h3>
											<p className="text-[10px] text-gray-500 font-mono mt-1">ID: {selectedPrivateProblem.id} | Author: {selectedPrivateProblem.authorUid}</p>
										</div>
										<button
											onClick={() => setSelectedPrivateProblem(null)}
											className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
										>
											← Back to Gym
										</button>
									</div>

									{/* Problem Configuration Spec Form */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="space-y-4">
											<h4 className="font-bold text-white border-b border-gray-800 pb-1 text-xs">Problem Spec & Metadata</h4>
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Description Markdown
												</label>
												<textarea
													value={selectedPrivateProblem.description}
													onChange={(e) => setSelectedPrivateProblem({ ...selectedPrivateProblem, description: e.target.value })}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-800 focus:border-brand-orange text-xs rounded-lg p-3 text-white outline-none transition h-32"
												/>
											</div>

											<div className="grid grid-cols-2 gap-3">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
														Difficulty
													</label>
													<BeastCodeSelect
														options={[
															{ value: "Easy", label: "Easy" },
															{ value: "Medium", label: "Medium" },
															{ value: "Hard", label: "Hard" }
														]}
														value={selectedPrivateProblem.difficulty}
														onChange={(val) => setSelectedPrivateProblem({ ...selectedPrivateProblem, difficulty: val })}
														size="sm"
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
														Review Workflow Status
													</label>
													<BeastCodeSelect
														options={[
															{ value: "draft", label: "Draft" },
															{ value: "internal_review", label: "Internal Review" },
															{ value: "testing", label: "Testing" },
															{ value: "approved", label: "Approved" },
															{ value: "published", label: "Published" },
															{ value: "archived", label: "Archived" }
														]}
														value={selectedPrivateProblem.reviewStatus}
														onChange={(val) => setSelectedPrivateProblem({ ...selectedPrivateProblem, reviewStatus: val })}
														size="sm"
													/>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-3">
												<div>
													<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
														Visibility
													</label>
													<BeastCodeSelect
														options={[
															{ value: "organization", label: "Organization Members Only" },
															{ value: "contest_only", label: "Contest Only" },
															{ value: "public", label: "Public" },
															{ value: "hidden", label: "Hidden" },
															{ value: "archived", label: "Archived" }
														]}
														value={selectedPrivateProblem.visibility}
														onChange={(val) => setSelectedPrivateProblem({ ...selectedPrivateProblem, visibility: val })}
														size="sm"
													/>
												</div>
												<div className="flex items-end">
													<button
														onClick={async () => {
															setActionLoading(true);
															try {
																const idToken = await user?.getIdToken();
																const res = await fetch(`/api/organizations/${org.id}/private-problems/${selectedPrivateProblem.id}`, {
																	method: "PATCH",
																	headers: {
																		"Content-Type": "application/json",
																		Authorization: `Bearer ${idToken}`,
																	},
																	body: JSON.stringify(selectedPrivateProblem),
																});
																const data = await res.json();
																if (data.success) {
																	triggerFeedback("success", "Problem specification saved successfully!");
																	if (data.problem) {
																		setPrivateProblems((prev) =>
																			prev.map((p) => (p.id === selectedPrivateProblem.id ? data.problem : p))
																		);
																		setSelectedPrivateProblem(data.problem);
																	}
																} else {
																	triggerFeedback("error", data.error || "Failed to save spec.");
																}
															} catch (err: any) {
																triggerFeedback("error", err.message);
															} finally {
																setActionLoading(false);
															}
														}}
														className="w-full bg-brand-orange hover:bg-brand-orange-s text-bg-base py-2 rounded-lg text-xs font-bold transition"
														style={{ color: "var(--bg-base)" }}
													>
														Save Spec Changes
													</button>
												</div>
											</div>
										</div>

										<div className="space-y-4">
											<h4 className="font-bold text-white border-b border-gray-800 pb-1 text-xs">Testcase Suite & Generator Scripts</h4>
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Example Input Testcase (Single Example)
												</label>
												<textarea
													placeholder="Example inputs (e.g. 5\n1 2 3 4 5)..."
													value={inputTestExample}
													onChange={(e) => setInputTestExample(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-800 focus:border-brand-orange text-xs rounded-lg p-2 text-white outline-none font-mono transition h-14"
												/>
											</div>
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Example Output Testcase
												</label>
												<textarea
													placeholder="Example expected outputs..."
													value={outputTestExample}
													onChange={(e) => setOutputTestExample(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-800 focus:border-brand-orange text-xs rounded-lg p-2 text-white outline-none font-mono transition h-14"
												/>
											</div>
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Generator Script (Python config)
												</label>
												<textarea
													placeholder="import random\nprint(random.randint(1, 100))"
													value={generatorScript}
													onChange={(e) => setGeneratorScript(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-1 border border-gray-800 focus:border-brand-orange text-xs rounded-lg p-2 text-white outline-none font-mono transition h-16"
												/>
											</div>
											<div className="flex gap-2">
												<button
													onClick={() => handleUpdateTestcases(selectedPrivateProblem.id)}
													className="flex-1 bg-dark-fill-3 hover:bg-dark-fill-2 text-white py-2 rounded-lg text-[10px] font-bold transition"
												>
													Save Test Configs
												</button>
												<button
													onClick={() => handleGenerateRandomTests(selectedPrivateProblem.id)}
													className="flex-1 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange py-2 rounded-lg text-[10px] font-bold transition"
												>
													Run Test Generator
												</button>
											</div>

											{/* Rollback Support */}
											<div className="border-t border-gray-800 pt-4 mt-2">
												<h4 className="font-bold text-white text-[11px] mb-2">Version History & Rollbacks</h4>
												<div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
													{selectedPrivateProblem.versions?.map((v: any, idx: number) => (
														<div key={idx} className="flex justify-between items-center bg-dark-layer-1 p-2 rounded border border-gray-850">
															<div>
																<p className="font-bold text-white text-[10px]">v{v.version} — {v.editorName}</p>
																<p className="text-[9px] text-gray-500 italic mt-0.5">{v.summary}</p>
															</div>
															{v.version !== selectedPrivateProblem.version && (
																<button
																	onClick={() => handleRollbackVersion(selectedPrivateProblem.id, v.version)}
																	className="text-brand-orange hover:text-brand-orange-s text-[9px] font-bold transition"
																>
																	Restore v{v.version}
																</button>
															)}
														</div>
													))}
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								<>
									<div className="flex justify-between items-center gap-4">
										<h2 className="text-base font-bold text-white">Private Gym Problem Library</h2>
										{hasPerm("organization.createProblem") && (
											<button
												onClick={() => {
													document.getElementById("priv-prob-form")?.scrollIntoView({ behavior: "smooth" });
												}}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												<FaPlus /> Compose Draft Problem
											</button>
										)}
									</div>

									<div className="relative">
										<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
											<FaSearch size={11} />
										</span>
										<input
											type="text"
											placeholder="Search private gym problemset..."
											value={privateProblemSearch}
											onChange={(e) => setPrivateProblemSearch(e.target.value)}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="bg-dark-layer-2 border border-gray-850 text-xs rounded-lg pl-8 pr-3 py-2 w-full outline-none focus:border-brand-orange mb-4"
										/>
									</div>

									{privateProblems.length === 0 ? (
										<p className="text-xs text-gray-500 italic py-6 text-center">No exclusive private problems uploaded yet.</p>
									) : (
										<div className="overflow-x-auto border border-gray-850 rounded-xl">
											<table className="w-full text-left text-xs text-gray-300">
												<thead>
													<tr className="bg-dark-layer-1 border-b border-gray-850">
														<th className="px-5 py-3">Problem Title</th>
														<th className="px-5 py-3">Difficulty</th>
														<th className="px-5 py-3">Visibility</th>
														<th className="px-5 py-3">Review Status</th>
														<th className="px-5 py-3 text-right">Actions</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-850">
													{privateProblems
														.filter((p) => p.title?.toLowerCase().includes(privateProblemSearch.toLowerCase()))
														.map((p) => (
															<tr key={p.id} className="hover:bg-dark-fill-3 transition">
																<td className="px-5 py-3">
																	<span
																		onClick={() => setSelectedPrivateProblem(p)}
																		className="font-bold text-white hover:text-brand-orange cursor-pointer transition"
																	>
																		{p.title}
																	</span>
																	<p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {p.id} | version: v{p.version}</p>
																</td>
																<td className="px-5 py-3">
																	<span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-dark-layer-2 text-gray-400">
																		{p.difficulty}
																	</span>
																</td>
																<td className="px-5 py-3 capitalize text-gray-400 font-semibold">{p.visibility}</td>
																<td className="px-5 py-3 uppercase text-brand-orange font-bold text-[9px] tracking-wide">{p.reviewStatus || "draft"}</td>
																<td className="px-5 py-3 text-right">
																	<button
																		onClick={() => setSelectedPrivateProblem(p)}
																		className="text-[10px] font-extrabold text-brand-orange hover:text-brand-orange-s transition cursor-pointer"
																	>
																		Manage Spec / Tests
																	</button>
																</td>
															</tr>
														))}
												</tbody>
											</table>
										</div>
									)}

									{hasPerm("organization.createProblem") && (
										<div id="priv-prob-form" className="border-t border-gray-850 pt-6">
											<h3 className="text-xs font-bold text-white mb-4">Compose Draft Problem</h3>
											<form onSubmit={handleCreatePrivateProblem} className="space-y-4">
												<div>
													<input
														type="text"
														placeholder="Problem Title..."
														value={newPrivateProblemTitle}
														onChange={(e) => setNewPrivateProblemTitle(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
														required
													/>
												</div>
												<div>
													<textarea
														placeholder="Write problem statement in Markdown format..."
														value={newPrivateProblemDesc}
														onChange={(e) => setNewPrivateProblemDesc(e.target.value)}
														autoComplete="off"
														autoCorrect="off"
														autoCapitalize="off"
														spellCheck={false}
														className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition h-24"
														required
													/>
												</div>
												<div className="flex items-center justify-between">
													<BeastCodeSelect
														options={[
															{ value: "Easy", label: "Easy" },
															{ value: "Medium", label: "Medium" },
															{ value: "Hard", label: "Hard" }
														]}
														value={newPrivateProblemDifficulty}
														onChange={(val) => setNewPrivateProblemDifficulty(val)}
														size="sm"
														className="w-32"
													/>
													<button
														type="submit"
														disabled={actionLoading}
														className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
														style={{ color: "var(--bg-base)" }}
													>
														Initialize Draft Problem
													</button>
												</div>
											</form>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{/* COMPETITOR TEAMS TAB */}
					{tab === "teams" && (
						<div className="space-y-6 animate-fade-in text-xs">
							{selectedTeam ? (
								<div className="bg-dark-layer-2 border border-gray-800 p-6 rounded-xl space-y-6">
									<div className="flex justify-between items-center border-b border-gray-800 pb-4">
										<div>
											<h3 className="text-sm font-bold text-white">🏆 Team: {selectedTeam.name}</h3>
											<p className="text-[10px] text-gray-500 font-mono mt-1">Captain UID: {selectedTeam.captainUid} | Rating: {selectedTeam.rating}</p>
										</div>
										<button
											onClick={() => setSelectedTeam(null)}
											className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
										>
											← Back to Teams
										</button>
									</div>

									<div>
										<h4 className="font-bold text-white text-xs mb-3">Team Members ({selectedTeam.members?.length || 0})</h4>
										<div className="space-y-2">
											{selectedTeam.members?.map((memberUid: string, idx: number) => (
												<div key={idx} className="flex justify-between items-center bg-dark-layer-1 p-3 rounded border border-gray-850">
													<span className="font-mono text-gray-400">{memberUid} {memberUid === selectedTeam.captainUid && <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs ml-2"><FaCrown size={12} /> (Captain)</span>}</span>
													<div className="flex items-center gap-2">
														{selectedTeam.captainUid === user?.uid && memberUid !== user?.uid && (
															<>
																<button
																	onClick={async () => {
																		if (!confirm("Transfer captain role to this user?")) return;
																		try {
																			const idToken = await user?.getIdToken();
																			const res = await fetch(`/api/organizations/${org.id}/teams/${selectedTeam.id}`, {
																				method: "PATCH",
																				headers: {
																					"Content-Type": "application/json",
																					Authorization: `Bearer ${idToken}`,
																				},
																				body: JSON.stringify({ action: "transfer_captain", targetUid: memberUid }),
																			});
																			const data = await res.json();
																			if (data.success) {
																				triggerFeedback("success", "Captain status transferred!");
																				setSelectedTeam(data.team);
																				if (data.team) {
																					setTeams((prev) =>
																						prev.map((t) => (t.id === selectedTeam.id ? data.team : t))
																					);
																				}
																			} else {
																				triggerFeedback("error", data.error || "Failed to transfer captain.");
																			}
																		} catch (err: any) {
																			triggerFeedback("error", err.message);
																		}
																	}}
																	className="text-yellow-500 hover:text-yellow-400 font-semibold"
																>
																	Make Captain
																</button>
																<button
																	onClick={async () => {
																		if (!confirm("Kick this member from the team?")) return;
																		try {
																			const idToken = await user?.getIdToken();
																			const res = await fetch(`/api/organizations/${org.id}/teams/${selectedTeam.id}`, {
																				method: "PATCH",
																				headers: {
																					"Content-Type": "application/json",
																					Authorization: `Bearer ${idToken}`,
																				},
																				body: JSON.stringify({ action: "kick_member", targetUid: memberUid }),
																			});
																			const data = await res.json();
																			if (data.success) {
																				triggerFeedback("success", "Member kicked!");
																				setSelectedTeam(data.team);
																				if (data.team) {
																					setTeams((prev) =>
																						prev.map((t) => (t.id === selectedTeam.id ? data.team : t))
																					);
																				}
																			} else {
																				triggerFeedback("error", data.error || "Failed to kick member.");
																			}
																		} catch (err: any) {
																			triggerFeedback("error", err.message);
																		}
																	}}
																	className="text-red-500 hover:text-red-400 font-semibold"
																>
																	Kick
																</button>
															</>
														)}
													</div>
												</div>
											))}
										</div>
									</div>

									{selectedTeam.captainUid === user?.uid && (
										<div className="flex gap-3 pt-4 border-t border-gray-800">
											<input
												type="text"
												placeholder="Invite User UID..."
												id="team-invite-uid"
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="bg-dark-layer-1 border border-gray-800 text-xs rounded-lg px-3 py-2 outline-none w-52 focus:border-brand-orange"
											/>
											<button
												onClick={async () => {
													const el = document.getElementById("team-invite-uid") as HTMLInputElement;
													const inviteUid = el?.value;
													if (!inviteUid) return;
													try {
														const idToken = await user?.getIdToken();
														const res = await fetch(`/api/organizations/${org.id}/teams/${selectedTeam.id}`, {
															method: "PATCH",
															headers: {
																"Content-Type": "application/json",
																Authorization: `Bearer ${idToken}`,
															},
															body: JSON.stringify({ action: "add_member", targetUid: inviteUid }),
														});
														const data = await res.json();
														if (data.success) {
															triggerFeedback("success", "Member added to team!");
															setSelectedTeam(data.team);
															if (data.team) {
																setTeams((prev) =>
																	prev.map((t) => (t.id === selectedTeam.id ? data.team : t))
																);
															}
															el.value = "";
														} else {
															triggerFeedback("error", data.error || "Failed to add member.");
														}
													} catch (err: any) {
														triggerFeedback("error", err.message);
													}
												}}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-lg text-xs font-bold transition"
												style={{ color: "var(--bg-base)" }}
											>
												Add Member
											</button>
										</div>
									)}
								</div>
							) : (
								<>
									<div className="flex justify-between items-center gap-4">
										<h2 className="text-base font-bold text-white">Competitor Teams</h2>
										{hasPerm("organization.manageTeams") && (
											<button
												onClick={() => {
													document.getElementById("new-team-form")?.scrollIntoView({ behavior: "smooth" });
												}}
												className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
												style={{ color: "var(--bg-base)" }}
											>
												<FaPlus /> Create Team
											</button>
										)}
									</div>

									{teams.length === 0 ? (
										<p className="text-xs text-gray-500 italic py-6 text-center">No competitor teams built yet inside this organization.</p>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{teams.map((t) => (
												<div
													key={t.id}
													className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl flex flex-col justify-between hover:border-gray-800 transition cursor-pointer"
													onClick={() => setSelectedTeam(t)}
												>
													<div>
														<h3 className="font-bold text-white text-xs">🏆 Team: {t.name}</h3>
														<p className="text-[10px] text-gray-500 font-mono mt-1">Captain UID: {t.captainUid}</p>
														<div className="flex items-center gap-3 text-xs text-gray-400 mt-4">
															<span>{t.members?.length || 0} Members</span>
															<span className="text-yellow-500">Rating: {t.rating || 1500}</span>
														</div>
													</div>
													<div className="flex justify-end items-center mt-5 border-t border-gray-800 pt-3">
														<span className="text-[10px] font-extrabold text-brand-orange hover:text-brand-orange-s transition cursor-pointer">
															View Details & Invite →
														</span>
													</div>
												</div>
											))}
										</div>
									)}

									{hasPerm("organization.manageTeams") && (
										<div id="new-team-form" className="border-t border-gray-850 pt-6">
											<h3 className="text-xs font-bold text-white mb-4">Create Competitor Team</h3>
											<form onSubmit={handleCreateTeam} className="flex gap-3">
												<input
													type="text"
													placeholder="Competitor Team Name..."
													value={newTeamName}
													onChange={(e) => setNewTeamName(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl px-4 py-3 text-white outline-none w-72 transition"
													required
												/>
												<button
													type="submit"
													disabled={actionLoading}
													className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
													style={{ color: "var(--bg-base)" }}
												>
													Build Team
												</button>
											</form>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{/* TRAINING ROADMAPS TAB */}
					{tab === "roadmaps" && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Roadmaps & Syllabus Syllabus</h2>
								{hasPerm("organization.createRoadmap") && (
									<button
										onClick={() => {
											document.getElementById("roadmap-form-target")?.scrollIntoView({ behavior: "smooth" });
										}}
										className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
										style={{ color: "var(--bg-base)" }}
									>
										<FaPlus /> Build Learning Path
									</button>
								)}
							</div>

							{roadmaps.length === 0 ? (
								<p className="text-xs text-gray-500 italic py-6 text-center">No learning roadmaps published yet.</p>
							) : (
								<div className="space-y-6">
									{roadmaps.map((r) => (
										<div key={r.id} className="bg-dark-layer-2 border border-gray-800 p-5 rounded-xl space-y-4">
											<div>
												<h3 className="font-bold text-white text-xs flex items-center gap-2">
													📚 {r.title}
												</h3>
												<p className="text-xs text-gray-400 mt-1">{r.description}</p>
											</div>

											{/* Modules Timeline */}
											<div className="border-l-2 border-brand-orange/30 pl-4 space-y-4 font-sans ml-2">
												{r.modules?.map((m: any, idx: number) => (
													<div key={idx} className="relative">
														<div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-brand-orange" />
														<h4 className="font-bold text-white text-[11px]">Week {m.weekNumber}: {m.title}</h4>
														
														{/* Problems List */}
														<div className="flex gap-2 flex-wrap mt-2">
															{m.problemIds?.map((pid: string) => (
																<span key={pid} className="bg-dark-layer-1 border border-gray-850 px-2.5 py-0.5 rounded font-mono text-[9px] text-gray-400">
																	Problem: {pid}
																</span>
															))}
														</div>

														{/* Materials Checklist */}
														<div className="mt-2 space-y-1">
															{m.materials?.map((mat: any, idx: number) => (
																<div key={idx} className="text-[10px] text-gray-500 flex items-center gap-1">
																	<span>📄 {mat.title}</span>
																	<a href={mat.url} target="_blank" rel="noreferrer" className="text-brand-orange hover:underline font-mono">({mat.type})</a>
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}

							{hasPerm("organization.createRoadmap") && (
								<div id="roadmap-form-target" className="border-t border-gray-850 pt-6">
									<h3 className="text-xs font-bold text-white mb-4">Build Structured Roadmap</h3>
									<form onSubmit={handleCreateRoadmap} className="space-y-4">
										<div>
											<input
												type="text"
												placeholder="Roadmap Title (e.g. 5-Week Binary Search Camp)..."
												value={newRoadmapTitle}
												onChange={(e) => setNewRoadmapTitle(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
										</div>
										<div>
											<textarea
												placeholder="Describe target audience and syllabus learning objectives..."
												value={newRoadmapDesc}
												onChange={(e) => setNewRoadmapDesc(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition h-20"
												required
											/>
										</div>
										<button
											type="submit"
											disabled={actionLoading}
											className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-6 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
											style={{ color: "var(--bg-base)" }}
										>
											Publish Learning Path
										</button>
									</form>
								</div>
							)}
						</div>
					)}

					{/* HOMEWORK & ASSIGNMENTS TAB */}
					{tab === "assignments" && (
						<div className="space-y-6 animate-fade-in text-xs">
							<div className="flex justify-between items-center gap-4">
								<h2 className="text-base font-bold text-white">Homework & Tasks</h2>
								{hasPerm("organization.assignHomework") && (
									<button
										onClick={() => {
											document.getElementById("assign-form-target")?.scrollIntoView({ behavior: "smooth" });
										}}
										className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
										style={{ color: "var(--bg-base)" }}
									>
										<FaPlus /> Distribute Assignment
									</button>
								)}
							</div>

							{assignments.length === 0 ? (
								<p className="text-xs text-gray-500 italic py-6 text-center">No homework assignments active.</p>
							) : (
								<div className="space-y-4">
									{assignments.map((a) => (
										<div key={a.id} className="bg-dark-layer-2 border border-gray-800 p-5 rounded-xl relative">
											<div className="flex justify-between items-start">
												<div>
													<h3 className="font-bold text-white text-xs">📝 {a.title}</h3>
													<p className="text-xs text-gray-400 mt-1">{a.description}</p>
													<div className="flex gap-2 flex-wrap mt-3">
														{a.problemIds?.map((pid: string) => (
															<span key={pid} className="bg-dark-layer-1 border border-gray-850 px-2 py-0.5 rounded font-mono text-[9px] text-brand-orange">
																{pid}
															</span>
														))}
													</div>
												</div>
												<div className="text-right">
													<span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-gray-850 text-gray-400 border border-gray-800">
														Assignee: {a.assigneeType}
													</span>
													<p className="text-[10px] text-gray-500 mt-2">
														Deadline: {new Date(a.closeDate).toLocaleDateString()}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							)}

							{hasPerm("organization.assignHomework") && (
								<div id="assign-form-target" className="border-t border-gray-850 pt-6">
									<h3 className="text-xs font-bold text-white mb-4">Distribute Homework Assignment</h3>
									<form onSubmit={handleCreateAssignment} className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<input
												type="text"
												placeholder="Assignment Title..."
												value={newAssignmentTitle}
												onChange={(e) => setNewAssignmentTitle(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
											<input
												type="text"
												placeholder="Problem IDs (comma separated, e.g. two-sum, contains-duplicate)..."
												value={newAssignmentProblems}
												onChange={(e) => setNewAssignmentProblems(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												required
											/>
										</div>
										<div>
											<textarea
												placeholder="Write homework assignment description instructions..."
												value={newAssignmentDesc}
												onChange={(e) => setNewAssignmentDesc(e.target.value)}
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition h-20"
												required
											/>
										</div>
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Assignee Scope
												</label>
												<BeastCodeSelect
													options={[
														{ value: "all", label: "All Members" },
														{ value: "teams", label: "Specific Competitor Teams" },
														{ value: "members", label: "Specific Members UIDs" }
													]}
													value={newAssignmentType}
													onChange={(val) => setNewAssignmentType(val as "all" | "members" | "teams")}
													size="sm"
												/>
											</div>
											<div>
												<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
													Assignee IDs (comma separated UIDs / Team IDs)
												</label>
												<input
													type="text"
													placeholder="Leave empty if 'All Members'..."
													value={newAssignmentAssigneeIds}
													onChange={(e) => setNewAssignmentAssigneeIds(e.target.value)}
													autoComplete="off"
													autoCorrect="off"
													autoCapitalize="off"
													spellCheck={false}
													className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
												/>
											</div>
											<div className="flex items-end">
												<button
													type="submit"
													disabled={actionLoading}
													className="w-full bg-brand-orange hover:bg-brand-orange-s text-bg-base py-3 rounded-xl text-xs font-bold transition cursor-pointer"
													style={{ color: "var(--bg-base)" }}
												>
													Distribute Assignment Task
												</button>
											</div>
										</div>
									</form>
								</div>
							)}
						</div>
					)}

					{/* ANALYTICS TAB */}
					{tab === "analytics" && hasPerm("organization.viewAnalytics") && analytics && (
						<div className="space-y-6 animate-fade-in">
							<h2 className="text-base font-bold text-white">Performance Analytics Dashboard</h2>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl">
									<h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Average Rating</h4>
									<p className="text-3xl font-mono font-extrabold text-brand-orange mt-2">
										{analytics.averageRating ?? 1500}
									</p>
								</div>
								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl">
									<h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Average Solved Problems</h4>
									<p className="text-3xl font-mono font-extrabold text-brand-orange mt-2">
										{analytics.averageSolved ?? 0}
									</p>
								</div>
								<div className="bg-dark-layer-2 border border-gray-850 p-5 rounded-xl">
									<h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Workspace Members</h4>
									<p className="text-3xl font-mono font-extrabold text-brand-orange mt-2">
										{analytics.totalMembersCount ?? org.memberCount}
									</p>
								</div>
							</div>

							<div className="border border-gray-850 rounded-xl p-5 bg-dark-layer-2/30">
								<h3 className="text-xs font-bold text-white mb-3">Participation Trends</h3>
								<div className="h-32 flex items-end gap-2 pt-4">
									<div className="flex-1 bg-dark-fill-3 h-[40%] rounded" title="Month 1"></div>
									<div className="flex-1 bg-dark-fill-3 h-[55%] rounded" title="Month 2"></div>
									<div className="flex-1 bg-dark-fill-2 h-[75%] rounded" title="Month 3"></div>
									<div className="flex-1 bg-brand-orange/40 h-[60%] rounded" title="Month 4"></div>
									<div className="flex-1 bg-brand-orange h-[90%] rounded animate-pulse" title="Current Month"></div>
								</div>
								<div className="flex justify-between text-[9px] text-gray-500 mt-2 font-mono">
									<span>Feb</span>
									<span>Mar</span>
									<span>Apr</span>
									<span>May</span>
									<span>Jun/Jul</span>
								</div>
							</div>
						</div>
					)}

					{/* AUDIT LOGS TAB */}
					{tab === "audit-logs" && hasPerm("organization.viewAuditLogs") && (
						<div className="space-y-6 animate-fade-in">
							<h2 className="text-base font-bold text-white">Immutable Security Audit Trails</h2>
							<p className="text-xs text-gray-500">Security history of operations performed on workspace collections.</p>

							<div className="overflow-x-auto border border-gray-850 rounded-xl">
								<table className="w-full text-left text-xs text-gray-300">
									<thead>
										<tr className="bg-dark-layer-1 border-b border-gray-850">
											<th className="px-5 py-3 w-44">Date & Time</th>
											<th className="px-5 py-3">Actor</th>
											<th className="px-5 py-3">Operation</th>
											<th className="px-5 py-3">Event Details</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-850">
										{auditLogs.map((l, idx) => (
											<tr key={idx} className="hover:bg-dark-fill-3 transition">
												<td className="px-5 py-3 font-mono text-gray-400">
													{new Date(l.timestamp).toLocaleString()}
												</td>
												<td className="px-5 py-3 font-bold text-white">{l.actorName || l.actorUid}</td>
												<td className="px-5 py-3 font-semibold text-brand-orange uppercase">
													{l.action}
												</td>
												<td className="px-5 py-3 text-gray-400 font-mono truncate max-w-[200px]" title={JSON.stringify(l.details)}>
													{l.details ? JSON.stringify(l.details) : `ID: ${l.resourceId}`}
												</td>
											</tr>
										))}

										{auditLogs.length === 0 && (
											<tr>
												<td colSpan={4} className="text-center py-6 text-gray-500 italic">No audit records found.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* SETTINGS TAB */}
					{tab === "settings" && hasPerm("organization.manageSettings") && (
						<form onSubmit={handleUpdateSettings} className="space-y-6 animate-fade-in">
							<h2 className="text-base font-bold text-white">Workspace Configuration</h2>

							<div className="space-y-4">
								{/* Organization Avatar Section */}
								<div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-lg bg-dark-layer-2 border border-gray-850 hover:border-gray-800 transition">
									<div className="relative group cursor-pointer w-24 h-24 shrink-0" onClick={() => avatarInputRef.current?.click()}>
										<OrganizationAvatar
											src={avatarPreview}
											name={org.name}
											size="xl"
											className="border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10 group-hover:scale-[1.02] transition duration-300"
										/>
										<div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
											<FaCamera size={20} className="text-white" />
										</div>
									</div>

									<div className="flex-1 text-center md:text-left space-y-2">
										<h3 className="text-sm font-bold text-white">Organization Logo / Avatar</h3>
										<p className="text-xs text-gray-500">
											Customize your workspace&apos;s identity. Supports PNG, JPG, JPEG, or WEBP (Max 5MB).
										</p>
										<div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
											<button
												type="button"
												onClick={() => avatarInputRef.current?.click()}
												className="bg-dark-fill-3 hover:bg-dark-fill-2 text-white border border-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
											>
												Choose Image
											</button>
											{avatarBase64 && (
												<button
													type="button"
													onClick={handleUploadAvatar}
													disabled={actionLoading}
													className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
													style={{ color: "var(--bg-base)" }}
												>
													Save Avatar
												</button>
											)}
											{(org.avatarUrl || org.avatar) && (
												<button
													type="button"
													onClick={handleRemoveAvatar}
													disabled={actionLoading}
													className="bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
								>
									Remove Avatar
								</button>
											)}
										</div>
										<input
											ref={avatarInputRef}
											type="file"
											accept="image/png, image/jpg, image/jpeg, image/webp"
											className="hidden"
											onChange={handleAvatarChange}
										/>
									</div>
								</div>
								<div>
									<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
										Workspace Display Name
									</label>
									<input
										type="text"
										value={org.name}
										onChange={(e) => setOrg({ ...org, name: e.target.value })}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
										required
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
											Workspace Visibility
										</label>
										<BeastCodeSelect
											options={[
												{ value: "public", label: "Public" },
												{ value: "private", label: "Private" },
												{ value: "secret", label: "Secret" }
											]}
											value={org.visibility}
											onChange={(val) => setOrg({ ...org, visibility: val })}
											size="sm"
										/>
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
											Recruitment applications Status
										</label>
										<BeastCodeSelect
											options={[
												{ value: "open", label: "Open" },
												{ value: "closed", label: "Closed" }
											]}
											value={org.recruitmentStatus}
											onChange={(val) => setOrg({ ...org, recruitmentStatus: val })}
											size="sm"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
											Location
										</label>
										<input
											type="text"
											value={org.location}
											onChange={(e) => setOrg({ ...org, location: e.target.value })}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
										/>
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
											Country
										</label>
										<input
											type="text"
											value={org.country}
											onChange={(e) => setOrg({ ...org, country: e.target.value })}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
										/>
									</div>
								</div>

								<div>
									<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
										Website / Link URL
									</label>
									<input
										type="text"
										value={org.website}
										onChange={(e) => setOrg({ ...org, website: e.target.value })}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
									/>
								</div>

								<div>
									<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
										Workspace Contact Email
									</label>
									<input
										type="email"
										value={org.contactEmail}
										onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition"
									/>
								</div>

								<div>
									<label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
										About / Description
									</label>
									<textarea
										value={org.description}
										onChange={(e) => setOrg({ ...org, description: e.target.value })}
										autoComplete="off"
										autoCorrect="off"
										autoCapitalize="off"
										spellCheck={false}
										className="w-full bg-dark-layer-2 border border-gray-850 focus:border-brand-orange text-xs rounded-xl p-3 text-white outline-none transition h-24"
									/>
								</div>
							</div>

							<div className="border-t border-gray-850 pt-6 flex justify-between items-center">
								{userRole === "owner" && (
									<button
										type="button"
										onClick={handleDeleteOrg}
										disabled={actionLoading}
										className="bg-red-950 text-red-500 hover:bg-red-900 border border-red-800/40 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
									>
										Delete Organization
									</button>
								)}
								<button
									type="submit"
									disabled={actionLoading}
									className="bg-brand-orange hover:bg-brand-orange-s text-bg-base px-6 py-2.5 rounded-xl text-xs font-bold transition ml-auto cursor-pointer"
									style={{ color: "var(--bg-base)" }}
								>
									{actionLoading ? "Saving..." : "Save Workspace Changes"}
								</button>
							</div>
						</form>
					)}
				</section>
			</div>

			{/* Slide-over Member Details Drawer */}
			{selectedMember && (
				<div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-dark-surface border-l border-gray-850 shadow-2xl flex flex-col justify-between animate-slide-left">
					<div>
						{/* Header */}
						<div className="p-6 border-b border-gray-850 flex justify-between items-center bg-dark-layer-1">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-dark-layer-2 overflow-hidden flex items-center justify-center border border-gray-750">
									{selectedMember.avatarUrl ? (
										<img src={selectedMember.avatarUrl} alt={selectedMember.displayName} className="w-full h-full object-cover" />
									) : (
										<span className="text-xs font-bold text-gray-400">MB</span>
									)}
								</div>
								<div>
									<h4 className="text-xs font-bold text-white">{selectedMember.displayName || "Anonymous"}</h4>
									<p className="text-[9px] text-gray-500 font-mono mt-0.5">UID: {selectedMember.uid}</p>
								</div>
							</div>
							<button
								onClick={() => setSelectedMember(null)}
								className="text-gray-500 hover:text-white transition p-1 cursor-pointer"
							>
								<FaTimes size={14} />
							</button>
						</div>

						{/* Drawer Tabs */}
						<div className="p-4 bg-dark-layer-2">
							<div
								className="flex items-center gap-1.5 p-1 rounded-md border transition-all duration-300 w-max max-w-full"
								style={{
									backgroundColor: "var(--bg-dark-layer-1)",
									borderColor: "var(--border-subtle)",
								}}
							>
								{["overview", "submissions", "problems"].map((tabName) => {
									const isActive = drawerTab === tabName;
									return (
										<button
											key={tabName}
											onClick={() => setDrawerTab(tabName)}
											className={`px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors border select-none cursor-pointer ${
												isActive
													? "border-emerald-500/40 bg-surface text-emerald-450 font-bold"
													: "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
											}`}
										>
											{tabName}
										</button>
									);
								})}
							</div>
						</div>

						{/* Drawer Content */}
						<div className="p-6 space-y-4">
							{drawerTab === "overview" && (
								<div className="space-y-3 text-xs">
									<div className="bg-dark-layer-2 p-3 rounded-lg border border-gray-850">
										<p className="text-gray-500 font-bold uppercase text-[9px]">Department / Field</p>
										<p className="text-white mt-1 font-semibold">{selectedMember.department || "General Engineering"}</p>
									</div>
									<div className="bg-dark-layer-2 p-3 rounded-lg border border-gray-850">
										<p className="text-gray-500 font-bold uppercase text-[9px]">Workspace Role</p>
										<p className="text-white mt-1 capitalize font-semibold">{selectedMember.role}</p>
									</div>
									<div className="bg-dark-layer-2 p-3 rounded-lg border border-gray-850">
										<p className="text-gray-500 font-bold uppercase text-[9px]">Joined Workspace</p>
										<p className="text-white mt-1 font-semibold">
											{selectedMember.joinedAt ? new Date(selectedMember.joinedAt).toLocaleDateString() : "Recently"}
										</p>
									</div>
								</div>
							)}

							{drawerTab === "submissions" && (
								<div className="text-center py-8">
									<FaInfoCircle className="text-gray-500 mx-auto mb-2" size={18} />
									<p className="text-xs text-gray-400 font-semibold">No recent submissions registered.</p>
								</div>
							)}

							{drawerTab === "problems" && (
								<div className="space-y-3">
									<div className="bg-dark-layer-2 p-3 rounded-lg border border-gray-850 flex justify-between items-center">
										<span className="text-xs text-gray-400 font-semibold">Problems Solved</span>
										<span className="text-xs font-bold text-white font-mono">{selectedMember.problemsSolved ?? 0}</span>
									</div>
									<div className="bg-dark-layer-2 p-3 rounded-lg border border-gray-850 flex justify-between items-center">
										<span className="text-xs text-gray-400 font-semibold">Contest Rating Index</span>
										<span className="text-xs font-bold text-yellow-500 font-mono">{selectedMember.contestRating ?? 1500}</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Drawer Footer Actions */}
					<div className="p-6 border-t border-gray-850 bg-dark-layer-1 flex justify-end gap-3">
						<button
							onClick={() => setSelectedMember(null)}
							className="px-4 py-2 bg-dark-fill-3 hover:bg-dark-fill-2 text-xs font-semibold rounded-lg text-gray-300 cursor-pointer"
						>
							Close Profile
						</button>
						{hasPerm("organization.removeMember") && selectedMember.role !== "owner" && selectedMember.uid !== user?.uid && (
							<button
								onClick={() => {
									handleRemoveMember(selectedMember.uid);
									setSelectedMember(null);
								}}
								className="px-4 py-2 bg-red-950 text-red-500 border border-red-900/30 text-xs font-bold rounded-lg cursor-pointer"
							>
								Remove Member
							</button>
						)}
					</div>
				</div>
			)}

			{/* File Preview Modal */}
			{previewFile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
					<div className="bg-dark-layer-1 border border-gray-850 rounded-lg w-full max-w-2xl mx-4 overflow-hidden shadow-2xl animate-scale-up">
						<div className="bg-dark-surface px-6 py-4 border-b border-gray-850 flex justify-between items-center">
							<h3 className="text-xs font-bold text-white truncate max-w-md">{previewFile.filename}</h3>
							<button
								onClick={() => setPreviewFile(null)}
								className="text-gray-500 hover:text-white transition text-lg p-1"
							>
								&times;
							</button>
						</div>
						<div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
							<div className="bg-dark-layer-2 border border-gray-850 p-4 rounded-xl font-mono text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
								{previewFile.filename.endsWith(".md") || previewFile.mimeType === "text/markdown" ? (
									`# Shared Material Preview\n\nFile Name: ${previewFile.filename}\nSize: ${previewFile.size} bytes\n\nThis material is shared under the ${previewFile.visibility} visibility setting. You can access the direct storage path using the download button below.`
								) : (
									`File details and preview are loading...\n\nMimeType: ${previewFile.mimeType || "Binary"}\nDownload Count: ${previewFile.downloadCount ?? 0}\nStorage Link: ${previewFile.storagePath}`
								)}
							</div>
						</div>
						<div className="bg-bg-surface px-5 py-3 border-t border-border-default flex justify-end gap-2">
							<button
								onClick={() => setPreviewFile(null)}
								className="px-3.5 py-1.5 bg-bg-elevated hover:bg-bg-hover border border-border-default text-xs font-medium text-text-secondary rounded-md"
							>
								Close
							</button>
							<a
								href={previewFile.storagePath}
								target="_blank"
								rel="noreferrer"
								className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-bg-page text-xs font-medium rounded-md flex items-center gap-1.5"
							>
								<FaDownload size={10} /> Download File
							</a>
						</div>
					</div>
				</div>
			)}
		</AppShell>
	);
}
