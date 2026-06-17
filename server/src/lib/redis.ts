import IORedis from "ioredis";

let connection: IORedis | null = null;

export function isRedisConfigured(): boolean {
	return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedisConnection(): IORedis {
	if (!isRedisConfigured()) {
		throw new Error("REDIS_URL is not configured");
	}

	if (!connection) {
		connection = new IORedis(process.env.REDIS_URL!, {
			maxRetriesPerRequest: null,
		});
	}

	return connection;
}
