// Per-user rate limit for state-changing and heavy requests.

const MAX_ENTRIES = 20000;

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = "Too many requests. Please slow down.",
  label = "rate",
  methods = null,
} = {}) => {
  const hits = new Map();
  const allowedMethods = methods ? new Set(methods) : null;

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req, res, next) => {
    if (allowedMethods) {
      if (!allowedMethods.has(req.method)) return next();
    } else if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    const key = String(req.user?._id || req.ip || req.socket?.remoteAddress || "unknown");
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
    }

    entry.count += 1;

    if (hits.size >= MAX_ENTRIES && !hits.has(key)) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }

    hits.set(key, entry);

    if (entry.count > max) {
      console.warn(`[${label}] rate limit hit by ${key}`);
      const retryAfter = Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }

    return next();
  };
};

// Autosave is debounced at 700 ms, so a human typing flat out produces at most
// ~85 writes/minute. The ceiling sits well above that: high enough that normal
// editing never trips it, low enough to bound abuse and runaway clients.
export const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 240,
  label: "write",
  message: "Too many changes in a short time. Please wait a moment.",
});

// Bounds heavy archive export and bulk import operations per user.
export const heavyOpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 25,
  methods: ["GET", "POST"],
  label: "heavy-file",
  message: "Too many import/export requests. Please wait a moment.",
});
