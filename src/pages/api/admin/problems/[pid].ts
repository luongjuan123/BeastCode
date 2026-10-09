import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { verifyPlatformAdmin } from "@/utils/withAdminGuard";

// Increase body size limit for problems with large test case payloads
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "10mb",
		},
	},
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { pid } = req.query;

	if (!pid || typeof pid !== "string") {
		return res.status(400).json({ success: false, error: "Invalid challenge ID / slug." });
	}

	const db = getAdminFirestore();

	// 1. Authenticate caller via Firebase ID Token
	let token = "";
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		token = authHeader.substring(7).trim();
	} else if (req.body && req.body.idToken) {
		token = typeof req.body.idToken === "string" ? req.body.idToken.trim() : "";
	}

	if (!token) {
		return res.status(401).json({ success: false, error: "Unauthorized: Missing authentication token." });
	}

	let decoded: any;
	let isPlatformAdmin = false;
	let adminRole = "user";
	let userEmail = "";

	try {
		const adminAuth = getAdminAuth();
		decoded = await adminAuth.verifyIdToken(token, true);
		userEmail = (decoded.email || "").toLowerCase().trim();

		const adminCheck = await verifyPlatformAdmin(decoded.uid, decoded);
		isPlatformAdmin = adminCheck.isPlatformAdmin;
		adminRole = adminCheck.role;
	} catch (authError: any) {
		console.error("[api/admin/problems/[pid]] Token verification failed:", authError?.message || authError);
		return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired session token." });
	}

	const problemRef = db.collection("problems").doc(pid);

	// ─── GET: Fetch challenge details ──────────────────────────────────────────
	if (req.method === "GET") {
		try {
			const problemSnap = await problemRef.get();
			if (!problemSnap.exists) {
				return res.status(404).json({ success: false, error: "Problem not found." });
			}
			return res.status(200).json({ success: true, problem: problemSnap.data() });
		} catch (error: any) {
			console.error("[api/admin/problems/[pid]] GET error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to fetch challenge." });
		}
	}

	// ─── Authorization Check for Mutations ────────────────────────────────────
	// Must be either a Platform Admin OR an assigned Moderator / Owner of this problem
	let isModerator = false;
	try {
		const existingProblemSnap = await problemRef.get();
		if (existingProblemSnap.exists) {
			const existingData = existingProblemSnap.data();
			if (userEmail && existingData && Array.isArray(existingData.moderators)) {
				isModerator = existingData.moderators.some(
					(m: string) => typeof m === "string" && m.toLowerCase().trim() === userEmail
				);
			}
		}
	} catch (fetchError: any) {
		console.error("[api/admin/problems/[pid]] Failed checking problem moderators:", fetchError);
	}

	if (!isPlatformAdmin && !isModerator) {
		return res.status(403).json({
			success: false,
			error: "Forbidden: You must be a platform administrator or challenge moderator to perform this action."
		});
	}

	// ─── POST (Create) & PUT (Update) ────────────────────────────────────────
	if (req.method === "POST" || req.method === "PUT") {
		try {
			const existingProblemSnap = await problemRef.get();
			if (req.method === "POST" && existingProblemSnap.exists) {
				return res.status(400).json({ success: false, error: `A challenge with ID "${pid}" already exists.` });
			}

			const body = req.body || {};
			const problemData: Record<string, any> = {
				id: pid,
				slug: pid,
				updatedAt: Date.now(),
			};

			if (req.method === "POST" && !existingProblemSnap.exists) {
				problemData.createdAt = body.createdAt || Date.now();
				problemData.likes = 0;
				problemData.dislikes = 0;
			}

			// Validate required fields if provided
			if (body.title !== undefined) {
				if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
					return res.status(400).json({ success: false, error: "Challenge title cannot be empty." });
				}
				problemData.title = body.title.trim();
			}

			if (body.problemStatement !== undefined) {
				if (typeof body.problemStatement !== "string" || !body.problemStatement.trim()) {
					return res.status(400).json({ success: false, error: "Problem statement cannot be empty." });
				}
				problemData.problemStatement = body.problemStatement;
			}

			// Copy other scalar / optional fields safely
			if (body.difficulty !== undefined) problemData.difficulty = body.difficulty;
			if (body.videoId !== undefined) problemData.videoId = body.videoId?.trim() || null;
			if (body.link !== undefined) problemData.link = body.link?.trim() || null;
			if (body.description !== undefined) problemData.description = body.description?.trim() || "";
			if (body.language !== undefined) problemData.language = body.language || "English";
			if (body.inputFormat !== undefined) problemData.inputFormat = body.inputFormat?.trim() || "";
			if (body.outputFormat !== undefined) problemData.outputFormat = body.outputFormat?.trim() || "";
			if (body.constraints !== undefined) problemData.constraints = body.constraints?.trim() || "";

			// Tags processing
			if (Array.isArray(body.tags)) {
				const sanitizedTags: string[] = Array.from(
					new Set<string>(
						body.tags
							.filter((t: any): t is string => typeof t === "string" && t.trim().length > 0)
							.map((t: string) => t.trim().toLowerCase())
					)
				);
				problemData.tags = sanitizedTags;

				// Register new tags in problemTags collection so they show in tag selectors
				for (const tagId of sanitizedTags) {
					try {
						const tagRef = db.collection("problemTags").doc(tagId);
						const tagSnap = await tagRef.get();
						if (!tagSnap.exists) {
							await tagRef.set({
								id: tagId,
								name: tagId.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
								description: `Tag for ${tagId}`,
								isHidden: false,
								isEnabled: true,
								order: 99,
								createdAt: Date.now(),
								updatedAt: Date.now(),
								popularityCount: 1
							});
						}
					} catch (tagErr) {
						console.warn(`[api/admin/problems/[pid]] Auto-seeding tag '${tagId}' warning:`, tagErr);
					}
				}
			}

			// Moderators processing
			if (Array.isArray(body.moderators)) {
				const sanitizedMods: string[] = Array.from(
					new Set<string>(
						body.moderators
							.filter((m: any): m is string => typeof m === "string" && m.trim().length > 0)
							.map((m: string) => m.trim().toLowerCase())
					)
				);
				problemData.moderators = sanitizedMods;
			}

			if (body.starterCode !== undefined) problemData.starterCode = body.starterCode?.trim() || "";
			if (body.starterFunctionName !== undefined) problemData.starterFunctionName = body.starterFunctionName?.trim() || "";
			if (body.handlerFunction !== undefined) problemData.handlerFunction = body.handlerFunction?.trim() || "";
			if (body.executionProfile !== undefined) problemData.executionProfile = body.executionProfile;
			if (body.customTimeoutMs !== undefined) problemData.customTimeoutMs = Number(body.customTimeoutMs) || 5000;
			if (body.customMemoryLimitMb !== undefined) problemData.customMemoryLimitMb = Number(body.customMemoryLimitMb) || 256;
			if (body.customMaxOutputSizeChars !== undefined) problemData.customMaxOutputSizeChars = Number(body.customMaxOutputSizeChars) || 65536;
			if (body.customCpuCount !== undefined) problemData.customCpuCount = Number(body.customCpuCount) || 1;
			if (body.customDiskLimitMb !== undefined) problemData.customDiskLimitMb = Number(body.customDiskLimitMb) || 50;
			if (body.customProcessLimit !== undefined) problemData.customProcessLimit = Number(body.customProcessLimit) || 15;

			if (body.customChecker) {
				problemData.customChecker = {
					type: body.customChecker.type || "exact",
					epsilon: Number(body.customChecker.epsilon) || 1e-6,
					scriptLanguage: body.customChecker.scriptLanguage || "python",
					scriptCode: (body.customChecker.scriptCode || "").trim(),
				};
			}

			if (body.editorial) {
				problemData.editorial = {
					markdown: (body.editorial.markdown || "").trim(),
					videoUrl: (body.editorial.videoUrl || "").trim() || null,
				};
			}

			// Examples / Test cases
			if (Array.isArray(body.examples)) {
				problemData.examples = body.examples;
			}

			// Persist changes to Firestore
			await problemRef.set(problemData, { merge: true });

			return res.status(200).json({
				success: true,
				message: "Problem updated successfully.",
				problem: problemData
			});
		} catch (error: any) {
			console.error("[api/admin/problems/[pid]] PUT error:", error);
			return res.status(500).json({
				success: false,
				error: error.message || "Failed to update problem."
			});
		}
	}

	// ─── DELETE: Remove or soft-delete challenge ──────────────────────────────
	if (req.method === "DELETE") {
		if (!isPlatformAdmin) {
			return res.status(403).json({ success: false, error: "Only platform administrators can delete challenges." });
		}

		try {
			await problemRef.delete();
			return res.status(200).json({ success: true, message: "Problem deleted successfully." });
		} catch (error: any) {
			console.error("[api/admin/problems/[pid]] DELETE error:", error);
			return res.status(500).json({ success: false, error: error.message || "Failed to delete problem." });
		}
	}

	return res.status(405).json({ success: false, error: `Method ${req.method} not allowed.` });
}
