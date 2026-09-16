import { Router, type Request, type Response } from "express";

import {
	getElevenLabsConfigStatus,
	getGeminiConfigStatus,
	getGroqConfigStatus,
	getPassiveAiConfigStatus,
	getTavilyConfigStatus,
} from "../lib/ai-config";
import { isRedisConfigured } from "../lib/redis";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
	const groq = getGroqConfigStatus();
	const gemini = getGeminiConfigStatus();
	const passive = getPassiveAiConfigStatus();
	const tavily = getTavilyConfigStatus();
	const elevenlabs = getElevenLabsConfigStatus();

	res.json({
		configured: groq.configured,
		missing: groq.missing,
		passiveConfigured: passive.configured,
		redisConfigured: isRedisConfigured(),
		groq,
		gemini,
		searchWeb: {
			configured: true,
			provider: tavily.configured ? "tavily" : "duckduckgo",
		},
		elevenlabs,
	});
});

export default router;