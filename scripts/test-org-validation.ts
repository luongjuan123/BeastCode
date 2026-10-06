import fs from "fs";
import path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Import Next.js API route handlers
import gradebookHandler from "../src/pages/api/organizations/[id]/courses/[courseId]/gradebook";
import problemDetailHandler from "../src/pages/api/organizations/[id]/private-problems/[problemId]/index";
import problemTestcasesHandler from "../src/pages/api/organizations/[id]/private-problems/[problemId]/testcases";
import assessmentDetailHandler from "../src/pages/api/organizations/[id]/assessments/[assessmentId]/index";
import teamDetailHandler from "../src/pages/api/organizations/[id]/teams/[teamId]";
import jobDetailHandler from "../src/pages/api/organizations/[id]/jobs/[jobId]";
import applicationDetailHandler from "../src/pages/api/organizations/[id]/applications/[applicationId]";
import memberDetailHandler from "../src/pages/api/organizations/[id]/members/[uid]";
import coursesHandler from "../src/pages/api/organizations/[id]/courses/index";
import certificatesHandler from "../src/pages/api/organizations/[id]/certificates/index";
import courseMaterialsHandler from "../src/pages/api/organizations/[id]/courses/[courseId]/materials";
import searchHandler from "../src/pages/api/organizations/[id]/search";
import acceptInvitationHandler from "../src/pages/api/invitations/[token]/accept";
import universityHierarchyHandler from "../src/pages/api/organizations/[id]/university-hierarchy";
import interviewsHandler from "../src/pages/api/organizations/[id]/interviews";
import orgsIndexHandler from "../src/pages/api/organizations/index";
import orgDetailHandler from "../src/pages/api/organizations/[id]/index";

import {
	SYSTEM_PERMISSIONS,
	SYSTEM_ROLES_TEMPLATES,
	checkOrgPermission,
	resolveOrgAndMembership,
	emitOrgEvent,
} from "../src/utils/orgEngine";
import { verifyUserPermission, hasPermission, OrgRole, OrgPermission } from "../src/utils/orgPermissions";

// Load environment
const envPath = path.resolve(process.cwd(), ".env.local");
let apiKey = "";
let clientEmail = "";
let privateKey = "";
let projectId = "beastcode-7555e";

if (fs.existsSync(envPath)) {
	const content = fs.readFileSync(envPath, "utf8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			const key = trimmed.substring(0, eqIdx).trim();
			let val = trimmed.substring(eqIdx + 1).trim();
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			val = val.replace(/\\n/g, "\n");
			if (key === "NEXT_PUBLIC_FIREBASE_API_KEY") apiKey = val;
			if (key === "FIREBASE_CLIENT_EMAIL") clientEmail = val;
			if (key === "FIREBASE_PRIVATE_KEY") privateKey = val;
			if (key === "FIREBASE_PROJECT_ID") projectId = val;
			if (!process.env[key]) process.env[key] = val;
		}
	}
}

if (!getApps().length) {
	initializeApp({
		credential: cert({ projectId, clientEmail, privateKey }),
		projectId,
	});
}

const db = getFirestore();
const auth = getAuth();

// Test Result Interface
export interface TestResult {
	id: string;
	category: string;
	title: string;
	description: string;
	roleOrActor: string;
	targetResource: string;
	expectedStatus: number | string;
	actualStatus: number | string;
	status: "PASS" | "FAIL" | "FIXED";
	vulnerabilitySeverity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
	details: string;
	evidence?: any;
}

const testResults: TestResult[] = [];

// Mock Req/Res generator
function mockReqRes(options: {
	method: string;
	query?: Record<string, string>;
	body?: any;
	token?: string;
	user?: { uid: string; email?: string };
}) {
	let statusCode = 200;
	let responseData: any = null;
	const headers: Record<string, string> = {};

	if (options.token) {
		headers["authorization"] = `Bearer ${options.token}`;
	}

	const req: any = {
		method: options.method,
		query: options.query || {},
		body: options.body || {},
		headers,
		socket: { remoteAddress: "127.0.0.1" },
		user: options.user,
	};

	const res: any = {
		status(code: number) {
			statusCode = code;
			return res;
		},
		json(data: any) {
			responseData = data;
			return res;
		},
		send(data: any) {
			responseData = data;
			return res;
		},
		setHeader(k: string, v: string) {
			headers[k.toLowerCase()] = v;
			return res;
		},
		getHeader(k: string) {
			return headers[k.toLowerCase()];
		},
		get statusCode() {
			return statusCode;
		},
		get data() {
			return responseData;
		},
	};

	return { req, res };
}

// User tokens map
const tokenMap: Record<string, string> = {};

async function getIdTokenForUid(uid: string, email?: string): Promise<string> {
	if (tokenMap[uid]) return tokenMap[uid];

	try {
		// Ensure user exists in Auth
		try {
			await auth.getUser(uid);
		} catch (e: any) {
			if (e.code === "auth/user-not-found") {
				await auth.createUser({
					uid,
					email: email || `${uid.toLowerCase()}@example.com`,
					displayName: uid.replace("QA_AUTOMATED_", ""),
				});
			}
		}

		const customToken = await auth.createCustomToken(uid);
		const resp = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: customToken, returnSecureToken: true }),
			}
		);
		const data: any = await resp.json();
		if (!data.idToken) {
			throw new Error("Failed to get ID token: " + JSON.stringify(data));
		}
		tokenMap[uid] = data.idToken;
		return data.idToken;
	} catch (err: any) {
		console.error(`Error acquiring token for ${uid}:`, err.message);
		throw err;
	}
}

// Test Entity Identifiers
const ORG_A_ID = "QA_AUTOMATED_ORG_A";
const ORG_A_SLUG = "qa-automated-org-a";

const ORG_B_ID = "QA_AUTOMATED_ORG_B";
const ORG_B_SLUG = "qa-automated-org-b";

const USERS = {
	OWNER_A: "QA_AUTOMATED_USER_OWNER_A",
	ADMIN_A: "QA_AUTOMATED_USER_ADMIN_A",
	COACH_A: "QA_AUTOMATED_USER_COACH_A",
	INSTRUCTOR_A: "QA_AUTOMATED_USER_INSTRUCTOR_A",
	TA_A: "QA_AUTOMATED_USER_TA_A",
	MEMBER_A: "QA_AUTOMATED_USER_MEMBER_A",

	OWNER_B: "QA_AUTOMATED_USER_OWNER_B",
	ADMIN_B: "QA_AUTOMATED_USER_ADMIN_B",
	COACH_B: "QA_AUTOMATED_USER_COACH_B",
	INSTRUCTOR_B: "QA_AUTOMATED_USER_INSTRUCTOR_B",
	TA_B: "QA_AUTOMATED_USER_TA_B",
	MEMBER_B: "QA_AUTOMATED_USER_MEMBER_B",

	OUTSIDER: "QA_AUTOMATED_USER_OUTSIDER",
};

// Provision Fixtures
async function setupFixtures() {
	console.log("Setting up QA Automated Test Fixtures in Firestore...");

	// 1. Create User Docs
	const batch = db.batch();
	for (const [key, uid] of Object.entries(USERS)) {
		batch.set(
			db.collection("users").doc(uid),
			{
				uid,
				email: `${key.toLowerCase()}@beastcode-test.qa`,
				username: key.toLowerCase(),
				displayName: `QA ${key}`,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			{ merge: true }
		);
	}
	await batch.commit();

	// 2. Create Organizations
	await db.collection("organizations").doc(ORG_A_ID).set({
		id: ORG_A_ID,
		slug: ORG_A_SLUG,
		name: "QA Automated Engineering Org A",
		displayName: "QA Org Alpha",
		shortName: "ORGA",
		description: "Isolated automated test organization Alpha",
		avatar: "",
		banner: "",
		organizationType: "university",
		visibility: "public",
		verified: true,
		website: "https://beastcode.qa/org-a",
		country: "United States",
		city: "San Francisco",
		location: "San Francisco, CA",
		email: "contact@orga.qa",
		contactPhone: "+1-555-0101",
		socialLinks: {},
		memberCount: 6,
		contestCount: 2,
		problemCount: 5,
		announcementCount: 3,
		fileCount: 0,
		createdBy: USERS.OWNER_A,
		ownerUid: USERS.OWNER_A,
		status: "active",
		createdAt: Date.now(),
		updatedAt: Date.now(),
		deletedAt: null,
	});

	await db.collection("organizations").doc(ORG_B_ID).set({
		id: ORG_B_ID,
		slug: ORG_B_SLUG,
		name: "QA Automated Enterprise Org B",
		displayName: "QA Org Beta (Private)",
		shortName: "ORGB",
		description: "Isolated automated test organization Beta - Strictly Confidential",
		avatar: "",
		banner: "",
		organizationType: "enterprise",
		visibility: "private",
		verified: true,
		website: "https://beastcode.qa/org-b",
		country: "United Kingdom",
		city: "London",
		location: "London, UK",
		email: "security@orgb.qa",
		contactPhone: "+44-20-7946-0991",
		socialLinks: {},
		memberCount: 6,
		contestCount: 1,
		problemCount: 3,
		announcementCount: 1,
		fileCount: 0,
		createdBy: USERS.OWNER_B,
		ownerUid: USERS.OWNER_B,
		status: "active",
		createdAt: Date.now(),
		updatedAt: Date.now(),
		deletedAt: null,
	});

	// 3. Create Memberships
	const membersA = [
		{ uid: USERS.OWNER_A, roleId: "owner" },
		{ uid: USERS.ADMIN_A, roleId: "admin" },
		{ uid: USERS.COACH_A, roleId: "coach" },
		{ uid: USERS.INSTRUCTOR_A, roleId: "instructor" },
		{ uid: USERS.TA_A, roleId: "ta" },
		{ uid: USERS.MEMBER_A, roleId: "member" },
	];

	for (const m of membersA) {
		await db.collection("organizationMembers").doc(`${ORG_A_ID}_${m.uid}`).set({
			organizationId: ORG_A_ID,
			uid: m.uid,
			roleId: m.roleId,
			nickname: `Alpha ${m.roleId}`,
			title: `${m.roleId.toUpperCase()} Staff`,
			department: "Computer Science",
			status: "active",
			joinedAt: Date.now(),
			joinedBy: USERS.OWNER_A,
			lastActive: Date.now(),
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		});
	}

	const membersB = [
		{ uid: USERS.OWNER_B, roleId: "owner" },
		{ uid: USERS.ADMIN_B, roleId: "admin" },
		{ uid: USERS.COACH_B, roleId: "coach" },
		{ uid: USERS.INSTRUCTOR_B, roleId: "instructor" },
		{ uid: USERS.TA_B, roleId: "ta" },
		{ uid: USERS.MEMBER_B, roleId: "member" },
	];

	for (const m of membersB) {
		await db.collection("organizationMembers").doc(`${ORG_B_ID}_${m.uid}`).set({
			organizationId: ORG_B_ID,
			uid: m.uid,
			roleId: m.roleId,
			nickname: `Beta ${m.roleId}`,
			title: `${m.roleId.toUpperCase()} Staff`,
			department: "R&D Systems",
			status: "active",
			joinedAt: Date.now(),
			joinedBy: USERS.OWNER_B,
			lastActive: Date.now(),
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		});
	}

	// 4. Create Courses
	await db.collection("organizationCourses").doc("QA_COURSE_A").set({
		id: "QA_COURSE_A",
		organizationId: ORG_A_ID,
		code: "CS-101-ALPHA",
		title: "Algorithms & Data Structures Alpha",
		semester: "Spring 2026",
		syllabus: "Complete algorithmic complexity, graphs, and dynamic programming.",
		instructorUids: [USERS.INSTRUCTOR_A],
		taUids: [USERS.TA_A],
		studentUids: [USERS.MEMBER_A],
		createdAt: Date.now(),
	});

	await db.collection("organizationCourses").doc("QA_COURSE_B").set({
		id: "QA_COURSE_B",
		organizationId: ORG_B_ID,
		code: "SEC-909-BETA",
		title: "Proprietary Systems Architecture Beta",
		semester: "Fall 2026",
		syllabus: "Internal systems and security blueprints.",
		instructorUids: [USERS.INSTRUCTOR_B],
		taUids: [USERS.TA_B],
		studentUids: [USERS.MEMBER_B],
		createdAt: Date.now(),
	});

	// 5. Create Course Materials
	await db.collection("organizationCourseMaterials").doc("QA_MAT_A").set({
		id: "QA_MAT_A",
		courseId: "QA_COURSE_A",
		organizationId: ORG_A_ID,
		title: "Lecture 1: Asymptotic Analysis",
		type: "slides",
		url: "https://beastcode.qa/materials/alpha-lec1.pdf",
		uploadedBy: USERS.INSTRUCTOR_A,
		createdAt: Date.now(),
	});

	await db.collection("organizationCourseMaterials").doc("QA_MAT_B").set({
		id: "QA_MAT_B",
		courseId: "QA_COURSE_B",
		organizationId: ORG_B_ID,
		title: "Beta Confidential Core Design",
		type: "pdf",
		url: "https://beastcode.qa/materials/beta-core-confidential.pdf",
		uploadedBy: USERS.INSTRUCTOR_B,
		createdAt: Date.now(),
	});

	// 6. Create Gradebook entries
	await db.collection("organizationGradebook").doc("QA_COURSE_A_QA_AUTOMATED_USER_MEMBER_A").set({
		id: "QA_COURSE_A_QA_AUTOMATED_USER_MEMBER_A",
		courseId: "QA_COURSE_A",
		organizationId: ORG_A_ID,
		studentUid: USERS.MEMBER_A,
		grades: { "quiz-1": 95, "hw-1": 100 },
		finalGrade: "A+",
		attendanceCount: 14,
		updatedAt: Date.now(),
	});

	await db.collection("organizationGradebook").doc("QA_COURSE_B_QA_AUTOMATED_USER_MEMBER_B").set({
		id: "QA_COURSE_B_QA_AUTOMATED_USER_MEMBER_B",
		courseId: "QA_COURSE_B",
		organizationId: ORG_B_ID,
		studentUid: USERS.MEMBER_B,
		grades: { "audit-1": 88 },
		finalGrade: "B+",
		attendanceCount: 10,
		updatedAt: Date.now(),
	});

	// 7. Create Private Problems
	await db.collection("organizationPrivateProblems").doc("QA_PROB_A").set({
		id: "QA_PROB_A",
		organizationId: ORG_A_ID,
		title: "Alpha Graph Kernel Optimization",
		difficulty: "Hard",
		description: "Design an O(V+E) algorithm for kernel partitioning.",
		examples: [{ input: "4 vertices", output: "2 partitions" }],
		hiddenTests: [{ input: "1000 vertices", output: "250 partitions" }],
		generatorScript: "def gen(): return 1000",
		validatorScript: "def validate(): return True",
		specialJudgeScript: "def judge(): return 1.0",
		versions: [{ version: 1, summary: "Initial release", timestamp: Date.now() }],
		version: 1,
		createdBy: USERS.COACH_A,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	await db.collection("organizationPrivateProblems").doc("QA_PROB_B").set({
		id: "QA_PROB_B",
		organizationId: ORG_B_ID,
		title: "Beta Quantum Lattice Cipher",
		difficulty: "Hard",
		description: "Confidential lattice problem for internal candidates.",
		examples: [{ input: "secret seed", output: "cipher" }],
		hiddenTests: [{ input: "super confidential test vector", output: "verified signature" }],
		generatorScript: "def gen(): return 'top_secret'",
		validatorScript: "def validate(): return 'top_secret_eval'",
		specialJudgeScript: "def judge(): return 1.0",
		versions: [{ version: 1, summary: "Initial confidential version", timestamp: Date.now() }],
		version: 1,
		createdBy: USERS.COACH_B,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	// 8. Create Assessments
	await db.collection("organizationAssessments").doc("QA_ASSESS_A").set({
		id: "QA_ASSESS_A",
		organizationId: ORG_A_ID,
		title: "Alpha Senior Algorithms Screening",
		timeLimitMinutes: 90,
		privateProblemIds: ["QA_PROB_A"],
		antiCheatSettings: { disableCopyPaste: true, screenRecording: true },
		createdAt: Date.now(),
	});

	await db.collection("organizationAssessments").doc("QA_ASSESS_B").set({
		id: "QA_ASSESS_B",
		organizationId: ORG_B_ID,
		title: "Beta Staff Engineer Assessment",
		timeLimitMinutes: 120,
		privateProblemIds: ["QA_PROB_B"],
		antiCheatSettings: { disableCopyPaste: true, screenRecording: true },
		createdAt: Date.now(),
	});

	// 9. Create Teams
	await db.collection("organizationTeams").doc("QA_TEAM_A").set({
		id: "QA_TEAM_A",
		organizationId: ORG_A_ID,
		name: "Alpha ICPC World Finalists",
		captainUid: USERS.COACH_A,
		members: [USERS.COACH_A, USERS.MEMBER_A],
		createdAt: Date.now(),
	});

	await db.collection("organizationTeams").doc("QA_TEAM_B").set({
		id: "QA_TEAM_B",
		organizationId: ORG_B_ID,
		name: "Beta High Performance Team",
		captainUid: USERS.COACH_B,
		members: [USERS.COACH_B, USERS.MEMBER_B],
		createdAt: Date.now(),
	});

	// 10. Create Recruitment Jobs
	await db.collection("organizationJobs").doc("QA_JOB_A").set({
		id: "QA_JOB_A",
		organizationId: ORG_A_ID,
		title: "Alpha Research Scientist",
		department: "AI & Optimization",
		status: "open",
		createdAt: Date.now(),
	});

	await db.collection("organizationJobs").doc("QA_JOB_B").set({
		id: "QA_JOB_B",
		organizationId: ORG_B_ID,
		title: "Beta Principal Cryptographer",
		department: "Security",
		status: "open",
		createdAt: Date.now(),
	});

	// 11. Create Applications
	await db.collection("organizationApplications").doc("QA_APP_A").set({
		id: "QA_APP_A",
		organizationId: ORG_A_ID,
		jobId: "QA_JOB_A",
		candidateUid: USERS.MEMBER_A,
		currentStage: "screen",
		pipelineHistory: [{ stage: "applied", timestamp: Date.now(), updatedBy: USERS.MEMBER_A }],
		createdAt: Date.now(),
	});

	await db.collection("organizationApplications").doc("QA_APP_B").set({
		id: "QA_APP_B",
		organizationId: ORG_B_ID,
		jobId: "QA_JOB_B",
		candidateUid: USERS.MEMBER_B,
		currentStage: "review",
		pipelineHistory: [{ stage: "applied", timestamp: Date.now(), updatedBy: USERS.MEMBER_B }],
		createdAt: Date.now(),
	});

	// 12. Create Hierarchy Nodes
	await db.collection("organizationUniversityNodes").doc("QA_NODE_A").set({
		id: "QA_NODE_A",
		organizationId: ORG_A_ID,
		name: "Department of Computer Science Alpha",
		type: "department",
		managerUids: [USERS.ADMIN_A],
		studentUids: [USERS.MEMBER_A],
		graduationYears: [2026],
		createdAt: Date.now(),
	});

	await db.collection("organizationUniversityNodes").doc("QA_NODE_B").set({
		id: "QA_NODE_B",
		organizationId: ORG_B_ID,
		name: "Beta Advanced Cryptography Lab",
		type: "laboratory",
		managerUids: [USERS.ADMIN_B],
		studentUids: [USERS.MEMBER_B],
		graduationYears: [2026],
		createdAt: Date.now(),
	});

	// 13. Create Interviews
	await db.collection("organizationInterviews").doc("QA_INT_A").set({
		id: "QA_INT_A",
		applicationId: "QA_APP_A",
		organizationId: ORG_A_ID,
		interviewerUid: USERS.COACH_A,
		date: "2026-10-15",
		time: "10:00 AM",
		status: "scheduled",
		createdAt: Date.now(),
	});

	await db.collection("organizationInterviews").doc("QA_INT_B").set({
		id: "QA_INT_B",
		applicationId: "QA_APP_B",
		organizationId: ORG_B_ID,
		interviewerUid: USERS.COACH_B,
		date: "2026-10-16",
		time: "02:00 PM",
		status: "scheduled",
		createdAt: Date.now(),
	});

	// 14. Create Invitations
	await db.collection("organizationInvitations").doc("QA_INV_VALID_A").set({
		inviteId: "QA_INV_VALID_A",
		organizationId: ORG_A_ID,
		token: "qa-token-valid-a",
		uid: USERS.OUTSIDER,
		email: "outsider@beastcode-test.qa",
		roleId: "member",
		status: "Pending",
		createdAt: Date.now(),
		expiresAt: Date.now() + 86400000,
	});

	await db.collection("organizationInvitations").doc("QA_INV_EXPIRED").set({
		inviteId: "QA_INV_EXPIRED",
		organizationId: ORG_A_ID,
		token: "qa-token-expired",
		uid: USERS.OUTSIDER,
		email: "outsider@beastcode-test.qa",
		roleId: "member",
		status: "Pending",
		createdAt: Date.now() - 100000,
		expiresAt: Date.now() - 1000,
	});

	console.log("All QA Automated Test Fixtures successfully created!");
}

// Cleanup Fixtures
export async function cleanupFixtures() {
	console.log("Cleaning up all QA Automated Test Fixtures from Firestore...");

	const collections = [
		"organizations",
		"organizationMembers",
		"organizationCourses",
		"organizationCourseMaterials",
		"organizationGradebook",
		"organizationPrivateProblems",
		"organizationAssessments",
		"organizationAssessmentAttempts",
		"organizationTeams",
		"organizationJobs",
		"organizationApplications",
		"organizationUniversityNodes",
		"organizationInterviews",
		"organizationInvitations",
		"organizationAnnouncements",
		"organizationCertificates",
		"organizationAuditLogs",
	];

	for (const col of collections) {
		const snap = await db.collection(col).get();
		const batch = db.batch();
		let count = 0;
		for (const doc of snap.docs) {
			if (doc.id.startsWith("QA_") || doc.data()?.organizationId?.startsWith("QA_")) {
				batch.delete(doc.ref);
				count++;
			}
		}
		if (count > 0) {
			await batch.commit();
			console.log(`Deleted ${count} test documents from ${col}`);
		}
	}

	console.log("Cleanup completed!");
}

// RUN ALL VALIDATION TESTS
export async function runAllTests() {
	await setupFixtures();

	console.log("\n============================================================");
	console.log("EXECUTING COMPREHENSIVE ORGANIZATION TEST SUITE");
	console.log("============================================================\n");

	// Pre-generate tokens
	const tokenOwnerA = await getIdTokenForUid(USERS.OWNER_A);
	const tokenAdminA = await getIdTokenForUid(USERS.ADMIN_A);
	const tokenCoachA = await getIdTokenForUid(USERS.COACH_A);
	const tokenInstructorA = await getIdTokenForUid(USERS.INSTRUCTOR_A);
	const tokenTaA = await getIdTokenForUid(USERS.TA_A);
	const tokenMemberA = await getIdTokenForUid(USERS.MEMBER_A);

	const tokenOwnerB = await getIdTokenForUid(USERS.OWNER_B);
	const tokenAdminB = await getIdTokenForUid(USERS.ADMIN_B);
	const tokenCoachB = await getIdTokenForUid(USERS.COACH_B);
	const tokenInstructorB = await getIdTokenForUid(USERS.INSTRUCTOR_B);
	const tokenTaB = await getIdTokenForUid(USERS.TA_B);
	const tokenMemberB = await getIdTokenForUid(USERS.MEMBER_B);

	const tokenOutsider = await getIdTokenForUid(USERS.OUTSIDER);

	// ------------------------------------------------------------
	// GROUP 1: IDOR & CROSS-TENANT ISOLATION TESTS (BUGS 1-6, 14-15)
	// ------------------------------------------------------------

	// Test 1: Bug 1 - IDOR Gradebook Cross-Tenant Access
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_B" },
			token: tokenInstructorA,
		});
		await gradebookHandler(req, res);

		const isFixed = res.statusCode === 404 && res.data?.error?.includes("Course not found");
		testResults.push({
			id: "TC_SEC_001",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Gradebook Cross-Tenant Read Prevention",
			description: "Verify Instructor in Org A cannot read gradebook of Course in Org B",
			roleOrActor: "INSTRUCTOR_A",
			targetResource: "organizationGradebook (Course B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Org A Instructor requested Course B gradebook. Response code: ${res.statusCode}, Error: ${res.data?.error}`,
			evidence: res.data,
		});
	}

	// Test 2: Bug 1 - IDOR Gradebook Cross-Tenant Overwrite
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_B" },
			body: { studentUid: USERS.MEMBER_B, finalGrade: "A+" },
			token: tokenInstructorA,
		});
		await gradebookHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_001_WRITE",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Gradebook Cross-Tenant Overwrite Prevention",
			description: "Verify Instructor in Org A cannot alter grades of student in Course B",
			roleOrActor: "INSTRUCTOR_A",
			targetResource: "organizationGradebook (Course B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Org A Instructor attempted to overwrite Course B gradebook. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 3: Bug 2 - IDOR Private Problem Cross-Tenant Read
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, problemId: "QA_PROB_B" },
			token: tokenCoachA,
		});
		await problemDetailHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_002",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Private Problem Read Prevention",
			description: "Verify Coach in Org A cannot view confidential private problem from Org B",
			roleOrActor: "COACH_A",
			targetResource: "organizationPrivateProblems (Problem B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Coach A requested Problem B via Org A endpoint. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 4: Bug 2 - Privilege Escalation on Private Problem Deletion
	{
		const { req, res } = mockReqRes({
			method: "DELETE",
			query: { id: ORG_A_ID, problemId: "QA_PROB_A" },
			token: tokenCoachA,
		});
		await problemDetailHandler(req, res);

		const isFixed = res.statusCode === 403;
		testResults.push({
			id: "TC_SEC_003",
			category: "Privilege Escalation",
			title: "Private Problem Deletion Permission Enforcement",
			description: "Verify Coach (who has editProblem) cannot delete private problem (requires deleteProblem)",
			roleOrActor: "COACH_A",
			targetResource: "organizationPrivateProblems (Problem A)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Coach A attempted DELETE on Problem A. Response: ${res.statusCode}, Error: ${res.data?.error}`,
			evidence: res.data,
		});
	}

	// Test 5: Bug 3 - IDOR Hidden Testcases & Evaluation Scripts Leak
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, problemId: "QA_PROB_B" },
			token: tokenCoachA,
		});
		await problemTestcasesHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_004",
			category: "Tenant Isolation / Information Disclosure",
			title: "IDOR Hidden Testcases & Special Judge Leak Prevention",
			description: "Verify Coach in Org A cannot inspect secret testcases or validator scripts of Org B",
			roleOrActor: "COACH_A",
			targetResource: "organizationPrivateProblems testcases (Problem B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Coach A attempted reading Problem B testcases. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 6: Bug 4 - IDOR Assessment Candidate Session Leak & Cross-Tenant Access
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, assessmentId: "QA_ASSESS_B" },
			token: tokenMemberA,
		});
		await assessmentDetailHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_005",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Assessment Template Cross-Tenant Isolation",
			description: "Verify Member in Org A cannot access or start Assessment in Org B",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationAssessments (Assessment B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Member A attempted to access Assessment B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 7: Bug 5 - IDOR Team Tampering & Member Manipulation
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, teamId: "QA_TEAM_B" },
			body: { action: "add_member", targetUid: USERS.MEMBER_A },
			token: tokenCoachA,
		});
		await teamDetailHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_006",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Team Tampering Prevention",
			description: "Verify Coach/Manager in Org A cannot modify roster or settings of Team in Org B",
			roleOrActor: "COACH_A",
			targetResource: "organizationTeams (Team B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Coach A attempted modifying Team B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 8: Bug 6 - IDOR Job Posting Modification
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, jobId: "QA_JOB_B" },
			body: { title: "Compromised Job Title" },
			token: tokenAdminA,
		});
		await jobDetailHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_007",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Recruitment Job Posting Modification Prevention",
			description: "Verify Recruiter/Admin in Org A cannot alter Job Posting in Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizationJobs (Job B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Admin A attempted to PATCH Job B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 9: Bug 6 - IDOR Candidate Application Review Tampering
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, applicationId: "QA_APP_B" },
			body: { stage: "rejected", notes: "Malicious rejection by competitor org" },
			token: tokenAdminA,
		});
		await applicationDetailHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_008",
			category: "Tenant Isolation / IDOR",
			title: "IDOR Candidate Application Review Status Prevention",
			description: "Verify Recruiter in Org A cannot review or change stage of candidate in Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizationApplications (Application B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Admin A attempted to modify candidate Application B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 10: Bug 7 - Member Profile & Preferences Unauthorized Modification
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, uid: USERS.ADMIN_A },
			body: { nickname: "Hacked Nickname", isFavorite: true },
			token: tokenMemberA,
		});
		await memberDetailHandler(req, res);

		const isFixed = res.statusCode === 403;
		testResults.push({
			id: "TC_SEC_009",
			category: "Privilege Escalation",
			title: "Member Profile and Preference Tampering Prevention",
			description: "Verify standard member cannot modify profile or preferences of another member",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationMembers (Admin A)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Member A attempted to edit Admin A profile. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 11: Bug 8 - Private Organization Course Enumeration
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_B_ID },
			token: tokenOutsider,
		});
		await coursesHandler(req, res);

		const isFixed = res.statusCode === 403;
		testResults.push({
			id: "TC_SEC_010",
			category: "Information Disclosure",
			title: "Private Organization Course Roster Enumeration Protection",
			description: "Verify non-member cannot list courses or curriculum of private organization",
			roleOrActor: "OUTSIDER",
			targetResource: "organizationCourses (Org B)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Outsider attempted GET /courses on private Org B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 12: Bug 8 - Private Organization Certificate Enumeration
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_B_ID },
			token: tokenOutsider,
		});
		await certificatesHandler(req, res);

		const isFixed = res.statusCode === 403;
		testResults.push({
			id: "TC_SEC_011",
			category: "Information Disclosure",
			title: "Private Organization Certificate Registry Protection",
			description: "Verify non-member cannot enumerate certificates issued by private organization",
			roleOrActor: "OUTSIDER",
			targetResource: "organizationCertificates (Org B)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Outsider attempted GET /certificates on private Org B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 13: Bug 8 - Cross-Tenant Course Material Enumeration & Upload
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_B" },
			token: tokenMemberA,
		});
		await courseMaterialsHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_012",
			category: "Tenant Isolation / IDOR",
			title: "Course Materials Tenant Isolation",
			description: "Verify materials endpoint verifies course belongs to the requested organization",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationCourseMaterials (Course B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Member A attempted GET materials for Course B via Org A. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 14: Bug 12 - PII Email Masking in Public Member Search
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, type: "members" },
			user: { uid: USERS.MEMBER_A },
			token: tokenMemberA,
		});
		await searchHandler(req, res);

		const members = res.data?.results || [];
		const otherMember = members.find((m: any) => m.uid === USERS.ADMIN_A);
		const ownMember = members.find((m: any) => m.uid === USERS.MEMBER_A);

		const isFixed = otherMember?.email === undefined && ownMember?.email !== undefined;
		testResults.push({
			id: "TC_SEC_013",
			category: "PII & Privacy Protection",
			title: "Member Email PII Masking in Workspace Search",
			description: "Verify member emails are masked for non-managers while keeping self email visible",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationMembers (Org A Search)",
			expectedStatus: 200,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "MEDIUM",
			details: `Other member email exposed: ${otherMember?.email !== undefined}. Own email exposed: ${ownMember?.email !== undefined}`,
			evidence: { otherMemberEmail: otherMember?.email, ownEmail: ownMember?.email },
		});
	}

	// Test 15: Bug 13 - Cross-Recipient Invitation Token Acceptance Prevention
	{
		const { req, res } = mockReqRes({
			method: "POST",
			query: { token: "qa-token-valid-a" },
			user: { uid: USERS.MEMBER_B }, // Different UID than OUTSIDER
			token: tokenMemberB,
		});
		await acceptInvitationHandler(req, res);

		const isFixed = res.statusCode === 403;
		testResults.push({
			id: "TC_SEC_014",
			category: "Authentication & Invitations",
			title: "Invitation Token Recipient UID Enforcement",
			description: "Verify invitation issued to a designated UID cannot be redeemed by another user",
			roleOrActor: "MEMBER_B",
			targetResource: "organizationInvitations (Token A)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "LOW",
			details: `User B attempted to accept invitation issued to Outsider. Response: ${res.statusCode}, Error: ${res.data?.error}`,
			evidence: res.data,
		});
	}

	// Test 16: Bug 14 - University Hierarchy Node Cross-Tenant Modification
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID },
			body: { nodeId: "QA_NODE_B", name: "Tampered Node Name" },
			token: tokenAdminA,
		});
		await universityHierarchyHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_015",
			category: "Tenant Isolation / IDOR",
			title: "University Hierarchy Node Cross-Tenant Modification Prevention",
			description: "Verify Admin in Org A cannot alter hierarchy nodes belonging to Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizationUniversityNodes (Node B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Admin A attempted to modify Node B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 17: Bug 15 - Interview Scheduling Cross-Tenant Application IDOR
	{
		const { req, res } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID },
			body: {
				applicationId: "QA_APP_B",
				date: "2026-10-20",
				time: "11:00 AM",
				interviewerUid: USERS.COACH_A,
			},
			token: tokenAdminA,
		});
		await interviewsHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_016",
			category: "Tenant Isolation / IDOR",
			title: "Interview Scheduling Application Tenant Verification",
			description: "Verify Recruiter in Org A cannot schedule interview using Application ID of Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizationInterviews (Application B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Recruiter A attempted interview scheduling on Application B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 18: Bug 15 - Interview Evaluation Cross-Tenant IDOR
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID },
			body: {
				interviewId: "QA_INT_B",
				notes: "Unauthorized evaluation note",
				evaluation: { score: 10, decision: "no_hire" },
			},
			token: tokenAdminA,
		});
		await interviewsHandler(req, res);

		const isFixed = res.statusCode === 404;
		testResults.push({
			id: "TC_SEC_017",
			category: "Tenant Isolation / IDOR",
			title: "Interview Evaluation Cross-Tenant Modification Prevention",
			description: "Verify Recruiter in Org A cannot submit evaluation for Interview in Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizationInterviews (Interview B)",
			expectedStatus: 404,
			actualStatus: res.statusCode,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Recruiter A attempted evaluation on Interview B. Response: ${res.statusCode}`,
			evidence: res.data,
		});
	}

	// Test 19: Bug 11 - Status vs State Check in orgPermissions
	{
		// Temporarily set org status to suspended
		await db.collection("organizations").doc("QA_TEMP_SUSPENDED").set({
			id: "QA_TEMP_SUSPENDED",
			slug: "qa-temp-suspended",
			status: "suspended",
			visibility: "public",
			ownerUid: USERS.OWNER_A,
		});

		const { allowed } = await verifyUserPermission("QA_TEMP_SUSPENDED", USERS.OWNER_A, "VIEW_ORG");
		const isFixed = allowed === false;

		await db.collection("organizations").doc("QA_TEMP_SUSPENDED").delete();

		testResults.push({
			id: "TC_SEC_018",
			category: "Access Control / State Management",
			title: "Suspended Organization Status Check Enforcement",
			description: "Verify verifyUserPermission correctly honors org.status === suspended",
			roleOrActor: "OWNER_A",
			targetResource: "organizations (Suspended Org)",
			expectedStatus: "allowed: false",
			actualStatus: `allowed: ${allowed}`,
			status: isFixed ? "FIXED" : "FAIL",
			vulnerabilitySeverity: "MEDIUM",
			details: `Checked if owner can access org with status: 'suspended'. Result: allowed=${allowed}`,
		});
	}

	// ------------------------------------------------------------
	// GROUP 2: RBAC MATRIX & PRIVILEGE ESCALATION TESTS
	// ------------------------------------------------------------

	// Matrix of permissions to test for each role
	const samplePermissions = [
		"organization.deleteOrganization",
		"organization.manageSettings",
		"organization.assignRole",
		"organization.manageCourses",
		"organization.createProblem",
		"organization.editProblem",
		"organization.deleteProblem",
		"organization.assignHomework",
		"organization.viewInstructorMetrics",
		"organization.manageCertificates",
		"organization.issueCertificates",
		"organization.manageTeams",
		"organization.viewAuditLogs",
	];

	const roleActors = [
		{ role: "owner", uid: USERS.OWNER_A },
		{ role: "admin", uid: USERS.ADMIN_A },
		{ role: "coach", uid: USERS.COACH_A },
		{ role: "instructor", uid: USERS.INSTRUCTOR_A },
		{ role: "ta", uid: USERS.TA_A },
		{ role: "member", uid: USERS.MEMBER_A },
	];

	for (const actor of roleActors) {
		for (const perm of samplePermissions) {
			const { allowed } = await checkOrgPermission(ORG_A_ID, actor.uid, perm);
			const expectedAllowed =
				actor.role === "owner"
					? true
					: actor.role === "admin"
					? perm !== "organization.deleteOrganization"
					: SYSTEM_ROLES_TEMPLATES.find((r) => r.id === actor.role)?.permissions?.includes(perm) || false;

			const match = allowed === expectedAllowed;
			testResults.push({
				id: `TC_RBAC_${actor.role.toUpperCase()}_${perm.replace("organization.", "").toUpperCase()}`,
				category: "RBAC Matrix Verification",
				title: `Role ${actor.role.toUpperCase()} - ${perm}`,
				description: `Validate permission check for ${perm} matches system template definition`,
				roleOrActor: actor.role.toUpperCase(),
				targetResource: `Permission: ${perm}`,
				expectedStatus: expectedAllowed ? "ALLOWED" : "DENIED",
				actualStatus: allowed ? "ALLOWED" : "DENIED",
				status: match ? "PASS" : "FAIL",
				details: `Role ${actor.role} permission ${perm}: got ${allowed}, expected ${expectedAllowed}`,
			});
		}
	}

	// Vertical Escalation: Member attempts Organization Settings Update
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID },
			body: { displayName: "Defaced Workspace Name" },
			token: tokenMemberA,
		});
		await orgDetailHandler(req, res);

		const isPass = res.statusCode === 403;
		testResults.push({
			id: "TC_ESC_001",
			category: "Vertical Privilege Escalation",
			title: "Member Modifying Workspace Settings Prevention",
			description: "Verify standard Member cannot update organization branding/settings",
			roleOrActor: "MEMBER_A",
			targetResource: "organizations (Org A Settings)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			vulnerabilitySeverity: "HIGH",
			details: `Member A attempted to PATCH org settings. Response: ${res.statusCode}`,
		});
	}

	// Vertical Escalation: Admin attempts Organization Deletion
	{
		const { req, res } = mockReqRes({
			method: "DELETE",
			query: { id: ORG_A_ID },
			token: tokenAdminA,
		});
		await orgDetailHandler(req, res);

		const isPass = res.statusCode === 403;
		testResults.push({
			id: "TC_ESC_002",
			category: "Vertical Privilege Escalation",
			title: "Admin Deleting Organization Prevention",
			description: "Verify Workspace Admin cannot delete organization (Owner only privilege)",
			roleOrActor: "ADMIN_A",
			targetResource: "organizations (Org A)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Admin A attempted DELETE on Org A. Response: ${res.statusCode}`,
		});
	}

	// Horizontal Escalation: Admin A attempts to change settings of Org B
	{
		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_B_ID },
			body: { description: "Cross-tenant defacement" },
			token: tokenAdminA,
		});
		await orgDetailHandler(req, res);

		const isPass = res.statusCode === 403;
		testResults.push({
			id: "TC_ESC_003",
			category: "Horizontal Privilege Escalation",
			title: "Cross-Tenant Admin Settings Modification Prevention",
			description: "Verify Admin in Org A cannot alter settings of Org B",
			roleOrActor: "ADMIN_A",
			targetResource: "organizations (Org B)",
			expectedStatus: 403,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			vulnerabilitySeverity: "CRITICAL",
			details: `Admin A attempted to modify Org B. Response: ${res.statusCode}`,
		});
	}

	// ------------------------------------------------------------
	// GROUP 3: FUNCTIONAL LIFECYCLE WORKFLOWS
	// ------------------------------------------------------------

	// Test: Course Creation by Instructor
	{
		const { req, res } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID },
			body: {
				code: "CS-301",
				title: "Distributed Systems & Cloud Computing",
				semester: "Fall 2026",
				syllabus: "Consensus protocols, Raft, Paxos, and multi-tenant cloud storage.",
			},
			token: tokenInstructorA,
		});
		await coursesHandler(req, res);

		const isPass = res.statusCode === 201 && res.data?.course?.id;
		testResults.push({
			id: "TC_FUNC_001",
			category: "Course Management",
			title: "Course Creation Workflow",
			description: "Verify Instructor can create a new course with code, title, and semester",
			roleOrActor: "INSTRUCTOR_A",
			targetResource: "organizationCourses",
			expectedStatus: 201,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Instructor A created course CS-301. ID: ${res.data?.course?.id}`,
			evidence: res.data?.course,
		});
	}

	// Test: Course Material Upload by Instructor
	{
		const { req, res } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_A" },
			body: {
				title: "Week 2: Advanced Graph Algorithms",
				type: "slides",
				url: "https://beastcode.qa/slides/week2.pdf",
			},
			token: tokenInstructorA,
		});
		await courseMaterialsHandler(req, res);

		const isPass = res.statusCode === 201 && res.data?.material?.id;
		testResults.push({
			id: "TC_FUNC_002",
			category: "Course Management",
			title: "Course Material Upload Workflow",
			description: "Verify Instructor can publish lecture slides and materials",
			roleOrActor: "INSTRUCTOR_A",
			targetResource: "organizationCourseMaterials",
			expectedStatus: 201,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Instructor A uploaded material. ID: ${res.data?.material?.id}`,
			evidence: res.data?.material,
		});
	}

	// Test: Certificate Issuance by Coach/Instructor
	{
		const { req, res } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID },
			body: {
				candidateUid: USERS.MEMBER_A,
				courseId: "QA_COURSE_A",
				criteria: "Excellence in Competitive Algorithms (Top 1%)",
				signeeName: "Dr. BeastCode",
				signeeRole: "Lead Algorithms Coach",
			},
			token: tokenCoachA,
		});
		await certificatesHandler(req, res);

		const isPass = res.statusCode === 201 && !!(res.data?.certificate?.qrCodeDataUrl || res.data?.certificate?.qrCodeUrl);
		testResults.push({
			id: "TC_FUNC_003",
			category: "Certificates",
			title: "Certificate Issuance & Verification QR Code Generation",
			description: "Verify Coach can issue certificate with QR code URL",
			roleOrActor: "COACH_A",
			targetResource: "organizationCertificates",
			expectedStatus: 201,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Certificate issued. ID: ${res.data?.certificate?.id}, QR URL: ${res.data?.certificate?.qrCodeDataUrl || res.data?.certificate?.qrCodeUrl}`,
			evidence: res.data?.certificate,
		});
	}

	// Test: Gradebook Student Self-Lookup
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_A" },
			token: tokenMemberA,
		});
		await gradebookHandler(req, res);

		const isPass = res.statusCode === 200 && res.data?.grades?.finalGrade === "A+";
		testResults.push({
			id: "TC_FUNC_004",
			category: "Gradebook",
			title: "Student Gradebook Self-Inspection",
			description: "Verify enrolled student can view their personal grade record",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationGradebook (Course A)",
			expectedStatus: 200,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Student looked up grades. Final Grade: ${res.data?.grades?.finalGrade}`,
			evidence: res.data?.grades,
		});
	}

	// Test: Gradebook CSV Export by Instructor
	{
		const { req, res } = mockReqRes({
			method: "GET",
			query: { id: ORG_A_ID, courseId: "QA_COURSE_A", exportFormat: "csv" },
			token: tokenInstructorA,
		});
		await gradebookHandler(req, res);

		const isPass = res.statusCode === 200 && typeof res.data === "string" && res.data.includes("Student UID");
		testResults.push({
			id: "TC_FUNC_005",
			category: "Gradebook",
			title: "Gradebook CSV Export Generation",
			description: "Verify Instructor can export gradebook roster in CSV format",
			roleOrActor: "INSTRUCTOR_A",
			targetResource: "organizationGradebook (Course A CSV)",
			expectedStatus: 200,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `CSV export completed. Content starts with: ${typeof res.data === "string" ? res.data.slice(0, 50) : "N/A"}`,
		});
	}

	// Test: Private Problem Rollback Workflow
	{
		// First update problem to version 2
		await db.collection("organizationProblemVersions").doc(`${ORG_A_ID}_QA_PROB_A_v1`).set({
			id: `${ORG_A_ID}_QA_PROB_A_v1`,
			problemId: "QA_PROB_A",
			version: 1,
			title: "Alpha Graph Kernel Optimization (v1)",
			description: "Original v1 description",
			difficulty: "Hard",
		});

		const { req, res } = mockReqRes({
			method: "PATCH",
			query: { id: ORG_A_ID, problemId: "QA_PROB_A" },
			body: { action: "rollback", versionNumber: 1 },
			token: tokenCoachA,
		});
		await problemDetailHandler(req, res);

		const isPass = res.statusCode === 200 && res.data?.problem?.version === 2; // Next version contains restored v1 snapshot
		testResults.push({
			id: "TC_FUNC_006",
			category: "Private Problems",
			title: "Private Problem Version Rollback Workflow",
			description: "Verify Coach can roll back problem statement to a previous historical version snapshot",
			roleOrActor: "COACH_A",
			targetResource: "organizationPrivateProblems (Problem A)",
			expectedStatus: 200,
			actualStatus: res.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Rollback applied. Current problem version: ${res.data?.problem?.version}`,
			evidence: res.data?.problem,
		});
	}

	// Test: Candidate Assessment Start & Submit Workflow
	{
		await db.collection("organizationAssessmentAttempts").doc(`QA_ASSESS_A_${USERS.MEMBER_A}`).delete();

		// Start
		const { req: startReq, res: startRes } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID, assessmentId: "QA_ASSESS_A" },
			body: { action: "start" },
			token: tokenMemberA,
		});
		await assessmentDetailHandler(startReq, startRes);

		// Submit
		const { req: subReq, res: subRes } = mockReqRes({
			method: "POST",
			query: { id: ORG_A_ID, assessmentId: "QA_ASSESS_A" },
			body: {
				action: "submit",
				submissions: {
					QA_PROB_A: { code: "class Solution: ...", score: 90, verdict: "Accepted" },
				},
			},
			token: tokenMemberA,
		});
		await assessmentDetailHandler(subReq, subRes);

		const isPass = subRes.statusCode === 200 && subRes.data?.score === 90;
		testResults.push({
			id: "TC_FUNC_007",
			category: "Assessments",
			title: "Candidate Assessment Attempt & Automated Evaluation",
			description: "Verify candidate can start assessment and submit solutions with automated score calculation",
			roleOrActor: "MEMBER_A",
			targetResource: "organizationAssessments (Assessment A)",
			expectedStatus: 200,
			actualStatus: subRes.statusCode,
			status: isPass ? "PASS" : "FAIL",
			details: `Candidate started and submitted. Final calculated score: ${subRes.data?.score}`,
			evidence: subRes.data,
		});
	}

	// Test: Audit Logging Verification
	{
		const auditSnap = await db
			.collection("organizationAuditLogs")
			.where("organizationId", "==", ORG_A_ID)
			.get();

		const hasLogs = !auditSnap.empty;
		testResults.push({
			id: "TC_FUNC_008",
			category: "Audit Logging",
			title: "Comprehensive Audit Log Recording",
			description: "Verify all sensitive events (course/problem/role updates) emit structured audit logs",
			roleOrActor: "SYSTEM",
			targetResource: "organizationAuditLogs (Org A)",
			expectedStatus: "AUDIT_RECORDS_FOUND",
			actualStatus: hasLogs ? `FOUND_${auditSnap.size}_RECORDS` : "NO_RECORDS",
			status: hasLogs ? "PASS" : "FAIL",
			details: `Total audit events logged for Org A: ${auditSnap.size}`,
			evidence: auditSnap.docs.slice(0, 3).map((d) => d.data()),
		});
	}

	// ------------------------------------------------------------
	// SUMMARY CALCULATION & EXPORT
	// ------------------------------------------------------------
	const total = testResults.length;
	const passed = testResults.filter((r) => r.status === "PASS").length;
	const fixed = testResults.filter((r) => r.status === "FIXED").length;
	const failed = testResults.filter((r) => r.status === "FAIL").length;

	console.log("\n============================================================");
	console.log("AUTOMATED TEST RESULTS SUMMARY:");
	console.log(`TOTAL TESTS:   ${total}`);
	console.log(`PASSED:        ${passed}`);
	console.log(`FIXED:         ${fixed}`);
	console.log(`FAILED:        ${failed}`);
	console.log("============================================================\n");

	// Ensure evidence folder exists
	const evidenceDir = path.resolve(process.cwd(), "organization-validation-evidence");
	if (!fs.existsSync(evidenceDir)) {
		fs.mkdirSync(evidenceDir, { recursive: true });
	}

	const resultsPath = path.join(evidenceDir, "test-results.json");
	fs.writeFileSync(
		resultsPath,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				summary: { total, passed, fixed, failed },
				results: testResults,
			},
			null,
			2
		)
	);

	console.log(`Test results saved to ${resultsPath}`);
	return { total, passed, fixed, failed, testResults };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("test-org-validation.ts")) {
	runAllTests()
		.then(() => {
			console.log("Automated test run finished successfully.");
		})
		.catch((err) => {
			console.error("Test execution encountered an error:", err);
			process.exit(1);
		});
}
