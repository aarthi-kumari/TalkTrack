import { getRedisConnection, isRedisConfigured } from "./redis";

type WindowHit = {
	count: number;
	resetAt: number;
};

const memoryWindows = new Map<string, WindowHit>();

export async function consumeRateLimit(params: {
	key: string;
	limit: number;
	windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
	if (isRedisConfigured()) {
		try {
			const redis = getRedisConnection();
			const count = await redis.incr(params.key);
			if (count === 1) {
				await redis.pexpire(params.key, params.windowMs);
			}
			return {
				allowed: count <= params.limit,
				remaining: Math.max(0, params.limit - count),
			};
		} catch (error) {
			console.warn("Redis rate limit failed, using memory:", error);
		}
	}

	const now = Date.now();
	const existing = memoryWindows.get(params.key);
	if (!existing || existing.resetAt <= now) {
		memoryWindows.set(params.key, { count: 1, resetAt: now + params.windowMs });
		return { allowed: true, remaining: params.limit - 1 };
	}

	existing.count += 1;
	return {
		allowed: existing.count <= params.limit,
		remaining: Math.max(0, params.limit - existing.count),
	};
}
