export type LiveKitConfigStatus = {
	configured: boolean;
	url: string | null;
	missing: string[];
};

export function getLiveKitConfigStatus(): LiveKitConfigStatus {
	const apiKey = process.env.LIVEKIT_API_KEY?.trim();
	const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
	const url = process.env.LIVEKIT_URL?.trim() || null;

	const missing: string[] = [];
	if (!apiKey) missing.push("LIVEKIT_API_KEY");
	if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
	if (!url) missing.push("LIVEKIT_URL");

	return {
		configured: missing.length === 0,
		url,
		missing,
	};
}

export function requireLiveKitConfig() {
	const status = getLiveKitConfigStatus();
	if (!status.configured) {
		throw new Error(
			`LiveKit is not configured. Set ${status.missing.join(", ")} in server/.env`,
		);
	}
	return {
		apiKey: process.env.LIVEKIT_API_KEY!.trim(),
		apiSecret: process.env.LIVEKIT_API_SECRET!.trim(),
		url: process.env.LIVEKIT_URL!.trim(),
	};
}
