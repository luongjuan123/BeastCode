import { getAdminFirestore } from "@/firebase/firebaseAdmin";

export type OrgRole =
	| "owner"
	| "admin"
	| "moderator"
	| "contest_manager"
	| "problem_manager"
	| "recruiter"
	| "announcement_manager"
	| "member"
	| "guest";

export type OrgPermission =
	| "VIEW_ORG"
	| "MANAGE_SETTINGS"
	| "DELETE_ORG"
	| "MANAGE_MEMBERS"
	| "INVITE_MEMBERS"
	| "APPROVE_JOIN_REQUESTS"
	| "MANAGE_CONTESTS"
	| "MANAGE_PROBLEMS"
	| "MANAGE_ANNOUNCEMENTS"
	| "MANAGE_RECRUITMENT"
	| "UPLOAD_FILES"
	| "VIEW_AUDIT_LOGS"
	| "VIEW_ANALYTICS";

const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
	owner: [
		"VIEW_ORG",
		"MANAGE_SETTINGS",
		"DELETE_ORG",
		"MANAGE_MEMBERS",
		"INVITE_MEMBERS",
		"APPROVE_JOIN_REQUESTS",
		"MANAGE_CONTESTS",
		"MANAGE_PROBLEMS",
		"MANAGE_ANNOUNCEMENTS",
		"MANAGE_RECRUITMENT",
		"UPLOAD_FILES",
		"VIEW_AUDIT_LOGS",
		"VIEW_ANALYTICS",
	],
	admin: [
		"VIEW_ORG",
		"MANAGE_SETTINGS",
		"MANAGE_MEMBERS",
		"INVITE_MEMBERS",
		"APPROVE_JOIN_REQUESTS",
		"MANAGE_CONTESTS",
		"MANAGE_PROBLEMS",
		"MANAGE_ANNOUNCEMENTS",
		"MANAGE_RECRUITMENT",
		"UPLOAD_FILES",
		"VIEW_AUDIT_LOGS",
		"VIEW_ANALYTICS",
	],
	moderator: [
		"VIEW_ORG",
		"MANAGE_MEMBERS",
		"INVITE_MEMBERS",
		"APPROVE_JOIN_REQUESTS",
		"MANAGE_ANNOUNCEMENTS",
		"UPLOAD_FILES",
		"VIEW_AUDIT_LOGS",
		"VIEW_ANALYTICS",
	],
	contest_manager: ["VIEW_ORG", "MANAGE_CONTESTS", "UPLOAD_FILES"],
	problem_manager: ["VIEW_ORG", "MANAGE_PROBLEMS", "UPLOAD_FILES"],
	recruiter: ["VIEW_ORG", "MANAGE_RECRUITMENT", "INVITE_MEMBERS", "APPROVE_JOIN_REQUESTS"],
	announcement_manager: ["VIEW_ORG", "MANAGE_ANNOUNCEMENTS"],
	member: ["VIEW_ORG", "UPLOAD_FILES"],
	guest: ["VIEW_ORG"],
};

export function hasPermission(role: OrgRole, permission: OrgPermission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export async function getMemberRoleAndStatus(
	orgSlug: string,
	uid: string
): Promise<{ role: OrgRole | null; status: "active" | "suspended" | null }> {
	const db = getAdminFirestore();
	const memberDoc = await db
		.collection("organizationMembers")
		.doc(`${orgSlug}_${uid}`)
		.get();

	if (!memberDoc.exists) {
		return { role: null, status: null };
	}

	const data = memberDoc.data();
	return {
		role: (data?.role || "member") as OrgRole,
		status: (data?.status || "active") as "active" | "suspended",
	};
}

export async function verifyUserPermission(
	orgSlug: string,
	uid: string,
	permission: OrgPermission
): Promise<{ allowed: boolean; role: OrgRole | null; org: any | null }> {
	const db = getAdminFirestore();

	// Fetch organization to verify visibility and status
	const orgDoc = await db.collection("organizations").doc(orgSlug).get();
	if (!orgDoc.exists) {
		return { allowed: false, role: null, org: null };
	}

	const org = orgDoc.data();
	if (org?.status === "deleted" || org?.status === "suspended" || org?.state === "deleted" || org?.state === "suspended") {
		// Even owners cannot access suspended/deleted orgs via normal API
		return { allowed: false, role: null, org };
	}

	// Fetch user member doc
	const { role, status } = await getMemberRoleAndStatus(orgSlug, uid);

	if (status === "suspended") {
		return { allowed: false, role, org };
	}

	// Owner check bypass
	if (role === "owner" || org?.ownerUid === uid) {
		return { allowed: true, role: "owner", org };
	}

	// If it is a public view permission and organization is public, it's allowed
	if (permission === "VIEW_ORG" && org?.visibility === "public") {
		return { allowed: true, role, org };
	}

	if (!role) {
		return { allowed: false, role: null, org };
	}

	const allowed = hasPermission(role, permission);
	return { allowed, role, org };
}

export async function logOrgAction(
	orgSlug: string,
	actorUid: string,
	actorName: string,
	action: string,
	target: string,
	metadata: any = {},
	ip: string = "unknown"
) {
	try {
		const db = getAdminFirestore();
		await db.collection("organizationAuditLogs").add({
			orgSlug,
			timestamp: Date.now(),
			actorUid,
			actorName,
			action,
			target,
			metadata,
			ip,
		});
	} catch (error) {
		console.error("Failed to log organization audit log:", error);
	}
}
