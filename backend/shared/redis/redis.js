import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 1000, 5000),
});

let warned = false;

redis.on("error", (err) => {
  if (!warned) {
    warned = true;
    const reason = err.code || err.message || err.name;
    console.warn(
      `[redis] ${reason} — sessions will not persist until Redis is reachable.`,
    );
  }
});

redis.on("connect", () => {
  warned = false;
  console.log("redis connected");
});

export default redis;
