# Environment Variables

## Live local readiness

The following capabilities are required for the complete application:

| Capability | Local dependency | Verification status |
| --- | --- | --- |
| Frontend | Vite on port `5173` | Available |
| Gateway | Backend gateway on port `8000` | Available |
| Auth, project, and file services | Ports `8001`, `8002`, and `8003` | Available |
| MongoDB | Same `MONGODB_URI` in auth, project, and file services | Listening and connection-tested |
| Redis | `REDIS_URL`, normally `redis://127.0.0.1:6379` | Container running; read/write tested |
| Firebase | Frontend Firebase config and auth service account | Credentials present; provider login requires an interactive browser session |
| Preview | Service on port `8004` | Not present in the current repository |
| AI provider | Provider-specific backend integration | No provider integration or credential is currently implemented |
| Terminal | Project workspace command panel (`help`, `ls`, `cd`, `pwd`, `cat`, `open`, `echo`, `clear`) | Available; does not execute system shell processes |

Each app reads its own environment file. The `.env` files are git-ignored;
`.env.example` files are committed and contain no secrets.

```mermaid
flowchart TD
    ENV["Environment files"] --> GW["backend/gateway/.env"]
    ENV --> AU["backend/services/auth/.env"]
    ENV --> PR["backend/services/project/.env"]
    ENV --> FI["backend/services/file/.env"]
    ENV --> PV["backend/services/preview/.env"]
    ENV --> FE["frontend/.env.local"]
    AU --> KEY["serviceAccountKey.json<br>(not an env file)"]
```

## Gateway

File: `backend/gateway/.env`

| Variable | Required | Default in code | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `8000` | `8000` | Gateway listen port. |
| `FRONTEND_URL` | No | `http://localhost:5173` | `https://app.example.com` | Exact allowed CORS origin. |
| `AUTH_SERVICE` | No | `http://localhost:8001` | `http://auth-service:8001` | Auth service base URL. |
| `PROJECT_SERVICE` | No | `http://localhost:8002` | `http://project-service:8002` | Project service base URL. |
| `FILE_SERVICE` | No | `http://localhost:8003` | `http://file-service:8003` | File service base URL. |
| `PREVIEW_SERVICE` | No | `http://localhost:8004` | `http://preview-service:8004` | Preview service base URL. |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | `redis://redis:6379` | Used by the shared Redis client for session checks. |
| `INTERNAL_SECRET` | In production | none | shared secret value | Sent to protected internal services. |
| `NODE_ENV` | No | undefined | `production` | Affects cookie flags in the auth service, not the gateway logic. |

Notes:

- `FRONTEND_URL` is used with `credentials: true`; it must be an exact origin,
  not `*`.
- The gateway imports the shared Redis client, so `REDIS_URL` matters here too.
- In production, set `INTERNAL_SECRET` to the same value configured on every
  internal service.

## Auth service

File: `backend/services/auth/.env`

| Variable | Required | Default in code | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `8001` | `8001` | Auth service listen port. |
| `MONGODB_URI` | Yes | none | `mongodb://127.0.0.1:27017/nexpulse` | MongoDB connection string. |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | `redis://redis:6379` | Session storage. |
| `INTERNAL_SECRET` | In production | none | shared secret value | Must match the gateway's internal secret. |
| `HOST` | No | `127.0.0.1` | `127.0.0.1` | Bind address. |
| `NODE_ENV` | No | undefined | `production` | Controls `secure` and `sameSite` on the session cookie. |

If `MONGODB_URI` is missing, the service logs `[auth] MONGODB_URI is not set` and
continues running; login attempts that need the database will fail.

### Firebase service account

File: `backend/services/auth/serviceAccountKey.json`

This is not an environment variable. It is a JSON credential file loaded by
`src/config/firebase.js` at import time. If it is missing or malformed, the auth
service crashes immediately. It is a secret and is ignored by Git.

## Project service

File: `backend/services/project/.env`

| Variable | Required | Default in code | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `8002` | `8002` | Project service listen port. |
| `MONGODB_URI` | Yes | none | `mongodb://127.0.0.1:27017/nexpulse` | MongoDB connection string. |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | `redis://redis:6379` | Project-list cache. |
| `FILE_SERVICE` | No | `http://localhost:8003` | `http://file-service:8003` | File service URL used when creating project roots. |
| `INTERNAL_SECRET` | In production | none | shared secret value | Must match the gateway's internal secret. |
| `HOST` | No | `127.0.0.1` | `127.0.0.1` | Bind address. |
| `NODE_ENV` | No | undefined | `production` | Reserved; currently not used by this service's logic. |

Use the same database as the auth service so `owner` can reference a user `_id`.

## File service

File: `backend/services/file/.env`

| Variable | Required | Default in code | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `8003` | `8003` | File service listen port. |
| `MONGODB_URI` | Yes | none | `mongodb://127.0.0.1:27017/nexpulse` | Stores project file trees and content. |
| `STORAGE_QUOTA_BYTES` | No | unlimited | `104857600` | Optional per-user storage quota for imports. |
| `INTERNAL_SECRET` | In production | none | shared secret value | Must match the gateway's internal secret. |
| `HOST` | No | `127.0.0.1` | `127.0.0.1` | Bind address; use a private container network when needed. |
| `NODE_ENV` | No | undefined | `production` | Runtime environment. |

## Preview service

File: `backend/services/preview/.env`

| Variable | Required | Default in code | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `8004` | `8004` | Preview service listen port. |
| `INTERNAL_SECRET` | In production | none | shared secret value | Must match the gateway's internal secret. |
| `HOST` | No | `127.0.0.1` | `127.0.0.1` | Bind address. |
| `FILE_SERVICE` | No | `http://localhost:8003` | `http://file-service:8003` | Internal file service URL. |
| `NEXPULSE_PREVIEW_DIR` | No | OS temp directory | `D:/nexpulse-workspaces` | Root directory for per-user/project runtime workspaces. |
| `NEXPULSE_PREVIEW_IDLE_MS` | No | 1800000 | `1800000` | Idle session timeout in milliseconds. |
| `NEXPULSE_INSTALL_TIMEOUT_MS` | No | 600000 | `600000` | Dependency installation timeout. |
| `NEXPULSE_START_TIMEOUT_MS` | No | 120000 | `120000` | Frontend/runtime startup timeout. |
| `NEXPULSE_BACKEND_TIMEOUT_MS` | No | 90000 | `90000` | Backend startup timeout. |
| `NEXPULSE_ALLOW_INSTALL_SCRIPTS` | No | enabled | `0` or `1` | Set to `0` to block package install lifecycle scripts. |

## Frontend

File: `frontend/.env.local` (or `.env`)

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | Yes | `http://localhost:8000` | Base URL for every axios request. Must be the gateway. |
| `VITE_FIREBASE_API_KEY` | Yes | `AIza...` | Firebase web API key used by `src/config/firebase.js`. |

Important:

- **Anything prefixed `VITE_` is public.** Vite substitutes it into the browser
  bundle. Never put a server secret there.
- Vite reads these at startup; restart `npm run dev` after changing them.
- Production builds inline these values, so changing them requires a rebuild.

Firebase configuration in `frontend/src/config/firebase.js` also contains the project id,
auth domain, storage bucket, messaging sender id, app id, and measurement id.
Those identify the Firebase project and are safe to commit.

## Shared Redis client

File: `backend/shared/src/redis/redis.js` reads `process.env.REDIS_URL` directly.

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Connection string for `ioredis`. |

`backend/shared/` has no `.env` file of its own. It inherits `process.env` from
the program that imports it. Load `dotenv/config` before importing the shared
client, which every backend entry point currently does.

## Environment matrix

| Variable | Gateway | Auth | Project | File | Preview | Frontend |
| --- | --- | --- | --- | --- | --- | --- |
| `PORT` | Yes | Yes | Yes | Yes | Yes | — |
| `FRONTEND_URL` | Yes | — | — | — | — | — |
| `AUTH_SERVICE` | Yes | — | — | — | — | — |
| `PROJECT_SERVICE` | Yes | — | — | — | — | — |
| `FILE_SERVICE` | Yes | — | Yes | — | Yes | — |
| `PREVIEW_SERVICE` | Yes | — | — | — | — | — |
| `INTERNAL_SECRET` | Yes | Yes | Yes | Yes | Yes | — |
| `REDIS_URL` | Yes | Yes | Yes | — | — | — |
| `MONGODB_URI` | — | Yes | Yes | Yes | — | — |
| `NODE_ENV` | Yes | Yes | Yes | Yes | Yes | — |
| `NEXPULSE_*` | — | — | — | — | Yes | — |
| `STORAGE_QUOTA_BYTES` | — | — | — | Yes | — | — |
| `HOST` | — | Yes | Yes | Yes | Yes | — |
| `VITE_SERVER_URL` | — | — | — | — | — | Yes |
| `VITE_FIREBASE_API_KEY` | — | — | — | — | — | Yes |

## Security classification

| Value | Public? | Where it belongs |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes (browser key) | Frontend env |
| Firebase project id / app id | Yes | Frontend source |
| `MONGODB_URI` | No | Backend env / secret store |
| `REDIS_URL` with credentials | No | Backend env / secret store |
| `serviceAccountKey.json` | No | Auth service secret mount |
| Session id | Sensitive, but stored in an `httpOnly` cookie | Browser cookie only |

See [Security Model](../backend/security.md) for the reasoning.
