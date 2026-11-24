// Per-user rate limit for state-changing requests.
//
// Login already had one; without this, an authenticated client could hammer
// /api/file/import with 25 MB bodies and exhaust memory, Mongo or the budget.

const MAX_ENTRIES = 20000;

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = "Too many requests. Please slow down.",
  label = "rate",
} = {}) => {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req, res, next) => {
    // Read-only traffic is unlimited; this guards writes only.
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
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
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
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
