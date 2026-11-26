# NexPulse Gateway Connection Diagnostic & Fix

## Root Cause

1. **Backend services were not running (Primary Cause)**:
   - `netstat -ano` showed zero listeners on ports `8000` (`gateway`), `8001` (`auth`), `8002` (`project`), and `8003` (`file`), while MongoDB (`27017`) and Redis (`6379`) were running.
   - Because `frontend/.env` configures `VITE_SERVER_URL=http://localhost:8000`, every `/api/me` call from the browser received `net::ERR_CONNECTION_REFUSED`.
   - The repository lacked a unified backend startup script to boot `auth`, `file`, `project`, and `gateway` in dependency order, and `setupGracefulShutdown` did not attach an HTTP `server.on("error")` handler to surface `EADDRINUSE` / `EACCES` startup failures cleanly.
   - Note on port `5173`: On this machine, `127.0.0.1:5173` (IPv4) was occupied by an unrelated local `nginx` process while Vite bound `[::1]:5173` (IPv6). If a browser resolves `localhost` to `127.0.0.1`, it hits the wrong server unless `5173` is free or another port (e.g. `5179`) is used.
2. **Duplicate `/api/me` probes & missing Axios timeout (Secondary Frontend Cause)**:
   - `frontend/src/features/session.js` (`bootstrapSession`) had no in-flight deduplication (`inFlightBootstrap`), allowing concurrent calls (React `StrictMode` double-effect or rapid `Try again` clicks) to trigger overlapping `/api/me` requests and duplicate `[me] Network Error` logs.
   - `frontend/src/utils/axios.js` had no request `timeout` and no `VITE_SERVER_URL` fallback.

---

## Files Inspected

- `backend/gateway/package.json`, `backend/gateway/src/index.js`, `backend/gateway/.env`
- `backend/services/{auth,project,file}/.env`
- `backend/shared/src/http/gracefulShutdown.js`
- `frontend/src/app/App.jsx`, `frontend/src/features/session.js`, `frontend/src/utils/axios.js`, `frontend/.env`

## Files Modified / Created

- [gracefulShutdown.js](file:///C:/Users/User/Documents/Web_development/MERN-Stack/NexPulse/backend/shared/src/http/gracefulShutdown.js) — Added `server.on("error")` diagnostics for `EADDRINUSE` and `EACCES` across all services.
- [session.js](file:///C:/Users/User/Documents/Web_development/MERN-Stack/NexPulse/frontend/src/features/session.js) — Added `inFlightBootstrap` deduplication while preserving `MAX_ATTEMPTS = 2` (700 ms backoff) and `<SessionError />`.
- [axios.js](file:///C:/Users/User/Documents/Web_development/MERN-Stack/NexPulse/frontend/src/utils/axios.js) — Added `timeout: 10000` and `"http://localhost:8000"` fallback for `baseURL`.
- [start-all.mjs](file:///C:/Users/User/Documents/Web_development/MERN-Stack/NexPulse/backend/start-all.mjs) — Added unified launcher that starts `auth`, `file`, and `project`, waits for their `/ready` endpoints, then starts `gateway`.
- [nexpulse.spec.js](file:///C:/Users/User/Documents/Web_development/MERN-Stack/NexPulse/frontend/e2e/nexpulse.spec.js) — Added Test 3 verifying controlled `<SessionError />` and bounded `/api/me` attempts (`<= 2`) when gateway is stopped.

---

## Required Environment Variables

- **Backend Gateway (`backend/gateway/.env`)**: `PORT=8000`, `FRONTEND_URL=http://localhost:5173`, `AUTH_SERVICE=http://localhost:8001`, `PROJECT_SERVICE=http://localhost:8002`, `FILE_SERVICE=http://localhost:8003`, `REDIS_URL=redis://localhost:6379`, `INTERNAL_SECRET` (required in production).
- **Internal Services (`auth`, `project`, `file`)**: `PORT` (`8001`, `8002`, `8003`), `MONGODB_URI`, `REDIS_URL`, `FILE_SERVICE=http://localhost:8003` (for `project`), `HOST=127.0.0.1`.
- **Frontend (`frontend/.env`)**: `VITE_SERVER_URL=http://localhost:8000`, `VITE_FIREBASE_API_KEY`.

---

## Service Startup Order & Windows Commands

1. Ensure **MongoDB** (`127.0.0.1:27017`) and **Redis** (`127.0.0.1:6379`) are running.
2. Start all 4 backend services in dependency order (`auth` + `file` + `project` -> `gateway`):
   ```powershell
   node backend/start-all.mjs
   ```
3. Start the frontend dev server (in a separate terminal):
   ```powershell
   cd frontend
   npm run dev
   ```
   *(If port `5173` is occupied by another local service on IPv4 `127.0.0.1`, pass `--port 5179` and include `http://localhost:5179` in `FRONTEND_URL`.)*

---

## Test Results

- **`node backend/start-all.mjs` smoke test**: `GET /health` -> `200 {"status":"ok","service":"gateway","redis":"ready"}`; `GET /ready` -> `200 {"status":"ready","redis":"ready"}`.
- **Frontend lint & unit tests**: `0` ESLint errors, `139 / 139` unit tests passing, production build succeeded (`10.98 s`).
- **Playwright E2E (`npm run test:e2e`)**: `3 / 3` passed (`20.5 s`):
  - Test 1: Unauthenticated `/api/me` returns `401` and redirects to `/signin`; valid session persists across reload; logout clears cookie & Redis session.
  - Test 2: Full authenticated Dashboard, Project CRUD, Monaco, Preview, Terminal, ThemeSwitcher flow with `0` console errors.
  - Test 3: Gateway stopped -> frontend displays `"We can't reach NexPulse"` (`<SessionError />`) after `<= 2` `/api/me` requests (no infinite retry loop).

## Remaining Issues

- On this Windows host, `127.0.0.1:5173` is occupied by an unrelated `nginx` process (`PID 9576`); free port `5173` or run Vite on a clean port (e.g. `5179`) matching `FRONTEND_URL`.
- Interactive Firebase Google OAuth popup login requires real Google credentials in a non-headless session.
