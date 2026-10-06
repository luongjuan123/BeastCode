import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { EmailService } from "./emailService";
import { COLORS } from "./emailComponents";
import { getEmailHtml } from "./emailTemplate";
import { buildAbsoluteUrl } from "./siteConfig";

// ============================================================
// SCHEMAS & INTERFACES
// ============================================================

export interface Organization {
	id: string;
	slug: string;
	name: string;
	displayName: string;
	shortName: string;
	description: string;
	avatar: string;
	avatarUrl?: string;
	avatarStoragePath?: string;
	avatarUpdatedAt?: number;
	banner: string;
	bannerUrl?: string;
	organizationType: string;
	visibility: "public" | "private" | "secret";
	verified: boolean;
	website: string;
	country: string;
	city: string;
	location: string;
	email: string;
	contactPhone: string;
	socialLinks: Record<string, string>;
	memberCount: number;
	contestCount: number;
	problemCount: number;
	announcementCount: number;
	fileCount: number;
	createdBy: string;
	ownerUid: string;
	status: "active" | "suspended" | "deleted";
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
}

export interface OrganizationMember {
	organizationId: string;
	uid: string;
	roleId: string;
	nickname: string;
	title: string;
	department: string;
	status: "active" | "suspended" | "pending_invitation";
	joinedAt: number;
	joinedBy: string;
	lastActive: number;
	permissionsVersion: number;
	isHidden: boolean;
	isFavorite: boolean;
}

export interface OrganizationRole {
	id: string;
	organizationId: string;
	name: string;
	description: string;
	priority: number;
	permissions: string[];
	color: string;
	icon: string;
	editable: boolean;
	systemRole: boolean;
	createdAt: number;
}

export interface OrganizationPermissionDefinition {
	id: string;
	name: string;
	description: string;
	category: string;
}

export interface OrganizationJoinRequest {
	requestId: string;
	organizationId: string;
	uid: string;
	message: string;
	status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Expired";
	submittedAt: number;
	reviewedBy: string | null;
	reviewedAt: number | null;
	adminNote: string | null;
}

export interface OrganizationInvitation {
	inviteId: string;
	organizationId: string;
	email: string;
	uid: string | null;
	token: string;
	roleId: string;
	status: "Pending" | "Accepted" | "Declined" | "Expired";
	expiresAt: number;
	createdBy: string;
	acceptedAt: number | null;
}

export interface OrganizationAnnouncement {
	id: string;
	organizationId: string;
	title: string;
	content: string;
	markdown: string;
	attachments: string[];
	visibility: "all" | "members" | "admins";
	authorUid: string;
	isPinned: boolean;
	published: boolean;
	publishedAt: number;
	editedAt: number | null;
	deletedAt: number | null;
}

export interface OrganizationProblemVersion {
	version: number;
	editorUid: string;
	editorName: string;
	timestamp: number;
	summary: string;
}

export interface OrganizationPrivateProblem {
	id: string;
	organizationId: string;
	authorUid: string;
	editors: string[];
	reviewers: string[];
	title: string;
	description: string;
	inputFormat: string;
	outputFormat: string;
	difficulty: "Easy" | "Medium" | "Hard";
	tags: string[];
	source: string;
	visibility: "public" | "organization" | "contest_only" | "hidden" | "archived";
	reviewStatus: "draft" | "internal_review" | "testing" | "approved" | "published" | "archived";
	timeLimit: number;
	memoryLimit: number;
	version: number;
	versions: OrganizationProblemVersion[];
	examples: { input: string; output: string; explanation?: string }[];
	hiddenTests: { input: string; output: string; weight?: number }[];
	generatorScript?: string;
	validatorScript?: string;
	specialJudgeScript?: string;
	createdAt: number;
	updatedAt: number;
}

export interface OrganizationTeam {
	id: string;
	organizationId: string;
	name: string;
	captainUid: string;
	members: string[];
	logoUrl?: string;
	country: string;
	rating: number;
	createdAt: number;
}

export interface OrganizationRoadmapModule {
	weekNumber: number;
	title: string;
	problemIds: string[];
	materials: { type: "pdf" | "video" | "markdown"; title: string; url: string }[];
	assignments: { title: string; deadline: number; totalPoints: number }[];
}

export interface OrganizationTrainingRoadmap {
	id: string;
	organizationId: string;
	title: string;
	description: string;
	modules: OrganizationRoadmapModule[];
	createdBy: string;
	createdAt: number;
}

export interface OrganizationAssignment {
	id: string;
	organizationId: string;
	title: string;
	description: string;
	problemIds: string[];
	assigneeType: "all" | "teams" | "members";
	assigneeIds: string[];
	openDate: number;
	closeDate: number;
	lateSubmissionAllowed: boolean;
	latePenaltyPercentage: number;
	autoLock: boolean;
	createdAt: number;
	createdBy: string;
}

export interface OrganizationProblem {
	organizationId: string;
	problemId: string;
	visibility: "public" | "private";
	assignedBy: string;
	assignedAt: number;
	tags: string[];
	difficultyOverride?: string;
	customOrder?: number;
}

export interface OrganizationContest {
	organizationId: string;
	contestId: string;
	visibility: "public" | "private" | "password_protected" | "invite_only" | "organization_only" | "hidden";
	registrationMode: "open" | "approval_required" | "invitation_only" | "automatic" | "deadline_based";
	contestType: "training" | "official" | "mock_interview" | "homework" | "exam" | "recruitment" | "practice" | "virtual";
	published: boolean;
	assignedBy: string;
	assignedAt: number;
}

export interface OrganizationFile {
	id: string;
	organizationId: string;
	uploaderUid: string;
	filename: string;
	mimeType: string;
	storagePath: string;
	size: number;
	visibility: "public" | "members" | "admins";
	downloadCount: number;
	createdAt: number;
}

export interface OrganizationAuditLog {
	logId: string;
	organizationId: string;
	actorUid: string;
	targetUid: string | null;
	action: string;
	resource: string;
	resourceId: string;
	metadata: Record<string, any>;
	ip: string;
	timestamp: number;
}

// ============================================================
// SYSTEM ROLES & PERMISSIONS DEFINITIONS
// ============================================================

export const SYSTEM_PERMISSIONS = [
	"organization.createContest",
	"organization.deleteContest",
	"organization.createProblem",
	"organization.editProblem",
	"organization.deleteProblem",
	"organization.inviteMember",
	"organization.removeMember",
	"organization.assignRole",
	"organization.manageRoles",
	"organization.uploadFile",
	"organization.publishAnnouncement",
	"organization.manageRecruitment",
	"organization.deleteOrganization",
	"organization.manageSettings",
	"organization.viewAnalytics",
	"organization.viewAuditLogs",
	"organization.createRoadmap",
	"organization.assignHomework",
	"organization.viewInstructorMetrics",
	"organization.manageTeams",
	"organization.manageCourses",
	"organization.manageCertificates",
	"organization.issueCertificates",
];

export const SYSTEM_ROLES_TEMPLATES = [
	{
		id: "owner",
		name: "Owner",
		description: "Full workspace ownership and settings control.",
		priority: 100,
		permissions: [...SYSTEM_PERMISSIONS],
		color: "#ef4444",
		icon: "crown",
		editable: false,
		systemRole: true,
	},
	{
		id: "admin",
		name: "Admin",
		description: "Workspace managers with full operations permissions except deletion.",
		priority: 90,
		permissions: SYSTEM_PERMISSIONS.filter((p) => p !== "organization.deleteOrganization"),
		color: "#f59e0b",
		icon: "shield",
		editable: false,
		systemRole: true,
	},
	{
		id: "coach",
		name: "Coach",
		description: "Create training camp roadmaps, run contests and verify assignments.",
		priority: 85,
		permissions: [
			"organization.createContest",
			"organization.createProblem",
			"organization.editProblem",
			"organization.publishAnnouncement",
			"organization.createRoadmap",
			"organization.assignHomework",
			"organization.viewInstructorMetrics",
			"organization.manageTeams",
			"organization.viewAnalytics",
			"organization.manageCertificates",
			"organization.issueCertificates",
		],
		color: "#10b981",
		icon: "award",
		editable: false,
		systemRole: true,
	},
	{
		id: "instructor",
		name: "Instructor",
		description: "Manage educational curriculum syllabuses and student tasks.",
		priority: 85,
		permissions: [
			"organization.createRoadmap",
			"organization.assignHomework",
			"organization.viewInstructorMetrics",
			"organization.publishAnnouncement",
			"organization.manageCourses",
			"organization.manageCertificates",
			"organization.issueCertificates",
		],
		color: "#3b82f6",
		icon: "book-open",
		editable: false,
		systemRole: true,
	},
	{
		id: "ta",
		name: "Teaching Assistant",
		description: "Review homework, assign tasks, and monitor statistics.",
		priority: 80,
		permissions: [
			"organization.assignHomework",
			"organization.viewInstructorMetrics",
			"organization.manageCourses",
		],
		color: "#a78bfa",
		icon: "users",
		editable: false,
		systemRole: true,
	},
	{
		id: "moderator",
		name: "Moderator",
		description: "Manage membership approvals, review flags and audit logs.",
		priority: 80,
		permissions: [
			"organization.inviteMember",
			"organization.removeMember",
			"organization.publishAnnouncement",
			"organization.viewAuditLogs",
			"organization.viewAnalytics",
		],
		color: "#3b82f6",
		icon: "star",
		editable: false,
		systemRole: true,
	},
	{
		id: "contest_manager",
		name: "Contest Manager",
		description: "Manage practice arenas and private contests.",
		priority: 70,
		permissions: ["organization.createContest", "organization.deleteContest", "organization.uploadFile"],
		color: "#8b5cf6",
		icon: "trophy",
		editable: false,
		systemRole: true,
	},
	{
		id: "problem_manager",
		name: "Problem Manager",
		description: "Link and curate code practice problems.",
		priority: 70,
		permissions: ["organization.createProblem", "organization.editProblem", "organization.deleteProblem", "organization.uploadFile"],
		color: "#ec4899",
		icon: "code",
		editable: false,
		systemRole: true,
	},
	{
		id: "recruiter",
		name: "Recruiter",
		description: "Process applications and manage recruitment pipelines.",
		priority: 70,
		permissions: ["organization.inviteMember", "organization.manageRecruitment", "organization.viewAnalytics"],
		color: "#10b981",
		icon: "user-plus",
		editable: false,
		systemRole: true,
	},
	{
		id: "member",
		name: "Member",
		description: "Standard active workspace member.",
		priority: 50,
		permissions: ["organization.uploadFile"],
		color: "#9ca3af",
		icon: "user",
		editable: false,
		systemRole: true,
	},
	{
		id: "guest",
		name: "Guest",
		description: "External viewer with read-only permissions.",
		priority: 10,
		permissions: [],
		color: "#d1d5db",
		icon: "eye",
		editable: false,
		systemRole: true,
	},
];

// Simple in-memory cache to prevent redundant queries
const orgCache: Record<string, { data: any; expiresAt: number }> = {};
const roleCache: Record<string, { data: any; expiresAt: number }> = {};

// ============================================================
// PERMISSION & POLICY ENGINE
// ============================================================

export async function resolveOrgAndMembership(orgIdOrSlug: string, uid: string | null) {
	const db = getAdminFirestore();

	// Resolve organization (id or slug check)
	let org: Organization | null = null;
	const cacheKey = `org_${orgIdOrSlug}`;

	if (orgCache[cacheKey] && orgCache[cacheKey].expiresAt > Date.now()) {
		org = orgCache[cacheKey].data;
	} else {
		// Query by slug
		const slugSnap = await db.collection("organizations").where("slug", "==", orgIdOrSlug).limit(1).get();
		if (!slugSnap.empty) {
			org = { id: slugSnap.docs[0].id, ...slugSnap.docs[0].data() } as Organization;
		} else {
			// Query by doc id
			const idDoc = await db.collection("organizations").doc(orgIdOrSlug).get();
			if (idDoc.exists) {
				org = { id: idDoc.id, ...idDoc.data() } as Organization;
			}
		}

		if (org) {
			orgCache[cacheKey] = { data: org, expiresAt: Date.now() + 5000 }; // 5s cache
		}
	}

	if (!org || org.status === "deleted") {
		return { org: null, member: null, role: null };
	}

	if (org.status === "suspended") {
		throw new Error("Organization is suspended");
	}

	if (!uid) {
		return { org, member: null, role: null };
	}

	// Fetch membership details
	const memberDocId = `${org.id}_${uid}`;
	const memberDoc = await db.collection("organizationMembers").doc(memberDocId).get();

	if (!memberDoc.exists) {
		return { org, member: null, role: null };
	}

	const member = memberDoc.data() as OrganizationMember;
	if (member.status === "suspended") {
		return { org, member: null, role: null };
	}

	// Fetch member's role
	let role: OrganizationRole | null = null;
	const roleCacheKey = `${org.id}_${member.roleId}`;

	if (roleCache[roleCacheKey] && roleCache[roleCacheKey].expiresAt > Date.now()) {
		role = roleCache[roleCacheKey].data;
	} else {
		// First search custom role
		const customRoleDoc = await db
			.collection("organizationRoles")
			.doc(`${org.id}_${member.roleId}`)
			.get();

		if (customRoleDoc.exists) {
			role = { id: customRoleDoc.id, ...customRoleDoc.data() } as OrganizationRole;
		} else {
			// fallback system role templates
			const foundTemplate = SYSTEM_ROLES_TEMPLATES.find((t) => t.id === member.roleId);
			if (foundTemplate) {
				role = {
					id: foundTemplate.id,
					organizationId: org.id,
					name: foundTemplate.name,
					description: foundTemplate.description,
					priority: foundTemplate.priority,
					permissions: foundTemplate.permissions,
					color: foundTemplate.color,
					icon: foundTemplate.icon,
					editable: foundTemplate.editable,
					systemRole: foundTemplate.systemRole,
					createdAt: org.createdAt,
				};
			}
		}

		if (role) {
			roleCache[roleCacheKey] = { data: role, expiresAt: Date.now() + 10000 }; // 10s cache
		}
	}

	return { org, member, role };
}

export async function checkOrgPermission(
	orgIdOrSlug: string,
	uid: string,
	requiredPermission: string
): Promise<{ allowed: boolean; org: Organization; member?: OrganizationMember; role?: OrganizationRole }> {
	const { org, member, role } = await resolveOrgAndMembership(orgIdOrSlug, uid);

	if (!org) {
		throw new Error("Organization not found");
	}

	// If secret organization, non-members should get access denied immediately
	if (org.visibility === "secret" && !member) {
		throw new Error("Access Denied");
	}

	if (!member || !role) {
		return { allowed: false, org };
	}

	// Owners bypass all permission requirements
	if (org.ownerUid === uid || member.roleId === "owner") {
		return { allowed: true, org, member, role };
	}

	const allowed = role.permissions.includes(requiredPermission);
	return { allowed, org, member, role };
}

// ============================================================
// RATE LIMIT ENGINE (Firestore/Distributed Memory Safe)
// ============================================================

export async function checkRateLimit(uid: string, action: string, limit: number, durationSeconds: number): Promise<boolean> {
	const db = getAdminFirestore();
	const now = Date.now();
	const cutoff = now - durationSeconds * 1000;

	const key = `${uid}_${action}`;
	const docRef = db.collection("rateLimits").doc(key);

	return await db.runTransaction(async (transaction) => {
		const docSnap = await transaction.get(docRef);
		const data = docSnap.data() || { timestamps: [] };
		
		const validTimestamps = data.timestamps.filter((t: number) => t > cutoff);
		
		if (validTimestamps.length >= limit) {
			return false;
		}

		validTimestamps.push(now);
		transaction.set(docRef, { timestamps: validTimestamps }, { merge: true });
		return true;
	});
}

// ============================================================
// EVENT & NOTIFICATION STREAM
// ============================================================

export async function emitOrgEvent(
	orgId: string,
	actorUid: string,
	action: string,
	targetUid: string | null | undefined,
	resource: string,
	resourceId: string,
	metadata: Record<string, any>,
	ip: string
) {
	const db = getAdminFirestore();
	const now = Date.now();

	// Sanitized target UID
	const cleanTargetUid = targetUid || null;

	// Helper to clean undefined fields recursively to prevent Firestore crashes
	const cleanUndefined = (val: any): any => {
		if (val === null || val === undefined) return null;
		if (Array.isArray(val)) return val.map(cleanUndefined);
		if (typeof val === "object") {
			const cleanObj: any = {};
			for (const key in val) {
				if (Object.prototype.hasOwnProperty.call(val, key)) {
					const v = val[key];
					cleanObj[key] = v === undefined ? null : cleanUndefined(v);
				}
			}
			return cleanObj;
		}
		return val;
	};

	// 1. Immutable Audit Log Entry
	const logRef = db.collection("organizationAuditLogs").doc();
	const auditData = cleanUndefined({
		logId: logRef.id,
		organizationId: orgId,
		actorUid,
		targetUid: cleanTargetUid,
		action,
		resource,
		resourceId,
		metadata: metadata || {},
		ip: ip || "127.0.0.1",
		timestamp: now,
	});
	await logRef.set(auditData);

	// 2. Fetch actor profile name
	const actorDoc = await db.collection("users").doc(actorUid).get();
	const actorData = actorDoc.data() || {};
	const actorName = actorData.displayName || actorData.username || "System Member";

	// 3. Fetch Organization name
	const orgDoc = await db.collection("organizations").doc(orgId).get();
	const orgData = orgDoc.data() || {};
	const orgName = orgData.displayName || orgData.name || "Workspace";

	// 4. Resolve Target Info (could be registered user or email-only guest)
	let targetEmail = "";
	let targetName = "there";
	let targetData: any = {};

	if (cleanTargetUid) {
		const targetDoc = await db.collection("users").doc(cleanTargetUid).get();
		if (targetDoc.exists) {
			targetData = targetDoc.data() || {};
			targetEmail = targetData.email || "";
			targetName = targetData.displayName || targetData.username || "there";
		}
	}

	if (!targetEmail && metadata?.email) {
		targetEmail = metadata.email;
	}

	const ctaUrl = `/orgs/${orgData.slug || ""}`;

	let notifTitle = "";
	let notifBody = "";
	let emailSubject = "";
	let emailHtml = "";

	switch (action) {
		case "member.invited":
			notifTitle = `✉️ Organization Invitation`;
			notifBody = `You have been invited to join ${orgName}`;
			emailSubject = `BeastCode Workspace Invitation: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "WORKSPACE INVITATION",
				accentColor: COLORS.primary,
				title: "Workspace Invitation",
				leadText: `Hi ${targetName},`,
				description: `You have been invited to join the ${orgName} workspace on BeastCode.`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar,
					roleName: metadata?.newRole || "Member",
					detailsText: `Invited by ${actorName || "Workspace Administrator"}`
				},
				ctaText: "Accept Invitation",
				ctaUrl: buildAbsoluteUrl(`/orgs/invitation/${metadata?.inviteId || ''}`)
			});
			break;
		case "member.joined":
			notifTitle = `👋 Welcome to ${orgName}`;
			notifBody = `Your application to join ${orgName} has been approved.`;
			emailSubject = `Welcome to ${orgName} on BeastCode`;
			emailHtml = getEmailHtml({
				headerTitle: "WELCOME TO WORKSPACE",
				accentColor: COLORS.success,
				title: "Welcome to the Workspace",
				leadText: `Hi ${targetName},`,
				description: `Your application to join ${orgName} has been approved!`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar,
					roleName: metadata?.newRole || "Member"
				},
				ctaText: "Workspace Overview",
				ctaUrl: buildAbsoluteUrl(`/orgs/${orgData.slug || ''}`)
			});
			break;
		case "member.rejected":
			notifTitle = `⚠️ Application Update`;
			notifBody = `Your request to join ${orgName} was rejected.`;
			emailSubject = `Update regarding your BeastCode application for ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "APPLICATION UPDATE",
				accentColor: COLORS.danger,
				title: "Application Status Update",
				leadText: `Hi ${targetName},`,
				description: `Thank you for your interest in ${orgName}. Unfortunately, your request to join this workspace was rejected by the administrators at this time.`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar
				}
			});
			break;
		case "role.changed":
			notifTitle = `🛡️ Role Assignment Update`;
			notifBody = `Your role inside ${orgName} was changed to: ${metadata?.newRole || ''}`;
			emailSubject = `Role Change in ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "ROLE UPDATE",
				accentColor: COLORS.accent,
				title: "Permissions Updated",
				leadText: `Hi ${targetName},`,
				description: `Your permissions inside the workspace ${orgName} have been updated.`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar,
					roleName: metadata?.newRole || "Member"
				}
			});
			break;
		case "member.removed":
			notifTitle = `👋 Removed from Workspace`;
			notifBody = `You were removed from ${orgName}.`;
			emailSubject = `Removed from ${orgName} Workspace`;
			emailHtml = getEmailHtml({
				headerTitle: "WORKSPACE REMOVAL",
				accentColor: COLORS.danger,
				title: "Removed from Workspace",
				leadText: `Hi ${targetName},`,
				description: `This email is to inform you that you have been removed from the ${orgName} workspace.`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar
				}
			});
			break;
		case "candidate.applied":
			notifTitle = `💼 Job Application Received`;
			notifBody = `Your application for the position of ${metadata?.jobTitle || "Job"} at ${orgName} has been received.`;
			emailSubject = `Application Received: ${metadata?.jobTitle || "Job"} at ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "APPLICATION RECEIVED",
				accentColor: COLORS.primary,
				title: "Application Received",
				leadText: `Hi ${targetName},`,
				description: `We have successfully received your application for the ${metadata?.jobTitle || "Job"} role. Our team will review your application shortly.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate",
					skills: metadata?.skills || [],
					description: "Thank you for applying!"
				}
			});
			break;
		case "candidate.stage_updated":
			notifTitle = `📈 Application Status Update`;
			notifBody = `Your application stage for ${metadata?.jobTitle || "Job"} has been updated to: ${metadata?.stage || ''}`;
			emailSubject = `Application Status Update: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "APPLICATION STATUS",
				accentColor: COLORS.accent,
				title: "Status Update",
				leadText: `Hi ${targetName},`,
				description: `Your application status for the ${metadata?.jobTitle || "Job"} role has been updated.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate",
					description: `Current Stage: ${metadata?.stage || "Under Review"}`
				}
			});
			break;
		case "candidate.offer_sent":
			notifTitle = `🎉 Job Offer Received!`;
			notifBody = `Congratulations! ${orgName} has extended a job offer to you.`;
			emailSubject = `Job Offer: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "JOB OFFER RECEIVED",
				accentColor: COLORS.success,
				title: "Congratulations! Job Offer Extended",
				leadText: `Hi ${targetName},`,
				description: `Congratulations! We are thrilled to extend an offer for the ${metadata?.jobTitle || "Job"} position. Please review the details in your candidate dashboard.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate"
				},
				ctaText: "Review Offer",
				ctaUrl: buildAbsoluteUrl(`/orgs/${orgData.slug || ''}`)
			});
			break;
		case "candidate.accepted":
			notifTitle = `🤝 Offer Accepted`;
			notifBody = `You have accepted the offer from ${orgName}. Welcome aboard!`;
			emailSubject = `Offer Accepted Confirmation: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "OFFER ACCEPTED",
				accentColor: COLORS.success,
				title: "Offer Accepted Confirmation",
				leadText: `Hi ${targetName},`,
				description: `Thank you for accepting our offer! We are excited to welcome you to ${orgName}.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate"
				}
			});
			break;
		case "candidate.rejected":
			notifTitle = `💼 Application Update`;
			notifBody = `Thank you for your application to ${orgName}. Unfortunately, we are not moving forward at this time.`;
			emailSubject = `Application Update: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "APPLICATION UPDATE",
				accentColor: COLORS.secondaryText,
				title: "Application Status Update",
				leadText: `Hi ${targetName},`,
				description: `Thank you for taking the time to apply and speak with us. Unfortunately, we are not moving forward with your application at this time.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate"
				}
			});
			break;
		case "candidate.assessment_assigned":
			notifTitle = `📝 Coding Assessment Assigned`;
			notifBody = `You have been assigned a coding assessment for your application at ${orgName}.`;
			emailSubject = `Coding Assessment: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "ASSESSMENT ASSIGNED",
				accentColor: COLORS.warning,
				title: "Coding Assessment Assigned",
				leadText: `Hi ${targetName},`,
				description: `As part of our evaluation for the ${metadata?.jobTitle || "Job"} position, please complete the coding assessment assigned to your application.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate"
				},
				ctaText: "Start Assessment",
				ctaUrl: buildAbsoluteUrl(`/orgs/${orgData.slug || ''}`)
			});
			break;
		case "candidate.interview_scheduled":
			notifTitle = `📅 Interview Scheduled`;
			notifBody = `An interview has been scheduled for your application at ${orgName} on ${metadata?.date || ''} at ${metadata?.time || ''}.`;
			emailSubject = `Interview Invitation: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "INTERVIEW SCHEDULED",
				accentColor: COLORS.accent,
				title: "Interview Invitation",
				leadText: `Hi ${targetName},`,
				description: `An interview has been scheduled for your application at ${orgName}.`,
				recruitmentCard: {
					companyName: orgName,
					companyLogo: orgData.avatar,
					jobTitle: metadata?.jobTitle || "Job Candidate",
					description: `Date: ${metadata?.date || ""} | Time: ${metadata?.time || ""}`
				},
				ctaText: "Join Meeting",
				ctaUrl: metadata?.meetingLink || "#"
			});
			break;
		case "certificate.issued":
			notifTitle = `📜 Certificate Issued`;
			notifBody = `You have been awarded a verifiable completion certificate from ${orgName}.`;
			emailSubject = `Verified Certificate Awarded: ${orgName}`;
			emailHtml = getEmailHtml({
				headerTitle: "CERTIFICATE ISSUED",
				accentColor: COLORS.success,
				title: "Verified Certificate Awarded",
				leadText: `Hi ${targetName},`,
				description: `Congratulations! You have been awarded a verifiable certificate of completion by ${orgName}.`,
				orgCard: {
					orgName: orgName,
					orgAvatar: orgData.avatar,
					detailsText: "Certificate ID: Verifiable Completion Certificate"
				}
			});
			break;
	}

	// 5. In-App Notification (only if user is registered)
	if (notifTitle && cleanTargetUid) {
		const notifCenterRef = db.collection("notifications").doc();
		const notifData = cleanUndefined({
			toUid: cleanTargetUid,
			fromUid: actorUid,
			fromDisplayName: actorName,
			fromAvatarUrl: actorData.avatarUrl || "",
			type: "ORGANIZATION_EVENT",
			title: notifTitle,
			body: notifBody,
			category: "social",
			priority: "medium",
			createdAt: now,
			read: false,
			ctaText: action === "member.invited" ? "View Invitation" : "Open Workspace",
			ctaUrl: action === "member.invited" && metadata?.inviteId ? `/orgs/invitation/${metadata.inviteId}` : ctaUrl,
			metadata: {
				orgId,
				action,
				...metadata,
				orgName,
				orgLogo: orgData.avatar || "",
				orgType: orgData.organizationType || "",
				orgVisibility: orgData.visibility || "",
				orgOwnerUid: orgData.ownerUid || "",
				orgDescription: orgData.description || "",
				orgMemberCount: orgData.memberCount || 0,
				inviterName: actorName,
				expiresAt: metadata?.expiresAt || (now + 7 * 24 * 60 * 60 * 1000)
			},
		});
		await notifCenterRef.set(notifData);
	}

	// 6. Direct Email notification
	if (emailSubject && targetEmail) {
		await EmailService.sendDirectEmail(targetEmail, emailSubject, emailHtml);
	}
}

// ============================================================
// SYSTEM ROLES INITIALIZER
// ============================================================

export async function initializeOrgRoles(orgId: string) {
	const db = getAdminFirestore();
	const batch = db.batch();

	for (const template of SYSTEM_ROLES_TEMPLATES) {
		const roleRef = db.collection("organizationRoles").doc(`${orgId}_${template.id}`);
		batch.set(roleRef, {
			organizationId: orgId,
			name: template.name,
			description: template.description,
			priority: template.priority,
			permissions: template.permissions,
			color: template.color,
			icon: template.icon,
			editable: template.editable,
			systemRole: template.systemRole,
			createdAt: Date.now(),
		});
	}

	await batch.commit();
}

// ============================================================
// PART 5 SCHEMA INTERFACES
// ============================================================

export interface OrganizationCompanyDetails {
	organizationId: string;
	industry: string;
	headquarters: string;
	website: string;
	careersPage: string;
	description: string;
	technologies: string[];
	employeeCount: number;
	hiringStatus: "hiring" | "closed" | "selective";
	recruiterUids: string[];
	socialLinks: Record<string, string>;
	cultureSections: { title: string; content: string; imageUrl?: string }[];
}

export interface OrganizationUniversityNode {
	id: string;
	organizationId: string;
	parentId: string | null; // hierarchy root CS Faculty -> CS Dept -> CS106B -> Spring 2027
	name: string;
	type: "faculty" | "department" | "course" | "class" | "semester";
	managerUids: string[]; // professors / TAs
	studentUids: string[];
	graduationYears: Record<string, number>; // uid -> grad year mapping
}

export interface OrganizationJob {
	id: string;
	organizationId: string;
	title: string;
	description: string;
	responsibilities: string[];
	requirements: string[];
	preferredSkills: string[];
	salaryRange: string;
	location: string;
	remoteStatus: "onsite" | "hybrid" | "remote";
	employmentType: "Full-time" | "Internship" | "Research" | "Part-time" | "Freelance" | "Contract" | "Volunteer" | "Campus Recruitment" | "Teaching Assistant";
	applicationDeadline: number;
	recruiterUid: string;
	hiringTeam: string[];
	requiredAssessmentId: string | null;
	requiredOrgMembership: boolean;
	status: "draft" | "active" | "filled" | "archived";
	createdAt: number;
	updatedAt: number;
}

export interface OrganizationApplication {
	id: string;
	jobId: string;
	organizationId: string;
	candidateUid: string;
	coverLetter: string;
	portfolioUrl: string;
	githubUrl: string;
	linkedinUrl: string;
	websiteUrl: string;
	attachments: { name: string; url: string }[];
	additionalAnswers: Record<string, string>;
	currentStage: "Applied" | "Resume Review" | "Online Assessment" | "Technical Interview" | "Behavioral Interview" | "Final Review" | "Offer" | "Accepted" | "Rejected";
	pipelineHistory: { stage: string; timestamp: number; updatedBy: string; notes?: string }[];
	assessmentScore: number | null;
	assessmentAttemptId: string | null;
	interviewIds: string[];
	createdAt: number;
	updatedAt: number;
}

export interface UserResume {
	uid: string;
	education: { institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number; gpa?: number }[];
	experience: { company: string; role: string; location: string; startMonthYear: string; endMonthYear: string; description: string; current: boolean }[];
	projects: { title: string; description: string; url?: string; technologies: string[] }[];
	awards: { title: string; issuer: string; year: number; description?: string }[];
	certifications: { name: string; issuer: string; date: number; url?: string }[];
	languages: string[];
	skills: string[];
	programmingLanguages: string[];
	cpAchievements: string[];
	contestRating: number;
	solvedProblems: number;
	openSourceContributions: string[];
	autoProfileScore: number;
	updatedAt: number;
}

export interface OrganizationAssessment {
	id: string;
	organizationId: string;
	title: string;
	privateProblemIds: string[];
	timeLimitMinutes: number;
	plagiarismCheck: boolean;
	antiCheatSettings: { webcamRequired: boolean; browserLockRequired: boolean };
	createdAt: number;
	createdBy: string;
}

export interface OrganizationAssessmentAttempt {
	id: string;
	assessmentId: string;
	candidateUid: string;
	startTime: number;
	endTime: number | null;
	status: "started" | "completed" | "timed_out";
	submissions: Record<string, { code: string; language: string; score: number; passedCount: number; totalCount: number; verdict: string }>;
	finalScore: number;
}

export interface OrganizationInterview {
	id: string;
	applicationId: string;
	organizationId: string;
	date: string;
	time: string;
	interviewerUid: string;
	meetingLink: string;
	notes: string;
	evaluation: {
		algorithmsScore: number;
		dataStructuresScore: number;
		systemDesignScore: number;
		communicationScore: number;
		problemSolvingScore: number;
		cultureFitScore: number;
		recommendation: "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire";
		comments: string;
	} | null;
	status: "scheduled" | "completed" | "cancelled";
	createdAt: number;
}

export interface OrganizationCourse {
	id: string;
	organizationId: string;
	code: string;
	title: string;
	semester: string;
	syllabus: string;
	instructorUids: string[];
	taUids: string[];
	studentUids: string[];
	createdAt: number;
}

export interface OrganizationCourseMaterial {
	id: string;
	courseId: string;
	organizationId: string;
	title: string;
	type: "pdf" | "video" | "slides" | "lecture";
	url: string;
	uploadedBy: string;
	createdAt: number;
}

export interface OrganizationGradebookEntry {
	id: string; // courseId_studentUid
	courseId: string;
	organizationId: string;
	studentUid: string;
	grades: Record<string, { score: number; maxScore: number; submittedAt: number; comment?: string; late: boolean }>;
	finalGrade: string;
	attendanceCount: number;
	updatedAt: number;
}

export interface OrganizationCertificate {
	id: string;
	organizationId: string;
	candidateUid: string;
	courseId: string | null;
	jobId: string | null;
	criteria: string;
	issueDate: number;
	signeeName: string;
	signeeRole: string;
	qrCodeDataUrl: string;
	verified: boolean;
}

// ============================================================
// AUTO PROFILE SCORING ALGORITHM
// ============================================================

export function computeUserProfileScore(userData: any, resumeData: any): number {
	let score = 0;

	// 1. Problem Solving Stats (Max 35 points)
	const solvedProblems = userData?.solvedProblems || [];
	const easyCount = userData?.easyCount || 0;
	const mediumCount = userData?.mediumCount || 0;
	const hardCount = userData?.hardCount || 0;

	const problemPoints = (easyCount * 0.1) + (mediumCount * 0.5) + (hardCount * 1.5);
	score += Math.min(35, problemPoints);

	// 2. Contest Rating Performance (Max 35 points)
	// Map rating 1000 -> 3000 to score range 0 -> 35
	const rating = userData?.contestRating || resumeData?.contestRating || 0;
	if (rating > 1000) {
		const ratingScore = ((rating - 1000) / 2000) * 35;
		score += Math.min(35, Math.max(0, ratingScore));
	}

	// 3. Resume Completeness (Max 15 points)
	let completeness = 0;
	if (resumeData?.education && resumeData.education.length > 0) completeness += 4;
	if (resumeData?.experience && resumeData.experience.length > 0) completeness += 4;
	if (resumeData?.projects && resumeData.projects.length > 0) completeness += 4;
	if (resumeData?.skills && resumeData.skills.length > 0) completeness += 3;
	score += completeness;

	// 4. Activity and Coding Accuracy (Max 15 points)
	// Base points on solved problems diversity and languages used
	const langCount = (resumeData?.programmingLanguages || []).length || 1;
	const langBonus = Math.min(5, langCount * 1.5);
	score += langBonus;

	const totalSolvedCount = solvedProblems.length || (easyCount + mediumCount + hardCount);
	const solveBonus = Math.min(10, totalSolvedCount * 0.2);
	score += solveBonus;

	return Math.round(score);
}
