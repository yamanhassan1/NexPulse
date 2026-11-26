import crypto from "node:crypto";
import redis, { isRedisReady } from "./redis.js";

const RENEW_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export class LockUnavailableError extends Error {
  constructor(message = "Distributed lock store unavailable") {
    super(message);
    this.name = "LockUnavailableError";
    this.status = 503;
  }
}

export class LockTimeoutError extends Error {
  constructor(message = "Resource is busy; please retry shortly") {
    super(message);
    this.name = "LockTimeoutError";
    this.status = 429;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Acquire a Redis-backed distributed mutex with ownership token, bounded wait
 * timeout, automatic lease renewal for long operations, and atomic Lua release.
 */
export const acquireDistributedLock = async ({
  key,
  ttlMs = 15000,
  waitTimeoutMs = 10000,
  retryDelayMs = 40,
} = {}) => {
  if (!key) throw new Error("Lock key is required");
  if (!isRedisReady()) {
    throw new LockUnavailableError();
  }

  const token = crypto.randomUUID();
  const deadline = Date.now() + waitTimeoutMs;

  while (true) {
    let acquired;
    try {
      acquired = await redis.set(key, token, "PX", ttlMs, "NX");
    } catch (error) {
      throw new LockUnavailableError(error.message);
    }

    if (acquired === "OK") {
      const renewEveryMs = Math.max(1000, Math.floor(ttlMs / 3));
      const timer = setInterval(() => {
        if (!isRedisReady()) return;
        redis.eval(RENEW_LUA, 1, key, token, String(ttlMs)).catch((err) => {
          console.warn(`[lock] renew failed for ${key}: ${err.message}`);
        });
      }, renewEveryMs);
      timer.unref?.();

      let released = false;
      const release = async () => {
        if (released) return;
        released = true;
        clearInterval(timer);
        if (!isRedisReady()) return;
        try {
          await redis.eval(RELEASE_LUA, 1, key, token);
        } catch (err) {
          console.warn(`[lock] release failed for ${key}: ${err.message}`);
        }
      };

      return { key, token, release };
    }

    if (Date.now() >= deadline) {
      throw new LockTimeoutError();
    }

    const jitter = Math.floor(Math.random() * 25);
    await sleep(retryDelayMs + jitter);
  }
};

export const withDistributedLock = async (options, fn) => {
  const lock = await acquireDistributedLock(options);
  try {
    return await fn(lock);
  } finally {
    await lock.release();
  }
};
