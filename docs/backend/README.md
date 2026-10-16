# The Backend

This page is the map for the `backend/` folder. Read it to see how the pieces
fit together, then dive into whichever service you're working on.

## What the backend is

The backend is the part of NexPulse that runs on a server rather than in the
browser. It holds the logic, and it will hold the database connection and the
secrets (things like API keys) that must never be exposed to users.

The browser sends the backend requests; the backend sends back answers. Today
that means two small running programs.

It is built as a collection of **services** rather than one big program. A
service is a small, self-contained program that does one job, with its own
folder, dependencies, and settings.

## Folder layout

```
backend/
├── gateway/            The front door. Routes requests to services.  (port 8000)
├── services/
│   └── auth/           Will handle users and login.                  (port 8001)
└── shared/             A home for code shared across services. (empty for now)
```

The split is intentional:

- `gateway/` sits at the top because it is **infrastructure** — it routes
  traffic but owns no data of its own.
- `services/` groups the **business services**. Each new service gets its own
  folder here.
- `shared/` is reserved for code used by more than one service.

## The services

### 1. Gateway (`backend/gateway`)

The gateway is the only backend address the frontend needs to know. It receives
every request and forwards each one to the right service.

- **Port:** `8000`
- **Route it owns today:** anything starting with `/auth` goes to the auth
  service. (The `/auth` part is stripped before forwarding — the auth service
  defines its own routes without it.)
- **Shared jobs handled here:** CORS (letting the frontend in), cookie parsing,
  and request logging — all done once, for every service.

Full details: [Gateway Service](./gateway.md).

### 2. Auth service (`backend/services/auth`)

The auth service is where user identity will live: signing up, logging in, and
keeping sessions valid. Right now it is a working skeleton — it answers a health
check, and its database tool is installed and ready to be connected.

- **Port:** `8001`
- **Database tool:** Mongoose (installed, not connected yet).

Full details: [Auth Service](./auth-service.md).

### 3. Shared (`backend/shared`)

An empty-but-intentional folder. When two or more services need the same helper
code — a shared logger, common validation rules, and so on — it lives here.

Why bother having an empty folder? Because copy-pasted code drifts: two copies
start identical, then slowly become different, and bugs hide in the differences.
A single shared location prevents that. It's empty today because nothing is
shared yet; the folder marks where that code *will* go.

## How a request moves through the backend

```
Browser
   │  GET /auth/
   ▼
Gateway :8000
   │  "This path starts with /auth — send it to the auth service."
   ▼
Auth Service :8001
   │  (handles the request)
   ▼
Response travels back up the same chain
```

## Conventions every service follows

These habits keep the services predictable, so you can move between them without
re-learning how things work.

- **One folder per service.** Each service is self-contained: its own code,
  `package.json`, `.env`, and dependencies.
- **ES Modules.** Every `package.json` sets `"type": "module"`, so code uses
  `import` / `export` rather than the older `require`.
- **Configuration from the environment.** Ports and URLs come from `.env` files,
  never hard-coded. `.env` files are ignored by Git.
- **A `dev` script.** Every service runs with `npm run dev`, which uses
  `nodemon` to restart automatically when you save a file.
- **A health endpoint.** Every service answers `GET /` with a small JSON
  message, so you can confirm it's alive.

## Running the backend

You'll need **Node.js**. Each service is installed and started separately, in
its own terminal:

```bash
npm install
npm run dev
```

Repeat that inside each service folder. See
[Getting Started](../getting-started.md) for the full walkthrough.
