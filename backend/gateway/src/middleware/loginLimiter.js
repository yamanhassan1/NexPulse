import { createRedisRateLimiter } from "./redisRateLimiter.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX || 30);

export const loginLimiter = createRedisRateLimiter({
  windowMs: WINDOW_MS,
  max: MAX_ATTEMPTS,
  prefix: "ratelimit:login",
  label: "login",
  methods: ["POST"],
  message: "Too many login attempts. Try again later.",
  keyGenerator: (req) => String(req.ip || req.socket?.remoteAddress || "unknown"),
  resetOnSuccess: true,
});
