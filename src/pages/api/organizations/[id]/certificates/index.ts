import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore, getAdminAuth } from "@/firebase/firebaseAdmin";
import { checkOrgPermission, emitOrgEvent, resolveOrgAndMembership } from "@/utils/orgEngine";
import { buildAbsoluteUrl } from "@/utils/siteConfig";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const orgId = req.query.id as string;
	const authorization = req.headers.authorization;

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, error: "Unauthorized access" });
	}

	const idToken = authorization.split("Bearer ")[1];
	const db = getAdminFirestore();

	try {
		const decodedToken = await getAdminAuth().verifyIdToken(idToken);
		const uid = decodedToken.uid;

		const { org, member } = await resolveOrgAndMembership(orgId, uid);
		if (!org) {
			return res.status(404).json({ success: false, error: "Organization not found" });
		}

		if (req.method === "GET") {
			if (org.visibility !== "public" && !member && org.ownerUid !== uid) {
				return res.status(403).json({ success: false, error: "Access Denied: Private organization" });
			}

			const snap = await db
				.collection("organizationCertificates")
				.where("organizationId", "==", org.id)
				.get();

			const certificates = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			return res.status(200).json({ success: true, certificates });
		}

		if (req.method === "POST") {
			const { allowed, org } = await checkOrgPermission(orgId, uid, "organization.issueCertificates");
			if (!allowed) {
				return res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions" });
			}

			const { candidateUid, courseId = null, jobId = null, criteria, signeeName, signeeRole } = req.body;

			if (!candidateUid || !criteria || !signeeName) {
				return res.status(400).json({ success: false, error: "Candidate UID, criteria, and signeeName are required" });
			}

			const certId = "cert-" + Math.random().toString(36).slice(2, 12).toUpperCase();

			// Generate a simulated QR code data URL pointing to verification endpoint
			const qrCodeDataUrl = buildAbsoluteUrl(`/qr-verify/${certId}`);

			const newCertificate = {
				id: certId,
				organizationId: orgId,
				candidateUid,
				courseId,
				jobId,
				criteria,
				issueDate: Date.now(),
				signeeName,
				signeeRole: signeeRole || "Authorized Representative",
				qrCodeDataUrl,
				verified: true,
			};

			await db.collection("organizationCertificates").doc(certId).set(newCertificate);

			await emitOrgEvent(
				orgId,
				uid,
				"certificate.issued",
				candidateUid,
				"organizationCertificates",
				certId,
				{ criteria },
				req.socket.remoteAddress || "127.0.0.1"
			);

			return res.status(201).json({ success: true, certificate: newCertificate });
		}

		return res.status(405).json({ success: false, error: "Method not allowed" });
	} catch (err: any) {
		console.error("Error in certificates API:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
