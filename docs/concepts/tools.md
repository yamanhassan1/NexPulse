# Tools and Libraries

NexPulse stands on other people's software. This page explains every tool the
project uses — what it is, why it was chosen, and where it appears.

New terms link to the [Glossary](./glossary.md).

## The short version

| Layer | Tools |
| --- | --- |
| **Runtime** | Node.js |
| **Backend** | Express 5, `express-http-proxy`, `dotenv`, `cors`, `cookie-parser`, `morgan`, `nodemon` |
| **Database** | MongoDB, Mongoose |
| **Sessions** | Redis, `ioredis` |
| **Identity** | Firebase Authentication, `firebase-admin` |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, React Router 7, Redux Toolkit, `react-icons`, axios, Firebase (client SDK) |
| **Quality & tooling** | ESLint, Git, Postman |

Everything below is in far more detail.

---

## Runtime

### Node.js

- **What:** A runtime that lets JavaScript run outside the browser — on a
  server, a laptop, or a build machine.
- **Why:** One language for the whole stack means less mental switching.
  JavaScript also has a huge ecosystem, which is why nearly every library here
  exists.
- **Where:** Every backend service. Version 18 or newer is required; the project
  is developed on a recent release.
- **Version note:** The auth service uses modern syntax that needs a current
  Node — JSON import attributes (`with { type: "json" }`) and ES modules.

---

## Backend

### Express 5

- **What:** A small web framework for Node.js. It receives requests, runs
  **middleware** in order, and matches requests to route handlers.
- **Why:** It's minimal — routing and middleware, and then it stays out of the
  way. Express 5 specifically was chosen over the older 4 because it handles
  async errors properly: a rejected `Promise` inside a handler is passed to the
  error middleware instead of leaving the request hanging.
- **Where:** Both the gateway and the auth service.
- **Trade-off:** Express 5 is newer, so a few older packages haven't been
  updated for it. Care is needed when adding middleware.

### `express-http-proxy`

- **What:** A reverse proxy. It takes an incoming request, forwards it to
  another server, and returns that server's answer as if the proxy had produced
  it.
- **Why:** This is the single package that turns an Express app into a gateway.
  One line routes an entire path prefix to a service:
  `app.use("/api/auth", proxy(process.env.AUTH_SERVICE))`.
- **Where:** The gateway.
- **Gotcha:** When mounted on a path, Express **strips that prefix** before the
  proxy forwards. `/api/auth/login` reaches the auth service as `/login`. This
  is the most common source of confusion in this codebase.

### `dotenv`

- **What:** Reads a `.env` file and loads its contents into `process.env`.
- **Why:** Configuration and secrets must not live in source code. Ports,
  database URLs, and keys change per machine and per environment; keeping them
  out of the code means the same code runs anywhere.
- **Where:** Both backend services.
- **Related:** `.env` files are git-ignored so credentials never reach the
  repository.

### `cors`

- **What:** Middleware that adds the HTTP headers a browser needs in order to
  allow a cross-origin request.
- **Why:** Browsers block a page from calling a different **origin** by
  default. The frontend and the gateway run on different ports, so CORS is what
  permits them to talk — and `credentials: true` additionally allows cookies.
- **Where:** The gateway, configured with `origin: process.env.FRONTEND_URL`.

### `cookie-parser`

- **What:** Middleware that reads the `Cookie` header and puts the parsed result
  on `req.cookies`.
- **Why:** Login sessions are stored in cookies. Parsing once in the gateway
  means services behind it can read them without each re-implementing the work.
- **Where:** The gateway.
- **Status:** Wired up. The auth service now *sets* session cookies on login;
  reading them at the front door comes next. Note that each service parses its
  own requests — when logout is routed, the auth service will need its own
  copy of this middleware.

### `morgan`

- **What:** Middleware that prints a one-line log for each HTTP request.
- **Why:** When something "doesn't work," the first question is *did the request
  even arrive, and where did it go?* A request log answers that instantly.
- **Where:** The gateway, in `"dev"` format (compact, colour-coded).

### `nodemon`

- **What:** A development tool that watches your files and restarts the server
  whenever one is saved.
- **Why:** It removes the manual "stop, start, stop, start" loop. It's for
  development only — production should use a plain `node` process or a process
  manager.
- **Where:** Every backend service, through the `npm run dev` script.

---

## Database

### MongoDB

- **What:** A database that stores data as flexible, JSON-like **documents**
  rather than fixed tables and rows.
- **Why:** Documents map naturally onto JavaScript objects, and a flexible
  structure suits a project whose data model is still evolving. It's also the
  "M" in MERN, the stack this project sits in.
- **Where:** Holds the users collection, accessed by the auth service.
- **Configuration:** The connection string comes from `MONGODB_URI` in
  `services/auth/.env`.

### Mongoose

- **What:** An **ODM** (Object Document Mapper). It sits between your code and
  MongoDB, defining **schemas** and validating data before it's saved.
- **Why:** Raw MongoDB will happily store anything, including nonsense. Mongoose
  enforces structure — required fields, unique indexes, defaults, automatic
  `createdAt`/`updatedAt` — and turns documents into JavaScript objects you can
  work with.
- **Where:** The auth service. `models/user.model.js` defines the user schema;
  `config/db.js` opens the connection.
- **Why it fails soft:** `connectDb` catches its own errors and logs them. A
  database outage doesn't crash the server — the service still starts, it just
  can't save data until the connection returns.

### Redis

- **What:** An in-memory key-value store, kept outside the database. Reading and
  writing is extremely fast, and data can be given a **time to live** — it
  deletes itself after the expiry.
- **Why:** Sessions are small, short-lived, and read on every request — exactly
  the shape Redis is built for. A `7 days` TTL means expired sessions clean up
  themselves, with no cron job and no garbage collection code.
- **Where:** Stores login sessions (`session-<id>` keys). Runs as its own
  process, started with `docker compose -f backend/docker-compose.yml up -d`.
- **Trade-off:** It's one more thing to run, and sessions are lost if Redis
  restarts without persistence — acceptable here, since a lost session just
  means the user signs in again.

### `ioredis`

- **What:** The Node.js client for Redis — how the backend talks to it.
- **Why:** It's the standard Redis client for Node: promise-based, well
  documented, and forgiving about reconnecting.
- **Where:** `backend/shared/redis/redis.js` creates one shared client. It lives
  in `backend/shared/` (with its own `package.json`) because more than one
  service may need Redis later.
- **How it behaves here:** If Redis is unreachable, the client reports it **once**
  (`[redis] ECONNREFUSED — sessions will not persist…`) and keeps retrying in the
  background. Commands fail immediately rather than queueing forever, and login
  still succeeds — it just doesn't create a session until Redis is back.

---

## Identity

### Firebase Authentication

- **What:** A Google service that handles signing users in — passwords, Google
  sign-in, email verification, and more.
- **Why:** Auth is easy to build badly. Password hashing, reset flows, brute
  force protection, and social login are all a lot of careful work. Firebase
  does all of it properly, so the project doesn't have to.
- **Where:** The **frontend** uses the client SDK to sign users in with Google.
  The backend never signs anyone in — it only verifies.
- **The trade-off:** A dependency on a third party. A Firebase outage means new
  sign-ins fail until it recovers, though existing user data stays safe in
  MongoDB.

### `firebase-admin`

- **What:** The **server-side** SDK for Firebase. In this project it does two
  things: loads the project's credentials, and verifies sign-in tokens.
- **Why:** It's what makes login secure. `verifyIdToken` checks that a token is
  genuine, unexpired, and actually issued by this Firebase project. Without it,
  the backend would have to believe whatever the frontend claims — and the
  frontend is running in the user's hands.
- **Where:** The auth service — `config/firebase.js` initializes it;
  `controllers/auth.controller.js` calls `verifyIdToken`.

---

## Frontend

### React 19

- **What:** A UI library. You describe what the screen should look like for a
  given state, and React updates the DOM when that state changes.
- **Why:** Components keep UI code organized and reusable, and the ecosystem is
  enormous. Version 19 is current.
- **Where:** The whole frontend. `App.jsx` is the router; the page itself is
  `pages/Dashboard.jsx`, composed from small components in `components/`
  (`Navbar`, `Hero`, `CodeWindow`, `Footer`, and so on).

### Vite 8

- **What:** A build tool and dev server. In development it serves your modules
  directly to the browser (which is why starts are near-instant); for a release
  it bundles and minifies everything into static files.
- **Why:** Vite is dramatically faster than the older bundler-based dev servers,
  and its configuration is tiny. The project's `vite.config.js` is eight lines.
- **Where:** The frontend.
- **Why not Create React App:** CRA is effectively unmaintained and much slower.
  Vite is the current default choice for new React projects.

### Tailwind CSS 4

- **What:** A utility-first CSS framework. Instead of writing custom class names
  and separate stylesheets, you compose styles from small utilities directly in
  your markup, e.g. `className="mt-4 rounded-lg bg-sky-500 px-4 py-2"`.
- **Why:** No more hunting through stylesheets to find where a class is defined,
  and no unused CSS to maintain. Version 4 is configured through a Vite plugin
  rather than a separate config file, which is why `vite.config.js` lists
  `@tailwindcss/vite` and `index.css` is just `@import "tailwindcss";`.
- **Where:** The frontend.
- **Trade-off:** Markup gets noisier with long class strings. That's the price
  of keeping all styling in one place.

### `@vitejs/plugin-react`

- **What:** The glue that lets Vite understand React — JSX transformation and
  fast refresh (preserving component state when you save a file).
- **Why:** Vite doesn't know about React out of this box; this plugin teaches
  it.
- **Where:** `frontend/vite.config.js`.

### Firebase (client SDK)

- **What:** The browser half of Firebase. It talks to Firebase's servers to
  actually sign users in.
- **Why:** The frontend needs *something* to show the Google popup and obtain a
  token. This is it. Notice it is a **different** package from
  `firebase-admin`: this one is for browsers, `firebase-admin` is for servers,
  and they are not interchangeable.
- **Where:** `frontend/firebase.js` initializes it and exports `auth` and
  `googleProvider`.

### axios

- **What:** An HTTP client for making requests.
- **Why:** Nicer syntax than the built-in `fetch`, sensible error handling, and
  — the real reason here — **`axios.create`** lets you configure one client
  once and reuse it.
- **Where:** `frontend/src/utils/axios.js` creates a single shared client:

  ```js
  export const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    withCredentials: true,
  });
  ```

  Defining the base URL and credential handling in one place means every request
  in the app is consistent, and changing the server address is a one-line edit.

### React Router 7

- **What:** The routing library for React. It listens to the browser's URL and
  decides which page component to render.
- **Why:** An app with more than one screen needs real URLs — so the back button
  works, links can be shared, and a reload lands where the user was. Wiring it up
  while there's still one screen means the second screen is just a new
  `<Route>`.
- **Where:** `frontend/src/App.jsx` wraps the app in a `<BrowserRouter>` and maps
  `/` to the `Dashboard` page.

### Redux Toolkit

- **What:** The official, modern way to use Redux — a **store** that holds state
  the whole app can read, updated by small functions called **reducers**.
- **Why:** Some state (like "who is signed in") is wanted by many components, and
  passing it down through props gets painful fast. A store lets any component
  read it directly.
- **Where:** `frontend/src/redux/store.js` creates the store,
  `userSlice.js` defines the `user` slice, and `main.jsx` wraps the app in a
  `<Provider>` so components can use `useSelector` and `useDispatch`. Today
  `Dashboard` dispatches `setUserData` after login.
- **Trade-off:** A store is more machinery than a one-page app strictly needs.
  It's here as a bet that the app will grow more than one screen and more than
  one reader of the user object.

### `react-icons`

- **What:** A package bundling many icon sets as ready-to-use React components
  (e.g. `FiArrowRight` from Feather, `FcGoogle` from the Google set).
- **Why:** Icons render as inline SVG components — no image files, no extra
  network requests, and they inherit `currentColor` so they follow the text
  color.
- **Where:** Used throughout `frontend/src/components/` — the code window, the
  sign-in button, the feature list.

### `import.meta.env`

- **What:** Vite's way of reading environment variables in frontend code.
- **Why:** The gateway URL and Firebase key shouldn't be hard-coded either.
- **Where:** `VITE_SERVER_URL` and `VITE_FIREBASE_API_KEY`.
- **Important caveat:** **Vite variables are public.** Anything prefixed
  `VITE_` gets baked into the files the browser downloads, so never put a real
  secret there. That's why the Firebase *web* key is fine here (it's meant to be
  public) but the service account key stays on the server.

---

## Quality and tooling

### ESLint

- **What:** A tool that reads your code and reports patterns that are likely
  mistakes.
- **Why:** It catches problems before you run the code — unused variables,
  broken hook usage, and the like.
- **Where:** The frontend, with plugins for React's rules:
  `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- **Command:** `npm run lint` inside `frontend/`.

### Git

- **What:** Version control. Every change is recorded as a commit with a
  message and timestamp.
- **Why:** It's how the project can be rewound, compared, and shared. The
  [Development Log](../development/README.md) exists to explain what each commit
  was actually about.
- **Ignore rules:** `node_modules/`, `.env`, `postman/`, `.postman/`, and
  `serviceAccountKey.json` are all excluded from Git — the first is large and
  rebuildable; the rest are secrets.

### Postman

- **What:** A tool for designing and testing HTTP APIs by hand.
- **Why:** It lets you poke at an endpoint without writing frontend code first,
  which is useful for checking a service in isolation.
- **Where:** Collections live in the `postman/` folder, which is git-ignored —
  nothing Postman-specific reaches the repository.

---

## Where a piece of software lives

| If you want to change… | Look at… |
| --- | --- |
| How requests are routed | `backend/gateway/index.js` |
| The login logic | `backend/services/auth/controllers/auth.controller.js` |
| What a user record contains | `backend/services/auth/models/user.model.js` |
| The database connection | `backend/services/auth/config/db.js` |
| Firebase setup on the server | `backend/services/auth/config/firebase.js` |
| Session storage (Redis) | `backend/shared/redis/redis.js` |
| The page itself | `frontend/src/pages/Dashboard.jsx` |
| A piece of the page | The matching file in `frontend/src/components/` |
| Routes | `frontend/src/App.jsx` |
| Shared app state (who's signed in) | `frontend/src/redux/` |
| Where the frontend sends requests | `frontend/src/utils/axios.js` |
| Firebase setup in the browser | `frontend/firebase.js` |
| Styling | `frontend/src/index.css` and Tailwind classes in JSX |
