import { TestRunContext } from "../reporting/testContext";
import { TestFixture } from "../fixtures/seedTestData";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, terminate, collection, getDocs, addDoc } from "firebase/firestore";
import assert from "assert";

export async function runRulesTests(ctx: TestRunContext, fixture: TestFixture) {
	console.log("\n--- Running Firestore Security Rules Tests (Client SDK) ---");

	const { userA, userB, userC, directConvId } = fixture;

	// Initialize client app for Outsider User C
	const appName = `client_rules_${Date.now()}`;
	const clientApp = initializeApp(
		{
			apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
			authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		},
		appName
	);

	const clientAuth = getAuth(clientApp);
	await signInWithCustomToken(clientAuth, userC.customToken);
	const clientDb = getFirestore(clientApp);

	try {
		// 1. CHAT-PERM-001: Firestore rules deny outsider User C reading /conversations/{cid}
		{
			const testId = "CHAT-PERM-001";
			const start = Date.now();
			try {
				let denied = false;
				try {
					const convRef = doc(clientDb, "conversations", directConvId);
					const snap = await getDoc(convRef);
					// If rules allow or document is accessible, check if denied
					if (!snap.exists()) {
						denied = false;
					}
				} catch (err: any) {
					if (err.code === "permission-denied" || err.message?.includes("insufficient permissions")) {
						denied = true;
					}
				}
				// Note: in firestore.rules line 322: allow read: if request.auth != null && (resource == null || isConversationParticipant(resource.data));
				// When doc exists and User C is not in participantUids, getDoc fails with permission-denied.
				assert.ok(denied, "Direct read of conversation by outsider User C must be denied by Firestore rules");
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Firestore rules denied conversation read with permission-denied");
				console.log(`  ✓ ${testId} - Firestore rules deny outsider conversation read`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// 2. CHAT-PERM-002: Firestore rules deny outsider User C reading /conversations/{cid}/messages
		{
			const testId = "CHAT-PERM-002";
			const start = Date.now();
			try {
				let denied = false;
				try {
					const messagesRef = collection(clientDb, "conversations", directConvId, "messages");
					await getDocs(messagesRef);
				} catch (err: any) {
					if (err.code === "permission-denied" || err.message?.includes("insufficient permissions")) {
						denied = true;
					}
				}
				assert.ok(denied, "Direct read of messages by outsider User C must be denied by Firestore rules");
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Firestore rules denied message list read with permission-denied");
				console.log(`  ✓ ${testId} - Firestore rules deny unauthorized message read`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// 3. CHAT-PERM-003: Firestore rules deny outsider User C creating messages in someone else's conversation
		{
			const testId = "CHAT-PERM-003";
			const start = Date.now();
			try {
				let denied = false;
				try {
					const msgRef = doc(clientDb, "conversations", directConvId, "messages", `outsider_msg_${Date.now()}`);
					await setDoc(msgRef, {
						senderId: userC.uid,
						text: "Rogue outsider message",
						createdAt: Date.now(),
					});
				} catch (err: any) {
					if (err.code === "permission-denied" || err.message?.includes("insufficient permissions")) {
						denied = true;
					}
				}
				// Note: in firestore.rules line 330: allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;
				// If rules allowed creation because it lacks isConversationParticipant check on create:
				if (!denied) {
					ctx.recordAttempt(testId, "FAIL", Date.now() - start, "VULNERABILITY: Firestore rules allow outsider User C to directly insert messages into conversations they do not belong to", "Missing isConversationParticipant check on message creation in firestore.rules");
					ctx.addDefect({
						defectId: "DEF-CHAT-002",
						testId,
						feature: "Security, Moderation & Blocking",
						title: "Firestore security rules allow message injection by non-participants",
						severity: "High",
						component: "firestore.rules:line 330",
						stepsToReproduce: "1. Authenticate as User C using client SDK.\n2. Attempt setDoc into /conversations/{directConvId}/messages/{mid} with senderId=UserC.uid.",
						expectedBehavior: "Rules must require isConversationParticipant(get(/databases/$(database)/documents/conversations/$(cid)).data) on message create.",
						actualBehavior: "Rules only verified request.resource.data.senderId == request.auth.uid, allowing non-participants to create messages directly via client SDK.",
						evidenceSnippet: "Write operation succeeded without permission-denied error",
					});
					console.warn(`  ✗ ${testId} - DEFECT DETECTED: Firestore rules omit participant check on message creation`);
				} else {
					ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Firestore rules denied outsider message creation");
					console.log(`  ✓ ${testId} - Firestore rules deny outsider message write`);
				}
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}

		// 4. CHAT-PERM-004: Firestore rules reject spoofed senderId in messages
		{
			const testId = "CHAT-PERM-004";
			const start = Date.now();
			try {
				let denied = false;
				try {
					const forgedMsgRef = doc(clientDb, "conversations", directConvId, "messages", `forged_${Date.now()}`);
					await setDoc(forgedMsgRef, {
						senderId: userA.uid, // User C claiming to be User A
						text: "Forged sender message",
						createdAt: Date.now(),
					});
				} catch (err: any) {
					if (err.code === "permission-denied" || err.message?.includes("insufficient permissions")) {
						denied = true;
					}
				}
				assert.ok(denied, "Forged senderId must be denied by Firestore rules");
				ctx.recordAttempt(testId, "PASS", Date.now() - start, undefined, "Firestore rules denied spoofed senderId with permission-denied");
				console.log(`  ✓ ${testId} - Firestore rules reject spoofed senderId`);
			} catch (err: any) {
				ctx.recordAttempt(testId, "FAIL", Date.now() - start, err.message, err.stack);
				console.error(`  ✗ ${testId} - Failed:`, err.message);
			}
		}
	} finally {
		await terminate(clientDb);
		await deleteApp(clientApp);
	}
}
