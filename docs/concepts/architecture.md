# Architecture

This page explains how the parts of NexPulse that already exist fit together,
and why they were built this way. A few terms here are defined in the
[Glossary](./glossary.md) if you need them.

## The pieces that exist

There are two backend services today, and nothing else.

```
   ┌───────────────────────┐
   │   Browser (frontend)  │   The web app the user opens
   └──────────┬────────────┘     (not built yet — shown for context)
              │  HTTP / JSON + cookies
              ▼
   ┌───────────────────────┐
   │     API Gateway       │   Single entry point   (port 8000)
   │    backend/gateway    │
   └──────────┬────────────┘
              │  forwards /auth/* requests
              ▼
   ┌───────────────────────┐
   │     Auth Service      │   Will handle users & login   (port 8001)
   │ backend/services/auth │
   └───────────────────────┘
```

A request from the browser does not go to the auth service directly. It always
reaches the gateway first, and the gateway decides where the request should go.
Right now there is no frontend to send those requests, but the gateway is ready
for one.

## Why a "gateway"?

The gateway is the **front door** of the backend. The frontend only needs to
know one address — the gateway's. The gateway then forwards each request to the
right place.

Picture a receptionist in a large office building. You don't wander the halls
looking for the right person; you tell the receptionist what you need, and they
send you to the right office. The gateway is that receptionist for the backend.

**What this gives us:**

- **One address to remember.** The frontend talks to port `8000` and nothing
  else. It never needs to know that an auth service exists.
- **Shared chores in one spot.** Cross-origin access, cookie reading, and
  logging are set up once in the gateway, not repeated in every service. When
  there are five services, that's five fewer copies to keep in sync.
- **A place for security checks.** Later, the gateway can check a user's session
  *before* a request reaches a service — one checkpoint guarding every door.

The cost is one extra hop: requests travel gateway → service → back. For most
apps this delay is tiny, and the clarity it buys is worth it.

## Why two services instead of one?

The backend is split into small, independent parts. There is only one business
service today (auth), but the gateway is separate from it on purpose: the
gateway is **infrastructure** (it routes traffic) rather than **business logic**
(it owns no data).

Keeping them apart means:

- Each piece can be understood and changed on its own.
- The auth logic has a clear boundary — nothing else needs to know how it
  works internally.
- The gateway can learn to route to new services without anyone touching the
  auth code.

## How a request flows today

1. A request arrives at the gateway, for example `GET /auth/`.
2. The gateway checks the path. It starts with `/auth`, so the gateway forwards
   the request to the auth service — with the `/auth` part removed, so the auth
   service receives `GET /`.
3. The auth service handles it and returns a response.
4. The gateway hands that response back to whoever called it.

The same sharing idea applies to **cookies**: the gateway reads them once, so
any service behind it can use them for login sessions.

## The technology used, and why

Each choice below is explained as **what it is**, **why it's here**, and
**where** it's used.

### Node.js + Express

- **What:** Node.js runs JavaScript outside the browser. Express is a small web
  framework on top of it that makes handling HTTP requests simple.
- **Why:** Using one language across the whole project means less switching
  between languages. Express is minimalist — it gives you routing and middleware
  and otherwise stays out of the way.
- **Where:** Both the gateway and the auth service. Both use Express 5.

### Environment variables (`dotenv`)

- **What:** A way to keep settings — ports, URLs, secrets — outside the code, in
  a `.env` file.
- **Why:** Secrets must never be committed to Git, and the same code should run
  in different places with different settings. Your laptop and a server need
  different ports and URLs, but the same code.
- **Where:** Both services load their `.env` on startup.

### `express-http-proxy`

- **What:** A library that lets one server forward a request to another, then
  return the answer as if it came from the first.
- **Why:** This is the mechanism that makes the gateway a gateway. A single line
  of code routes an entire path prefix to another service.
- **Where:** `backend/gateway/index.js`.

### CORS

- **What:** A browser security rule. It blocks a web page from calling a
  *different origin* unless that origin is explicitly allowed.
- **Why:** When the frontend is built, it will run on a different origin than
  the gateway. Without CORS the browser would refuse to let them talk.
- **Where:** The gateway, configured from `FRONTEND_URL`.

### Cookies (`cookie-parser`)

- **What:** Small pieces of data the browser stores and sends back with each
  request.
- **Why:** Login sessions will be stored in cookies. The gateway parses them so
  services behind it can read them easily.
- **Where:** The gateway. It's set up now so it's ready when login is built.

### Request logging (`morgan`)

- **What:** A middleware that prints one line per HTTP request.
- **Why:** During development you want to *see* what's hitting your server. A
  request log is the first thing you check when something "doesn't work."
- **Where:** The gateway.

### MongoDB + Mongoose

- **What:** MongoDB is a database that stores data as flexible, JSON-like
  documents. Mongoose is a helper that adds structure and validation on top of
  it, and lets you work with data as JavaScript objects.
- **Why:** Documents map naturally to JavaScript objects, and a flexible
  structure suits a project whose data is still taking shape.
- **Where:** Installed in the auth service. The connection itself is not set up
  yet.

### `nodemon`

- **What:** A development tool that restarts a server automatically when you
  save a file.
- **Why:** It removes the manual "stop the server, start the server" loop while
  you're making changes.
- **Where:** Both services, through `npm run dev`.

## Design principles in the existing code

1. **Single entry point.** The browser only ever needs the gateway.
2. **Configuration over hard-coding.** Settings live in `.env`, not in the
   source, so the same code works in different places.
3. **Secrets stay on the server.** Sensitive values are never shipped to the
   browser.
4. **Keep it explainable.** If a piece can't be explained simply, it's probably
   too complicated.
