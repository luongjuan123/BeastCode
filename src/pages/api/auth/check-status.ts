import { NextApiResponse } from "next";
import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { withAuthAndModeration, AuthenticatedRequest } from "@/utils/authMiddleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ success: false, error: "Method not allowed" });
	}
	// If it passes withAuthAndModeration, the user is active (or ban expired and was auto-lifted).
	return res.status(200).json({ success: true, status: "ACTIVE" });
}

export default withApiErrorHandler(withAuthAndModeration(handler));
