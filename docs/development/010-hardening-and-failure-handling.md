# 10 — Hardening, Ownership, and Failure Handling

## At a glance

| | |
| --- | --- |
| **Commit** | `2eddbd8` |
| **Date** | 2026-10-28 |
| **Author** | Yaman Hassan |
| **Message** | `feat: enhance navigation and user experience with new features and error handling` |

A broad hardening commit. It fixes the biggest authorization hole in the project
service, adds input limits and indexes, introduces the login rate limit, makes
Redis failures explicit, and gives the frontend retry/error states plus a
not-found page.

## What changed

### Backend

1. **Ownership checks.** Star and delete now query
   `{ _id: id, owner: userId }` instead of looking up by id alone.
2. **Input validation and limits.** Project names must be non-empty strings after
   trimming. Names are capped at 120 characters and descriptions at 2000.
3. **Indexes.** Added `{ owner: 1, updatedAt: -1 }` and
   `{ owner: 1, starred: 1, updatedAt: -1 }`.
4. **Cache TTL.** Project cache entries now expire after 5 minutes. Cache
   helpers swallow Redis errors and fall back to MongoDB.
5. **Login rate limit.** The gateway allows 30 attempts per IP per 15 minutes,
   using an in-memory map. `trust proxy` is set so `req.ip` works behind a
   proxy.
6. **Clearer failures.** `protect` returns `503 Session store unavailable` when
   Redis errors, and `401` for corrupt session JSON.
7. **Safer login response.** `toPublicUser` returns only `_id`, `name`, `email`,
   and `avatar`. Production cookies get `Secure` and `SameSite=None`.
8. **Environment examples.** Each backend service and the frontend gained an
   `.env.example`.
9. **Gateway shape.** `dotenv/config` replaces manual `dotenv.config()`, service
   URLs have fallbacks, `/health` is added, and JSON `404`/`500` handlers are
   registered.

### Frontend

1. **Automatic sign-out on `401`.** The axios interceptor clears the user and
   project slices when a protected request loses its session. `/api/me` and
   login are excluded.
2. **Project loading/error state.** The slice distinguishes projects and starred
   lists, tracks loading and errors, and `clearProjects` resets everything.
3. **Retry and inline errors.** The dashboard shows a load failure with a retry
   button, and the create form shows the backend message.
4. **Auth check state.** `authChecked` distinguishes "checking" from "signed
   out".
5. **Not found route.** `*` now renders a 404 page instead of nothing.
6. **Responsive/accessibility pass.** The sidebar becomes an `aside` with a
   `nav`, mobile users get project tabs, icon-only buttons gain labels, and the
   create dialog gets `role="dialog"`, a label, Escape handling, and focusable
   form controls.

## Why it was done

The previous commit shipped the flow but trusted too much:

- star and delete checked that a user id was present, then ignored it when
  looking up the project;
- any string could become a project name;
- cache entries never expired;
- Redis errors surfaced as generic `500`s or hung requests;
- the login route had no throttle;
- the client had no recovery path after a failed list load or an expired
  session.

This commit closes those gaps in the order they matter: authorization first,
then data validity, then failure behavior, then polish.

## Files touched

The commit spans 41 files. The important ones:

| Area | Files |
| --- | --- |
| Gateway | `index.js`, `middleware/protect.js`, `middleware/loginLimiter.js`, `utils/proxyWithHeaders.js`, `controllers/user.controller.js`, `package.json`, `.env.example` |
| Auth | `controllers/auth.controller.js`, `models/user.model.js`, `config/db.js`, `index.js`, `package.json`, `.env.example` |
| Project | `controllers/project.controller.js`, `models/project.model.js`, `routes/project.route.js`, `config/db.js`, `index.js`, `package.json`, `.env.example` |
| Shared | `shared/redis/redis.js` |
| Frontend state | `utils/axios.js`, `redux/projectSlice.js`, `redux/userSlice.js`, `App.jsx` |
| Frontend UI | `Dashboard.jsx`, `CreateProjectModel.jsx`, `ProjectCard.jsx`, `Sidebar.jsx`, `UserNavbar.jsx`, `NotFound.jsx`, `index.html` |
| Config | `.gitignore`, `frontend/.env.example` |

## Decisions worth noting

- **Distinguish "not signed in" from "session store down."** A missing or
  unknown session is `401`; a Redis error is `503`. Pretending Redis is down when
  the user is simply logged out would be misleading, and pretending auth failed
  when the store is down would force an unnecessary re-login.
- **Owner filters, not post-fetch checks.** The database query itself includes
  the owner. Another user's project is indistinguishable from a missing one and
  returns `404`.
- **TTL plus invalidation.** Writes delete the cache immediately; the 5-minute TTL
  bounds staleness if an invalidation is missed.
- **Cache failures are soft.** The project service logs a warning and continues.
  Sessions are different: the gateway cannot authenticate without Redis, so it
  fails closed with `503`.
- **The rate limiter is intentionally simple.** A `Map` keyed by IP with a
  15-minute window. It has no shared state and resets on restart; moving it to
  Redis is the scaling path.
- **Public user serialization.** The API no longer returns the raw Mongoose user.
  This keeps `firebaseUid` out of responses and Redis sessions.
- **Interceptor exceptions.** `/api/me` returning `401` is the normal signed-out
  answer. Login returning `401` is a login failure. Neither should trigger the
  "session expired" cleanup.
- **Generic list errors in UI, detail in console.** Users see "Could not load
  projects."; the actual error is logged. That keeps the UI readable without
  hiding diagnostics from developers.

## How to verify

1. Sign in as user A and create a project.
2. Sign in as user B and try to fetch, star, or delete A's project id. Each
   should return `404`.
3. Stop Redis and call a protected route. The gateway should return
   `503 Session store unavailable`, not `401`.
4. Send a project with an empty or whitespace-only name. Expect
   `400 Project name is required`.
5. Send an invalid project id such as `not-an-id`. Expect `400 Invalid id`.
6. Make more than 30 login attempts from one IP within 15 minutes. Expect `429`.
7. Stop the project service, load the dashboard, and use the retry button after
   restarting it.
8. Visit an unknown frontend path. Expect the 404 page.

## Known rough edges

- **The generic `PATCH /:id` route was removed**; only the two star aliases
  remain. That is clearer, but there is still no name/description update route.
- **Rate limiting is per process and in memory.** Restarting the gateway resets
  counters, and multiple instances do not share them.
- **Still no CSRF protection or origin check** for mutations, and logout remains
  a `GET`.
- **The signed-in and signed-out experiences still share `Dashboard.jsx`.**
  Splitting sign-in into its own route came next.
- **No theme toggle, toasts, project detail page, or error boundary yet.**
- **List state is still local to the dashboard rather than the richer
  loaded/loading/error slice used today.**
- **The login limiter counts every attempt, successful or not.** That is simple,
  but a busy shared IP can hit the limit.

## Up next

Split sign-in from the dashboard, add the project detail page, centralize theme
and toast handling, and remove the old landing-page components. The next entry
covers that productization pass.
