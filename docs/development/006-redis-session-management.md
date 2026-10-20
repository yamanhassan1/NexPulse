# 7 — Login Sessions with Redis

## At a glance

| | |
| --- | --- |
| **Commit** | `17a3be8` |
| **Date** | 2026-10-18 |
| **Author** | Yaman Hassan |
| **Message** | `feat: implement session management with Redis for login/logout functionality` |

Login now creates a real session: the browser keeps a cookie, Redis keeps the
data, and neither has to trust the other with more than a random ID.

## What changed

1. **Redis joined the stack.** `backend/docker-compose.yml` starts a Redis
   server for local development — one command, no install.
2. **`backend/shared/` got its first resident.** The Redis client lives in
   `shared/redis/redis.js`, with its own `package.json` declaring `ioredis`,
   because more than one service may need Redis eventually.
3. **Login stores a session.** After the find-or-create step, the auth service
   generates a session ID, saves `{ userId, name, email, avatar }` in Redis
   under `session-<id>` with a seven-day time to live, and attaches an
   `httpOnly` cookie with the same ID to the response. Login now returns the
   user object instead of the raw decoded token.
4. **A logout controller was written** — deletes the Redis key and clears the
   cookie. (It isn't wired to a route yet; see the rough edges.)
5. **`index.js` switched to `import "dotenv/config"`** as the very first line.

## Why it was done

Since entry 4, every request was authenticated from scratch — nothing survived a
page reload. A session changes the shape of things:

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Auth service
    participant R as Redis

    B->>A: POST /login { token }
    A->>R: SET session-<id> (EX 7 days)
    A-->>B: Set-Cookie: session=<id>; HttpOnly
    Note over B: Later requests carry the cookie
    B->>A: any request + Cookie header
    Note over A: Look up session-<id> → who is this user
```

The browser holds only a random ID; the user data stays server-side where
scripts can't reach it. Redis gets the job because sessions are small,
short-lived, and read constantly — its wheelhouse. The `EX` (time to live)
argument means expired sessions delete themselves; no cleanup code exists
because none is needed.

## Files touched

| File | State |
| --- | --- |
| `backend/docker-compose.yml` | **Added** — Redis, port 6379. |
| `backend/shared/package.json` | **Added** — `"type": "module"`, `ioredis`. |
| `backend/shared/redis/redis.js` | **Added** — the shared Redis client. |
| `backend/services/auth/controllers/auth.controller.js` | Edited — session block in `login`, new `logout`. |
| `backend/services/auth/index.js` | Edited — `dotenv/config` first. |

## Decisions worth noting

- **The session block has its own `try`/`catch`.** If Redis is down, login
  still succeeds and returns the user — it logs `[login] session not saved`
  instead of failing the request. A missing session is an inconvenience; a
  broken login button is an outage. The client is also configured with
  `enableOfflineQueue: false` and a capped retry, so commands fail immediately
  rather than queueing into an unbounded backlog, and connection errors are
  reported once — not on every retry.
- **`import "dotenv/config"` must be first.** ES module imports run in order,
  before the file's own code, and the shared Redis client reads `REDIS_URL` the
  moment it's imported. The old `dotenv.config()` call ran *after* the imports —
  harmless before, wrong now.
- **The shared client has its own `package.json`.** `ioredis` is declared where
  it's used — `backend/shared/` — not inside the auth service. The folder also
  needs `"type": "module"`, or Node treats its files as legacy CommonJS and
  warns on every start.
- **`secure: false`, for now.** Correct for local `http` development; must
  become `true` behind HTTPS in production.
- **The environment matters:** `REDIS_URL` must use the `redis://` scheme
  (`redis://localhost:6379`). An `http://` URL looks plausible and fails
  confusingly.

## How to verify

```bash
docker compose -f backend/docker-compose.yml up -d
cd backend/services/auth && npm run dev
```

Sign in through the frontend. The response carries
`Set-Cookie: session=…; HttpOnly`, and `docker compose exec redis redis-cli
KEYS 'session-*'` shows the stored session. Restart the auth service with Redis
stopped: one `[redis] ECONNREFUSED` line at startup, and login still returns 200
— without creating a session.

## Known rough edges

- **Logout isn't routed.** The `logout` controller exists, but
  `routes/auth.route.js` maps only `POST /login` — there's no way to reach it.
- **The auth service can't read cookies yet.** `logout` uses `req.cookies`,
  which needs `cookie-parser` installed in *this* service. The gateway has it,
  but each process parses its own requests.
- **The gateway doesn't use sessions yet.** The cookie is set and stored; the
  front door doesn't check it. That's the next piece.

## Up next

Wire logout to a route, give the auth service `cookie-parser`, and teach the
gateway to read the session cookie so requests can be authorized at the front
door.
