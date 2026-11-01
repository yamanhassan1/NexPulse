// The internal services sit behind the gateway and identify the user from an
// `x-user-id` header. That is only safe if the caller really is the gateway, so
// they share a secret that a browser never sees.
//
// Fail closed in production: a missing secret is a deployment bug, not a mode.

export const internalAuth = (req, res, next) => {
  const secret = (process.env.INTERNAL_SECRET || "").trim()
  if (!secret) return next()

  if (req.get("x-internal-secret") === secret) return next()

  return res.status(401).json({ message: "unauthorized" });
};

export const internalHeaders = () => {
  const secret = (process.env.INTERNAL_SECRET || "").trim()
  return secret ? { "x-internal-secret": secret } : {};
};

/** Refuse to boot in production without a shared secret. */
export const assertInternalSecret = (label) => {
  const secret = (process.env.INTERNAL_SECRET || "").trim()
  if (secret) return true

  if (process.env.NODE_ENV === "production") {
    console.error(
      `[${label}] INTERNAL_SECRET is required in production: the service trusts the ` +
        "x-user-id header and must only accept calls from the gateway.",
    );
    process.exit(1);
  }

  console.warn(
    `[${label}] INTERNAL_SECRET is not set — running in open dev mode. ` +
      "Set it before exposing this service to anything but localhost.",
  );
  return false;
};

/**
 * Internal services bind to loopback by default; only the gateway should be
 * reachable. Set HOST=0.0.0.0 when running each service in its own container.
 */
export const listenHost = () => (process.env.HOST || "127.0.0.1").trim();
