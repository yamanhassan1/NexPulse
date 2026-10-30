# NexPulse Frontend

The React client for NexPulse: Google sign-in, the project dashboard, project
detail pages, and legal pages. Built with Vite, React, Redux Toolkit, and
Tailwind CSS v4.

The full documentation lives in [`docs/frontend/`](../docs/frontend/README.md).

## Quick start

```bash
npm install
npm run dev
```

Vite prints the address, usually `http://localhost:5173`. The backend gateway
must be running too; see [Getting Started](../docs/getting-started.md).

Create `frontend/.env.local`:

```bash
VITE_SERVER_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
```

The other Firebase project identifiers are hard-coded in `firebase.js`. All
`VITE_*` values are public in the browser bundle.

## Routes

| Path | Page |
| --- | --- |
| `/signin` | Google sign-in |
| `/` | Dashboard (protected) |
| `/project/:id` | Project detail (protected) |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `*` | Not found |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload. |
| `npm run build` | Produce an optimized build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint over the code. |

## Deployment

The app uses `BrowserRouter`, so the host must rewrite unknown paths to
`index.html`. Without that, refreshing `/project/<id>` returns a server 404.

## Documentation

- [Frontend overview](../docs/frontend/README.md)
- [Routing and auth](../docs/frontend/routing-and-auth.md)
- [State management](../docs/frontend/state-management.md)
- [Components](../docs/frontend/components.md)
- [Styling and theme](../docs/frontend/styling-and-theme.md)
- [API reference](../docs/backend/api-reference.md)
- [Troubleshooting](../docs/guides/troubleshooting.md)
