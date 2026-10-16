# 3 — Gateway Implemented, Auth Skeleton, Docs

## At a glance

| | |
| --- | --- |
| **Commit** | `b1882f2` |
| **Date** | 2026-10-16 |
| **Author** | Yaman Hassan |
| **Message** | `Add backend services and documentation for NexPulse` |

## What changed

This is the commit where the backend stops being a folder of intentions and
becomes something that runs. Three things happened together:

1. **The gateway got real code** — CORS, cookie parsing, request logging, and
   a proxy route that forwards requests to the auth service.
2. **The auth service was scaffolded** — a minimal Express app with a health
   check, plus its dependencies including Mongoose.
3. **The project got its documentation** — the `docs/` folder was created with
   seven pages, and the README was rewritten.

A smaller but important change rode along: `.env` was added to `.gitignore`.

## Why it was done

The gateway and the auth service were built together because they only make
sense as a pair. A gateway that forwards to nothing can't be tested; an auth
service with no front door can't be reached from the browser. Landing them in
one commit means the thing in that commit actually works end to end.

Writing the documentation in the same commit was deliberate. When the code is
fresh in your head, explaining it is cheap. Two weeks later it costs real time
and the explanations get vague.

## Files touched

| File | State |
| --- | --- |
| `backend/gateway/index.js` | **Implemented** — 31 lines of gateway logic. |
| `backend/gateway/package.json` | Edited — switched `commonjs` to `module`. |
| `backend/services/auth/index.js` | **Added** — health-check skeleton. |
| `backend/services/auth/package.json` | **Added** — auth's identity and dependencies. |
| `backend/services/auth/package-lock.json` | **Added** — resolved dependency tree. |
| `.gitignore` | Edited — now ignores `.env`. |
| `README.md` | Rewritten — overview, quickstart, docs links. |
| `docs/*` | **Added** — architecture, getting started, glossary, backend pages. |

## Decisions worth noting

### The gateway became an ES module

`"type"` changed from `"commonjs"` to `"module"`, and `index.js` uses
`import`. This matches what the auth service already used and what the frontend
will use, so there's one module style across the project. The trade-off is that
relative imports need explicit file extensions.

### One line routes a whole service

The heart of the gateway is a single statement:

```js
app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
```

(At this commit it was `/auth`; the `/api` prefix arrives in commit 4.)

`express-http-proxy` forwards the request and returns the downstream response
as if the gateway had produced it itself. Two details are easy to get wrong and
worth remembering:

- **The mount prefix is stripped.** `/auth/login` arrives at the auth service as
  `/login`, not `/auth/login`. So the auth service defines routes *without* the
  prefix.
- **The target comes from `.env`**, not a hard-coded string. That keeps the
  service address out of the source code.

### Middleware order is a design choice

```js
app.use(cors(...));      // 1. let the frontend in
app.use(cookieParser()); // 2. read cookies
app.use(morgan("dev"));  // 3. log the request
// ...then routes
```

Middleware runs top to bottom, so these run before any route handler. Each one
handles a chore that would otherwise be repeated in every service. Putting
shared work in the gateway means new services get it for free.

### The auth service stays a skeleton on purpose

`index.js` is fifteen lines: set up Express, answer `GET /`, listen on the port.
No database connection, no routes. It proves the service runs and can be
reached through the gateway, without pretending to do work that isn't there
yet.

It does include Mongoose in its dependencies, which quietly signals the next
step: storing users in MongoDB.

### Secrets finally leave Git

`.gitignore` gained `.env`. Until this point, environment files could have been
committed by accident. Since `.env` holds ports and (soon) database credentials
and API keys, ignoring it is a safety change, not a tidy-up.

## How to verify

Start both services and confirm the gateway forwards to auth:

```bash
# terminal 1
cd backend/services/auth && npm install && npm run dev

# terminal 2
cd backend/gateway && npm install && npm run dev
```

Then:

- `http://localhost:8001/` → `{ "message": "Hello from Auth" }`
- `http://localhost:8000/` → `{ "message": "Hello from gateway" }`
- `http://localhost:8000/auth/` → the auth service's message, proving the proxy
  works.

## Up next

Add a real frontend, and teach the auth service to verify actual sign-ins
instead of just saying hello.
