import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getAdminAuth, getAdminFirestore } from "../../../src/firebase/firebaseAdmin";
import { Conversation, UserConversationMeta } from "../../../src/types/chat";
import fs from "fs";
import path from "path";

export interface TestUser {
	uid: string;
	email: string;
	password: string;
	displayName: string;
	emailVerified?: boolean;
	username: string;
	role: string;
	idToken: string;
	customToken: string;
}

export interface TestFixture {
	runId: string;
	userA: TestUser;
	userB: TestUser;
	userC: TestUser; // Outsider
	userD: TestUser; // Blocked
	staffUser: TestUser;
	adminUser: TestUser;
	directConvId: string;
	orgId: string;
	orgSlug: string;
	generalChannelId: string;
	announcementsChannelId: string;
}

export function generateRunId(): string {
	const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
	const rand = Math.random().toString(36).substring(2, 7);
	return `qa_${timestamp}_${rand}`;
}

async function exchangeCustomToken(customToken: string): Promise<string> {
	const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
	if (!apiKey) {
		throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not defined in environment");
	}

	const res = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: customToken, returnSecureToken: true }),
		}
	);

	const data = await res.json();
	if (!data.idToken) {
		throw new Error(`Failed to exchange custom token: ${JSON.stringify(data)}`);
	}
	return data.idToken;
}

export async function provisionTestUser(
	uid: string,
	email: string,
	displayName: string,
	username: string,
	role: string = "user",
	isAdmin: boolean = false
): Promise<TestUser> {
	const auth = getAdminAuth();
	const db = getAdminFirestore();
	const password = "TestPassword123!";

	// Ensure auth user exists
	try {
		await auth.getUser(uid);
		await auth.updateUser(uid, {
			email,
			password,
			displayName, emailVerified: true,
		});
	} catch (err: any) {
		if (err.code === "auth/user-not-found" || err.message?.includes("not found")) {
			await auth.createUser({
				uid,
				email,
				password,
				displayName, emailVerified: true,
			});
		} else {
			throw err;
		}
	}

	// Upsert firestore user document
	await db.collection("users").doc(uid).set(
		{
			uid,
			email,
			displayName, emailVerified: true,
			username,
			role: isAdmin ? "admin" : role,
			isAdmin: !!isAdmin, isOnboarded: true,
			updatedAt: Date.now(),
			createdAt: Date.now(),
		},
		{ merge: true }
	);

	// Mint custom token and exchange for ID token
	const customToken = await auth.createCustomToken(uid, isAdmin ? { admin: true } : {});
	const idToken = await exchangeCustomToken(customToken);

	return {
		uid,
		email,
		password,
		displayName,
		username,
		role,
		idToken,
		customToken,
	};
}

export async function seedTestEnvironment(runId: string): Promise<TestFixture> {
	const db = getAdminFirestore();
	const suffix = runId.slice(-6);

	// 1. Provision 6 distinct test accounts
	const [userA, userB, userC, userD, staffUser, adminUser] = await Promise.all([
		provisionTestUser(`qa_user_a_${suffix}`, `qa_a_${suffix}@beastcode.test`, `User A (${suffix})`, `usera_${suffix}`, "user", false),
		provisionTestUser(`qa_user_b_${suffix}`, `qa_b_${suffix}@beastcode.test`, `User B (${suffix})`, `userb_${suffix}`, "user", false),
		provisionTestUser(`qa_user_c_${suffix}`, `qa_c_${suffix}@beastcode.test`, `Outsider C (${suffix})`, `userc_${suffix}`, "user", false),
		provisionTestUser(`qa_user_d_${suffix}`, `qa_d_${suffix}@beastcode.test`, `Blocked D (${suffix})`, `userd_${suffix}`, "user", false),
		provisionTestUser(`qa_staff_${suffix}`, `qa_staff_${suffix}@beastcode.test`, `Org Staff (${suffix})`, `staff_${suffix}`, "user", false),
		provisionTestUser(`qa_admin_${suffix}`, `qa_admin_${suffix}@beastcode.test`, `Platform Admin (${suffix})`, `admin_${suffix}`, "admin", true),
	]);

	// 2. Provision Test Organization
	const orgId = `org_${runId}`;
	const orgSlug = `qa-org-${suffix}`;
	const now = Date.now();

	await db.collection("organizations").doc(orgId).set({
		id: orgId,
		slug: orgSlug,
		name: `QA Organization ${suffix}`,
		displayName: `QA Organization ${suffix}`,
		shortName: `QAOrg`,
		description: `Test organization for automated QA suite ${runId}`,
		avatar: "",
		banner: "",
		organizationType: "Club",
		visibility: "public",
		verified: true,
		website: "https://beastcode.test",
		country: "US",
		city: "Testville",
		location: "Online",
		email: staffUser.email,
		contactPhone: "+1000000000",
		socialLinks: {},
		memberCount: 2,
		contestCount: 0,
		problemCount: 0,
		announcementCount: 0,
		fileCount: 0,
		createdBy: staffUser.uid,
		ownerUid: staffUser.uid,
		status: "active",
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
	});

	// 3. Add Members: Staff (coach/owner) and User A (regular member)
	await Promise.all([
		db.collection("organizationMembers").doc(`${orgId}_${staffUser.uid}`).set({
			organizationId: orgId,
			uid: staffUser.uid,
			roleId: "owner",
			nickname: "Staff Member",
			title: "Coach",
			department: "Engineering",
			status: "active",
			joinedAt: now,
			joinedBy: staffUser.uid,
			lastActive: now,
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		}),
		db.collection("organizationMembers").doc(`${orgId}_${userA.uid}`).set({
			organizationId: orgId,
			uid: userA.uid,
			roleId: "member",
			nickname: "Student A",
			title: "Student",
			department: "Engineering",
			status: "active",
			joinedAt: now,
			joinedBy: staffUser.uid,
			lastActive: now,
			permissionsVersion: 1,
			isHidden: false,
			isFavorite: false,
		}),
	]);

	// 4. Setup Block: User A blocks User D
	await db.collection("userBlocks").doc(`${userA.uid}_${userD.uid}`).set({
		blockerUid: userA.uid,
		blockedUid: userD.uid,
		createdAt: now,
	});

	// 5. Setup Direct Conversation between User A and User B
	const sortedUids = [userA.uid, userB.uid].sort();
	const directConvId = `dm_${sortedUids.join("_")}`;

	const directConvData: Omit<Conversation, "id"> = {
		type: "direct",
		title: userB.displayName,
		participantUids: sortedUids,
		participantDetails: {
			[userA.uid]: {
				displayName: userA.displayName,
				username: userA.username,
				avatarUrl: "",
			},
			[userB.uid]: {
				displayName: userB.displayName,
				username: userB.username,
				avatarUrl: "",
			},
		},
		lastActivityAt: now,
		lastMessagePreview: "Direct conversation initialized",
		lastMessageSenderId: userA.uid,
		lastMessageSenderName: userA.displayName,
		lastMessageType: "system",
		createdBy: userA.uid,
		createdAt: now,
		updatedAt: now,
	};
	await db.collection("conversations").doc(directConvId).set(directConvData);

	// Initialize user conversation meta for A and B
	await Promise.all([
		db.collection("userConversationMeta").doc(`${userA.uid}_${directConvId}`).set({
			uid: userA.uid,
			conversationId: directConvId,
			lastReadAt: now,
			updatedAt: now,
		}),
		db.collection("userConversationMeta").doc(`${userB.uid}_${directConvId}`).set({
			uid: userB.uid,
			conversationId: directConvId,
			lastReadAt: 0,
			updatedAt: now,
		}),
	]);

	// 6. Setup Organization Channels
	const generalChannelId = `org_${orgId}_general`;
	await db.collection("conversations").doc(generalChannelId).set({
		type: "organization_channel",
		title: "General",
		description: "General discussion for QA Org",
		organizationId: orgId,
		organizationSlug: orgSlug,
		organizationName: `QA Organization ${suffix}`,
		organizationAvatar: "",
		channelType: "general",
		participantUids: [],
		lastActivityAt: now,
		lastMessagePreview: "Channel created",
		lastMessageSenderId: staffUser.uid,
		lastMessageSenderName: "System",
		lastMessageType: "system",
		createdBy: staffUser.uid,
		createdAt: now,
		updatedAt: now,
		isAnnouncement: false,
	});

	const announcementsChannelId = `org_${orgId}_announcements`;
	await db.collection("conversations").doc(announcementsChannelId).set({
		type: "organization_channel",
		title: "Announcements",
		description: "Staff announcements for QA Org",
		organizationId: orgId,
		organizationSlug: orgSlug,
		organizationName: `QA Organization ${suffix}`,
		organizationAvatar: "",
		channelType: "announcements",
		participantUids: [],
		lastActivityAt: now,
		lastMessagePreview: "Channel created",
		lastMessageSenderId: staffUser.uid,
		lastMessageSenderName: "System",
		lastMessageType: "system",
		createdBy: staffUser.uid,
		createdAt: now,
		updatedAt: now,
		isAnnouncement: true,
	});

	return {
		runId,
		userA,
		userB,
		userC,
		userD,
		staffUser,
		adminUser,
		directConvId,
		orgId,
		orgSlug,
		generalChannelId,
		announcementsChannelId,
	};
}

export async function cleanupTestData(fixture: TestFixture | null, runId?: string): Promise<void> {
	const targetRunId = fixture?.runId || runId;
	if (!targetRunId) return;

	const db = getAdminFirestore();
	const auth = getAdminAuth();
	const suffix = targetRunId.slice(-6);

	const uids = fixture
		? [
				fixture.userA.uid,
				fixture.userB.uid,
				fixture.userC.uid,
				fixture.userD.uid,
				fixture.staffUser.uid,
				fixture.adminUser.uid,
		  ]
		: [
				`qa_user_a_${suffix}`,
				`qa_user_b_${suffix}`,
				`qa_user_c_${suffix}`,
				`qa_user_d_${suffix}`,
				`qa_staff_${suffix}`,
				`qa_admin_${suffix}`,
		  ];

	// 1. Delete users from Admin Auth
	for (const uid of uids) {
		try {
			await auth.deleteUser(uid);
		} catch (e) {}
	}

	// 2. Delete Firestore users docs
	for (const uid of uids) {
		try {
			await db.collection("users").doc(uid).delete();
		} catch (e) {}
	}

	// 3. Delete conversations and their subcollections
	const convIdsToDelete: string[] = [];
	if (fixture) {
		convIdsToDelete.push(fixture.directConvId, fixture.generalChannelId, fixture.announcementsChannelId);
	}

	try {
		const orgConvsSnap = await db.collection("conversations")
			.where("organizationId", "==", `org_${targetRunId}`)
			.get();
		orgConvsSnap.forEach((d) => convIdsToDelete.push(d.id));
	} catch (e) {}

	const uniqueConvIds = Array.from(new Set(convIdsToDelete));
	for (const cid of uniqueConvIds) {
		try {
			const convRef = db.collection("conversations").doc(cid);
			const messagesSnap = await convRef.collection("messages").limit(100).get();
			for (const m of messagesSnap.docs) {
				await m.ref.delete();
			}
			const typingSnap = await convRef.collection("typing").limit(100).get();
			for (const t of typingSnap.docs) {
				await t.ref.delete();
			}
			await convRef.delete();
		} catch (e) {}
	}

	// 4. Delete userBlocks
	if (fixture) {
		try {
			await db.collection("userBlocks").doc(`${fixture.userA.uid}_${fixture.userD.uid}`).delete();
		} catch (e) {}
	}

	// 5. Delete organization and members
	const orgId = fixture?.orgId || `org_${targetRunId}`;
	try {
		await db.collection("organizations").doc(orgId).delete();
		const membersSnap = await db.collection("organizationMembers").where("organizationId", "==", orgId).get();
		for (const m of membersSnap.docs) {
			await m.ref.delete();
		}
	} catch (e) {}

	// 6. Delete userConversationMeta
	for (const uid of uids) {
		try {
			const metasSnap = await db.collection("userConversationMeta").where("uid", "==", uid).get();
			for (const m of metasSnap.docs) {
				await m.ref.delete();
			}
		} catch (e) {}
	}

	// 7. Clean up local uploaded files if any
	try {
		for (const cid of uniqueConvIds) {
			const uploadDir = path.join(process.cwd(), "uploads", "chat", cid);
			if (fs.existsSync(uploadDir)) {
				fs.rmSync(uploadDir, { recursive: true, force: true });
			}
		}
	} catch (e) {}
}
