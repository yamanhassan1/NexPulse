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
A small, self-contained program that does one job. NexPulse has a gateway
service and an auth service. Each runs on its own and has its own folder,
dependencies, and settings.

**API**
Short for "Application Programming Interface." Here it means the set of URLs
the backend exposes so the frontend can ask it to do things.

**Endpoint**
A single URL the backend answers, such as `GET /` or `POST /auth/login`. "Hit an
endpoint" just means "send a request to that URL."

**Port**
A numbered door on a computer that a program listens at. Two programs can't use
the same port at the same time. Here, the gateway uses `8000` and auth uses
`8001`.

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

## Data and code

**Database**
Where data is stored so it survives after the program stops. NexPulse will use
MongoDB.

**MongoDB**
A database that stores data as flexible, JSON-like documents instead of strict
tables and rows.

**Mongoose**
A helper (an "ODM," or Object Document Mapper) that adds structure and
validation on top of MongoDB and lets you work with data as JavaScript objects.
It is installed in the auth service but not yet connected.

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
