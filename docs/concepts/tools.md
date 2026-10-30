# Tools and Libraries

NexPulse stands on other people's software. This page explains every major tool
in the project: what it is, why it is here, and where it is used. Terms link to
the [Glossary](./glossary.md).

## At a glance

| Layer | Tools |
| --- | --- |
| **Runtime** | Node.js |
| **Backend** | Express 5, `express-http-proxy`, `dotenv`, `cors`, `cookie-parser`, `morgan`, `nodemon` |
| **Database** | MongoDB, Mongoose |
| **Sessions and cache** | Redis, `ioredis` |
| **Identity** | Firebase Authentication, `firebase-admin` |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, React Router 7, Redux Toolkit, axios, Firebase client SDK, Motion, `lucide-react`, `react-icons` |
| **Quality and tooling** | ESLint, Git, Postman |

---

## Runtime

### Node.js

- **What:** A runtime that lets JavaScript run outside the browser.
- **Why:** One language across the whole stack and a large ecosystem.
- **Where:** Every backend program. Version 18 or newer is required.
- **Version note:** The auth service uses ES modules and a JSON import attribute
  (`with { type: "json" }`), which needs a current Node release.

---

## Backend

### Express 5

- **What:** A small web framework for Node.js. It matches requests to routes and
  runs middleware in order.
- **Why:** Minimal and familiar. Express 5 handles rejected promises from async
  handlers by passing them to error middleware instead of leaving the request
  hanging.
- **Where:** Gateway, auth service, project service.
- **Trade-off:** Express 5 is newer, so a few older middleware packages are not
  fully compatible.

### `express-http-proxy`

- **What:** A reverse proxy. It forwards an incoming request to another server
  and returns the answer as if it had produced it.
- **Why:** It is the package that turns an Express app into a gateway. One line
  routes a whole path prefix to a service.
- **Where:** The gateway.
- **Two modes used:**
  - `app.use("/api/auth", proxy(authService))` — plain proxy for auth.
  - `proxyWithHeader(projectService)` — a wrapper that also sets
    `x-user-id` from `req.user._id`.
- **Gotcha:** Express strips the mount prefix before the proxy forwards.
  `/api/auth/login` reaches the auth service as `/login`. This is the most common
  source of routing confusion in the codebase.

### `dotenv`

- **What:** Reads a `.env` file and loads its values into `process.env`.
- **Why:** Ports, database URLs, and keys differ per machine and must not live in
  source.
- **Where:** Every backend entry point uses `import "dotenv/config"` as the first
  import. That ordering matters because the shared Redis client reads
  `process.env.REDIS_URL` when it is imported.
- **Related:** `.env` files are git-ignored.

### `cors`

- **What:** Middleware that adds the HTTP headers a browser needs to allow a
  cross-origin request.
- **Why:** The frontend (`:5173`) and gateway (`:8000`) are different origins.
  `credentials: true` additionally allows cookies to be sent.
- **Where:** The gateway, configured with `origin: process.env.FRONTEND_URL`.
- **Note:** A wildcard origin cannot be used with credentials. The origin must be
  exact.

### `cookie-parser`

- **What:** Reads the `Cookie` header into `req.cookies`.
- **Why:** The session id lives in a cookie.
- **Where:**
  - The gateway parses it so `protect` can read `req.cookies.session`.
  - The auth service parses it so `logout` can delete the session it names.
  - The project service does not use it; it reads `x-user-id`.

### `morgan`

- **What:** Middleware that prints one log line per HTTP request.
- **Why:** The first debugging question is usually "did the request arrive, and
  where did it go?"
- **Where:** The gateway, in `"dev"` format.

### `nodemon`

- **What:** Watches files and restarts the server on save.
- **Why:** Removes the manual stop/start loop during development.
- **Where:** The `npm run dev` script in each backend package.
- **Note:** Production should use `npm start` (`node index.js`) or a process
  manager.

---

## Database

### MongoDB

- **What:** A document database that stores JSON-like records instead of rows in
  tables.
- **Why:** Documents map naturally to JavaScript objects, and a flexible schema
  suits a project whose model is still growing. It is the "M" in MERN.
- **Where:** Holds the `users` collection (auth service) and the `projects`
  collection (project service).
- **Configuration:** `MONGODB_URI` in each service's `.env`. Both services should
  use the same database.

### Mongoose

- **What:** An ODM (Object Document Mapper) that adds schemas, validation,
  defaults, indexes, and timestamps on top of MongoDB.
- **Why:** Raw MongoDB accepts almost anything. Mongoose keeps records shaped
  correctly and turns them into JavaScript objects.
- **Where:**
  - `backend/services/auth/models/user.model.js`
  - `backend/services/project/models/project.model.js`
- **Behavior:** `connectDb` catches connection errors and logs them. The service
  keeps running but cannot read or write until MongoDB returns.
- **Indexes:** The project model declares two compound indexes for the dashboard
  queries: `{ owner, updatedAt }` and `{ owner, starred, updatedAt }`.

### Redis

- **What:** An in-memory key-value store with optional expiry (time to live).
- **Why:** It is a natural fit for two jobs:
  - **Sessions** are small, short-lived, and read on every protected request.
  - **Project lists** are read often and change only on writes.
- **Where:** `session-<uuid>` keys and `projects-<userId>` /
  `starred-projects-<userId>` keys.
- **Expiry:** Sessions: 7 days. Project cache: 5 minutes.
- **Trade-off:** One more process to run. If Redis restarts without persistence,
  sessions are lost (users sign in again) and caches are empty (the next read
  repopulates them).
- **Start it:** `docker compose -f backend/docker-compose.yml up -d`.

### `ioredis`

- **What:** The Node.js client for Redis.
- **Why:** Promise-based, well documented, and robust about reconnecting.
- **Where:** `backend/shared/redis/redis.js` creates one shared client used by:
  - the auth service (writes sessions),
  - the gateway's `protect` middleware (reads sessions),
  - the project service (reads/writes/deletes cache).
- **How it behaves:** `enableOfflineQueue: false` means commands fail immediately
  instead of queueing while Redis is down. Reconnect attempts are capped at 5
  seconds. The first connection error is logged once, and a successful
  connection resets the warning flag.
- **Dependency note:** `backend/shared/` has its own `package.json`, so
  `npm install` must be run there as well as in each service.

---

## Identity

### Firebase Authentication

- **What:** A Google service that handles sign-in, including Google OAuth,
  password flows, and email verification.
- **Why:** Auth is easy to build badly. Firebase does the hard parts properly.
- **Where:** The frontend uses the client SDK to open the Google popup. The
  backend never signs anyone in; it only verifies.
- **Trade-off:** A dependency on a third party. Existing sessions continue even
  if Firebase has an outage, but new sign-ins fail.

### `firebase-admin`

- **What:** The server-side Firebase SDK.
- **Why:** `verifyIdToken` is the security step. It checks that a token is
  genuine, unexpired, and issued by this project.
- **Where:** `backend/services/auth/config/firebase.js` initializes the admin app;
  `controllers/auth.controller.js` calls `verifyIdToken`.
- **Credential:** `serviceAccountKey.json`, loaded at import time. A missing or
  malformed key crashes the service at startup by design.

---

## Frontend

### React 19

- **What:** A UI library. You describe the screen for a given state, and React
  updates the DOM when state changes.
- **Why:** Components keep UI code reusable and organized.
- **Where:** The whole frontend. `App.jsx` owns the router and session restore;
  `pages/` holds screens; `components/` holds reusable pieces.

### Vite 8

- **What:** A build tool and dev server.
- **Why:** Near-instant dev startup, fast hot reload, and a tiny configuration.
- **Where:** The frontend. `vite.config.js` is eight lines and adds the React and
  Tailwind plugins.
- **Production:** `npm run build` writes static files to `frontend/dist/`.

### Tailwind CSS 4

- **What:** A utility-first CSS framework.
- **Why:** Styling stays beside the markup, and there is no separate stylesheet
  to keep in sync.
- **Where:** `frontend/src/index.css` imports Tailwind and defines the design
  tokens: colors, fonts, animations, and custom utilities such as `bg-grid` and
  `glass-panel`.
- **Version note:** Tailwind 4 is configured through the
  `@tailwindcss/vite` plugin rather than a separate config file.
- **Trade-off:** Markup gets long class strings. The project uses shared tokens
  to keep it readable.

### `@vitejs/plugin-react`

- **What:** Teaches Vite about React: JSX transformation and fast refresh.
- **Why:** Vite does not understand React out of the box.
- **Where:** `frontend/vite.config.js`.

### Firebase client SDK

- **What:** The browser half of Firebase.
- **Why:** It shows the Google popup and returns the ID token.
- **Where:** `frontend/firebase.js` initializes it and exports `auth` and
  `googleProvider`.
- **Important:** This is a different package from `firebase-admin`. The browser
  SDK cannot verify tokens; the admin SDK cannot run safely in a browser.

### axios

- **What:** An HTTP client.
- **Why:** One `axios.create` call configures the base URL and credentials once.
- **Where:** `frontend/src/utils/axios.js`:

  ```js
  export const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    withCredentials: true,
  });
  ```

- **Interceptor:** The same file adds a response interceptor. On a `401` that is
  not from `/api/me` or `/api/auth/login`, it clears the user and project state
  in Redux. That keeps the UI consistent when a session expires.
- **Why this matters:** `withCredentials: true` is what makes the browser send
  and accept the session cookie.

### React Router 7

- **What:** Client-side routing. It maps URLs to page components.
- **Why:** Real URLs make the back button, refresh, deep links, and bookmarking
  work.
- **Where:** `frontend/src/App.jsx`. Routes:
  - `/signin` — public sign-in page.
  - `/` — protected dashboard.
  - `/project/:id` — protected project detail.
  - `/terms` and `/privacy` — public legal pages.
  - `*` — not-found page.
- **Extra:** Pages are lazy-loaded and wrapped in `<Suspense>` with a page
  loader.

### Redux Toolkit

- **What:** The modern way to use Redux: a store holding state that many
  components can read, updated through reducers.
- **Why:** The signed-in user and project lists are needed by multiple screens.
  Prop-drilling would spread that state across the component tree.
- **Where:**
  - `frontend/src/redux/store.js` creates the store with `user` and `project`
    reducers.
  - `userSlice.js` holds `userData` and `authChecked`.
  - `projectSlice.js` holds projects, starred projects, loading flags, error
    messages, and optimistic star/delete updates.
  - `main.jsx` wraps the app in `<Provider>`.
- **Trade-off:** More machinery than a tiny app strictly needs. It is here as a
  bet on growth.

### Motion (`motion/react`)

- **What:** An animation library for React.
- **Why:** Small, declarative animations improve perceived quality without
  hand-written CSS keyframes.
- **Where:** Project cards, the create-project dialog, the sidebar buttons, and
  the dashboard.
- **Note:** Simple ambient animations (aurora glows, caret, page rise) are plain
  CSS keyframes in `index.css`; Motion handles interactive components.

### `lucide-react` and `react-icons`

- **What:** Icon packages that render icons as React components.
- **Why:** No image files, no extra network requests, and icons inherit the text
  color.
- **Where:**
  - `lucide-react` is used in most newer components (sidebar, project cards,
    dialog, detail page, loader, 404).
  - `react-icons` is used in a few older pieces (`UserNavbar`, `ThemeToggle`,
    `Toast`, `ErrorBoundary`, `SignInButton`).
- **Convention:** New icons should use `lucide-react` where an icon exists.

### `import.meta.env`

- **What:** Vite's way to read environment variables in frontend code.
- **Why:** The gateway URL and Firebase key should not be hard-coded.
- **Where:** `VITE_SERVER_URL` in `utils/axios.js` and
  `VITE_FIREBASE_API_KEY` in `firebase.js`.
- **Critical caveat:** `VITE_*` values are baked into the browser bundle and are
  public. A Firebase web key is fine; a server secret is not.

### Browser APIs used directly

- **`localStorage`** — saves the theme (`light` or `dark`).
- **`document.documentElement.classList`** — toggles Tailwind's dark variant.
- **`window.location.reload`** — the error boundary's recovery action.

---

## Quality and tooling

### ESLint

- **What:** A static checker for likely mistakes.
- **Why:** Catches unused variables, broken hook usage, and similar issues before
  runtime.
- **Where:** The frontend, with React hooks and React refresh plugins.
- **Command:** `npm run lint` inside `frontend/`.

### Git

- **What:** Version control.
- **Why:** History, comparison, and sharing.
- **Where:** The repository root. Ignored: `node_modules/`, `.env`, `.env.*`
  (except `.env.example`), `postman/`, `.postman/`, and
  `serviceAccountKey.json`.
- **History:** The [Development Log](../development/README.md) explains what each
  commit was about.

### Postman

- **What:** A tool for designing and testing HTTP APIs by hand.
- **Why:** Useful for checking a service without frontend code.
- **Where:** Collections live in `postman/`, which is git-ignored.

---

## Where a piece of software lives

| If you want to change... | Look at... |
| --- | --- |
| Request routing / CORS / errors | `backend/gateway/index.js` |
| Whether a route requires login | `backend/gateway/middleware/protect.js` |
| Login rate limiting | `backend/gateway/middleware/loginLimiter.js` |
| Forwarding the user id | `backend/gateway/utils/proxyWithHeaders.js` |
| `/api/me` response | `backend/gateway/controllers/user.controller.js` |
| Login / logout logic | `backend/services/auth/controllers/auth.controller.js` |
| User schema | `backend/services/auth/models/user.model.js` |
| Firebase server setup | `backend/services/auth/config/firebase.js` |
| Project logic | `backend/services/project/controllers/project.controller.js` |
| Project schema and indexes | `backend/services/project/models/project.model.js` |
| Session/cache client | `backend/shared/redis/redis.js` |
| Pages and routes | `frontend/src/pages/`, `frontend/src/App.jsx` |
| Reusable UI | `frontend/src/components/` |
| API calls | `frontend/src/features/` |
| Shared state | `frontend/src/redux/` |
| Theme and toast providers | `frontend/src/hooks/` |
| Styling tokens | `frontend/src/index.css` |
| Firebase browser setup | `frontend/firebase.js` |
