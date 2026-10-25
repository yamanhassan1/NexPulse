# 8 — The Auth Gate, Session Restore, and the Project Service

## At a glance

| | |
| --- | --- |
| **Commits** | `fb72984`, `f8746da` |
| **Date** | 2026-10-20 → 2026-10-22 |
| **Author** | Yaman Hassan |
| **Messages** | `feat: implement user authentication middleware and fetch current user data` / `feat: initialize project with Express and Mongoose setup` |

Two commits that finally *use* the Redis sessions the previous work was storing.
The first adds the gateway middleware that checks a session, plus an `/api/me`
endpoint and the frontend code to restore a user on reload. The second applies
that gate to a brand-new service — the first one that only ever answers
authenticated requests — and tightens error handling across the flow.

## What changed

1. **The gateway got an auth gate.** `middleware/protect.js` reads the session
   cookie, looks the session up in Redis, and attaches the user to `req.user` —
   or answers `401` and stops. It's the first middleware that makes a route
   "protected."
2. **A `GET /api/me` endpoint.** The gateway answers "who am I?" from the
   session, so the frontend can recover the signed-in user after a page reload
   without going through Firebase again.
3. **A new project service.** `backend/services/project` (port `8002`) stores a
   user's code projects in MongoDB, with endpoints to create, list, fetch, star,
   and delete. Its list endpoints cache in Redis.
4. **Identity by header.** The gateway's new `utils/proxyWithHeaders.js`
   forwards the user's id to the project service as an `x-user-id` header, so the
   service never touches cookies or sessions itself.
5. **Session restore on the client.** `App.jsx` now calls `me()` once on mount
   and dispatches the result into Redux, and `features/me.js` wraps the endpoint.
6. **Error handling tightened.** `handleLogin` gained a `try`/`catch`/`finally`,
   `login()` stopped swallowing errors, and the backend controllers stopped
   returning raw error messages to the client.

## Why it was done

The session work had landed but nothing read it. Login wrote a session to Redis
and set a cookie, then every request ignored both — the cookie was decorative.
`protect` turns it into an actual gate: a single place that answers "is this
request from a signed-in user?" before anything behind the gateway runs.

`/api/me` is the natural companion. Sessions survive a page reload, but Redux
doesn't — so on every refresh the app *looked* signed out even though the cookie
said otherwise. `me()` closes that gap by asking the backend who the cookie
belongs to.

The project service is where that gate earns its keep. It's the first service
that should only ever be reachable by a signed-in user, and because `protect`
runs at the gateway, the service itself stays simple: it reads an `x-user-id`
header and does its job. No cookie parsing, no Redis lookups, no Firebase — one
trusted input instead of the whole auth stack repeated in every service.

## Files touched

| File | State |
| --- | --- |
| `backend/gateway/middleware/protect.js` | **Added** — the session check. |
| `backend/gateway/utils/proxyWithHeaders.js` | **Added** — forwards `x-user-id` to services. |
| `backend/gateway/controllers/user.controller.js` | **Added** — the `/api/me` handler. |
| `backend/gateway/index.js` | Edited — mounts `protect`, `/api/me`, and the protected project route. Drops the old plain proxy for `/api/project`. |
| `backend/gateway/package.json` | Edited — adds `ioredis` (the gateway now reads sessions itself). |
| `backend/services/project/index.js` | **Added** — the service entry point. |
| `backend/services/project/config/db.js` | **Added** — its MongoDB connection. |
| `backend/services/project/models/project.model.js` | **Added** — `owner`, `name`, `description`, `starred`, `lastOpenedAt`. |
| `backend/services/project/controllers/project.controller.js` | **Added** — create / list / starred / fetch / star / delete, with Redis caching. |
| `backend/services/project/routes/project.route.js` | **Added** — maps URLs to the controllers. |
| `backend/services/project/package.json` | **Added** — its own dependency list. |
| `backend/services/auth/controllers/auth.controller.js` | Edited — `login`/`logout` return generic messages and log the detail. |
| `frontend/src/App.jsx` | Edited — the session-restore effect, using `me()`. |
| `frontend/src/features/me.js` | **Added** — wraps `GET /api/me`. |
| `frontend/src/features/login.js` | Edited — no longer catches and returns `null`. |
| `frontend/src/pages/Dashboard.jsx` | Edited — `handleLogin` now has `try`/`catch`/`finally`. |

## Decisions worth noting

- **Identity travels as an `x-user-id` header, not the cookie.** The cookie
  stays between the browser and the gateway. Behind the gateway, a single header
  carries identity — which keeps session handling in one place, but means the
  services must never be exposed directly. Anyone who could reach port `8002`
  and set the header could impersonate a user; only the gateway calls it, which
  is what makes the header trustworthy.
- **`protect` fails closed.** A missing cookie, an unknown session, or a Redis
  error all produce `401` — never a "logged in anyway." The one subtlety is
  ordering: the Redis lookup runs *before* the `if (!result)` check, so a
  thrown error is caught by the same `try` rather than leaving `result` in a
  half-defined state.
- **The project service caches reads and invalidates on writes.** Listing
  projects is frequent and only changes on a write, so it's a good cache
  candidate. But unlike sessions, those keys have **no expiry** — they live until
  a write deletes them. That's only safe while this service is the sole writer.
- **`/api/me` lives on the gateway, not a service.** It answers from the session
  the gateway already holds, so routing it anywhere else would just be a
  round-trip to re-derive the same thing.
- **Backend errors stopped leaking detail.** The auth controllers now return
  `{ message: "Login failed" }` and `console.error` the real reason. A user sees
  a generic failure; the operator sees the stack. The trade-off is that debugging
  from the browser alone is harder — which is the point.

## How to verify

Start Redis, the auth service, the project service, the gateway, and the
frontend (five processes — see [Getting Started](../getting-started.md)). Then:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, sign in with Google, and **reload**. Because
`App.jsx` calls `me()` on mount, the session is restored — no second sign-in.

Check the gate directly with a tool like `curl`:

```bash
# No cookie → the gate refuses.
curl -i http://localhost:8000/api/me
# → HTTP/1.1 401 Unauthorized

# No cookie → the gate refuses the project route too.
curl -i http://localhost:8000/api/project
# → HTTP/1.1 401 Unauthorized
```

`npm run lint` and `npm run build` both pass. On the backend,
`node --check` is clean on the changed files.

## Known rough edges

- **The project service has bugs in two controllers.** `toggleStar` and
  `deleteProject` reference an undefined `userId` — they were written before the
  header-based identity was settled. Listing and creating work; starring and
  deleting throw.
- **The project service has no `cookie-parser`,** and doesn't need one — it reads
  `x-user-id`. But that also means it does **no** verification of its own: it
  trusts the header completely.
- **Logout still isn't wired up.** The auth controller can delete a session, but
  there's no route to it and the auth service has no `cookie-parser`, so the
  frontend can't log out yet.
- **`me()` has no loading or error state.** While `/api/me` is in flight the app
  renders as signed out; a `401` is ignored (correctly — it's the normal answer
  for a visitor), but a real failure is only logged.
- **The project-list cache can go stale across writers.** Any change to projects
  made outside this service wouldn't invalidate the `projects-<userId>` keys.
- **`protect` does authentication, not authorization.** It confirms *who* the
  user is; it doesn't yet check whether they're allowed to touch a given project.

## Up next

Add a logout route (and `cookie-parser` in the auth service), fix the undefined
`userId` in `toggleStar`/`deleteProject`, and start reading the stored user in the
UI — a navbar name and a real signed-out view. Longer term, move ownership checks
("is this *your* project?") into the gateway or the service so `protect` is
joined by a matching authorization step.
