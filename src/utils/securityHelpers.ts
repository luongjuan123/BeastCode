import crypto from "crypto";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { NextApiRequest } from "next";

export function sha256(value: string): string {
	return crypto.createHash("sha256").update(value).digest("hex");
}

export function parseUA(ua: string): { os: string; browser: string } {
	let os = "Unknown OS";
	if (/windows/i.test(ua))          os = "Windows";
	else if (/mac os x/i.test(ua))    os = "macOS";
	else if (/linux/i.test(ua))       os = "Linux";
	else if (/android/i.test(ua))     os = "Android";
	else if (/iphone|ipad/i.test(ua)) os = "iOS";
	let browser = "Unknown Browser";
	if      (/chrome|crios/i.test(ua) && !/edge|edg|opr/i.test(ua)) browser = "Chrome";
	else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua))        browser = "Safari";
	else if (/firefox|fxios/i.test(ua))                               browser = "Firefox";
	else if (/edge|edg/i.test(ua))                                    browser = "Edge";
	else if (/opr/i.test(ua))                                         browser = "Opera";
	return { os, browser };
}

export function getClientInfo(req: NextApiRequest) {
	const ip = ((req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
	const userAgent = (req.headers["user-agent"] ?? "Unknown UA") as string;
	const country = ((req.headers["cf-ipcountry"] ?? req.headers["x-country-code"] ?? "Unknown") as string);
	const { os, browser } = parseUA(userAgent);
	return { ip, userAgent, country, os, browser };
}

/**
 * Generate a 6-digit verification code, hash it, store in Firestore, and return raw code.
 */
export async function createVerificationCode(userId: string, purpose: string): Promise<string> {
	const db = getAdminFirestore();
	const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
	const codeHash = sha256(rawCode);
	const now = Date.now();

	// Invalidate any older pending codes for the same purpose & user
	const oldCodesSnap = await db.collection("verificationCodes")
		.where("userId", "==", userId)
		.where("purpose", "==", purpose)
		.where("used", "==", false)
		.get();

	const batch = db.batch();
	oldCodesSnap.docs.forEach((doc) => {
		batch.update(doc.ref, { used: true, invalidatedAt: now });
	});

	const newCodeRef = db.collection("verificationCodes").doc();
	batch.set(newCodeRef, {
		userId,
		codeHash,
		purpose,
		expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
		createdAt: now,
		used: false,
		attemptCount: 0,
	});

	await batch.commit();

	// Automatically run async cleanup of expired codes (non-blocking)
	db.collection("verificationCodes")
		.where("expiresAt", "<", now)
		.get()
		.then((snap) => {
			const cleanupBatch = db.batch();
			snap.docs.forEach((d) => cleanupBatch.delete(d.ref));
			return cleanupBatch.commit();
		})
		.catch((err) => console.error("[Verification Code Cleanup] Error:", err));

	return rawCode;
}

/**
 * Verifies a verification code against the database.
 */
export async function verifyVerificationCode(userId: string, purpose: string, code: string): Promise<{ success: boolean; error?: string }> {
	const db = getAdminFirestore();
	const codeHash = sha256(code);
	const now = Date.now();

	const codesSnap = await db.collection("verificationCodes")
		.where("userId", "==", userId)
		.where("purpose", "==", purpose)
		.where("used", "==", false)
		.get();

	if (codesSnap.empty) {
		return { success: false, error: "No active verification code found." };
	}

	// Find the matching code
	const matchingDoc = codesSnap.docs.find((doc) => doc.data().codeHash === codeHash);

	if (!matchingDoc) {
		// Increment attempts on all active codes of this user & purpose as a security penalty
		const incrementBatch = db.batch();
		let maxAttemptsReached = false;
		for (const doc of codesSnap.docs) {
			const newAttempts = (doc.data().attemptCount || 0) + 1;
			if (newAttempts >= 5) {
				incrementBatch.update(doc.ref, { attemptCount: newAttempts, used: true, lockedAt: now });
				maxAttemptsReached = true;
			} else {
				incrementBatch.update(doc.ref, { attemptCount: newAttempts });
			}
		}
		await incrementBatch.commit();

		if (maxAttemptsReached) {
			return { success: false, error: "Too many failed attempts. This code has been invalidated." };
		}
		return { success: false, error: "Invalid verification code. Please try again." };
	}

	const data = matchingDoc.data();
	if (data.expiresAt < now) {
		await matchingDoc.ref.update({ used: true, expiredAt: now });
		return { success: false, error: "Verification code has expired. Please request a new one." };
	}

	if (data.attemptCount >= 5) {
		await matchingDoc.ref.update({ used: true, lockedAt: now });
		return { success: false, error: "This code is locked due to too many failed attempts." };
	}

	// Success! Mark code as used
	await matchingDoc.ref.update({ used: true, verifiedAt: now });
	return { success: true };
}
