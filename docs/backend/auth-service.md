# Auth Service

**Location:** `backend/services/auth`
**Default port:** `8001`

The auth service is where user identity will live: signing up, logging in, and
keeping users' sessions valid. Right now it is a working skeleton — it responds
to a health check, and its database tool is installed and ready.

"Auth" is short for **authentication** (proving who you are) and
**authorization** (deciding what you're allowed to do). Both will live here.

## Why it's its own service

Identity is sensitive and changes on its own timeline. Keeping it separate means
the login logic lives in one clear place, with a boundary around it. The gateway
routes requests here without needing to know how login works.

## What it does today

It exposes a single health endpoint so you can confirm it's alive:

```js
app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});
```

The groundwork is already in place: Express is set up, configuration is loaded
from `.env`, and Mongoose is installed so a database connection can be added.

## The code, explained

The whole service currently lives in `index.js`.

### 1. Loading dependencies

```js
import express from "express";
import dotenv from "dotenv";
```

- `express` — the web framework that runs the service and handles routes.
- `dotenv` — loads settings from `.env` so nothing is hard-coded.

> `mongoose` is already listed in `package.json`. It is the tool that will
> connect this service to MongoDB and define the shape of user data. It isn't
> used yet, but it's installed and waiting.

### 2. Reading configuration

```js
dotenv.config();
const port = process.env.PORT || 8001;
```

Loads the `.env` file and reads the port. The `|| 8001` fallback means the
service still starts even if `PORT` is missing.

The `.env` file currently contains:

| Variable | Meaning |
| --- | --- |
| `PORT` | The port this service listens on (`8001`). |

### 3. Creating the app and health endpoint

```js
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});
```

The app is created, and a single route answers `GET /` with a small JSON
message. This is the standard health check every service in NexPulse exposes.

### 4. Starting the server

```js
app.listen(port, () => {
  console.log(`Auth running at ${port}`);
});
```

Starts the server and confirms it in the console.

## How it talks to the gateway

The auth service is **not** called directly by the browser. The gateway
(`localhost:8000`) forwards any request starting with `/auth` to this service.

```
Browser → Gateway :8000 → Auth Service :8001
          GET /auth/  →  GET /
```

One important detail: the gateway **strips the `/auth` prefix** before
forwarding (see [Gateway Service](./gateway.md#7-routing-to-the-auth-service)).
So the auth service defines its routes *without* that prefix — `/`, `/login`,
and so on — and never needs to know that the outside world sees them as
`/auth/...`.

This is why the health check is simply `app.get("/")`, and why a future login
endpoint will be `app.post("/login")` rather than `app.post("/auth/login")`.

## How to run it

```bash
cd backend/services/auth
npm install
npm run dev
```

Then open `http://localhost:8001/` — you should see:

```json
{ "message": "Hello from Auth" }
```

## Dependencies and why we use them

| Package | What it is | Why we use it |
| --- | --- | --- |
| `express` | Web framework | Runs the service and handles routes. |
| `mongoose` | MongoDB ODM | Will connect to the database and define user models. Installed, not used yet. |
| `dotenv` | Config loader | Keeps the port out of the code. |
| `nodemon` | Dev auto-restart | Restarts the service when you save a file. |
