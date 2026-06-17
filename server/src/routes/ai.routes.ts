import { Router, type Request, type Response } from "express";

import { getGroqConfigStatus } from "../lib/ai-config";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
	const groq = getGroqConfigStatus();
	res.json({
		configured: groq.configured,
		missing: groq.missing,
	});
});

export default router;
