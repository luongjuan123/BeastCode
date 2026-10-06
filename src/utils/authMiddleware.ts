import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { verifyPlatformAdmin } from "./withAdminGuard";

export interface AuthenticatedRequest extends NextApiRequest {
	user?: {
		uid: string;
		email?: string;
		role?: string;
		isAdmin?: boolean;
	};
}

export type AuthenticatedHandler = (
	req: AuthenticatedRequest,
	res: NextApiResponse
) => void | Promise<void>;

/**
 * Higher-Order Function to authenticate requests and reject banned users.
 */
export function withAuthAndModeration(handler: AuthenticatedHandler, options?: { requireAdmin?: boolean }) {
	return async (req: AuthenticatedRequest, res: NextApiResponse) => {
		let idToken = "";
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			idToken = authHeader.substring(7).trim();
		} else if (req.body && req.body.idToken) {
			idToken = typeof req.body.idToken === "string" ? req.body.idToken.trim() : "";
		} else if (req.query && req.query.idToken) {
			idToken = typeof req.query.idToken === "string" ? req.query.idToken.trim() : "";
		}

		const isPublicAttachment = req.query && req.query.path && typeof req.query.path === "string" && req.query.path.startsWith("avatars/");
		if (isPublicAttachment) {
			return handler(req, res);
		}

		if (!idToken) {
			return res.status(401).json({ success: false, error: "Authentication required" });
		}

		try {
			const adminAuth = getAdminAuth();
			const decodedToken = await adminAuth.verifyIdToken(idToken, true);
			const uid = decodedToken.uid;

			const db = getAdminFirestore();

			// Check moderation state
			const modDoc = await db.collection("userModeration").doc(uid).get();
			if (modDoc.exists) {
				const modData = modDoc.data() || {};
				if (modData.status === "BANNED") {
					if (modData.expiresAt && Date.now() > modData.expiresAt) {
						// Auto-unban
						await db.collection("userModeration").doc(uid).update({
							status: "ACTIVE",
							expiresAt: null,
						});
						await db.collection("moderationLogs").add({
							adminUid: "SYSTEM",
							targetUid: uid,
							action: "UNBAN",
							timestamp: Date.now(),
							reason: "Temporary ban expired",
							duration: "N/A",
							ip: req.socket.remoteAddress || "127.0.0.1",
							oldState: "BANNED",
							newState: "ACTIVE"
						});
					} else {
						return res.status(403).json({
							success: false,
							error: {
								code: "BANNED",
								message: "This account has been suspended.",
								reason: modData.reason || "Violation of terms",
								duration: modData.duration || "Permanent",
								referenceId: modData.caseId || uid.substring(0, 8).toUpperCase()
							}
						});
					}
				}
				if (modData.status === "PENDING_DELETION") {
					const isAllowedRoute = req.url?.startsWith("/api/moderation/appeal") || req.url?.startsWith("/api/auth/check-status");
					if (!isAllowedRoute) {
						return res.status(403).json({
							success: false,
							error: {
								code: "PENDING_DELETION",
								message: "Your account is currently scheduled for deletion.",
								referenceId: modData.caseId || uid.substring(0, 8).toUpperCase()
							}
						});
					}
				}
			}

			// Verify platform admin privileges if required
			const { isPlatformAdmin, role: adminRole } = await verifyPlatformAdmin(uid, decodedToken);

			if (options?.requireAdmin && !isPlatformAdmin) {
				return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
			}

			const userDoc = await db.collection("users").doc(uid).get();
			const userData = userDoc.exists ? (userDoc.data() || {}) : {};

			req.user = {
				uid,
				email: decodedToken.email,
				role: isPlatformAdmin ? adminRole : (userData.role || "user"),
				isAdmin: isPlatformAdmin
			};

			return handler(req, res);
		} catch (error: any) {
			console.error("Auth & Moderation verification error:", error);
			return res.status(401).json({ success: false, error: "Invalid or expired session token." });
		}
	};
}
