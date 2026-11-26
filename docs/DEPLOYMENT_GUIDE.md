# NexPulse Production Deployment Guide

## 1. Required Environment Variables

Configure `.env` files (or container secrets) from each service's `.env.example`:

- **Shared Security (`gateway`, `auth`, `project`, `file`)**:
  - `NODE_ENV=production` (mandatory; `assertInternalSecret` exits if `INTERNAL_SECRET` is missing in production)
  - `INTERNAL_SECRET=<64-char-cryptographic-random-secret>` (identical across gateway and all internal services)
  - `REDIS_URL=rediss://:<password>@<redis-host>:6379`
  - `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/nexpulse?retryWrites=true&w=majority`
- **Gateway (`backend/gateway/.env`)**:
  - `PORT=8000`
  - `FRONTEND_URL=https://app.example.com` (strict comma-separated origins; no wildcards)
  - `LOGIN_RATE_LIMIT_MAX=30`, `WRITE_RATE_LIMIT_MAX=240`, `IMPORT_RATE_LIMIT_MAX=25`, `EXPORT_RATE_LIMIT_MAX=25`
- **File Service (`backend/services/file/.env`)**:
  - `HOST=0.0.0.0` (only when containerized inside a private VPC/network; default `127.0.0.1`)
  - `STORAGE_QUOTA_BYTES=104857600` (e.g. 100 MB per user)
  - `QUOTA_LOCK_TTL_MS=15000`, `QUOTA_LOCK_WAIT_MS=10000`
- **Frontend (`frontend/.env`)**:
  - `VITE_SERVER_URL=https://api.example.com`
  - `VITE_FIREBASE_API_KEY=...` (public Firebase client config only; **never** place server/LLM secrets in `VITE_*`)

## 2. Reverse Proxy & HTTPS

- Terminate TLS 1.2/1.3 at your reverse proxy / load balancer (Nginx, Caddy, ALB) and redirect all HTTP -> HTTPS.
- Gateway enables `app.set("trust proxy", 1)` and `Strict-Transport-Security` in `NODE_ENV=production`. Ensure only the trusted reverse proxy can reach Gateway `:8000`, and internal services (`8001–8003`) are **not** publicly exposed.
- Auth cookies use `httpOnly: true`, `secure: true`, `sameSite: "none"` in production (required when SPA and API are on distinct subdomains; HTTPS is mandatory for `SameSite=None; Secure`).

## 3. Health, Readiness & Graceful Shutdown

- **Liveness**: `GET /health`
- **Readiness**: `GET /ready` (returns `503` if MongoDB or Redis is disconnected; wire Kubernetes/load-balancer readiness probes here).
- **Graceful Shutdown**: All services trap `SIGTERM`/`SIGINT`, drain HTTP keep-alive connections, and close MongoDB/Redis clients cleanly.

## 4. Backup & Recovery

- Enable automated MongoDB point-in-time backups / daily snapshots with retention and test restores quarterly.
- Redis holds ephemeral sessions, rate-limit windows, locks, and project-list cache; RDB/AOF persistence is optional (if Redis restarts, users re-authenticate cleanly).
