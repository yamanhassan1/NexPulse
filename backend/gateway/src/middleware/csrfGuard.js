const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated writes.
 *
 * The session cookie is `SameSite=None` in production (the SPA and API can be
 * deployed on different sites), which means a cross-site page *can* attach it
 * to a form POST. Browsers always send `Origin` on cross-origin unsafe
 * requests, so requiring it to match the configured frontend blocks the attack
 * without needing a token round-trip.
 *
 * Requests with no Origin header at all are non-browser clients (curl, health
 * checks, the project -> file service hop) and are allowed through.
 */
export const csrfGuard = ({ allowedOrigins = [] }) => {
  const allowed = new Set(
    allowedOrigins.map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean),
  );

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    if (!origin) return next();

    const normalised = String(origin).replace(/\/$/, "");
    if (allowed.has(normalised)) return next();

    console.warn(`[csrf] blocked ${req.method} ${req.originalUrl} from ${origin}`);
    return res.status(403).json({ message: "Cross-site request blocked" });
  };
};
