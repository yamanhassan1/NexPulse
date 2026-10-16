# NexPulse Documentation

Welcome to the documentation for **NexPulse**.

This folder explains the parts of the project that already exist — how they
work, why they were built the way they were, and what each piece is for.

The writing here is deliberately plain. Technical projects usually drown in
jargon, and that helps no one. If a term anywhere feels like jargon, it is
defined in the [Glossary](./glossary.md) in everyday words.

## What exists right now

NexPulse is a web-based code editor. The **backend foundation** has been built
first, and it has two parts:

- a **gateway** that acts as the single entry point for all requests, and
- an **auth** service that will hold user accounts and login.

Both are running Express apps. Each answers a simple health check so you can
confirm it's alive. The gateway forwards anything starting with `/auth` to the
auth service. The auth service has its database tool (Mongoose) installed, but
no database connection yet.

Nothing else exists yet — there is no frontend and no login logic. These docs
describe only what is actually in the code today, so they stay trustworthy.
They will grow as the code grows.

## Where to start

New to the project? Read in this order:

1. **[Getting Started](./getting-started.md)** — run the backend on your own
   machine.
2. **[Architecture](./architecture.md)** — understand how the two services fit
   together and why.
3. The **service deep-dives** — read whichever service you're working on:
   [Gateway](./backend/gateway.md) or [Auth](./backend/auth-service.md).

In a hurry? The [Backend Overview](./backend/README.md) is a one-page map of
the `backend/` folder.

## The documents

| Document | What it covers |
| --- | --- |
| [Architecture](./architecture.md) | How the services fit together and why. |
| [Getting Started](./getting-started.md) | Running what exists on your machine. |
| [Glossary](./glossary.md) | Plain-language definitions of key terms. |
| [Backend Overview](./backend/README.md) | What lives in the `backend/` folder. |
| [Gateway Service](./backend/gateway.md) | The front door of the backend — what it does and why. |
| [Auth Service](./backend/auth-service.md) | The service that will handle users and login. |

## A note on how these docs are written

Each technology and each piece of code is explained in three parts:

- **What** it is, in plain words.
- **Why** it's there — the problem it solves.
- **Where** it's used in the project.

If you can explain a piece of code simply, you understand it. That's the bar
these docs aim for.
