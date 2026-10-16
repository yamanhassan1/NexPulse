# The Backend

This page is the map for the `backend/` folder. Read it to see how the pieces
fit together, then dive into whichever service you're working on.

## What the backend is

The backend is the part of NexPulse that runs on a server rather than in the
browser. It holds the logic, the database connection, and the secrets (things
like API keys) that must never be exposed to users.

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
│   └── auth/           Verifies sign-ins and stores users.           (port 8001)
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
- **Route it owns today:** anything starting with `/api/auth` goes to the auth
  service. (The `/api/auth` part is stripped before forwarding — the auth
  service defines its own routes without it, so `/api/auth/login` arrives there
  as `/login`.)
- **Shared jobs handled here:** CORS (letting the frontend in), cookie parsing,
  and request logging — all done once, for every service.

Full details: [Gateway Service](./gateway.md).

### 2. Auth service (`backend/services/auth`)

The auth service is where user identity lives. It uses **Firebase
Authentication** to verify that a request comes from a real user, then stores
that user's profile in **MongoDB**.

- **Port:** `8001`
- **Owns:** `POST /login` and the `GET /` health check.
- **Storage:** MongoDB, through Mongoose.
- **External dependency:** Firebase Admin, used to verify sign-in tokens.

It's organised into the usual Express folders:

```
services/auth/
├── index.js              Wires everything together and starts the server.
├── config/               One-time setup: DB connection, Firebase init.
├── controllers/          The login logic.
├── models/               The user schema.
└── routes/               Maps URLs to controller functions.
```

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
   │  POST /api/auth/login   (with a Firebase token)
   ▼
Gateway :8000
   │  "This path starts with /api/auth — send it on, without that prefix."
   ▼
Auth Service :8001
   │  POST /login
   │  verify the token with Firebase
   │  find or create the user in MongoDB
   ▼
Response travels back up the same chain
```

Note that `/api/auth` is stripped at the gateway, so the auth service defines
its routes without that prefix.

## Conventions every service follows

These habits keep the services predictable, so you can move between them without
re-learning how things work.

- **One folder per service.** Each service is self-contained: its own code,
  `package.json`, `.env`, and dependencies.
- **ES Modules.** Every `package.json` sets `"type": "module"`, so code uses
  `import` / `export` rather than the older `require`. Relative imports must
  include the file extension — `../models/user.model.js`, not
  `../models/user.model`. Leaving it out is the most common way this kind of
  project fails to start.
- **Configuration from the environment.** Ports, URLs, and database URIs come
  from `.env` files, never hard-coded.
- **Secrets stay out of Git.** `.env` files are ignored by Git, and other
  credential files (such as the auth service's `serviceAccountKey.json`) must be
  ignored too.
- **A `dev` script.** Every service runs with `npm run dev`, which uses
  `nodemon` to restart automatically when you save a file.
- **A health endpoint.** Every service answers `GET /` with a small JSON
  message, so you can confirm it's alive.
- **Requests flow in layers.** Routes point to controllers, controllers use
  models, and nothing jumps over a layer. Routing stays a one-liner, and the
  logic stays easy to test.

## Running the backend

You'll need **Node.js**. Each service is installed and started separately, in
its own terminal:

```bash
npm install
npm run dev
```

Repeat that inside each service folder. See
[Getting Started](../getting-started.md) for the full walkthrough.
