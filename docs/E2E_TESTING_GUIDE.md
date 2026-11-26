# NexPulse E2E Testing Guide

## Overview

End-to-end browser tests use **Playwright** (`@playwright/test`) configured in `frontend/playwright.config.js` and located in `frontend/e2e/nexpulse.spec.js`.

## Test Authentication Strategy

Production authentication uses Firebase Google OAuth (`POST /api/auth/login` -> Redis `session-<uuid>` HttpOnly cookie). Automated E2E tests **do not weaken production authentication** and do not require live Google OAuth credentials:

- The test harness creates isolated test users (`E2E User A`, `E2E User B`) in an isolated MongoDB database (`nexpulse_e2e_test`).
- It seeds `session-<uuid>` entries directly in Redis and injects the `session` cookie into isolated Playwright `BrowserContext`s.
- All backend requests still traverse the real Gateway `protect` middleware, CSRF guard, Redis session lookup, and microservice `internalAuth`.

## Prerequisites

1. Local MongoDB (`127.0.0.1:27017`) and Redis (`127.0.0.1:6379`) running.
2. Google Chrome installed (Playwright uses `channel: "chrome"`), or update `playwright.config.js` to use `channel: "msedge"` / bundled Chromium.
3. Built frontend bundle (`npm run build` in `frontend/`).

## Running the Suite

```powershell
cd frontend
npm run build
npm run test:e2e
```

## Covered Workflows

1. **Authentication & Session Security**: Unauthenticated `/` redirect to `/signin`, invalid UUID cookie `401` rejection, valid session persistence across reload, logout cookie + Redis session invalidation.
2. **Dashboard, Ownership Isolation & UI**: Project creation, navigation to `/project/:id`, User B `404` isolation check, lazy-loaded `ThemeSwitcher`, `404` NotFound route, responsive mobile (`390x844`) overflow check.
3. **Monaco Editor & Web Workers**: Verifies Monaco chunks are **not** loaded on `/` (Dashboard), lazy-load on file open, worker initialization (`MonacoEnvironment`) with zero console errors, editing + `Ctrl+S` save, and tab-switching heap stability.
4. **Preview & Simulated Terminal**: Terminal `help`, `npm install` rejection, invalid `cd` error, `touch` file creation, `open`, `Preview` tab `iframe` rendering, and fullscreen toggle.
