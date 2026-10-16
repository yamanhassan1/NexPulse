# NexPulse

An AI-powered code editor/IDE for the web.

NexPulse aims to give you a capable coding environment right in the browser —
write, organize, and build software while an AI assistant helps you along the
way. No heavy desktop install required.

> **Status:** early development. The backend foundation is being built first, so
> the project currently focuses on the server side.

## What's here today

The backend is built as a small set of services behind a single gateway.

| Part | Folder | Runs on | What it does |
| --- | --- | --- | --- |
| **Gateway** | `backend/gateway` | `:8000` | Single entry point. Routes requests to services. |
| **Auth service** | `backend/services/auth` | `:8001` | Skeleton with a health check; will handle users and login. |
| **Shared code** | `backend/shared` | — | Empty placeholder for code shared between services. |

```
Browser ─▶ Gateway :8000 ─▶ Auth Service :8001
```

The browser only ever talks to the gateway. The gateway decides where each
request goes. This keeps the frontend simple and keeps sensitive logic safely on
the server.

Both services respond to a health check (`GET /`), and the gateway forwards any
`/auth/*` request to the auth service. The auth service has its database tool
(Mongoose) installed, but no database connection yet.

## Tech stack

- **Node.js + Express** — the backend runtime and web framework.
- **`express-http-proxy`** — lets the gateway forward requests to services.
- **`dotenv`** — keeps configuration and secrets out of the source code.
- **`cors` / `cookie-parser` / `morgan`** — cross-origin access, cookies, and
  request logging.
- **Mongoose** — the database tool installed in the auth service.

Each choice is explained in the docs — including the reasoning behind it, not
just its name.

## Getting started

You'll need **Node.js** (v18+). Each service is installed and run separately.

**Terminal 1 — Auth service**

```bash
cd backend/services/auth
npm install
npm run dev
```

**Terminal 2 — Gateway**

```bash
cd backend/gateway
npm install
npm run dev
```

Then visit `http://localhost:8000/` and you should see
`{ "message": "Hello from gateway" }`.

For the full walkthrough — including how to verify the services are talking to
each other and how to fix common issues — see
[Getting Started](./docs/getting-started.md).

## Documentation

Detailed, plain-language documentation lives in the [`docs/`](./docs) folder. If
a term here is unfamiliar, the [Glossary](./docs/glossary.md) explains it.

| Document | What it covers |
| --- | --- |
| [Docs home](./docs/README.md) | Index and where to start. |
| [Architecture](./docs/architecture.md) | How the services fit together and why. |
| [Getting Started](./docs/getting-started.md) | Running the backend locally. |
| [Glossary](./docs/glossary.md) | Plain-language definitions of key terms. |
| [Backend overview](./docs/backend/README.md) | The services and how they fit together. |
| [Gateway service](./docs/backend/gateway.md) | The front door of the backend. |
| [Auth service](./docs/backend/auth-service.md) | The service that will handle users and login. |

## License

Not yet specified.
