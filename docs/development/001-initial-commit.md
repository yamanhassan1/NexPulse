# 1 — Repository Created

## At a glance

| | |
| --- | --- |
| **Commit** | `5149cab` |
| **Date** | 2026-10-16 |
| **Author** | Yaman Hassan |
| **Message** | `Initial commit` |

## What changed

A single file was added — a bare `README.md`:

```markdown
# NexPulse
```

That's it. One heading, one project name.

## Why it was done

Every project starts somewhere, and a repository with no README has no
identity. This commit marks the moment NexPulse stopped being a local folder
and became a tracked project with history.

It's deliberately minimal. There's no point writing a detailed README before a
single line of code exists — you don't yet know what you've built.

## Files touched

| File | State |
| --- | --- |
| `README.md` | Added — a single `# NexPulse` heading. |

## Decisions worth noting

**Name.** The project is called NexPulse. A name matters more than it seems:
it becomes the repository, the npm packages, and the Firebase project ID.

**Start thin.** The README was left as a stub on purpose. Documentation that
describes imagined features is worse than no documentation, because it lies.
The full README arrives later, in commit 3, once there's real code to describe.

## How to verify

Not much to verify here. You can confirm the project had exactly one file:

```bash
git show --stat 5149cab
```

## Up next

The next step is scaffolding the backend — starting with the API gateway.
