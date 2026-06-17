export type AiProviderStatus = {
	configured: boolean;
	missing: string[];
};

export function getGroqConfigStatus(): AiProviderStatus {
	const apiKey = process.env.GROQ_API_KEY?.trim();
	const missing: string[] = [];
	if (!apiKey) missing.push("GROQ_API_KEY");
	return { configured: missing.length === 0, missing };
}

export function getGeminiConfigStatus(): AiProviderStatus {
	const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
	const missing: string[] = [];
	if (!apiKey) missing.push("GOOGLE_AI_API_KEY");
	return { configured: missing.length === 0, missing };
}

export function getPassiveAiConfigStatus() {
	const groq = getGroqConfigStatus();
	const gemini = getGeminiConfigStatus();
	return {
		configured: groq.configured && gemini.configured,
		groq,
		gemini,
	};
}
