export type DeepgramConfigStatus = {
	configured: boolean;
	missing: string[];
};

export function getDeepgramConfigStatus(): DeepgramConfigStatus {
	const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
	const missing: string[] = [];
	if (!apiKey) missing.push("DEEPGRAM_API_KEY");

	return {
		configured: missing.length === 0,
		missing,
	};
}

export function getDeepgramApiKey(): string | null {
	return process.env.DEEPGRAM_API_KEY?.trim() || null;
}
