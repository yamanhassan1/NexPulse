import { createRedisRateLimiter } from "./redisRateLimiter.js";

// Autosave is debounced at 700 ms (~85 writes/min max). 240/min gives ample
// headroom for normal editing while bounding runaway or abusive clients.
export const writeLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.WRITE_RATE_LIMIT_MAX || 240),
  prefix: "ratelimit:write",
  label: "write",
  message: "Too many changes in a short time. Please wait a moment.",
});

export const importLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.IMPORT_RATE_LIMIT_MAX || 25),
  prefix: "ratelimit:import",
  methods: ["POST"],
  label: "import",
  message: "Too many import requests. Please wait a moment.",
});

export const exportLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.EXPORT_RATE_LIMIT_MAX || 25),
  prefix: "ratelimit:export",
  methods: ["GET"],
  label: "export",
  message: "Too many export requests. Please wait a moment.",
});

export const heavyOpLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 25,
  prefix: "ratelimit:heavy-file",
  methods: ["GET", "POST"],
  label: "heavy-file",
  message: "Too many import/export requests. Please wait a moment.",
});
