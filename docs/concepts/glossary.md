# Glossary

Plain-language definitions of the words used across these docs. Terms are
grouped by theme so related ideas sit together.

## Backend basics

**Server**
A computer or program that waits for requests and answers them. When we say
"the backend runs on a server," we mean this code runs somewhere other than the
user's browser.

**Service**
A small, self-contained program that does one job. NexPulse has an auth service
and a project service, plus the gateway in front of them. Each has its own
folder, dependencies, process, and settings.

**API**
Short for "Application Programming Interface." Here it means the set of URLs the
backend exposes so the frontend can ask it to do things.

**Endpoint**
A single URL and method the backend answers, such as `GET /` or
`POST /api/auth/login`. "Hit an endpoint" means "send a request to that URL."

**Port**
A numbered door on a computer that a program listens at. Two programs cannot use
the same port at the same time. Here: frontend `5173`, gateway `8000`, auth
`8001`, project `8002`, Redis `6379`.

**Health check**
A tiny endpoint that reports whether a service is alive. The backend services
answer `GET /` and `GET /health` with a short JSON message.

## The gateway

**Gateway**
The single public front door of the backend. The frontend only talks to the
gateway, and the gateway forwards each request to the right service.

**Reverse proxy**
Software that receives a request, passes it to another server, and returns that
server's answer as if it had produced it. The gateway is a reverse proxy;
`express-http-proxy` does the forwarding.

**Middleware**
A small function that runs on each request as it passes through, before the final
handler. Think of an assembly line: each middleware does one thing (parse
cookies, log the request, allow cross-origin access) and passes the request on.

**Auth gate**
The middleware that stands in front of protected routes and asks "is this a
signed-in user?" before letting the request through. In NexPulse it is `protect`
in the gateway: it reads the session cookie, looks the session up in Redis, and
either attaches the user to the request or returns `401`.

**Mount prefix**
The part of a URL where a router or middleware is mounted. In
`app.use("/api/auth", ...)`, `/api/auth` is the mount prefix. Express strips it
before the mounted handler sees the request, which is why the auth service
defines `/login`, not `/api/auth/login`.

**Rate limit**
A rule that blocks too many attempts from one source in a time window. The
gateway allows 30 login attempts per IP per 15 minutes.

**Trust boundary**
A line across which the assumptions change. The browser is untrusted; the
gateway is the public edge; the services behind it are trusted and must stay
private.

## Architecture patterns

**Microservice**
A small program that does one job well, with its own folder, dependencies, and
process. NexPulse has an auth service and a project service, with a gateway in
front.

**Monolith**
The opposite of microservices: one server that handles everything. Simpler to
build and run, but everything grows and fails together. Often the right choice
for a small project.

**API gateway**
A single front door in front of several services. The outside world talks only to
the gateway, which decides where each request goes. In NexPulse this is
`backend/gateway`.

**Three layers**
A classic way to split a web app: **presentation** (what you see), **application**
(the rules), and **data** (what is remembered). Keeping them apart means each can
change without dragging the others along.

**Stateless**
A program that does not keep per-user data in its own memory between requests.
NexPulse's backend instances are mostly stateless; shared state lives in Redis
and MongoDB. That makes horizontal scaling easier.

## Frontend

**React**
A UI library. You describe what the screen should look like for a given state,
and React updates the page when that state changes.

**Component**
A self-contained piece of UI — a button, a form, a whole page. React apps are
built by composing components. In NexPulse, screens live in `pages/` and
reusable pieces live in `components/`.

**Page**
A component mapped to a route. NexPulse's pages are `SignIn`, `Dashboard`,
`ProjectDetail`, `Legal`, and `NotFound`.

**Vite**
A build tool and dev server. In development it serves modules directly to the
browser, which makes startup fast; for a release it bundles and minifies
everything into static files in `dist/`.

**Tailwind CSS**
A utility-first styling approach: instead of separate stylesheets, styles are
composed from small classes in the markup, for example
`className="mt-4 rounded-lg bg-brand-600"`.

**Design token**
A named value used across the UI instead of repeating raw values. In
`frontend/src/index.css`, `--color-brand-600`, `--color-ink-950`, and
`--font-sans` are design tokens exposed as Tailwind utilities.

**axios**
An HTTP client for making requests to the backend. NexPulse creates one shared
instance in `frontend/src/utils/axios.js` so the server URL and credentials are
configured once.

**`VITE_` environment variable**
An environment variable for the frontend. **Important:** anything prefixed
`VITE_` is visible to the browser, so it is public by design. A Firebase web key
is fine there; a server secret is not.

**Redux store**
A single object that holds state shared by many components. Components read it
with `useSelector` and change it with `useDispatch`.

**Slice**
A Redux Toolkit concept: one file that owns a named piece of state and its
reducer functions. NexPulse has a `user` slice and a `project` slice.

**Optimistic update**
Updating the UI immediately as if the server call succeeded, then rolling back if
it fails. Star and delete in NexPulse work this way so the UI feels instant.

**Toast**
A small, temporary notification. NexPulse shows success, error, and info toasts
through a `ToastProvider`.

**Protected route**
A frontend route that requires a signed-in user. `ProtectedRoute` shows a loader
while the session is being checked, then either renders the page or redirects to
`/signin`.

**Session restore**
Recovering the signed-in user after a reload by calling `GET /api/me` with the
existing session cookie.

**Theme provider**
A React context that owns light/dark mode and saves the choice in `localStorage`.

## Browser and security

**Origin**
A combination of scheme, host, and port — for example `http://localhost:5173`.
Two URLs are the "same origin" only if all three match.

**CORS**
Cross-Origin Resource Sharing. A browser rule that blocks a page from calling a
different origin unless that origin allows it. The frontend and gateway are
different origins, so the gateway uses CORS to permit the frontend.

**Credentialed request**
A request that includes cookies or authentication headers. The frontend sets
`withCredentials: true`, and the gateway must respond with an exact allowed origin
rather than `*`.

**Cookie**
A small piece of data the browser stores and sends back with requests to the same
site. Used here to remember the session.

**httpOnly cookie**
A cookie the browser sends but JavaScript is not allowed to read. This makes it
safer for storing session ids, because a malicious script cannot steal it
directly.

**Session**
A short-lived record saying "this browser is logged in as this user." In NexPulse
the record lives in Redis, and the browser holds only a random id inside an
`httpOnly` cookie. Deleting the record ends the session.

**Session id**
The random UUID stored in Redis and in the cookie. The browser's value is
meaningless without the matching Redis record.

**Cache**
A copy of data kept somewhere fast so it does not have to be recomputed or fetched
every time. The catch is staleness: a cache must be updated or cleared when the
real data changes. NexPulse caches project lists for 5 minutes and clears them on
writes through the project service.

**TTL (time to live)**
How long a stored value survives before it expires automatically. Sessions use a
7-day TTL; project caches use a 5-minute TTL.

**Rate limiting**
See **Rate limit** above.

**Service account / service account key**
A credential file that lets server code act as a cloud service account. The auth
service has `serviceAccountKey.json` for Firebase. It is a secret: anyone holding
it can act as your Firebase project.

**CSRF (Cross-Site Request Forgery)**
An attack where another site causes the browser to make a state-changing request
with the user's cookies. NexPulse's current logout is a `GET`; a stricter
deployment would use a `POST` with CSRF protection.

## Configuration

**Environment variable**
A setting kept outside the code, so the same code can behave differently in
different places. For example, the port a service uses.

**`.env` file**
A plain text file holding environment variables, one per line, such as
`PORT=8000`. These files are ignored by Git so secrets and machine-specific
settings stay local.

**`.env.example`**
A committed template showing which variables an app expects, without real
values. Copy it to `.env` (backend) or `.env.local` (frontend) and fill it in.

**`dotenv`**
The tool that reads a `.env` file and loads its values into `process.env`.

**`NODE_ENV`**
A conventional environment value. The auth service uses it to decide whether the
session cookie should be `Secure` and `SameSite=None` (production) or `Lax`
(development).

## Identity and login

**Firebase Authentication**
A Google service that handles sign-in. NexPulse uses it so it does not have to
build and secure password handling itself.

**Token / ID token**
A short, signed piece of data proving "this person already signed in." The
frontend obtains one from Firebase and sends it once, to log in. The server
verifies it and starts a session; later requests use the session cookie instead.

**Verify a token**
Asking Firebase whether a token is genuine and not expired. This is the security
step in login; it is what stops someone forging a token.

**Firebase UID**
The unique id Firebase assigns to a user. Stored as `firebaseUid` in MongoDB to
link the local record to the Firebase identity.

**Public user**
The safe subset of a user record returned to the browser and stored in the
session: `_id`, `name`, `email`, and `avatar`. The Firebase UID is deliberately
not included.

## Data and code

**Database**
Where data is stored so it survives after a program stops. NexPulse uses MongoDB.

**MongoDB**
A database that stores data as flexible, JSON-like documents instead of strict
tables and rows.

**Mongoose**
An ODM that adds structure and validation on top of MongoDB and lets code work
with data as JavaScript objects. It defines the user and project schemas.

**Schema**
A definition of what a record looks like: which fields it has and what each one
must be. See `models/user.model.js` and `models/project.model.js`.

**Index**
A database structure that makes certain queries fast. The project model has
compound indexes for `{ owner, updatedAt }` and `{ owner, starred, updatedAt }`.

**Redis**
A fast in-memory key-value store. NexPulse uses it for sessions and project-list
caching. Values can have a TTL, so expired entries delete themselves.

**Key**
The name of a value in Redis. NexPulse uses `session-<uuid>`,
`projects-<userId>`, and `starred-projects-<userId>`.

**Node.js**
A runtime that lets JavaScript run outside the browser.

**Express**
A small web framework for Node.js that makes receiving requests and defining
routes simple. Every NexPulse backend program uses it.

**ES Modules**
The modern `import` / `export` syntax. NexPulse uses it everywhere, enabled by
`"type": "module"` in each `package.json`.

**JSON import attribute**
The syntax `with { type: "json" }` used when importing `serviceAccountKey.json`.
It tells Node the file is JSON rather than JavaScript.

**`nodemon`**
A development tool that restarts a service when a file is saved.

**Middleware order**
The order in which middleware runs. In Express it is top to bottom. In the
gateway, CORS and cookie parsing run before route handling so later code can rely
on them.
