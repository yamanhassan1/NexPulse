# Scripts and Commands

## npm scripts

Every backend package has the same two scripts.

| Package | Script | Command | Purpose |
| --- | --- | --- | --- |
| `backend/gateway` | `npm run dev` | `nodemon src/index.js` | Start with auto-restart on file save. |
| `backend/gateway` | `npm start` | `node src/index.js` | Start once, without a watcher. |
| `backend/services/auth` | `npm run dev` | `nodemon src/index.js` | Start with auto-restart. |
| `backend/services/auth` | `npm start` | `node src/index.js` | Start once. |
| `backend/services/file` | `npm run dev` | `nodemon src/index.js` | Start with auto-restart. |
| `backend/services/file` | `npm start` | `node src/index.js` | Start once. |
| `backend/services/project` | `npm run dev` | `nodemon src/index.js` | Start with auto-restart. |
| `backend/services/project` | `npm start` | `node src/index.js` | Start once. |
| `backend/services/preview` | `npm run dev` | `nodemon src/index.js` | Start with auto-restart. |
| `backend/services/preview` | `npm start` | `node src/index.js` | Start once. |
| `backend/services/preview` | `npm test` | `node --test "tests/*.test.js"` | Run preview service tests. |
| `backend/shared` | — | — | Libraries only; no start script. |

Frontend:

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the dev server with hot reload. |
| `npm run build` | `vite build` | Produce the production bundle in `dist/`. |
| `npm run preview` | `vite preview` | Serve the production build locally. |
| `npm run lint` | `eslint .` | Check the frontend for lint errors. |
| `npm test` | `node --test` | Run frontend tests. |

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

cd ../file
npm install

cd ../preview
npm install

cd ../../../frontend
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
cd backend/services/file
npm run dev
```

```bash
# Terminal 5
cd backend/services/preview
npm run dev
```

```bash
# Terminal 6
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
curl http://localhost:8003/health
curl http://localhost:8004/health
```

Expected responses:

```json
{ "message": "Hello from gateway" }
{ "message": "Hello from Auth" }
{ "message": "Hello from Project Service" }
{ "message": "Hello from File Service" }
{ "service": "preview", "status": "ok", "sessions": 0 }
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

The preview service has a built-in `npm test` script; there is no shared backend
test runner. `node --check` catches syntax errors:

```bash
cd backend/gateway
node --check src/index.js
node --check src/middleware/protect.js
node --check src/middleware/loginLimiter.js
node --check src/controllers/user.controller.js
node --check src/utils/proxyWithHeaders.js

cd ../services/auth
node --check src/index.js
node --check src/config/db.js
node --check src/config/firebase.js
node --check src/controllers/auth.controller.js
node --check src/models/user.model.js
node --check src/routes/auth.route.js

cd ../project
node --check src/index.js
node --check src/config/db.js
node --check src/controllers/project.controller.js
node --check src/models/project.model.js
node --check src/routes/project.route.js

cd ../file
node --check src/index.js
node --check src/config/db.js
node --check src/controllers/file.controller.js
node --check src/models/file.model.js
node --check src/routes/file.route.js

cd ../preview
node --check src/index.js
```

Frontend checks:

```bash
cd frontend
npm test
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
| `8003` | File service | `PORT` in `backend/services/file/.env` |
| `8004` | Preview service | `PORT` in `backend/services/preview/.env` |
| `6379` | Redis | Docker Compose mapping |

If you change the gateway port, update `VITE_SERVER_URL`. If you change a
service port, update the gateway's `AUTH_SERVICE`, `PROJECT_SERVICE`,
`FILE_SERVICE`, or `PREVIEW_SERVICE`.

## What is not available

- No shared backend test suite; preview has its own `npm test` script.
- No backend lint script.
- No root `package.json`; there is no workspace-level command runner.
- No database migration tool; Mongoose creates indexes from the schemas.
- No seed script.
