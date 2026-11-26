import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5179",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: "off",
  },
});
