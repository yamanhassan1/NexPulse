# NexPulse Distributed Systems Design

## 1. Architecture Overview

NexPulse runs as an API Gateway (`backend/gateway`) fronting internal Express microservices (`auth`, `project`, `file`) over loopback/private networking, backed by MongoDB and Redis.

```
Browser (SPA)
   │  HTTPS + HttpOnly Cookie (session=<uuid>)
   ▼
Gateway (1..N replicas) ──► Redis (Sessions, Rate Limits, Project Cache, Quota Locks)
   │  x-internal-secret + x-user-id + x-request-id
   ├──► Auth Service    ──► MongoDB + Firebase Admin
   ├──► Project Service ──► MongoDB + File Service
   └──► File Service (1..N replicas) ──► MongoDB + Redis Quota Lock
```

---

## 2. Redis-Backed Distributed Rate Limiting

Implemented in `backend/gateway/src/middleware/redisRateLimiter.js`, `loginLimiter.js`, and `writeLimiter.js`.

- **Atomic Execution**: Each request executes an atomic Lua script (`INCR` + `PEXPIRE` on first hit + `PTTL` self-healing check) in a single Redis round-trip.
- **Limiters & Key Namespaces**:
  - `loginLimiter` (`ratelimit:login:<ip>`): `POST /api/auth/login`, default `30` requests / `15 min` (`LOGIN_RATE_LIMIT_MAX`), clears on `<400` response.
  - `writeLimiter` (`ratelimit:write:<userId|ip>`): mutating methods (`POST`/`PATCH`/`PUT`/`DELETE`), default `240` requests / `60s` (`WRITE_RATE_LIMIT_MAX`).
  - `importLimiter` (`ratelimit:import:<userId|ip>`): `POST /api/file/import`, default `25` requests / `60s` (`IMPORT_RATE_LIMIT_MAX`).
  - `exportLimiter` (`ratelimit:export:<userId|ip>`): `GET /api/file/export`, default `25` requests / `60s` (`EXPORT_RATE_LIMIT_MAX`).
- **Headers**: Emits `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` on `429`.
- **Fail-Closed Redis Policy**: If Redis is unavailable (`!isRedisReady()` or `redis.eval` throws), the limiter returns `503 Service Unavailable` with `Retry-After: 30` so Redis outages never grant unlimited access and no unbounded in-memory fallback maps are used.

---

## 3. Redis-Backed Distributed Storage Quota Locking

Implemented in `backend/shared/src/redis/distributedLock.js` and wired into `createFile`, `updateFile`, and `importFiles` in `backend/services/file/src/controllers/file.controller.js`.

- **Lock Key**: `lock:quota:<userId>` (per-user isolation so different users never block each other).
- **Atomic Acquisition**: `SET lock:quota:<userId> <uuid-token> PX <ttlMs> NX` with bounded retries (`retryDelayMs + jitter`) up to `waitTimeoutMs`.
- **Lease Renewal**: For long-running imports, an unref'd interval at `ttlMs / 3` renews the lease via Lua only if the stored token still matches.
- **Owner-Safe Release**: `finally` block executes a Lua script that deletes the key **only** if `GET(key) == token`, preventing an expired worker from releasing another worker's lock.
- **Failure Handling**:
  - Redis unavailable -> `LockUnavailableError` -> HTTP `503` + `Retry-After: 5`.
  - Lock contention timeout -> `LockTimeoutError` -> HTTP `429` + `Retry-After: 1`.
  - Quota exceeded -> HTTP `413 Storage quota exceeded` before any folder/file writes occur.

---

## 4. Future AI Service Integration Boundary (Design Only)

`backend/services/ai` is currently an unreferenced placeholder copy of `services/file` and is **not routed by the gateway**. Before enabling AI features:

1. **Gateway Route**: Mount `/api/ai` behind `protect`, `csrfGuard`, and a dedicated Redis token-bucket AI rate limiter with `>= 60s` proxy timeout.
2. **Internal Auth**: Enforce `internalAuth` (`x-internal-secret`) and `assertInternalSecret("ai")` on the AI service.
3. **Credentials**: Keep LLM provider API keys exclusively in `backend/services/ai/.env` (never `VITE_*`).
4. **Streaming & Cancellation**: Stream via SSE / chunked `ReadableStream` and wire `req.on("close", () => abortController.abort())` to cancel upstream provider calls on client disconnect.
5. **Budgets & Context Authorization**: Enforce per-user daily token/request budgets in Redis and fetch project files only via `file` service using the authenticated `x-user-id` (preventing cross-tenant prompt injection/exfiltration).
