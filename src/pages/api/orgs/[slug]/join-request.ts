import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { verifyUserPermission, logOrgAction } from "@/utils/orgPermissions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const { slug } = req.query;
	const orgSlug = slug as string;
	const uid = req.user?.uid;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	if (req.method === "POST") {
		// Submit join request
		try {
			const orgDoc = await db.collection("organizations").doc(orgSlug).get();
			if (!orgDoc.exists) {
				return res.status(404).json({ success: false, error: "Organization not found." });
			}

			const org = orgDoc.data() || {};
			if (org.state !== "active") {
				return res.status(400).json({ success: false, error: "Organization is not active." });
			}

			if (org.visibility === "secret") {
				return res.status(403).json({ success: false, error: "Secret organizations cannot be joined by request." });
			}

			// Check if already member
			const memberDoc = await db.collection("organizationMembers").doc(`${orgSlug}_${uid}`).get();
			if (memberDoc.exists) {
				return res.status(400).json({ success: false, error: "You are already a member of this organization." });
			}

			const { message } = req.body;

			// Check if there is already a pending request
			const existingReq = await db.collection("organizationJoinRequests").doc(`${orgSlug}_${uid}`).get();
			if (existingReq.exists && existingReq.data()?.status === "pending") {
				return res.status(400).json({ success: false, error: "You already have a pending join request." });
			}

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			const newRequest = {
				orgSlug,
				uid,
				displayName: userData.displayName || "Anonymous",
				username: userData.username || "",
				avatarUrl: userData.avatarUrl || "",
				status: "pending",
				message: (message || "").trim(),
				createdAt: Date.now(),
			};

			await db.collection("organizationJoinRequests").doc(`${orgSlug}_${uid}`).set(newRequest);

			await logOrgAction(
				orgSlug,
				uid,
				userData.displayName || "User",
				"JOIN_REQUEST_SUBMITTED",
				uid,
				{ message },
				req.socket.remoteAddress || "127.0.0.1"
			);

			// Add in-app notification to organization owner
			if (org.ownerUid) {
				await db.collection("notifications").add({
					userId: org.ownerUid,
					title: `New Join Request for ${org.name}`,
					message: `${userData.displayName} has requested to join ${org.name}.`,
					isRead: false,
					createdAt: Date.now(),
					type: "ORG_JOIN_REQUEST",
				}).catch(() => {});
			}

			return res.status(201).json({ success: true, message: "Join request submitted successfully." });
		} catch (error: any) {
			console.error("Submit join request error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "GET") {
		// List join requests (requires APPROVE_JOIN_REQUESTS permission)
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "APPROVE_JOIN_REQUESTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			const snapshot = await db
				.collection("organizationJoinRequests")
				.where("orgSlug", "==", orgSlug)
				.where("status", "==", "pending")
				.get();

			const list: any[] = [];
			snapshot.forEach((doc) => {
				list.push(doc.data());
			});

			return res.status(200).json({ success: true, requests: list });
		} catch (error: any) {
			console.error("GET join requests error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	if (req.method === "PUT") {
		// Approve/Reject join request
		try {
			const { allowed } = await verifyUserPermission(orgSlug, uid, "APPROVE_JOIN_REQUESTS");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied." });
			}

			const { targetUid, action } = req.body; // action: 'approve' | 'reject'
			if (!targetUid || !action) {
				return res.status(400).json({ success: false, error: "Target UID and action are required." });
			}

			const requestRef = db.collection("organizationJoinRequests").doc(`${orgSlug}_${targetUid}`);
			const requestDoc = await requestRef.get();
			if (!requestDoc.exists) {
				return res.status(404).json({ success: false, error: "Join request not found." });
			}

			const requestData = requestDoc.data();
			if (requestData?.status !== "pending") {
				return res.status(400).json({ success: false, error: "Join request has already been handled." });
			}

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.data() || {};

			if (action === "approve") {
				// Fetch target user's details
				const targetDoc = await db.collection("users").doc(targetUid).get();
				const targetData = targetDoc.data() || {};

				const newMember = {
					orgSlug,
					uid: targetUid,
					displayName: targetData.displayName || "Member",
					username: targetData.username || "",
					avatarUrl: targetData.avatarUrl || "",
					email: targetData.email || "",
					role: "member",
					joinedAt: Date.now(),
					problemsSolved: (targetData.solvedProblems || []).length,
					contestRating: targetData.contestRating || 0,
					status: "active",
				};

				const orgRef = db.collection("organizations").doc(orgSlug);

				await db.runTransaction(async (transaction) => {
					// 1. Update request status
					transaction.update(requestRef, {
						status: "approved",
						handledBy: uid,
						handledAt: Date.now(),
					});
					// 2. Add member
					transaction.set(db.collection("organizationMembers").doc(`${orgSlug}_${targetUid}`), newMember);
					// 3. Increment member count
					const orgDoc = await transaction.get(orgRef);
					if (orgDoc.exists) {
						const currentCount = orgDoc.data()?.memberCount || 0;
						transaction.update(orgRef, { memberCount: currentCount + 1 });
					}
				});

				await logOrgAction(
					orgSlug,
					uid,
					userData.displayName || "Admin",
					"JOIN_REQUEST_APPROVED",
					targetUid,
					{ displayName: targetData.displayName },
					req.socket.remoteAddress || "127.0.0.1"
				);

				// Notify user
				await db.collection("notifications").add({
					userId: targetUid,
					title: `Join Request Approved`,
					message: `Your request to join organization ${orgSlug} has been approved!`,
					isRead: false,
					createdAt: Date.now(),
					type: "ORG_JOIN_APPROVED",
				}).catch(() => {});

			} else if (action === "reject") {
				await requestRef.update({
					status: "rejected",
					handledBy: uid,
					handledAt: Date.now(),
				});

				await logOrgAction(
					orgSlug,
					uid,
					userData.displayName || "Admin",
					"JOIN_REQUEST_REJECTED",
					targetUid,
					{ displayName: requestData?.displayName },
					req.socket.remoteAddress || "127.0.0.1"
				);

				// Notify user
				await db.collection("notifications").add({
					userId: targetUid,
					title: `Join Request Rejected`,
					message: `Your request to join organization ${orgSlug} was rejected.`,
					isRead: false,
					createdAt: Date.now(),
					type: "ORG_JOIN_REJECTED",
				}).catch(() => {});
			} else {
				return res.status(400).json({ success: false, error: "Invalid action. Must be 'approve' or 'reject'." });
			}

			return res.status(200).json({ success: true, message: `Join request successfully ${action}d.` });
		} catch (error: any) {
			console.error("Handle join request error:", error);
			return res.status(500).json({ success: false, error: error.message });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
