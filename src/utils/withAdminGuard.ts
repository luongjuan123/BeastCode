import { NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { AuthenticatedRequest, AuthenticatedHandler } from "./authMiddleware";

/**
 * Checks whether a given UID and decoded token possess valid platform administrator authority.
 * Verifies against the authoritative /platformAdmins collection and/or verified Firebase custom claims.
 * Fails closed.
 */
export async function verifyPlatformAdmin(
	uid: string,
	decodedToken: any
): Promise<{ isPlatformAdmin: boolean; role: string; email: string }> {
	if (!uid) {
		return { isPlatformAdmin: false, role: "user", email: "" };
	}

	const db = getAdminFirestore();

	// 1. Check moderation status: suspended or banned users cannot act as administrators
	const modDoc = await db.collection("userModeration").doc(uid).get();
	if (modDoc.exists) {
		const modData = modDoc.data() || {};
		if (modData.status === "BANNED" || modData.status === "PENDING_DELETION") {
			return { isPlatformAdmin: false, role: "user", email: decodedToken?.email || "" };
		}
	}

	// 2. Check authoritative /platformAdmins/{uid} record
	const adminDoc = await db.collection("platformAdmins").doc(uid).get();
	if (adminDoc.exists) {
		const adminData = adminDoc.data() || {};
		if (adminData.active === true && (adminData.role === "admin" || adminData.role === "super_admin")) {
			return {
				isPlatformAdmin: true,
				role: adminData.role,
				email: adminData.email || decodedToken?.email || ""
			};
		}
		// If explicitly marked inactive/revoked in platformAdmins, reject even if custom claim exists
		if (adminData.active === false) {
			return { isPlatformAdmin: false, role: "user", email: decodedToken?.email || "" };
		}
	}

	// 3. Fallback to verified custom claim
	if (decodedToken && (decodedToken.admin === true || decodedToken.role === "admin" || decodedToken.role === "super_admin")) {
		const claimRole = typeof decodedToken.role === "string" ? decodedToken.role : "admin";
		return {
			isPlatformAdmin: true,
			role: claimRole,
			email: decodedToken.email || ""
		};
	}

	return { isPlatformAdmin: false, role: "user", email: decodedToken?.email || "" };
}

export function withAdminGuard(handler: AuthenticatedHandler) {
	return async (req: AuthenticatedRequest, res: NextApiResponse) => {
		try {
			const authHeader = req.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid authorization header" });
			}

			const token = authHeader.substring(7).trim();
			if (!token) {
				return res.status(401).json({ success: false, error: "Unauthorized: Token empty" });
			}

			let decodedToken: any;
			try {
				const adminAuth = getAdminAuth();
				// verifyIdToken with checkRevoked = true ensures immediate invalidation of revoked sessions
				decodedToken = await adminAuth.verifyIdToken(token, true);
			} catch (tokenErr: any) {
				return res.status(401).json({ success: false, error: "Unauthorized: Token verification failed" });
			}

			if (!decodedToken || !decodedToken.uid) {
				return res.status(401).json({ success: false, error: "Unauthorized: Invalid token payload" });
			}

			const uid = decodedToken.uid;
			const { isPlatformAdmin, role, email } = await verifyPlatformAdmin(uid, decodedToken);

			if (!isPlatformAdmin) {
				return res.status(403).json({ success: false, error: "Forbidden: Administrative access required" });
			}

			req.user = {
				uid,
				email,
				role,
				isAdmin: true
			};

			return handler(req, res);
		} catch (error: any) {
			console.error("[withAdminGuard Error]:", error?.message || "Execution error");
			return res.status(500).json({ success: false, error: "Internal Server Error: Authorization check failed" });
		}
	};
}
