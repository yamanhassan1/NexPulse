# Deployment Notes

NexPulse does not have a committed deployment pipeline yet. This page describes
what a correct deployment must preserve, the settings that must change for
production, and the assumptions that are currently safe only in local
development. Treat it as a checklist and a set of constraints, not as a
turnkey recipe.

## The shape of a deployment

Keep the trust boundary the same as it is locally: only the frontend and gateway
are public. The auth and project services, MongoDB, and Redis stay on a private
network.

```mermaid
flowchart LR
    U["Users"] -->|"HTTPS"| FE["Frontend<br>static files / CDN"]
    FE -->|"HTTPS + cookies"| GW["Gateway<br>public HTTPS"]
    GW -->|"private network"| AU["Auth service"]
    GW -->|"private network"| PR["Project service"]
    AU --> DB[("MongoDB")]
    AU --> RD[("Redis")]
    AU --> FB[("Firebase Auth")]
    PR --> DB
    PR --> RD
    GW -.->|"session reads"| RD
```

The browser must never be able to reach `8001` or `8002` directly. The project
service trusts the `x-user-id` header completely; exposing it would allow anyone
to impersonate a user by setting that header.

## What must change for production

| Setting | Development value | Production requirement |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` |
| Session cookie `secure` | `false` | `true` (the auth controller derives it from `NODE_ENV`) |
| Session cookie `sameSite` | `lax` | `none` when the frontend and gateway are on different sites; `lax` is acceptable when they share a site |
| Gateway `FRONTEND_URL` | `http://localhost:5173` | The exact public frontend origin, for example `https://app.example.com` |
| `AUTH_SERVICE` / `PROJECT_SERVICE` | localhost URLs | Private network URLs or service names |
| `VITE_SERVER_URL` | `http://localhost:8000` | The public gateway URL, for example `https://api.example.com` |
| `MONGODB_URI` | local URI | A managed MongoDB connection string with authentication |
| `REDIS_URL` | `redis://localhost:6379` | A private Redis URL, ideally with a password and TLS if supported |
| Frontend build | `npm run dev` | `npm run build`, then serve `frontend/dist/` |
| Firebase key | local file | A secret mounted at runtime or injected by the platform |

## Recommended deployment order

```mermaid
flowchart TD
    A["1. Provision MongoDB and Redis"] --> B["2. Configure Firebase production project"]
    B --> C["3. Deploy auth service + secret key"]
    C --> D["4. Deploy project service"]
    D --> E["5. Deploy gateway"]
    E --> F["6. Build and deploy frontend"]
    F --> G["7. Verify health + login + project CRUD"]
```

Deploy backends before the frontend, so the frontend's first requests have
somewhere to go. The gateway must know the real internal URLs of the auth and
project services.

## Production environment files

The gateway:

```env
PORT=8000
FRONTEND_URL=https://app.example.com
AUTH_SERVICE=http://auth-service:8001
PROJECT_SERVICE=http://project-service:8002
REDIS_URL=redis://redis:6379
NODE_ENV=production
```

The auth service:

```env
PORT=8001
MONGODB_URI=mongodb+srv://user:password@cluster/nexpulse
REDIS_URL=redis://redis:6379
NODE_ENV=production
```

The project service:

```env
PORT=8002
MONGODB_URI=mongodb+srv://user:password@cluster/nexpulse
REDIS_URL=redis://redis:6379
NODE_ENV=production
```

The frontend build:

```env
VITE_SERVER_URL=https://api.example.com
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
```

Use the same MongoDB database for the auth and project services. The project
`owner` field stores the auth service's user `_id`.

## HTTPS and cookies

In production the auth service sets:

```js
secure: process.env.NODE_ENV === "production",
sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
```

This means:

- The session cookie is only sent over HTTPS.
- `SameSite=None` is required when the frontend and gateway are on different
  sites, but browsers only accept `SameSite=None` together with `Secure`.
- If the frontend and gateway share a parent site, you can change the production
  value to `lax` and avoid some cross-site cookie restrictions.
- `httpOnly` stays `true`. JavaScript cannot read the session cookie.

The gateway also sets `app.set("trust proxy", 1)`. Keep a real reverse proxy or
load balancer in front of it so `req.ip` is correct for the login rate limit.

## CORS

The gateway allows exactly one origin, `FRONTEND_URL`, with credentials enabled.
In production:

- Use the exact scheme, host, and port (omit the port for default HTTPS).
- Do not use `*`; browsers reject wildcard origins with credentials.
- If you have multiple frontend origins, the gateway needs a small allow-list
  change; the current code supports one.

## Secrets

| Secret | Where it goes | Rule |
| --- | --- | --- |
| Firebase service account JSON | Auth service only | Mount as a secret file or inject through the platform's secret manager. Never commit it. |
| `MONGODB_URI` | Auth and project services | Store in the platform's secret store. |
| `REDIS_URL` | Gateway, auth, project | Store as a secret if it contains a password. |
| `VITE_FIREBASE_API_KEY` | Frontend build | Public by design; it is not a server secret. |

If `serviceAccountKey.json` is ever committed or shared, revoke it in the
Firebase console and issue a new one. Rotating is cheap; ignoring a leak is not.

## Redis in production

Redis currently holds two kinds of data:

- Sessions (`session-<uuid>`, 7-day TTL).
- Project caches (`projects-<userId>`, `starred-projects-<userId>`, 5-minute TTL).

Losing sessions logs users out. Losing the cache only costs a database read. That
makes persistence nice to have but not critical for correctness. If you enable
persistence, configure it for the deployment's tolerance for lost sessions.

Keep Redis private. If the gateway, auth service, and project service run in
different networks, make sure all three can reach the same Redis instance.

## Scaling notes

The current code is safe for a small number of instances, with caveats:

| Concern | Current behavior | Before scaling |
| --- | --- | --- |
| Login rate limit | In-memory `Map` in the gateway | Move the limiter to Redis or a shared gateway so every instance sees the same counts. |
| Sessions | Shared Redis | Fine as long as all gateway instances read the same Redis. |
| Project cache | Shared Redis | Fine while the project service is the only writer. Changes made outside it are not invalidated. |
| Cookie | Stateless id + Redis lookup | No sticky sessions required. |
| Logging | `morgan("dev")` | Use a production log format and ship logs to a collector. |
| Errors | `console.error` | Add structured logging and alerting. |

## Frontend hosting

The frontend is a static single-page app after `npm run build`.

- Serve `frontend/dist/`.
- Configure the host to rewrite unknown paths to `index.html`, so client-side
  routes such as `/project/:id`, `/terms`, and `/privacy` work on refresh.
- Set `VITE_SERVER_URL` at build time. Vite inlines `VITE_*` values into the
  bundle, so changing them requires a rebuild.
- Ensure the frontend origin exactly matches the gateway's `FRONTEND_URL`.

## Pre-deployment checklist

- [ ] `NODE_ENV=production` in all three backend services.
- [ ] HTTPS is terminated in front of the gateway.
- [ ] `FRONTEND_URL` is the exact public frontend origin.
- [ ] `VITE_SERVER_URL` is the public gateway URL.
- [ ] Auth and project service ports are not publicly reachable.
- [ ] Redis is private and reachable by all three backend services.
- [ ] MongoDB uses authentication and network restrictions.
- [ ] Firebase service account key is mounted as a secret.
- [ ] The frontend is built with `npm run build`, not served by Vite.
- [ ] SPA fallback is configured.
- [ ] Health endpoints answer through the gateway.
- [ ] Sign-in, reload, create, star, open, delete, and logout all work over
      HTTPS.
- [ ] A leaked or rotated Firebase key procedure is known.
- [ ] Logs are collected somewhere other than a terminal.

## What is deliberately missing

There is no Docker Compose file for the full stack, no CI/CD configuration, no
container images for the Node services, and no infrastructure-as-code. Those are
reasonable next steps, but they do not exist in the repository today. Do not
assume they do.
