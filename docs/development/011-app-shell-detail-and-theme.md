# 11 — App Shell, Project Detail, and Theme

## At a glance

| | |
| --- | --- |
| **Commits** | `962dae2`, `702cd54`, `a328b60` |
| **Date** | 2026-10-28 → 2026-10-29 |
| **Author** | Yaman Hassan |
| **Messages** | `feat: update UI components and styles for improved user experience and consistency` / `feat: enhance UI components and structure for improved user experience and consistency across the application` / `feat: enhance user experience with new components and improved state management` |

Three commits that turn the prototype into a coherent app shell. The dashboard
gets a consistent visual system, sign-in becomes its own route, project cards
open a real detail page, and theme, toasts, loading screens, and an error
boundary are added. The old marketing landing page is removed.

## What changed

1. **Sign-in is a route.** `SignIn.jsx` owns the Google popup, error message, and
   redirect. `Dashboard.jsx` no longer contains a signed-out landing page.
2. **Protected routing.** `ProtectedRoute` waits for `authChecked`, redirects to
   `/signin`, and remembers the attempted path. Routes are lazy-loaded behind
   `Suspense`.
3. **Project detail.** `/project/:id` fetches a project, shows description and
   dates, and supports star and delete with confirmation. Missing projects get a
   dedicated 404 state.
4. **Theme system.** `ThemeProvider` toggles the `dark` class on `<html>`, saves
   the choice in `localStorage`, and an inline script in `index.html` applies it
   before paint. `ThemeToggle` appears on the sign-in, legal, not-found, and app
   screens.
5. **Toast system.** `ToastProvider` and `useToast` replace one-off console-only
   feedback for create, delete, star failure, and the upgrade placeholder.
6. **Error and loading shells.** `ErrorBoundary` catches render failures;
   `PageLoader` covers route chunks and session checks.
7. **Dashboard redesign.** `DashboardHeader`, `DashboardWatermark`,
   `ProjectsSection`, and a responsive sidebar split the old monolithic page into
   named pieces. Mobile users get Projects/Starred tabs in the section header.
8. **Legal pages.** `/terms` and `/privacy` render structured content with the
   shared theme.
9. **Old landing components removed.** `Hero`, `Navbar`, `Footer`, `CodeWindow`,
   and `FeatureList` were deleted along with their styles.
10. **Richer project state.** The slice gained loading, error, and loaded flags
    for both lists, plus explicit star/delete updates. The dashboard avoids
    duplicate fetches with a loaded check and an `inFlight` ref.
11. **Favicon and logos refreshed.** The brand assets were updated to match the
    new palette.

## Why it was done

The previous state mixed two products in one file: a marketing page for visitors
and a workspace for signed-in users. That made the dashboard hard to reason
about and meant direct links could not be protected properly. Splitting sign-in
into its own route gave the app a clear entry point and let `ProtectedRoute`
handle the "not signed in" case once.

The detail page was the missing destination for a project card. Without it, a
card was a dead end: no place to read the full description, see dates, or manage
the project. Adding it also made star/delete usable outside the grid.

The theme, toast, and error/loading work is infrastructure for everything after
this: instead of every page inventing its own spinner, alert, or dark-mode
handling, there is one provider and one pattern.

## Files touched

The three commits together touch most of `frontend/src`. Key files:

| Area | Files |
| --- | --- |
| Routing | `App.jsx`, `components/ProtectedRoute.jsx`, `components/PageLoader.jsx` |
| Pages | `pages/SignIn.jsx`, `pages/Dashboard.jsx`, `pages/ProjectDetail.jsx`, `pages/Legal.jsx`, `pages/NotFound.jsx` |
| Dashboard | `DashboardHeader.jsx`, `DashboardWatermark.jsx`, `ProjectsSection.jsx`, `Sidebar.jsx`, `UserNavbar.jsx` |
| Project actions | `ProjectCard.jsx`, `CreateProjectModel.jsx`, `redux/projectSlice.js` |
| Theme | `hooks/ThemeProvider.jsx`, `hooks/themeContext.js`, `ThemeToggle.jsx`, `index.css`, `index.html` |
| Feedback | `components/Toast.jsx`, `hooks/toastContext.js`, `components/ErrorBoundary.jsx` |
| Brand | `assets/logo.svg`, `assets/logo-white.svg`, `assets/favicon.svg` |
| Removed | `CodeWindow.jsx`, `FeatureList.jsx`, `Footer.jsx`, `Hero.jsx`, `Navbar.jsx` |

## Decisions worth noting

- **Route-level auth, not conditionals inside a page.** `ProtectedRoute` is a
  single boundary. A page does not need to know whether the user is signed in.
- **The attempted path is carried in router state.** `/project/abc` redirects to
  `/signin` with `from: '/project/abc'`; after login the user lands there. The
  trade-off is that the path is lost on a full reload during sign-in.
- **Detail data is fetched, not selected from the list.** Direct links work even
  if the dashboard has never loaded, and the record is fresh. The cost is that
  the same project exists in two places in memory.
- **Optimistic star updates in both views.** The card and detail page flip the
  UI immediately, dispatch the same Redux action, then reconcile with the
  response. Failure rolls back and shows a toast.
- **Theme is context, not Redux.** Only UI rendering needs it. `localStorage`
  persists it, and the inline script avoids a flash before React mounts.
- **Toasts are context, not Redux.** They are transient UI notifications, not
  application data.
- **ErrorBoundary and toasts cover different failures.** Render errors get the
  full-page fallback; async/action errors are caught locally and shown as toasts
  or inline messages.
- **The old landing page was deleted, not hidden.** Keeping it would leave two
  sign-in paths and dead components. Removing it makes `/signin` the only entry.
- **List caching is client-side too.** Loaded flags prevent refetching a tab on
  every switch; the backend still owns the 5-minute Redis cache.

## How to verify

1. Sign out and visit `/project/<some-id>` directly. You should land on
   `/signin`; after signing in, you should return to that project.
2. Reload while signed in. The dashboard should restore the session without a
   second Google popup and without flashing the sign-in page.
3. Toggle the theme and reload. The choice should persist, and the page should
   not flash the wrong theme.
4. Create a project. The modal should close, the card should appear, and a
   success toast should show.
5. Star a project from the grid and from the detail page. Both views should
   agree, and a forced failure should show an error toast and roll back.
6. Delete from the detail page. Confirm, then land on the dashboard with a
   success toast.
7. Visit a missing project id. Expect the "Project not found" panel.
8. Visit `/terms`, `/privacy`, and an unknown path. All should render and offer a
   way back.
9. Run:

```bash
cd frontend
npm run lint
npm run build
```

## Known rough edges

- **Firebase is not signed out.** Logout ends the server session and clears
  Redux, but does not call Firebase's `signOut()`. The next login still opens a
  popup.
- **Starring before the starred list loads can mark it loaded prematurely.** The
  optimistic action inserts the project into `starredProjects` and sets
  `starredLoaded`, so the Starred tab may show only that project until reload.
- **Dashboard lists can be stale after opening a detail page.** The backend
  updates `lastOpenedAt` and invalidates Redis, but the client's loaded flags
  keep the old list until a reload or forced retry.
- **No reduced-motion support.** Motion animations run regardless of the OS
  preference.
- **No project editing.** Name and description are set at creation only.
- **Legal copy is placeholder product copy**, not reviewed legal text.
- **`CreateProjectModel` is still spelled "Model".** The name is now part of
  imports and docs; renaming is a mechanical cleanup.
- **No automated frontend tests.** Verification is manual plus lint/build.
- **Deployment needs an SPA rewrite.** `BrowserRouter` paths must fall back to
  `index.html`.

## Up next

Make logout complete on the client, fix the starred-list edge case, add project
editing, and add tests around auth, list state, and the detail flow. The
[Roadmap](../roadmap.md) tracks these.
