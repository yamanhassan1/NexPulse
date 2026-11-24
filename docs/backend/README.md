# Backend Overview

The backend is the part that runs on a server instead of in the browser. It owns
identity, sessions, project data, and the rules for who may access what.

This page is the map. Each service has its own page, and the cross-cutting topics
have dedicated pages too.

| Page | What it covers |
| --- | --- |
| [Gateway](./gateway.md) | The public entry point, routing, CORS, cookies, auth gate, rate limit. |
| [Auth service](./auth-service.md) | Firebase verification, users, login, logout. |
| [File service](./file-service.md) | Project file trees, content, import/export, restore. |
| [Project service](./project-service.md) | Project CRUD, starred list, caching. |
| [Preview service](./preview-service.md) | Project analysis, runtime sessions, logs, generation templates. |
| [API Reference](./api-reference.md) | Every endpoint, body, response, and status code. |
| [Data Model](./data-model.md) | MongoDB schemas, relationships, Redis keys, TTLs. |
| [Security Model](./security.md) | Trust boundaries, cookies, rate limiting, known gaps. |
| [Redis Usage](./redis.md) | Sessions and caching in detail. |

## Folder layout

```text
backend/
├── docker-compose.yml          Local Redis
├── gateway/                    :8000 — public entry point
│   ├── src/
│   │   ├── index.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
├── services/
│   ├── auth/                   :8001 — identity
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── routes/
│   │   ├── serviceAccountKey.json  (secret, git-ignored)
│   │   └── package.json
│   ├── file/                   :8003 — file tree and contents
│   │   ├── src/                config/, controllers/, models/, routes/, utils/
│   │   └── package.json
│   ├── project/                :8002 — project data
│   │   ├── src/                config/, controllers/, models/, routes/, utils/
│   │   └── package.json
│   └── preview/                :8004 — project preview runtime
│       ├── src/                index.js, controllers/, lib/, routes/
│       ├── tests/              Node test runner tests
│       └── package.json
└── shared/
    ├── package.json            declares ioredis
    └── src/
        ├── http/               shared internal auth and error handling
        └── redis/              one shared Redis client
```

Runnable packages keep application code under `src/`. Manifests, environment
examples, and service-local tests remain at each package root. Shared runtime
helpers live in `backend/shared/src/`.

## Core backend request path

### 1. Gateway

The gateway is the front door. The browser never talks directly to the auth or
project service. It sends all requests to the gateway first.

Responsibilities:

- allow the configured frontend origin through CORS, with credentials
- parse cookies
- log requests with `morgan`
- rate-limit `POST /api/auth/login`
- forward `/api/auth/*` to the auth service
- run `protect` before forwarding `/api/project/*`
- add the `x-user-id` header for the project service
- answer `GET /api/me` from the session
- return JSON `404` and `500` responses

### 2. Auth service

The auth service owns identity.

It does this:

- receives a Firebase ID token from the frontend
- verifies it with Firebase Admin
- finds or creates the user in MongoDB
- creates a session id and stores the public user in Redis
- sets an `httpOnly` session cookie
- deletes the session and clears the cookie on logout

### 3. Project service

The project service owns project records.

It does this:

- trusts the gateway's `x-user-id` header
- creates, lists, fetches, stars, and deletes projects
- scopes every query to the signed-in owner
- caches list responses in Redis for 5 minutes
- invalidates the cache on writes

The file service owns project file data. The preview service analyzes files and
manages per-user, per-project runtime sessions. Both are routed through the
gateway.

## How a request moves

```mermaid
flowchart TD
    B["Browser"]
    B -->|"POST /api/auth/login"| G["Gateway :8000"]
    G -->|"POST /login"| A["Auth service :8001"]
    A --> F[("Firebase")]
    A --> M[("MongoDB")]
    A --> R[("Redis")]
    A -->|"Set-Cookie"| B

    B -->|"GET /api/project<br>+ session cookie"| G
    G -->|"protect: read session"| R
    G -->|"GET / + x-user-id"| P["Project service :8002"]
    P --> M
    P --> R
    P -->|"projects"| G
    G --> B

    B -->|"GET /api/me"| G
    G -->|"answered from session"| B
```

The important ideas:

- public login goes to the auth service
- private data goes through the gateway first
- the gateway checks the session before allowing access
- the project service never sees the session cookie

## Shared rules

Across the backend:

- each program has its own `package.json`
- configuration lives in `.env`
- MongoDB stores long-lived records
- Redis stores sessions and cache entries
- the gateway is the only public backend door
- services behind the gateway trust the gateway, not the browser
- errors return `{ "message": "..." }`; internal details are logged server-side

## Shared modules

HTTP auth/error helpers and the Redis client live in `backend/shared/src/`.
Each service process creates its own Redis connection when it imports the client.

Because `backend/shared/` has its own `package.json`, install its dependencies once:

```bash
cd backend/shared
npm install
```

Redis is used for:

- login sessions (`session-<uuid>`, 7-day TTL)
- project list caches (`projects-<userId>` and
  `starred-projects-<userId>`, 5-minute TTL)

See [Redis Usage](./redis.md).

## Running the backend

Start Redis first:

```bash
docker compose -f backend/docker-compose.yml up -d
```

Then each service in its own terminal:

```bash
cd backend/shared && npm install
```

```bash
cd backend/services/auth && npm install && npm run dev
```

```bash
cd backend/services/project && npm install && npm run dev
```

```bash
cd backend/services/file && npm install && npm run dev
```

```bash
cd backend/services/preview && npm install && npm run dev
```

```bash
cd backend/gateway && npm install && npm run dev
```

The auth service requires `serviceAccountKey.json` and MongoDB. The project and
file services require MongoDB. The preview service requires the file service
and runtime tooling such as Node/npm for JavaScript projects.

## Health endpoints

| Service | URL | Response |
| --- | --- | --- |
| Gateway | `http://localhost:8000/` and `/health` | `{ "message": "Hello from gateway" }` |
| Auth | `http://localhost:8001/` and `/health` | `{ "message": "Hello from Auth" }` |
| Project | `http://localhost:8002/health` | `{ "message": "Hello from Project Service" }` |
| File | `http://localhost:8003/health` | `{ "message": "Hello from File Service" }` |
| Preview | `http://localhost:8004/health` | `{ "service": "preview", "status": "ok", "sessions": 0 }` |

## What the backend does not do yet

- Preview service tests run with `npm test` in `backend/services/preview`.
- Other backend packages do not currently define test scripts.
- No authorization roles or sharing; ownership is enforced by query filters.
- No project update endpoint for name/description.
- No account deletion.
- No structured logging or tracing.
- The login limiter is in memory, so it does not coordinate across multiple
  gateway instances.

Those are tracked in the [Roadmap](../roadmap.md).
