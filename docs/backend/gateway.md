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

Login sessions are stored in cookies. This middleware parses them so any service
behind the gateway can read `req.cookies` easily. It's set up now so the auth
service can use it when it handles login. The same request path also carries
`Set-Cookie` headers back out to the browser, so a service behind the gateway
can set a session cookie without the gateway doing anything special.

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

### 8. A health endpoint

```js
app.get("/", (req, res) => {
  res.json({ message: "Hello from gateway" });
});
```

A simple way to confirm the gateway is alive. Visit `http://localhost:8000/` and
you should see this JSON message.

### 9. Starting the server

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

> The auth service must be running for `/api/auth/*` requests to succeed, but
> the gateway itself will start fine without it.

## Quick reference

| Method | Path | What happens |
| --- | --- | --- |
| `GET` | `/` | Returns `{ "message": "Hello from gateway" }`. |
| `ANY` | `/api/auth/*` | Forwarded to the auth service at `AUTH_SERVICE`, with the `/api/auth` prefix stripped. |

## Dependencies and why we use them

| Package | What it is | Why we use it |
| --- | --- | --- |
| `express` | Web framework | Provides the server, routing, and middleware. |
| `cors` | Cross-origin helper | Lets the frontend call the gateway from a different origin. |
| `cookie-parser` | Cookie middleware | Reads cookies so sessions can work. |
| `morgan` | Request logger | Shows each request during development. |
| `express-http-proxy` | Reverse proxy | Forwards requests to the services behind the gateway. |
| `dotenv` | Config loader | Keeps ports and URLs out of the code. |
| `nodemon` | Dev auto-restart | Restarts the server when you save a file. |
