# Development Log

This folder keeps a running record of how NexPulse was built — one document per
piece of work, focused on **code**. Documentation-only commits are not logged
here; the log is about the software, not about the writing.

## Why keep a log like this?

Code tells you *what* exists. It rarely tells you *how it got there* or *why a
decision was made*. A commit is a natural unit of progress: one focused change
with a message and a timestamp. Writing a short page for each one means that
months from now, you (or anyone else) can retrace the reasoning instead of
guessing from a diff.

It's also a diary of decisions. When you later wonder "why does the gateway
proxy `/api/auth` instead of `/auth`?", the answer has a home.

## How each entry is structured

Every page follows the same shape, so you can skim them quickly:

| Section | What it answers |
| --- | --- |
| **At a glance** | The commit hash, date, author, and message. |
| **What changed** | The plain-English summary of the diff. |
| **Why it was done** | The reason behind the change. |
| **Files touched** | What was added, edited, or removed. |
| **Decisions worth noting** | The choices made and their trade-offs. |
| **How to verify** | How to confirm this step actually works. |

## The log

| # | Commit | Date | Summary |
| --- | --- | --- | --- |
| 1 | `5149cab` | 2026-10-16 | Repository created. |
| 2 | `1104e31` | 2026-10-16 | Gateway project scaffolded. |
| 3 | `b1882f2` | 2026-10-16 | Gateway implemented, auth skeleton. |
| 4 | `bfa14ad` | 2026-10-17 | React frontend and Firebase-backed auth. |
| 5 | `7198711` | 2026-10-17 | Missing `dotenv` dependency and small frontend fixes. |
| 6 | `17a3be8` | 2026-10-18 | Login sessions with Redis. |
| 7 | `9c05d39`, `8d69b98` | 2026-10-18 | Landing page redesign, components, router, and Redux. |

### Reading the entries

Each entry describes the project **as it existed at that commit**. Where later
work fixed or changed something an entry calls a rough edge, the entry says so
in parentheses and points forward — so the log reads as a story, not a list of
problems that were never solved.

- [1 — Repository created](./001-initial-commit.md)
- [2 — Gateway scaffolded](./002-gateway-scaffold.md)
- [3 — Gateway implemented, auth skeleton](./003-backend-and-docs.md)
- [4 — React frontend and Firebase auth](./004-react-frontend-and-firebase-auth.md)
- [5 — The missing dotenv dependency](./005-mermaid-and-dotenv.md)
- [6 — Login sessions with Redis](./006-redis-session-management.md)
- [7 — Landing page, components, router, and Redux](./007-landing-page-and-redux.md)

## Keeping this going

Add a new numbered file whenever a meaningful piece of work lands. It doesn't
have to be perfect — a few honest paragraphs beat a polished essay written a
week later. If a change is too small to stand alone, it can share an entry with
related work.

The project's overall design lives in [Architecture](../concepts/architecture.md);
the libraries in use are explained in [Tools](../concepts/tools.md). This log is
about the *journey* between those pages.
