# Gateway Service

**Location:** `backend/gateway`
**Default port:** `8000`

The gateway is the front door of the NexPulse backend. Every request from the
browser arrives here first, and the gateway decides which service should handle
it. It is small on purpose — its only job is to route and to handle shared
chores that shouldn't be repeated in every service.

## Why it exists

If the frontend had to know about every backend service, their addresses, and
their quirks, then every time a service moved or changed, the frontend would
need to change too. That's fragile and annoying.

The gateway solves this by being the **single address** the frontend knows.
Inside, it keeps a simple list of which path belongs to which service. The
frontend stays unaware of what's behind the door.

It also means shared chores — allowing cross-origin requests, reading cookies,
printing logs — happen **once** here, instead of in every service.

## The code, explained

The whole service lives in `index.js`. Here it is, piece by piece.

### 1. Loading dependencies

```js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import proxy from "express-http-proxy";
import { protect } from "./middleware/protect.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeaders.js";
```

Each import is a tool:

- `express` — the web framework. It gives us a server and routing.
- `dotenv` — reads the `.env` file so settings like the port and service URLs
  aren't hard-coded.
- `cors` — lets the browser frontend (a different origin) call this server.
- `cookie-parser` — turns the raw `Cookie` header into a handy `req.cookies`
  object.
- `morgan` — logs each incoming request so you can see what's happening.
- `express-http-proxy` — the piece that forwards requests to other services.
- `protect` — the auth gate: reads the session cookie and loads the user.
- `getCurrentUser` — a small controller for `GET /api/me`.
- `proxyWithHeader` — a proxy wrapper that adds the `x-user-id` header.

### 2. Reading configuration

```js
dotenv.config();
const port = process.env.PORT || 8000;
```

`dotenv.config()` loads the `.env` file into `process.env`. Then we read the
port. The `|| 8000` is a safety net: if `PORT` isn't set, we fall back to 8000
rather than crashing.

The relevant `.env` values:

| Variable | Meaning |
| --- | --- |
| `PORT` | The port the gateway listens on (`8000`). |
| `FRONTEND_URL` | The frontend's address, trusted for CORS (`http://localhost:5173`). |
| `AUTH_SERVICE` | Where the auth service lives (`http://localhost:8001`). |
| `PROJECT_SERVICE` | Where the project service lives (`http://localhost:8002`). |

### 3. Creating the app

```js
const app = express();
```

This creates the Express application. Everything below attaches behavior to it.

### 4. Allowing the frontend in (CORS)

```js
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
```

Browsers block a web page from calling a different origin unless that origin is
explicitly allowed. The frontend and the gateway are different origins, so
without this the browser would refuse the request.

- `origin` — only trust the frontend's address.
- `credentials: true` — allow cookies to be sent. This is essential because
  login sessions will rely on cookies.

### 5. Reading cookies

```js
app.use(cookieParser());
```

Login sessions are stored in cookies. This middleware parses them into
`req.cookies`, which is what the `protect` middleware reads a moment later to
find the session. The same request path also carries `Set-Cookie` headers back
out to the browser, so the auth service can set a session cookie without the
gateway doing anything special.

### 6. Logging requests

```js
app.use(morgan("dev"));
```

Every request gets logged in a compact, readable format. This is the first thing
you check when debugging — did the request even arrive?

### 7. Routing to the auth service

```js
app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
```

This is the heart of the gateway. In plain words:

> "Any request whose path starts with `/api/auth` — send it to the auth service."

One detail matters here, and it's the single most common source of confusion in
this project: **the `/api/auth` prefix is removed** before the request is
forwarded. Express behaves this way because the proxy is mounted on a path
(`app.use("/api/auth", ...)`), and mounted middleware sees the path with that
prefix stripped off.

So in practice:

| You request | Auth service receives |
| --- | --- |
| `GET /api/auth/` on the gateway | `GET /` on the auth service |
| `POST /api/auth/login` on the gateway | `POST /login` on the auth service |

The auth service therefore does **not** define routes like `/api/auth/login`.
It defines `/login`, and the gateway is what adds the `/api/auth` part for the
outside world. The response then travels back to the caller unchanged.

This is why the frontend calls `/api/auth/login` while the auth service's route
is simply `app.post("/login")` — the gateway is the translator between the two.

> If the auth service ever needs the original path, it can read `req.baseUrl`,
> which still holds `/api/auth`.

### 8. The auth gate — `protect`

Logged-in-only routes share one guard: `middleware/protect.js`.

```js
import redis from "../../shared/redis/redis.js";

export const protect = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session;
    if (!sessionId) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const result = await redis.get(`session-${sessionId}`);
    if (!result) {
      return res.status(401).json({ message: "session not found" });
    }

    req.user = JSON.parse(result);
    next();
  } catch (error) {
    console.error(`[protect] ${error.message}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};
```

It does three things:

1. **Reads the session cookie.** No cookie → `401 unauthorized`.
2. **Looks the session up in Redis.** No matching key (expired or forged) →
   `401 session not found`.
3. **Attaches the user** to `req.user` and calls `next()`, so the route can use
   it.

Because `protect` is the *only* thing that touches Redis sessions, the services
behind the gateway never see the cookie — they trust `req.user` (or the
`x-user-id` header the proxy derives from it).

### 9. Routing to the project service (protected)

```js
app.use(
  "/api/project",
  protect,
  proxyWithHeader(process.env.PROJECT_SERVICE)
);
```

This is the auth service's pattern plus two extras:

- **`protect` runs first.** An unauthenticated request is stopped here and never
  reaches the project service.
- **`proxyWithHeader` forwards the user's identity.** It's a thin wrapper around
  `express-http-proxy` in `utils/proxyWithHeaders.js`:

  ```js
  import proxy from "express-http-proxy";

  export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
      proxyReqOptDecorator: (proxyReqOpts, req) => {
        if (req.user) {
          proxyReqOpts.headers["x-user-id"] = req.user?._id;
        }
        return proxyReqOpts;
      },
    });
  };
  ```

  `proxyReqOptDecorator` runs just before the request is forwarded, so it copies
  `req.user._id` into an `x-user-id` header. The project service reads that
  header and never has to know about sessions, cookies, or Redis.

As with `/api/auth`, the `/api/project` prefix is stripped, so `/api/project/`
arrives at the project service as `/`.

### 10. `GET /api/me` — who am I?

```js
app.get("/api/me", protect, getCurrentUser);
```

This route is answered **by the gateway itself** — it isn't proxied. `protect`
loads the user from the session, and `getCurrentUser` simply returns `req.user`.
The frontend calls it on page load to find out whether there's an active session
(and who it belongs to). A `401` here is a normal answer meaning "not signed in."

### 11. A health endpoint

```js
app.get("/", (req, res) => {
  res.json({ message: "Hello from gateway" });
});
```

A simple way to confirm the gateway is alive. Visit `http://localhost:8000/` and
you should see this JSON message.

### 12. Starting the server

```js
app.listen(port, () => {
  console.log(`gateway running at ${port}`);
});
```

This actually starts the server and prints a friendly line so you know it
started successfully.

## How to run it

```bash
cd backend/gateway
npm install
npm run dev
```

Then open `http://localhost:8000/` — you should see:

```json
{ "message": "Hello from gateway" }
```

> The auth service must be running for `/api/auth/*` requests to succeed, and
> the project service for `/api/project/*`. The gateway itself starts fine
> without either.

## Quick reference

| Method | Path | What happens |
| --- | --- | --- |
| `GET` | `/` | Returns `{ "message": "Hello from gateway" }`. |
| `ANY` | `/api/auth/*` | Forwarded to the auth service at `AUTH_SERVICE`, with the `/api/auth` prefix stripped. Public. |
| `ANY` | `/api/project/*` | Runs `protect`, then forwarded to the project service at `PROJECT_SERVICE` (prefix stripped) with an `x-user-id` header. |
| `GET` | `/api/me` | Runs `protect`, then returns the current user from the session. |

## Dependencies and why we use them

| Package | What it is | Why we use it |
| --- | --- | --- |
| `express` | Web framework | Provides the server, routing, and middleware. |
| `cors` | Cross-origin helper | Lets the frontend call the gateway from a different origin. |
| `cookie-parser` | Cookie middleware | Reads cookies so sessions can work. |
| `morgan` | Request logger | Shows each request during development. |
| `express-http-proxy` | Reverse proxy | Forwards requests to the services behind the gateway. |
| `ioredis` | Redis client | Lets `protect` look sessions up in Redis. (Via the shared client.) |
| `dotenv` | Config loader | Keeps ports and URLs out of the code. |
| `nodemon` | Dev auto-restart | Restarts the server when you save a file. |
