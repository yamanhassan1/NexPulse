# Getting Started

This guide gets the NexPulse backend running on your own machine, step by step.
No prior experience is assumed beyond being able to open a terminal and type
commands.

If any word here is unfamiliar — "service", "port", "terminal" — the
[Glossary](./glossary.md) explains it in plain language.

## What you'll need

| Tool | Why you need it | How to check |
| --- | --- | --- |
| **Node.js** (v18 or newer) | Runs the JavaScript backend. | `node --version` |
| **npm** | Installs project dependencies. It comes bundled with Node.js. | `npm --version` |

MongoDB is **not** required right now. The auth service has its database tool
installed, but it does not connect to a database yet.

## The one idea to understand first

The backend is made of **separate services**, and each service is its own little
project with its own dependencies.

That means: instead of running `npm install` once, you run it **once per
service**, and each service gets **its own terminal window**. This is normal for
a multi-service backend — it feels strange the first time.

For now there are two services, so you'll open two terminals.

## Step 1 — Get the code

```bash
git clone <repository-url>
cd NexPulse
```

## Step 2 — Start the auth service

Open a terminal, move into the auth service folder, install its dependencies,
and start it.

```bash
cd backend/services/auth
npm install
npm run dev
```

What those commands do:

- `cd backend/services/auth` — go into the auth service folder.
- `npm install` — download the packages this service needs (run once).
- `npm run dev` — start the service. `nodemon` keeps it running and restarts it
  whenever you save a file.

You should see:

```
Auth running at 8001
```

Confirm it works by opening `http://localhost:8001/` in your browser. You should
see:

```json
{ "message": "Hello from Auth" }
```

**Leave this terminal running.**

## Step 3 — Start the gateway

Open a **second** terminal — keep the first one running. Go into the gateway
folder and start it the same way.

```bash
cd backend/gateway
npm install
npm run dev
```

You should see:

```
gateway running at 8000
```

Confirm it by opening `http://localhost:8000/`. You should see:

```json
{ "message": "Hello from gateway" }
```

**Leave this terminal running too.**

## Step 4 — Confirm the two are connected

This is the interesting part. With both services running, visit the gateway's
auth path:

```
http://localhost:8000/auth/
```

You asked the **gateway**, but the answer comes from the **auth service**:

```json
{ "message": "Hello from Auth" }
```

That round trip — browser → gateway → auth → back — is exactly how every
request will flow through NexPulse.

## The two terminals at a glance

| Terminal | Folder | Command | Runs on |
| --- | --- | --- | --- |
| 1 | `backend/services/auth` | `npm run dev` | `8001` |
| 2 | `backend/gateway` | `npm run dev` | `8000` |

## Environment files

Each service reads its settings from its own `.env` file. These files are
ignored by Git (see `.gitignore`), so secrets and machine-specific settings stay
on your machine instead of being shared.

Current contents:

**`backend/gateway/.env`**

```
PORT=8000
FRONTEND_URL=http://localhost:5173
AUTH_SERVICE=http://localhost:8001
```

**`backend/services/auth/.env`**

```
PORT=8001
```

If a service won't start, or can't reach another service, the `.env` files are
the first place to look. A wrong port or URL here causes most connection
problems.

## Common problems

**"npm is not recognized"**
Node.js isn't installed, or isn't on your PATH. Install it from
[nodejs.org](https://nodejs.org) and reopen your terminal so it picks up the new
command.

**"Port already in use"**
Something else is already using that port. Either stop that program, or change
the `PORT` value in the service's `.env` file and restart it.

**`/auth/` returns an error instead of a message**
Usually one of two things: the auth service isn't running, or the gateway's
`AUTH_SERVICE` URL in `.env` doesn't match where auth is actually listening.

**My changes don't show up**
Both services use `nodemon`, which restarts on save. If something still looks
stale, check that the terminal didn't crash — scroll up and look for errors.

**Everything looks right, but the browser shows nothing**
Double-check the port in the URL. The gateway is `8000`; auth is `8001`. Mixing
them up is easy and common.
