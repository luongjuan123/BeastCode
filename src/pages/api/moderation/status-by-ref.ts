import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const { refId } = req.query;
	if (!refId || typeof refId !== "string") {
		return res.status(400).json({ success: false, error: "Reference ID is required." });
	}

	const db = getAdminFirestore();
	const normalizedRefId = refId.trim().toUpperCase();

	// Query userModeration by caseId
	const modSnap = await db.collection("userModeration").where("caseId", "==", normalizedRefId).limit(1).get();
	let foundDoc: any = null;
	let targetUid = "";
	let modData: any = null;

	if (modSnap.empty) {
		// Try fallback in users collection where caseId might be stored
		const usersSnap = await db.collection("users").where("caseId", "==", normalizedRefId).limit(1).get();
		if (usersSnap.empty) {
			// If not found by caseId, try matching via legacy prefix if refId is 8 chars
			let foundUserDoc: any = null;
			if (normalizedRefId.length === 8) {
				const modCol = await db.collection("userModeration").get();
				for (const doc of modCol.docs) {
					if (doc.id.substring(0, 8).toUpperCase() === normalizedRefId) {
						foundDoc = doc;
						break;
					}
				}
				if (!foundDoc) {
					const usersCol = await db.collection("users").get();
					for (const doc of usersCol.docs) {
						if (doc.id.substring(0, 8).toUpperCase() === normalizedRefId) {
							foundUserDoc = doc;
							break;
						}
					}
				}
			}

			if (!foundDoc && !foundUserDoc) {
				return res.status(404).json({ success: false, error: "No matching case found for this Reference ID." });
			}

			if (foundDoc) {
				targetUid = foundDoc.id;
				modData = foundDoc.data() || {};
			} else {
				targetUid = foundUserDoc.id;
				const userData = foundUserDoc.data() || {};
				modData = {
					status: userData.status || "ACTIVE",
					deleteAfter: userData.deleteAfter || null,
					appealDeadline: userData.appealDeadline || null,
					caseId: userData.caseId || normalizedRefId
				};
			}
		} else {
			const foundUserDoc = usersSnap.docs[0];
			targetUid = foundUserDoc.id;
			const userData = foundUserDoc.data() || {};
			modData = {
				status: userData.status || "ACTIVE",
				deleteAfter: userData.deleteAfter || null,
				appealDeadline: userData.appealDeadline || null,
				caseId: userData.caseId || normalizedRefId
			};
		}
	} else {
		foundDoc = modSnap.docs[0];
		targetUid = foundDoc.id;
		modData = foundDoc.data() || {};
	}

	// Obfuscate target email for privacy
	let email = "";
	const userDoc = await db.collection("users").doc(targetUid).get();
	if (userDoc.exists) {
		const rawEmail = userDoc.data()?.email || "";
		if (rawEmail.includes("@")) {
			const [name, domain] = rawEmail.split("@");
			email = `${name.substring(0, 2)}***@${domain}`;
		} else {
			email = rawEmail;
		}
	}

	return res.status(200).json({
		success: true,
		status: modData.status,
		reason: modData.reason || "",
		duration: modData.duration || "Permanent",
		deleteAfter: modData.deleteAfter || null,
		appealDeadline: modData.appealDeadline || null,
		deleteTimerPaused: modData.deleteTimerPaused || false,
		email,
		uid: targetUid,
		caseId: modData.caseId || normalizedRefId
	});
}

export default withApiErrorHandler(handler);
