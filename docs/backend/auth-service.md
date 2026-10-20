# Auth Service

**Location:** `backend/services/auth`
**Default port:** `8001`

The auth service is where user identity lives. It verifies that a request comes
from a real user, keeps a record of every user in MongoDB, and stores login
sessions in Redis.

"Auth" covers two related ideas: **authentication** (proving who you are) and
**authorization** (deciding what you're allowed to do). Both belong here.

## The key design decision: Firebase on the front, our data on the back

The service takes an unusual-looking but deliberate approach. It does **not**
store passwords or run its own "forgot password" flow. Instead:

- **Firebase Authentication** is used to actually sign users in. Firebase
  handles passwords, Google sign-in, and so on.
- **This service** receives a *token* from Firebase, checks that it's genuine,
  and then stores user profile data in **MongoDB**.

Why split it this way? Identity plumbing is hard to get right. Password
hashing, reset emails, email verification, and social logins are all easy to do
*badly*. Firebase does them properly, so we don't have to. Meanwhile we keep
full ownership of our own user records, which live in a database we control.

The trade-off: we depend on Firebase. If Firebase goes down, new logins go down
with it — though existing user data stays safe in MongoDB.

## The folder structure

```
services/auth/
├── index.js                      The entry point. Wires everything together.
├── config/
│   ├── db.js                     Connects to MongoDB via Mongoose.
│   └── firebase.js               Initializes Firebase Admin.
├── controllers/
│   └── auth.controller.js        The login logic.
├── models/
│   └── user.model.js             The shape of a user in MongoDB.
├── routes/
│   └── auth.route.js             Maps URLs to controller functions.
├── serviceAccountKey.json        Firebase credentials. A secret.
├── .env                          Config: port, MongoDB URI, Redis URL.
└── package.json
```

These folders follow a common Express pattern that's worth knowing, because
most Node backends look like this:

| Folder | Job |
| --- | --- |
| `routes/` | Which URL does what. It only decides *where* a request goes. |
| `controllers/` | The actual logic for each route. |
| `models/` | The database schema — what a record looks like. |
| `config/` | Setup that has to happen once, like connecting to a database. |

Keeping these separate means a route stays a one-liner, the logic is easy to
test on its own, and changing how users are stored doesn't touch the routing.

## The request, step by step

1. The user signs in through Firebase (in the frontend) and receives a token.
2. The frontend sends `POST /api/auth/login` with that token in the body.
3. The gateway sees the `/api/auth` prefix, strips it, and forwards the request
   as `POST /login` to this service.
4. This service asks Firebase to verify the token.
5. If the token is good, it looks for a user with that Firebase ID. It creates
   the user on first login, or returns the existing one.
6. It saves a session in Redis (expiring after 7 days) and attaches an `httpOnly`
   session cookie to the response.
7. The response travels back through the gateway to the frontend.

## The code, explained

### `index.js` — the entry point

```js
import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import router from "./routes/auth.route.js";

const port = process.env.PORT || 8001;

const app = express();
app.use(express.json());

app.use("/", router);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.listen(port, () => {
  connectDb();
  console.log(`Auth running at ${port}`);
});
```

Three things here are easy to overlook but matter:

- **`import "dotenv/config"` comes first.** ES modules run their imports in
  order, before any of the file's own code. The Redis client reads `REDIS_URL`
  the moment it's imported, so the environment has to be loaded *before* the
  route that pulls it in — otherwise the variable is silently missing.
- **`express.json()`** — this middleware reads the request body and turns it
  into a plain JavaScript object on `req.body`. Without it, `req.body` is
  empty, and the token sent by the frontend would never arrive.
- **`connectDb()` is called inside `listen`** — the server starts listening
  first, and the database connection is opened right after. This means a slow or
  failing database doesn't stop the server from starting; connection problems
  are logged instead.

Note that `app.use("/", router)` is registered before the `GET /` handler. Since
the router only handles `POST /login`, a `GET /` doesn't match inside it and
falls through to the health-check handler below. Order matters in Express:
middleware runs top to bottom.

### `config/db.js` — connecting to MongoDB

```js
import mongoose from "mongoose";

export const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB Connected");
  } catch (error) {
    console.log(error);
  }
};
```

This reads the connection string from `.env` and opens the connection. It
*doesn't* throw on failure — the `try`/`catch` logs the problem instead, so the
service keeps running. It won't be able to save users until the connection
works, but it won't crash either.

### `config/firebase.js` — initializing Firebase

```js
import { cert, initializeApp } from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json" with { type: "json" };

export const app = initializeApp({
  credential: cert(serviceAccount),
});
```

This loads the Firebase credentials and prepares the Firebase SDK. The import of
`serviceAccountKey.json` uses a **JSON import attribute** (`with { type: "json" }`),
which is the modern way for JavaScript to load a JSON file directly.

Worth knowing: this code runs the moment the module is imported — before the
server starts listening. If the key file is missing or malformed, the app throws
right away rather than starting half-working.

### `models/user.model.js` — what a user looks like

```js
const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, trim: true },
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar:      { type: String, default: "" },
  },
  { timestamps: true },
);
```

This is the **schema** — the shape of a user document in MongoDB.

- **`firebaseUid`** links our record to Firebase. This is the ID used to find
  the matching user.
- **`unique: true`** on `firebaseUid` and `email` means the database itself
  refuses duplicates — a safety net that doesn't rely on our code remembering
  to check.
- **`timestamps: true`** automatically adds `createdAt` and `updatedAt` fields.
- Because there's no password field, no password is ever stored here. That's on
  purpose.

### `controllers/auth.controller.js` — the login logic

```js
export const login = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = await getAuth(app).verifyIdToken(token);
    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture,
      });
    }

    const sessionId = crypto.randomUUID();

    try {
      await redis.set(
        `session-${sessionId}`,
        JSON.stringify({ name: user.name, userId: user._id, /* … */ }),
        "EX",
        7 * 24 * 60 * 60,
      );

      res.cookie("session", sessionId, {
        httpOnly: true,
        secure: false,
        samesite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    } catch (err) {
      console.warn(`[login] session not saved: ${err.message}`);
    }

    return res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: `Login Error ${error}` });
  }
};
```

The core of login:

- **`verifyIdToken(token)`** asks Firebase to check the token is real and not
  expired. This is the actual security step — it's what stops someone forging a
  token. The `decoded` result carries the user's Firebase ID, name, and email.
- **`findOne` then `create`** implements "sign up or log in" in one action. On
  first login there's no record yet, so it's created. Later logins find it.
- **The session block** is wrapped in its own `try`/`catch` on purpose. If Redis
  is down, the login still succeeds and returns the user — it just logs
  `[login] session not saved` instead of failing the whole request. A missing
  session is an inconvenience; a broken login button is an outage.
- **`secure: false`** is for local development over plain `http`. It must become
  `true` before deploying over HTTPS.

Worth knowing about **logout**: the controller has a `logout` function, but it is
**not wired to any route yet**, and it reads `req.cookies` — which needs
`cookie-parser` installed in *this* service (the gateway's copy doesn't count;
each process parses its own requests). Until both are done, logout is code
without a path to it.

### `routes/auth.route.js` — mapping URL to logic

```js
import { login } from "../controllers/auth.controller.js";

const router = express.Router();
router.post("/login", login);
```

The route file is deliberately tiny. It imports the controller and says "when
this URL gets this method, run that function." All the thinking happens in the
controller.

## How it talks to the gateway

The auth service is never called directly by the browser. The gateway
(`localhost:8000`) forwards any request starting with `/api/auth` to this
service.

```
Browser → Gateway :8000 → Auth Service :8001
          POST /api/auth/login  →  POST /login
```

One important detail: the gateway **strips the `/api/auth` prefix** before
forwarding (see [Gateway Service](./gateway.md#7-routing-to-the-auth-service)).
So the auth service defines routes *without* that prefix — `/login`, `/`, and
so on — and never needs to know that the outside world sees them as
`/api/auth/...`.

That's why the health check is `app.get("/")` and the login route is
`app.post("/login")` rather than `app.post("/api/auth/login")`. The gateway is
the translator between the frontend's paths and this service's paths.

## Sessions in Redis

After a successful login, the browser holds two things: the user record in
MongoDB, and a **session** — a random ID in an `httpOnly` cookie, pointing at a
record in Redis that expires after 7 days.

- The client is `backend/shared/redis/redis.js`, one shared `ioredis` instance.
- Sessions are keyed `session-<id>` and carry just enough to identify the user
  (id, name, email, avatar).
- The `EX 7 * 24 * 60 * 60` argument tells Redis to delete the key
  automatically after seven days. Expired sessions clean up themselves.

If Redis isn't running, the service says so **once** at startup and keeps going:

```
[redis] ECONNREFUSED — sessions will not persist until Redis is reachable.
```

Login still works in that state; it just doesn't create a session. Redis can be
started with `docker compose -f backend/docker-compose.yml up -d`.

## Configuration

From `.env`:

| Variable | Used by | What it does |
| --- | --- | --- |
| `PORT` | `index.js` | The port the service listens on (`8001`). |
| `MONGODB_URI` | `config/db.js` | The MongoDB connection string. |
| `REDIS_URL` | `shared/redis/redis.js` | Where Redis lives (`redis://localhost:6379`). |

Note the scheme: Redis URLs start with `redis://`, not `http://`.

## Secrets — read this before committing

`serviceAccountKey.json` is a **Firebase credential**. Anyone who gets it can act
as your Firebase project. It is therefore just as sensitive as a password.

- **`.env` is ignored by Git. `serviceAccountKey.json` is not** by default — but
  it *is* listed in this project's `.gitignore`. Keep it there.
- If the key ever does get committed, treat it as leaked: revoke it in the
  Firebase console and issue a new one.

## Dependencies

| Package | What it is | Why we use it |
| --- | --- | --- |
| `express` | Web framework | Runs the service and handles routes. |
| `mongoose` | MongoDB ODM | Defines the user schema and talks to the database. |
| `firebase-admin` | Firebase server SDK | Verifies sign-in tokens and reads Firebase credentials. |
| `dotenv` | Config loader | Keeps the port and database URI out of the code. |
| `nodemon` | Dev auto-restart | Restarts the service when you save a file. |

The Redis client's own dependency, `ioredis`, is declared in
`backend/shared/package.json` rather than here — it belongs to the shared client,
not to this service.
