# 7 — Landing Page, Components, Router, and Redux

## At a glance

| | |
| --- | --- |
| **Commits** | `9c05d39`, `8d69b98` |
| **Date** | 2026-10-18 |
| **Author** | Yaman Hassan |
| **Messages** | `feat: integrate routing and dashboard layout with Firebase authentication` / `feat: add Redux for state management and integrate user authentication flow` |

Two commits that together turn the bare sign-in button into an actual product
screen — and give the app somewhere to *keep* who just logged in. Kept as one
entry because the second only makes sense on top of the first.

## What changed

1. **The UI became a real landing page.** A single `App.jsx` button grew into a
   composed dashboard: a background, navbar, hero, feature list, an illustrated
   code window, and a footer. It's built Cursor-style — a dark grid backdrop,
   aurora glows, a floating "editor" mockup, and a gradient headline.
2. **The app got a router.** `react-router-dom` now wraps the app in
   `App.jsx`, with `Dashboard` mounted at `/`. Today there's one route, but the
   frame is there for the pages that come next.
3. **`Dashboard` became a page.** The login logic moved out of the root
   component into `src/pages/Dashboard.jsx`, which composes the new components
   and owns the click handler.
4. **Redux arrived.** `@reduxjs/toolkit` and `react-redux` store a logged-in
   user in a `user` slice. `main.jsx` wraps the app in a `<Provider>`, and
   `Dashboard` dispatches `setUserData(data)` after a successful login.
5. **A logo and a design system.** `logo.svg`, `logo-white.svg`, and
   `favicon.svg` land in `src/assets/`, and `index.css` gains reusable classes
   (`bg-grid`, `glass-panel`, `ring-hairline`, `text-gradient`) plus custom
   animations (`aurora`, `float`, `caret`, `rise`).

## Why it was done

The previous commits proved the *plumbing* — a token goes in, a session comes
out. This one makes the app look like something a person would actually sign in
to, because a login page nobody trusts is a login page nobody uses.

Redux is the part worth justifying. The app is still a single page, so a
`useState` would have done the job. It was added anyway because the user object
is the kind of state that many future components will want to read — a navbar
that shows the signed-in name, a protected editor route, a logout button. Putting
it in a store now means those pieces don't have to pass data down through props
or lift state into `App`. The trade-off is a new concept (slice, store,
dispatch) for a one-page app; the bet is the app won't stay one page for long.

## Files touched

| File | State |
| --- | --- |
| `frontend/src/App.jsx` | Rewritten — router with a single `/` route to `Dashboard`. |
| `frontend/src/pages/Dashboard.jsx` | **Added** — composes the page, owns `handleLogin`. |
| `frontend/src/components/Background.jsx` | **Added** — grid, aurora glows, vignette. |
| `frontend/src/components/Navbar.jsx` | **Added** — logo, nav links, sign-in button. |
| `frontend/src/components/Hero.jsx` | **Added** — headline, copy, sign-in, features. |
| `frontend/src/components/SignInButton.jsx` | **Added** — the Google button, with loading state. |
| `frontend/src/components/FeatureList.jsx` | **Added** — the three short claims. |
| `frontend/src/components/CodeWindow.jsx` | **Added** — the mock AI editor. |
| `frontend/src/components/Footer.jsx` | **Added** — logo and legal links. |
| `frontend/src/components/Logo.jsx` | **Added** — picks the color or white mark. |
| `frontend/src/redux/store.js` | **Added** — the store, with the `user` reducer. |
| `frontend/src/redux/userSlice.js` | **Added** — `userData` state and the `setUserData` action. |
| `frontend/src/main.jsx` | Edited — wraps `<App/>` in a Redux `<Provider>`. |
| `frontend/src/index.css` | Edited — design-system classes and keyframes. |
| `frontend/src/assets/logo.svg` | **Added** — the color logo. |
| `frontend/src/assets/logo-white.svg` | **Added** — the white logo, for dark surfaces. |
| `frontend/src/assets/favicon.svg` | **Added** — the app tile; `public/favicon.svg` removed. |
| `frontend/index.html` | Edited — favicon, apple-touch-icon, fonts, meta description. |
| `frontend/package.json` | Edited — adds `react-router-dom`, Redux, `react-icons`. |

## Decisions worth noting

- **Components split one file into many.** Every piece of the page lives in its
  own file under `components/`. A 300-line `Dashboard` would have worked, but
  splitting means the navbar can change without touching the hero, and each file
  stays small enough to hold in your head.
- **The logo is an SVG in `assets/`, not an inline component.** `Logo.jsx` just
  picks between the color and white marks, so the drawing stays a real asset you
  can edit in any vector tool.
- **Redux state is written, but not yet read.** `setUserData` dispatches after
  login, and the store holds the user — but nothing selects it yet, and there's
  no redirect or protected route. The wiring is deliberately ahead of the need;
  the payoff comes with the editor screen.
- **No error handling in `handleLogin` yet.** `Dashboard.jsx` sets `loading`
  true, signs in, and sets it false — all without a `try`/`catch`/`finally`. If
  the popup is closed or the request fails, the button can stay stuck on
  "Signing in…". This is the first thing to fix when the flow grows.

## How to verify

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. You should see the full landing page — navbar,
hero, code window, footer — not a lone button. `npm run lint` and
`npm run build` both pass. Clicking **Continue with Google** still opens the
popup and posts the token to the backend as before.

## Known rough edges

- **`handleLogin` has no failure path** (see above) — the loading state never
  resets on error. Closing the popup throws `auth/popup-closed-by-user`, which
  is normal, but it leaves the button stuck.
- **`login()` swallows errors and returns `null`**, which `Dashboard` then
  dispatches — clobbering the store and hiding the failure. A leftover
  `console.log` sits in its catch block.
- **The stored user isn't used anywhere.** No component reads `userData`, and a
  reload still looks signed out.
- **One route only.** The router exists, but `/` is the whole app.
- **Unused assets were kept.** `hero.png`, `react.svg`, `vite.svg`, and
  `public/icons.svg` aren't imported by anything.
- **No `<StrictMode>`.** `main.jsx` renders without it, so React's dev-only
  warnings are off.

## Up next

Read the stored user somewhere, add a logout flow, and give `handleLogin` a
failure path (a `try`/`finally` that always clears the loading state) so the
button recovers from a cancelled sign-in.
