import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
	if (redisClient) return redisClient;

	const redisUrl = process.env.REDIS_URL;
	const redisHost = process.env.REDIS_HOST;

	if (!redisUrl && !redisHost) {
		return null;
	}

	try {
		if (redisUrl) {
			redisClient = new Redis(redisUrl, {
				maxRetriesPerRequest: 1,
				connectTimeout: 2000, // Quick timeout for fast serverless fallback
				lazyConnect: true,
				retryStrategy() {
					return null; // Do not reconnect on failure (rely on Firestore fallback)
				}
			});
		} else {
			redisClient = new Redis({
				host: redisHost || "127.0.0.1",
				port: parseInt(process.env.REDIS_PORT || "6379", 10),
				password: process.env.REDIS_PASSWORD || undefined,
				maxRetriesPerRequest: 1,
				connectTimeout: 2000,
				lazyConnect: true,
				retryStrategy() {
					return null;
				}
			});
		}

		redisClient.on("error", (err) => {
			console.error("Redis connection error:", err);
		});

		return redisClient;
	} catch (e) {
		console.error("Failed to initialize Redis client:", e);
		return null;
	}
}
