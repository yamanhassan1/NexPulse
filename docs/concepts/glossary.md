# Glossary

Plain-language definitions of the words used across these docs. If a term
anywhere in the documentation feels like jargon, it should be explained here.

Terms are grouped by theme so related ideas sit together.

## Backend basics

**Server**
A computer (or program) that waits for requests and answers them. When we say
"the backend runs on a server," we mean this code runs somewhere other than the
user's browser.

**Service**
A small, self-contained program that does one job. NexPulse has an auth service
and a project service (plus the gateway in front of them). Each runs on its own
and has its own folder, dependencies, and settings.

**API**
Short for "Application Programming Interface." Here it means the set of URLs
the backend exposes so the frontend can ask it to do things.

**Endpoint**
A single URL the backend answers, such as `GET /` or `POST /api/auth/login`.
"Hit an endpoint" just means "send a request to that URL."

**Port**
A numbered door on a computer that a program listens at. Two programs can't use
the same port at the same time. Here, the gateway uses `8000`, auth uses `8001`,
and the project service uses `8002`.

**Health check / health endpoint**
A tiny endpoint (here, `GET /`) that simply reports whether a service is alive.
It's the fastest way to check a service started correctly.

## The gateway

**Gateway**
The single front door of the backend. The frontend only ever talks to the
gateway, and the gateway forwards each request to the right service.

**Reverse proxy**
Software that receives a request and passes it on to another server, then
returns that server's answer as if it had come from the proxy itself. The
gateway is a reverse proxy. `express-http-proxy` is the tool that does it.

**Middleware**
A small function that runs on every request as it passes through, before the
final handler. Think of an assembly line: each middleware does one thing (read
cookies, log the request, allow cross-origin access) and passes the request
along. Express is built around middleware.

**Auth gate**
The middleware that stands in front of protected routes and asks "is this a
signed-in user?" before letting the request through. In NexPulse it's
`protect`, in the gateway: it reads the session cookie, looks the session up,
and either attaches the user to the request or sends back `401`.

## Architecture patterns

**Microservice**
A small program that does one job well, with its own folder, dependencies, and
process. NexPulse has an auth service and a project service (with a gateway in
front). Instead of one big server doing everything, there are several small
ones.

**Monolith**
The opposite of microservices: one server that handles everything. Simpler to
build and run, but everything grows and fails together. It's often the right
choice for small projects — see [Architecture](./architecture.md#the-honest-trade-off).

**API gateway**
A single front door sitting in front of several services. The outside world
talks only to the gateway, which decides where each request goes. In NexPulse
this is `backend/gateway`.

**Three layers**
A classic way to split a web app: **presentation** (what you see — the
frontend), **application** (the rules — the backend), and **data** (what's
remembered — the database). Keeping them apart means each can change without
dragging the others along.

## Frontend

**React**
A UI library. You describe what the screen should look like for a given state,
and React updates the page when that state changes. Used throughout
`frontend/`.

**Component**
A self-contained piece of UI — a button, a form, a whole page. React apps are
built by composing components. NexPulse's landing page is `pages/Dashboard.jsx`,
composed from smaller components in `components/` (`Navbar`, `Hero`,
`CodeWindow`, `Footer`, and so on).

**Vite**
A build tool and dev server. In development it serves your code to the browser
directly, which is why starts are near-instant; for a release it bundles and
minifies everything into static files.

**Dev server**
A local server that serves your app while you're building it, reloading
automatically when you save a file. Vite provides one for the frontend.

**Tailwind CSS**
A utility-first styling approach: instead of writing separate stylesheets, you
compose styles from small classes right in your markup, e.g.
`className="mt-4 rounded-lg bg-sky-500"`.

**axios**
An HTTP client for making requests to the backend. NexPulse creates one shared
instance in `frontend/src/utils/axios.js` so the server URL is configured once.

**`VITE_` environment variables**
Environment variables for the frontend. **Important:** anything prefixed
`VITE_` is visible to the browser, so it is *public* by design. A Firebase web
key is fine there; a server secret is not.

## Browser and security

**Origin**
A combination of scheme, host, and port — for example `http://localhost:5173`.
Two URLs are "the same origin" only if all three match. `http://localhost:5173`
and `http://localhost:8000` are different origins because the ports differ.

**CORS**
Short for "Cross-Origin Resource Sharing." A browser rule that blocks a web page
from calling a *different* origin unless that origin says it's allowed. Since
the frontend and gateway are different origins, the gateway uses CORS to give
permission.

**Cookie**
A small piece of data the browser stores and automatically sends back with each
request to the same site. Handy for remembering who is logged in.

**httpOnly cookie**
A cookie the browser will send but JavaScript is **not** allowed to read. This
makes it much safer for storing login sessions, because a malicious script can't
steal it.

**Session**
A short-lived record that says "this browser is logged in as this user." In
NexPulse the record lives in Redis, and the browser holds only a random ID for
it inside an httpOnly cookie. Deleting the record ends the session.

**Cache**
A copy of data kept somewhere fast (here, Redis) so it doesn't have to be
recomputed or re-fetched every time. The catch is staleness: a cache must be
updated or cleared whenever the real data changes. NexPulse caches a user's
project list and clears it whenever they add, star, or delete a project.

## Configuration

**Environment variable**
A setting kept outside the code, so the same code can behave differently in
different places (your laptop vs. a server). For example, the port a service
uses.

**`.env` file**
A plain text file holding environment variables, one per line, like
`PORT=8000`. These files are ignored by Git (see `.gitignore`) so secrets and
machine-specific settings stay local.

**`dotenv`**
The tool that reads a `.env` file and loads its values so the code can use them.

## Identity and login

**Firebase Authentication**
A Google service that handles signing users in — passwords, Google sign-in,
email verification, and so on. NexPulse uses it so it doesn't have to build
and secure all of that itself.

**Token / ID token**
A short, signed piece of data that proves "this person already signed in."
The frontend obtains one from Firebase and sends it once, to log in. The server
verifies it and starts a session; later requests ride on the session cookie
instead of the token.

**Verify a token**
Asking Firebase whether a token is genuine and not expired. This is the
security step in login — it's what stops someone forging a token.

**Service account / service account key**
A credential file that lets server code act as a cloud service account. The
auth service has `serviceAccountKey.json` for Firebase. It is a secret: anyone
holding it can act as your Firebase project.

**Schema**
A definition of what a record looks like — which fields it has and what each
one must be. The auth service's user schema is in `models/user.model.js`.

## Data and code

**Database**
Where data is stored so it survives after the program stops. NexPulse uses
MongoDB.

**MongoDB**
A database that stores data as flexible, JSON-like documents instead of strict
tables and rows.

**Mongoose**
A helper (an "ODM," or Object Document Mapper) that adds structure and
validation on top of MongoDB and lets you work with data as JavaScript objects.
The auth service uses it to define the user schema and talk to the database.

**Redis**
A fast key-value store kept in memory rather than on disk. NexPulse uses it for
login sessions: each one gets a key and a time to live, so expired sessions
delete themselves.

**Node.js**
A runtime that lets JavaScript run outside the browser — for example, on a
server.

**Express**
A small web framework for Node.js that makes receiving requests and defining
routes simple. Every NexPulse service uses it.

**ES Modules**
The modern `import` / `export` syntax for sharing code between files. NexPulse
uses it everywhere, enabled by `"type": "module"` in each service's
`package.json`.

**`nodemon`**
A development tool that automatically restarts a service whenever you save a
file, so you don't have to stop and start it yourself.
