import { NextApiResponse } from "next";
import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { resolveOrgAndMembership } from "@/utils/orgEngine";
import { Conversation } from "@/types/chat";
import { validateAndParseChatMedia, persistChatAttachment } from "@/utils/chatMediaService";

// Next.js config to allow large payloads for base64 media
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "25mb",
		},
	},
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}

	const user = req.user;
	if (!user || !user.uid) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	const { fileData, fileName, conversationId, duration } = req.body;

	if (!fileData || !conversationId) {
		return res.status(400).json({ success: false, error: "Missing file data or conversation ID" });
	}

	const db = getAdminFirestore();
	const convRef = db.collection("conversations").doc(conversationId);
	const convSnap = await convRef.get();

	if (!convSnap.exists) {
		return res.status(404).json({ success: false, error: "Conversation not found" });
	}

	const convData = convSnap.data() as Conversation;

	// Verify authorization to upload to this conversation
	let isAuthorized = false;
	if (convData.type === "direct") {
		isAuthorized = (convData.participantUids || []).includes(user.uid);
	} else if (convData.type === "organization_channel" && convData.organizationId) {
		const { member } = await resolveOrgAndMembership(convData.organizationId, user.uid);
		if (member && member.status === "active") {
			isAuthorized = true;
		}
	} else if (user.isAdmin) {
		isAuthorized = true;
	}

	if (!isAuthorized) {
		return res.status(403).json({ success: false, error: "Access denied to conversation" });
	}

	let parsed;
	try {
		parsed = validateAndParseChatMedia(fileData, fileName);
	} catch (validationErr: any) {
		return res.status(400).json({ success: false, error: validationErr.message });
	}

	const attachment = await persistChatAttachment({
		parsed,
		fileName,
		conversationId,
		userUid: user.uid,
		duration,
	});

	return res.status(201).json({
		success: true,
		attachment,
	});
}

export default withApiErrorHandler(withAuthAndModeration(handler));
