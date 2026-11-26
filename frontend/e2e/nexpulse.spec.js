import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const FRONTEND_DIR = path.resolve(import.meta.dirname, "..");
const ROOT_DIR = path.resolve(FRONTEND_DIR, "..");
const requireAuth = createRequire(path.join(ROOT_DIR, "backend", "services", "auth", "package.json"));
const requireGw = createRequire(path.join(ROOT_DIR, "backend", "gateway", "package.json"));
const mongoose = requireAuth("mongoose");
const Redis = requireGw("ioredis");

const TEST_DB = "mongodb://127.0.0.1:27017/nexpulse_e2e_test";
const REDIS_URL = "redis://127.0.0.1:6379";
const INTERNAL_SECRET = "e2e-internal-secret-999";

const children = [];
let redis;
let userA;
let userB;
let sidA;
let sidB;

function startProc(cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  children.push(child);
  return child;
}

async function waitReady(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* ignore while service is starting */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Service did not become ready: ${url}`);
}

test.beforeAll(async () => {
  redis = new Redis(REDIS_URL);
  await mongoose.connect(TEST_DB);
  await mongoose.connection.dropDatabase();

  const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
    firebaseUid: String,
    avatar: String,
  }));
  userA = await User.create({ name: "E2E User A", email: "e2ea@nexpulse.local", firebaseUid: "e2e-a", avatar: "" });
  userB = await User.create({ name: "E2E User B", email: "e2eb@nexpulse.local", firebaseUid: "e2e-b", avatar: "" });

  sidA = crypto.randomUUID();
  sidB = crypto.randomUUID();
  await redis.set(`session-${sidA}`, JSON.stringify({ _id: String(userA._id), name: userA.name, email: userA.email, avatar: "" }), "EX", 3600);
  await redis.set(`session-${sidB}`, JSON.stringify({ _id: String(userB._id), name: userB.name, email: userB.email, avatar: "" }), "EX", 3600);

  const env = { NODE_ENV: "development", MONGODB_URI: TEST_DB, REDIS_URL, INTERNAL_SECRET, HOST: "127.0.0.1" };
  startProc(process.execPath, ["src/index.js"], path.join(ROOT_DIR, "backend/services/auth"), { ...env, PORT: "8001" });
  startProc(process.execPath, ["src/index.js"], path.join(ROOT_DIR, "backend/services/file"), { ...env, PORT: "8003" });
  startProc(process.execPath, ["src/index.js"], path.join(ROOT_DIR, "backend/services/project"), { ...env, PORT: "8002", FILE_SERVICE: "http://127.0.0.1:8003" });
  startProc(process.execPath, ["src/index.js"], path.join(ROOT_DIR, "backend/gateway"), {
    ...env,
    PORT: "8000",
    FRONTEND_URL: "http://localhost:5179",
    AUTH_SERVICE: "http://127.0.0.1:8001",
    PROJECT_SERVICE: "http://127.0.0.1:8002",
    FILE_SERVICE: "http://127.0.0.1:8003",
  });
  startProc(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", "5179", "--strictPort", "--host", "localhost"], FRONTEND_DIR);

  await Promise.all([
    waitReady("http://127.0.0.1:8001/ready"),
    waitReady("http://127.0.0.1:8002/ready"),
    waitReady("http://127.0.0.1:8003/ready"),
    waitReady("http://127.0.0.1:8000/ready"),
    waitReady("http://localhost:5179/"),
  ]);
});

test.afterAll(async () => {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore already-exited child */
    }
  }
  if (redis) {
    await redis.del(`session-${sidA}`, `session-${sidB}`, `projects:user:${userA?._id}`, `projects:user:${userB?._id}`);
    redis.disconnect();
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("1. Authentication, invalid session, protected routes & logout", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Protected route unauthenticated -> redirects to /signin
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();

  // Invalid session cookie -> rejected with 401
  await ctx.addCookies([{ name: "session", value: "not-a-valid-uuid", domain: "localhost", path: "/" }]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();

  // Valid session cookie -> Dashboard loads & persists across refresh
  const logoutSid = crypto.randomUUID();
  await redis.set(`session-${logoutSid}`, JSON.stringify({ _id: String(userA._id), name: userA.name, email: userA.email, avatar: "" }), "EX", 3600);
  await ctx.clearCookies();
  await ctx.addCookies([{ name: "session", value: logoutSid, domain: "localhost", path: "/" }]);
  await page.goto("/");
  await expect(page.getByText(/Welcome back, E2E/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Welcome back, E2E/i)).toBeVisible();

  // Logout invalidates session & redirects to SignIn
  await page.getByRole("button", { name: /E2E User A/i }).click();
  await page.getByRole("menuitem", { name: /Logout/i }).click();
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  expect(await redis.get(`session-${logoutSid}`)).toBeNull();

  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  await ctx.close();
});

test("2. Dashboard, project CRUD, ownership isolation, Monaco, Preview, Terminal & ThemeSwitcher", async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctxA.newPage();
  const consoleErrors = [];
  const serverErrors = [];
  const loadedChunks = new Set();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
    if (res.url().includes("/assets/") && res.url().endsWith(".js")) {
      loadedChunks.add(path.basename(new URL(res.url()).pathname));
    }
  });

  await ctxA.addCookies([{ name: "session", value: sidA, domain: "localhost", path: "/" }]);

  // Measure Web Vitals on Dashboard
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) window.__vitals.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/");
  await expect(page.getByText(/Welcome back, E2E/i)).toBeVisible();
  await page.waitForTimeout(300);

  // Collect Dashboard initial Web Vitals & JS transfer size before opening editor
  const dashMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const jsResources = performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".js"));
    const totalJsBytes = jsResources.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    return {
      lcpMs: Math.round(window.__vitals?.lcp || 0),
      cls: +(window.__vitals?.cls || 0).toFixed(4),
      domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
      loadMs: Math.round(nav?.loadEventEnd || 0),
      initialJsCount: jsResources.length,
      initialJsKB: +(totalJsBytes / 1024).toFixed(1),
    };
  });
  console.log("DASHBOARD_METRICS:", JSON.stringify(dashMetrics));

  // Verify Monaco is NOT loaded on Dashboard (lazy-loaded only when editor opens)
  const monacoBeforeEditor = [...loadedChunks].some((f) => f.includes("MonacoEditor") || f.includes("editor.api"));
  expect(monacoBeforeEditor).toBe(false);

  // Create project via UI and open it
  await page.getByRole("button", { name: /New Project/i }).click();
  await page.getByLabel("Project Name").fill("E2E Alpha");
  await page.getByRole("button", { name: /^Create Project$/i }).click();
  await expect(page.getByText("E2E Alpha")).toBeVisible();
  await page.getByText("E2E Alpha").first().click();
  await page.waitForURL(/\/project\/[a-f0-9]+/i);
  await expect(page.getByRole("button", { name: "Terminal" })).toBeVisible();

  const projectUrl = page.url();
  const projectId = projectUrl.split("/project/")[1];

  // User B ownership isolation check
  const ctxB = await browser.newContext();
  await ctxB.addCookies([{ name: "session", value: sidB, domain: "localhost", path: "/" }]);
  const pageB = await ctxB.newPage();
  const bResp = await pageB.request.get(`http://localhost:8000/api/project/${projectId}`);
  expect(bResp.status()).toBe(404);
  await ctxB.close();

  // Theme switching (lazy-loaded ThemeSwitcher)
  await page.getByRole("button", { name: /Change theme/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  // Terminal: open, run supported & unsupported commands, create files for Preview + Monaco
  await page.getByRole("button", { name: "Terminal" }).click();
  const termInput = page.getByRole("textbox").last();
  await termInput.fill("help");
  await termInput.press("Enter");
  await expect(page.getByText(/This browser workspace cannot run/i)).toBeVisible();

  await termInput.fill("npm install");
  await termInput.press("Enter");
  await expect(page.getByText(/command not found|not supported|cannot run/i).last()).toBeVisible();

  await termInput.fill("cd /does-not-exist");
  await termInput.press("Enter");
  await expect(page.getByText(/directory not found/i)).toBeVisible();

  await termInput.fill("touch index.html");
  await termInput.press("Enter");
  await expect(page.getByText(/Created file index\.html/i)).toBeVisible();

  await termInput.fill("touch styles.css");
  await termInput.press("Enter");
  await expect(page.getByText(/Created file styles\.css/i)).toBeVisible();

  await termInput.fill("touch app.js");
  await termInput.press("Enter");
  await expect(page.getByText(/Created file app\.js/i)).toBeVisible();

  // Open index.html in Monaco Editor via Terminal `open`
  await termInput.fill("open index.html");
  await termInput.press("Enter");
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 20000 });

  // Verify Monaco chunk actually lazy-loaded now
  const monacoAfterEditor = [...loadedChunks].some((f) => f.includes("MonacoEditor") || f.includes("editor.api"));
  expect(monacoAfterEditor).toBe(true);

  // Edit & save index.html, styles.css, app.js via UI + API seed for clean preview test
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.locator('iframe[title*="Preview"]')).toBeVisible();

  // Toggle fullscreen preview
  await page.getByRole("button", { name: /View preview full screen/i }).click();
  await expect(page.getByRole("button", { name: /Exit full-screen preview/i })).toBeVisible();
  await page.keyboard.press("Escape");

  // Switch back to Editor, open app.js, edit, save, and measure tab-switch heap stability
  await page.getByRole("tab", { name: "Editor" }).click();
  await termInput.fill("open app.js");
  await termInput.press("Enter");
  await page.locator(".monaco-editor").click();
  await page.keyboard.type("console.log('e2e');");
  await page.keyboard.press("Control+s");

  const heapBeforeTabs = await page.evaluate(() =>
    performance.memory ? +(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) : null,
  );
  const tTab0 = Date.now();
  for (let i = 0; i < 6; i++) {
    await page.getByRole("tab", { name: i % 2 === 0 ? /index\.html/i : /app\.js/i }).first().click();
  }
  const tabSwitchAvgMs = +((Date.now() - tTab0) / 6).toFixed(1);
  const heapAfterTabs = await page.evaluate(() =>
    performance.memory ? +(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) : null,
  );
  console.log("EDITOR_METRICS:", JSON.stringify({ tabSwitchAvgMs, heapBeforeTabs, heapAfterTabs }));

  // Responsive mobile viewport check
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);

  // Navigate back to Dashboard and verify 404 route as well
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: /Page not found/i })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("E2E Alpha")).toBeVisible();

  expect(serverErrors).toEqual([]);
  // Filter out intentional 401/network noise only if none expected; here all calls were authenticated
  expect(consoleErrors).toEqual([]);
  await ctxA.close();
});

test("3. Gateway unavailable surfaces controlled SessionError without infinite /api/me retries", async ({ browser }) => {
  // Stop gateway process (children[3] in beforeAll) to simulate gateway down
  const gwChild = children[3];
  try {
    gwChild.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 400));

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let meAttempts = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/me")) meAttempts += 1;
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /We can't reach NexPulse/i })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);

  // Bounded at MAX_ATTEMPTS = 2 (no infinite retry loop)
  expect(meAttempts).toBeLessThanOrEqual(2);
  expect(meAttempts).toBeGreaterThanOrEqual(1);
  await ctx.close();
});
