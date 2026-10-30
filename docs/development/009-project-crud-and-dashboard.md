# 9 — Project CRUD and the First Real Dashboard

## At a glance

| | |
| --- | --- |
| **Commit** | `b3d0e18` |
| **Date** | 2026-10-28 |
| **Author** | Yaman Hassan |
| **Message** | `feat: projects create delete starred toggle etc backend and frontend developed` |

This is the commit where the project service stopped being a skeleton and the
dashboard stopped being a landing page. It wires create, list, star, and delete
through the whole stack, adds the first user menu and sidebar, and brings the
project Redux slice into real use.

## What changed

1. **Logout got a route.** The auth router now exposes `GET /logout`, so the
   frontend can finally end a session instead of only creating one.
2. **Project routes gained star aliases.** `PATCH /star/:id` and
   `PATCH /:id/star` both call `toggleStar`. The generic `PATCH /:id` route was
   still present at this point.
3. **`toggleStar` and `deleteProject` were repaired.** Both now read
   `x-user-id`, which the previous version forgot to do, and both invalidate the
   all-projects and starred caches.
4. **The frontend gained project components.** `ProjectCard`, `Sidebar`,
   `UserNavbar`, and `CreateProjectModel` were added.
5. **Project HTTP calls got a home.** `features/project.js` wraps list, create,
   fetch, starred, toggle, and delete. `features/logout.js` wraps logout.
6. **Redux gained project state.** The store registers a `project` slice with
   `projects`, `starredProjects`, and actions for set/add/star/delete.
7. **The dashboard was rebuilt.** Signed-in users now see a navbar, sidebar,
   welcome header, project grid, empty states, and a create modal. Signed-out
   users still saw the old marketing landing page inside `Dashboard`.

## Why it was done

The backend could store projects, but the UI could not show one. The dashboard
was still a landing page whose only job was a Google button. This commit turns
it into a workspace: data from the project service, a way to add a project, and
a way to remove or star one.

The shape follows the backend that already existed. Lists come from
`/api/project` and `/api/project/starred`; mutations go to the matching routes;
Redux holds the two lists so the sidebar and cards do not fetch independently.

## Files touched

| File | State |
| --- | --- |
| `backend/services/auth/routes/auth.route.js` | Edited — adds `GET /logout`. |
| `backend/services/project/controllers/project.controller.js` | Edited — fixes `userId` in star/delete, invalidates both caches. |
| `backend/services/project/routes/project.route.js` | Edited — adds star route aliases. |
| `frontend/package.json` | Edited — adds `lucide-react` and `motion`. |
| `frontend/src/components/CreateProjectModel.jsx` | **Added** — create dialog. |
| `frontend/src/components/ProjectCard.jsx` | **Added** — card with star/delete. |
| `frontend/src/components/Sidebar.jsx` | **Added** — Projects/Starred navigation. |
| `frontend/src/components/UserNavbar.jsx` | **Added** — logo, theme slot, user menu, logout. |
| `frontend/src/features/logout.js` | **Added** — logout request. |
| `frontend/src/features/project.js` | **Added** — project requests. |
| `frontend/src/index.css` | Edited — dark variant and menu animation. |
| `frontend/src/pages/Dashboard.jsx` | Rewritten — workspace layout and project loading. |
| `frontend/src/redux/projectSlice.js` | Edited — list, star, delete, clear actions. |
| `frontend/src/redux/store.js` | Edited — registers the project reducer. |

## Decisions worth noting

- **Two star URLs.** `/star/:id` and `/:id/star` both exist. The frontend uses
  `/star/:id`; the alias keeps the URL intuitive from either direction. The cost
  is two routes doing the same thing.
- **Cache invalidation is paired.** A star or delete removes both list keys, not
  just the obvious one. Guessing which list changed is easy to get wrong.
- **Optimistic starring.** The card flips the star in Redux before the request
  finishes and rolls back if it fails. The page feels immediate, at the cost of
  briefly showing a state the server has not confirmed.
- **Redux holds lists, not individual cards.** Cards receive a project as a
  prop. There is no per-card fetch and no normalized entity store.
- **Logout is a `GET`.** It matches the route added in this commit. That is easy
  to call but not ideal for a state-changing action; it remains a known gap.
- **The signed-out view is still the landing page.** Splitting sign-in into its
  own route came in the next design pass, so at this commit the dashboard file
  contains both experiences.

## How to verify

Start the full stack, sign in, and create a project. Then:

- the card appears immediately at the top of the list;
- the starred tab shows it after starring;
- unstarring removes it from the starred list;
- deleting asks for confirmation and removes it from both lists;
- logging out clears the cookie and returns to the landing page.

Check the API directly with a session cookie:

```bash
curl http://localhost:8000/api/project -H "Cookie: session=<uuid>"
curl -X PATCH http://localhost:8000/api/project/star/<id> -H "Cookie: session=<uuid>"
curl -X DELETE http://localhost:8000/api/project/<id> -H "Cookie: session=<uuid>"
```

## Known rough edges

- **Star and delete were not owner-scoped yet.** They read `x-user-id` but
  looked projects up by id alone. Any signed-in user who knew an id could star or
  delete another user's project. The next commit adds `owner: userId` to those
  queries.
- **No loaded flags.** Switching tabs refetched a list every time.
- **Errors only reached the console.** There was no retry panel, no toast, and
  no inline feedback for failed list loads.
- **No project detail page.** Cards were the end of the line.
- **The dashboard still owned sign-in.** `SignIn` as a separate page did not
  exist yet.
- **No theme toggle.** The dark variant existed, but the user could not switch
  themes.
- **No inline sign-in error.** The button recovered, but failures were only
  logged.

## Up next

Add real ownership checks and input limits on the backend, add retry and error
states on the client, split sign-in from the dashboard, and build the project
detail view. The next entries cover those changes.
