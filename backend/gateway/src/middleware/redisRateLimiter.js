import redis, { isRedisReady } from "../../../shared/src/redis/redis.js";

// Atomic fixed-window counter with self-healing TTL in Redis.
// Returns { count, ttlMs }.
const RATE_LIMIT_LUA = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

export const createRedisRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  prefix = "ratelimit",
  label = "rate",
  message = "Too many requests. Please slow down.",
  methods = null,
  keyGenerator = (req) => String(req.user?._id || req.ip || req.socket?.remoteAddress || "unknown"),
  resetOnSuccess = false,
} = {}) => {
  const allowedMethods = methods ? new Set(methods) : null;

  return async (req, res, next) => {
    if (allowedMethods) {
      if (!allowedMethods.has(req.method)) return next();
    } else if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    if (!isRedisReady()) {
      res.setHeader("Retry-After", "30");
      return res.status(503).json({
        message: "Rate limit store unavailable. Please try again shortly.",
      });
    }

    const identity = keyGenerator(req);
    const redisKey = `${prefix}:${identity}`;

    try {
      const [count, ttlMs] = await redis.eval(
        RATE_LIMIT_LUA,
        1,
        redisKey,
        String(windowMs),
      );

      const remaining = Math.max(0, max - count);
      const resetSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (resetOnSuccess) {
        res.on("finish", () => {
          if (res.statusCode < 400 && isRedisReady()) {
            redis.del(redisKey).catch(() => {});
          }
        });
      }

      if (count > max) {
        console.warn(`[${label}] rate limit hit by ${identity}`);
        res.setHeader("Retry-After", String(resetSeconds));
        return res.status(429).json({ message });
      }

      return next();
    } catch (error) {
      console.error(`[${label}] redis error: ${error.message}`);
      res.setHeader("Retry-After", "30");
      return res.status(503).json({
        message: "Rate limit store unavailable. Please try again shortly.",
      });
    }
  };
};
