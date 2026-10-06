import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import {
	checkRateLimit,
	resolveOrgAndMembership,
	OrganizationJoinRequest,
} from "@/utils/orgEngine";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	const db = getAdminFirestore();
	const uid = req.user?.uid;
	const { id } = req.query;
	const orgIdentifier = id as string;

	if (!uid) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	// Resolve org and membership status
	const { org, member } = await resolveOrgAndMembership(orgIdentifier, uid);
	if (!org) {
		return res.status(404).json({ success: false, error: "Not Found: Organization does not exist" });
	}

	// POST - Create Join Request
	if (req.method === "POST") {
		try {
			// Cooldown rate-limit: 5 applications per day max
			const passedLimit = await checkRateLimit(uid, "org.join_request", 5, 86400);
			if (!passedLimit) {
				return res.status(429).json({ success: false, error: "Rate Limited: Maximum 5 join requests per day." });
			}

			if (member && member.status === "active") {
				return res.status(400).json({ success: false, error: "Validation Error: You are already a member of this organization" });
			}

			const { message = "" } = req.body;

			// Check if a request already exists with status 'Pending'
			const existingReqSnap = await db
				.collection("organizationJoinRequests")
				.where("organizationId", "==", org.id)
				.where("uid", "==", uid)
				.where("status", "==", "Pending")
				.limit(1)
				.get();

			if (!existingReqSnap.empty) {
				return res.status(409).json({ success: false, error: "Conflict: You already have a pending join request" });
			}

			const requestId = `${org.id}_${uid}`;
			const newRequest: OrganizationJoinRequest = {
				requestId,
				organizationId: org.id,
				uid,
				message: message.trim().substring(0, 500),
				status: "Pending",
				submittedAt: Date.now(),
				reviewedBy: null,
				reviewedAt: null,
				adminNote: null,
			};

			await db.collection("organizationJoinRequests").doc(requestId).set(newRequest);

			return res.status(201).json({ success: true, message: "Join request submitted successfully", request: newRequest });
		} catch (error: any) {
			console.error("POST /api/organizations/:id/join error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	// DELETE - Cancel Join Request
	if (req.method === "DELETE") {
		try {
			const requestId = `${org.id}_${uid}`;
			const requestRef = db.collection("organizationJoinRequests").doc(requestId);
			const requestSnap = await requestRef.get();

			if (!requestSnap.exists) {
				return res.status(404).json({ success: false, error: "Not Found: Join request not found" });
			}

			const requestData = requestSnap.data();
			if (requestData?.status !== "Pending") {
				return res.status(400).json({ success: false, error: `Validation Error: Cannot cancel a request that is already ${requestData?.status}` });
			}

			// Update to Cancelled
			await requestRef.update({
				status: "Cancelled",
			});

			return res.status(200).json({ success: true, message: "Join request cancelled successfully" });
		} catch (error: any) {
			console.error("DELETE /api/organizations/:id/join error:", error);
			return res.status(500).json({ success: false, error: "Internal Error" });
		}
	}

	return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
