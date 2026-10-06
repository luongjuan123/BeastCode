import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";

function handler(req: NextApiRequest, res: NextApiResponse) {
	res.status(200).json({ serverTime: Date.now() });
}

export default withApiErrorHandler(handler);
