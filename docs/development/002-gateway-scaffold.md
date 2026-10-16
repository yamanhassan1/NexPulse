# 2 — Gateway Scaffolded

## At a glance

| | |
| --- | --- |
| **Commit** | `1104e31` |
| **Date** | 2026-10-16 |
| **Author** | Yaman Hassan |
| **Message** | `new project started NexPulse` |

## What changed

The first real code appears: a `backend/gateway/` project with its dependencies
declared. The entry file `index.js` was created but left **empty** — the
structure exists, the logic doesn't yet.

The README also gained a one-line description.

## Why it was done

Before writing any code, the project's shape was decided: the backend would be
built as **separate services** behind a single **API gateway** (see
[Architecture](../concepts/architecture.md) for why). The gateway is the natural
place to start, because it's the front door every other service will sit behind.

Setting up the project first — rather than writing code and figuring out
dependencies later — means the tools are chosen deliberately, not grabbed
whenever they were needed.

## Files touched

| File | State |
| --- | --- |
| `README.md` | Edited — added the description line. |
| `backend/gateway/package.json` | Added — the gateway's identity and dependencies. |
| `backend/gateway/package-lock.json` | Added — the exact resolved dependency tree. |
| `backend/gateway/index.js` | Added — empty, waiting for code. |

## Decisions worth noting

### Express 5, not 4

The gateway pins `express` at `^5.3.0`. Express 5 is a newer major version than
the one most tutorials still teach. It brings clearer async error handling — a
rejected `Promise` inside a handler is now routed to the error handler instead
of hanging the request. The trade-off is that some older middleware hasn't been
updated for it, so care is needed when adding packages.

### Still CommonJS, for now

The `package.json` declares `"type": "commonjs"` — the older module style, using
`require`/`module.exports`. This is a starting point, not a final decision. The
project switches to ES modules in the next commit, once real code is written.
Worth knowing if you read this commit's files and see a different style than the
rest of the project.

### The chosen dependencies

| Package | Why it's here |
| --- | --- |
| `express` | The web framework — receives requests and runs middleware. |
| `cors` | To let the browser frontend call the backend from another origin. |
| `cookie-parser` | To read cookies, which will hold login sessions. |
| `morgan` | To log each request during development. |
| `express-http-proxy` | To forward requests to other services — the core of the gateway. |
| `nodemon` | To restart the server automatically when files are saved. |

Each of these is explained in more depth on the [Tools](../concepts/tools.md)
page.

### A lockfile, committed

`package-lock.json` was committed rather than ignored. That's intentional. The
lockfile pins the exact versions that were tested, so anyone else installing
the project gets the identical dependency tree instead of "whatever is newest
today."

### `.gitignore` still only ignores `node_modules/`

At this point `.env` was **not** yet ignored. That's a small gap, and it's
closed in the next commit — after configuration moved into environment
variables.

## How to verify

The folder exists with its dependencies declared, though there's nothing to run
yet since `index.js` is empty:

```bash
cd backend/gateway
cat package.json
```

## Up next

Write the actual gateway, stand up the auth service skeleton, and add the
project's documentation.
