import { Router, type Request, type Response } from "express";

import { getDeepgramConfigStatus } from "../lib/deepgram-config";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
	res.json(getDeepgramConfigStatus());
});

export default router;
