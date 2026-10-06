import { NextApiRequest, NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const certId = req.query.certId as string;
	const db = getAdminFirestore();

	try {
		const certDoc = await db.collection("organizationCertificates").doc(certId).get();
		if (!certDoc.exists) {
			return res.status(404).json({ success: false, error: "Certificate verification failed: Invalid credential ID" });
		}

		const certData = certDoc.data() as any;

		// Resolve candidate details
		const candidateDoc = await db.collection("users").doc(certData.candidateUid).get();
		const candidateData = candidateDoc.exists ? candidateDoc.data() : {};

		// Resolve organization details
		const orgDoc = await db.collection("organizations").doc(certData.organizationId).get();
		const orgData = orgDoc.exists ? orgDoc.data() : {};

		const verificationResult = {
			certificateId: certData.id,
			criteria: certData.criteria,
			issueDate: certData.issueDate,
			signeeName: certData.signeeName,
			signeeRole: certData.signeeRole,
			candidate: {
				uid: certData.candidateUid,
				displayName: candidateData?.displayName || candidateData?.username || "Student",
				username: candidateData?.username || "",
			},
			organization: {
				id: certData.organizationId,
				name: orgData?.displayName || orgData?.name || "Verified Issuer",
				slug: orgData?.slug || "",
				verified: orgData?.verified || false,
			},
			status: "VERIFIED",
		};

		return res.status(200).json({ success: true, verification: verificationResult });
	} catch (err: any) {
		console.error("Error verifying certificate:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
