# 5 — Documentation Restructured into Folders

## At a glance

| | |
| --- | --- |
| **Commits** | `9c95ece`, `6092214`, `ef76729` |
| **Date** | 2026-10-17 |
| **Author** | Yaman Hassan |
| **Messages** | `Delete .postman directory` / `feat: add architecture and glossary documentation for NexPulse project` / `feat: add initial documentation and structure for NexPulse project` |

Three commits from the same sitting, kept as one entry because they tell one
story: the docs outgrow a flat pile of files and become a structure.

## What changed

1. **`.postman/resources.yaml` was deleted.** Real Postman collections already
   lived in the gitignored `postman/` folder; the tracked file was leftover
   workspace config no one used. `9c95ece`.
2. **`architecture.md` and `glossary.md` moved into `docs/concepts/`.** Pure
   renames — the first step of the restructure. `6092214`.
3. **The documentation was rebuilt around folders.** `ef76729` is the big one:

```
docs/
├── README.md            The index: what NexPulse is today, and where to look.
├── getting-started.md   Run it locally, step by step.
├── concepts/            The ideas behind the code.
│   ├── architecture.md    How the pieces fit, and why.
│   ├── tools.md           Every library: What / Why / Where.
│   └── glossary.md        Jargon, in plain language.
├── backend/
│   ├── README.md          The backend overview.
│   ├── gateway.md         The gateway, middleware by middleware.
│   └── auth-service.md    The auth service, file by file.
├── frontend/
│   └── README.md          The React app and its login flow.
└── development/          This log — one entry per meaningful commit.
```

The root `README.md` was rewritten to match, and `.gitignore` learned
`.postman/`.

## Why it was done

Docs in a flat `docs/` folder don't scale. After the fourth file, nobody —
including the author — knows where a new page belongs, and readers have to open
everything to find one answer. The folder split follows a question:

- *"How do I run it?"* → `getting-started.md`
- *"How is this designed?"* → `concepts/`
- *"How does one part work?"* → `backend/`, `frontend/`
- *"How did it get built?"* → `development/`

The development log exists for the reason stated in its own README: code says
what exists, rarely how it got there. Each entry records the decision, not just
the diff — so the "why" survives after the memory fades.

## Files touched

| File | State |
| --- | --- |
| `docs/README.md` | Rewritten — the master index with a "Start here" router. |
| `docs/concepts/README.md` | **Added** — what lives in this folder. |
| `docs/concepts/tools.md` | **Added** — every tool, What/Why/Where. |
| `docs/concepts/architecture.md` | Moved + rewritten — big picture, layers, diagrams. |
| `docs/concepts/glossary.md` | Moved + expanded. |
| `docs/backend/README.md` | **Added** — backend overview and conventions. |
| `docs/backend/gateway.md` | **Added** — middleware-by-middleware walkthrough. |
| `docs/backend/auth-service.md` | **Added** — file-by-file walkthrough. |
| `docs/frontend/README.md` | **Added** — the React app and login flow. |
| `docs/development/README.md` | **Added** — this log's index. |
| `docs/development/001–004` | **Added** — entries for the work already done. |
| `docs/getting-started.md` | Rewritten — prerequisites, steps, common problems. |
| `README.md` | Rewritten — short overview pointing into `docs/`. |
| `.gitignore` | Edited — ignores `.postman/`. |
| `.postman/resources.yaml` | **Deleted** — leftover Postman config. |

## Decisions worth noting

- **Plain language, with a glossary.** Every page explains tools as
  *What it is / Why we use it / Where it lives*. Jargon gets a glossary link
  rather than a shrug. The rule: document what actually exists — never what's
  planned.
- **Folder trees stay as plain text; flow diagrams became Mermaid.** (The full
  Mermaid conversion landed in the next entry — this commit laid the
  groundwork.) Trees read fine as text in any editor; flows are clearer as
  rendered diagrams.
- **One entry per commit, small changes may share an entry.** This entry is
  itself an example: three related commits, one story.

## How to verify

Open `docs/README.md` and follow each of the four "Start here" paths — every
link should land somewhere useful. Cross-links between pages work relative to
their folders, so the structure survives a clone on any machine.

## Up next

Diagrams that render, and fixing the problems the editor's problems panel keeps
listing.
