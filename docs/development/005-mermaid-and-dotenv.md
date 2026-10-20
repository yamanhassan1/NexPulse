# 5 — Mermaid Diagrams and the Missing dotenv Dependency

## At a glance

| | |
| --- | --- |
| **Commit** | `7198711` |
| **Date** | 2026-10-17 |
| **Author** | Yaman Hassan |
| **Message** | `feat: update documentation with Mermaid diagrams and add dotenv dependency` |

Two kinds of work in one commit, as the message says: documentation that
renders, and a gateway that starts.

## What changed

1. **Seven flow diagrams converted to Mermaid.** The architecture overview, the
   login sequence, the backend request chain, the frontend prefix flow, the
   getting-started walkthrough, and both root/index READMEs now use fenced
   `mermaid` code blocks instead of hand-drawn ASCII. Folder trees were left as
   text — they read fine anywhere.
2. **The gateway got its missing `dotenv` dependency.** `backend/gateway/index.js`
   had imported `dotenv` from the start, but `package.json` never declared it.
   The gateway crashed on a clean install; it only appeared to work when the
   package happened to be resolvable by accident.
3. **Small frontend cleanups.** The unused `React` import and its
   `eslint-disable` comment left `App.jsx`, and the button now reads
   "Continue with Google" (capital G).
4. **Documentation corrections.** Stale claims were fixed along the way: the
   gateway's `.env` is now a required step in `getting-started.md` (it used to
   be optional), and a contradiction about which files are gitignored was
   removed.

## Why it was done

**Mermaid.** ASCII art diagrams break the moment a box gets one word wider, and
diffs of them are unreadable. Mermaid is plain text that GitHub renders as a real
diagram — version-controlled, diffable, and legible. Draw.io can import Mermaid
directly (Arrange → Insert → Advanced → Mermaid) when an editable picture is
needed.

**dotenv.** An undeclared dependency is a bug that hides: it works on the
machine where it was written, then fails for everyone else. `package.json` is
the honest list of what a project needs — if the code imports it, it belongs
there.

## Files touched

| File | State |
| --- | --- |
| `backend/gateway/package.json` | Edited — adds `dotenv`. |
| `README.md` | Edited — overview diagram becomes Mermaid. |
| `docs/README.md` | Edited — same. |
| `docs/concepts/architecture.md` | Edited — big-picture and sequence diagrams become Mermaid. |
| `docs/backend/README.md` | Edited — request-flow diagram becomes Mermaid. |
| `docs/backend/gateway.md` | Edited — stale notes removed. |
| `docs/frontend/README.md` | Edited — login-flow diagram becomes Mermaid. |
| `docs/getting-started.md` | Edited — gateway `.env` step added, diagram becomes Mermaid. |
| `docs/development/004-*.md` | Edited — its sequence diagram becomes Mermaid. |
| `frontend/src/App.jsx` | Edited — unused import removed, button text fixed. |

## Decisions worth noting

- **Folder trees stayed as text.** Mermaid's tree shapes are awkward; a code
  block renders identically in every editor and diffs cleanly. Diagrams that
  show *flow* became Mermaid; diagrams that show *structure* stayed plain.
- **The dependency fix rode along with the docs work** rather than becoming its
  own commit. Both landed in the same session, and the commit message names
  both halves — no mystery meat.

## How to verify

```bash
# the gateway now starts from a clean install
cd backend/gateway && npm ci && npm run dev
```

On GitHub, any page with a Mermaid block shows the rendered diagram. In
VS Code, the Mermaid preview extension shows it locally.

## Up next

The thing the frontend has been missing since entry 4: a session that survives
a page reload.
