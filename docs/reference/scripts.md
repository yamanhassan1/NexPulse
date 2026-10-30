# Scripts and Commands

## npm scripts

Every backend package has the same two scripts.

| Package | Script | Command | Purpose |
| --- | --- | --- | --- |
| `backend/gateway` | `npm run dev` | `nodemon index.js` | Start with auto-restart on file save. |
| `backend/gateway` | `npm start` | `node index.js` | Start once, without a watcher. |
| `backend/services/auth` | `npm run dev` | `nodemon index.js` | Start with auto-restart. |
| `backend/services/auth` | `npm start` | `node index.js` | Start once. |
| `backend/services/project` | `npm run dev` | `nodemon index.js` | Start with auto-restart. |
| `backend/services/project` | `npm start` | `node index.js` | Start once. |
| `backend/shared` | — | — | Libraries only; no start script. |

Frontend:

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the dev server with hot reload. |
| `npm run build` | `vite build` | Produce the production bundle in `dist/`. |
| `npm run preview` | `vite preview` | Serve the production build locally. |
| `npm run lint` | `eslint .` | Check the frontend for lint errors. |

## First-time install

Run `npm install` in each folder:

```bash
cd backend/shared
npm install

cd ../gateway
npm install

cd ../services/auth
npm install

cd ../services/project
npm install

cd ../../frontend
npm install
```

`backend/shared` must be installed because the backend services import its Redis
client, and its dependencies are declared in its own `package.json`.

## Start everything locally

Use separate terminals:

```bash
# Terminal 1
cd backend/services/auth
npm run dev
```

```bash
# Terminal 2
cd backend/services/project
npm run dev
```

```bash
# Terminal 3
cd backend/gateway
npm run dev
```

```bash
# Terminal 4
cd frontend
npm run dev
```

Redis:

```bash
docker compose -f backend/docker-compose.yml up -d
```

## Redis commands

```bash
# Start
docker compose -f backend/docker-compose.yml up -d

# Status
docker compose -f backend/docker-compose.yml ps

# Stop (keeps the container)
docker compose -f backend/docker-compose.yml stop

# Restart
docker compose -f backend/docker-compose.yml restart

# Remove the container
docker compose -f backend/docker-compose.yml down

# Ping
docker compose exec redis redis-cli ping

# Inspect keys
docker compose exec redis redis-cli KEYS 'session-*'
docker compose exec redis redis-cli KEYS 'projects-*'
docker compose exec redis redis-cli KEYS 'starred-projects-*'
```

## Health checks

```bash
curl http://localhost:8000/
curl http://localhost:8001/
curl http://localhost:8002/health
```

Expected responses:

```json
{ "message": "Hello from gateway" }
{ "message": "Hello from Auth" }
{ "message": "Hello from Project Service" }
```

## Protected-route checks

Without a session cookie:

```bash
curl -i http://localhost:8000/api/me
curl -i http://localhost:8000/api/project
```

Both should return `401`.

With a browser session, use the browser's Network tab or export the cookie
manually. The session cookie is `httpOnly`, so it cannot be read from
`document.cookie`; copy it from the browser dev tools or a tool such as Postman.

## Syntax checks

There is no backend test runner. `node --check` catches syntax errors:

```bash
cd backend/gateway
node --check index.js
node --check middleware/protect.js
node --check middleware/loginLimiter.js
node --check controllers/user.controller.js
node --check utils/proxyWithHeaders.js

cd ../services/auth
node --check index.js
node --check config/db.js
node --check config/firebase.js
node --check controllers/auth.controller.js
node --check models/user.model.js
node --check routes/auth.route.js

cd ../project
node --check index.js
node --check config/db.js
node --check controllers/project.controller.js
node --check models/project.model.js
node --check routes/project.route.js
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Where each port is configured

| Port | App | Setting |
| --- | --- | --- |
| `5173` | Frontend dev server | Vite default; printed at startup. |
| `8000` | Gateway | `PORT` in `backend/gateway/.env` |
| `8001` | Auth service | `PORT` in `backend/services/auth/.env` |
| `8002` | Project service | `PORT` in `backend/services/project/.env` |
| `6379` | Redis | Docker Compose mapping |

If you change the gateway port, update `VITE_SERVER_URL`. If you change a
service port, update the gateway's `AUTH_SERVICE` or `PROJECT_SERVICE`.

## What is not available

- No `npm test` in any package.
- No backend lint script.
- No root `package.json`; there is no workspace-level command runner.
- No database migration tool; Mongoose creates indexes from the schemas.
- No seed script.
