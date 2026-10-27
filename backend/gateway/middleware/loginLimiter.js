const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;
const hits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start > WINDOW_MS) {
      hits.delete(key);
    }
  }
}, WINDOW_MS).unref();

export const loginLimiter = (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = hits.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
  }

  entry.count += 1;
  hits.set(key, entry);

  if (entry.count > MAX_ATTEMPTS) {
    return res
      .status(429)
      .json({ message: "Too many login attempts. Try again later." });
  }

  next();
};
