import { spawn } from "node:child_process";
import path from "node:path";

const BACKEND_DIR = import.meta.dirname;

const SERVICES = [
  { name: "auth", dir: path.join(BACKEND_DIR, "services", "auth"), readyUrl: "http://127.0.0.1:8001/ready" },
  { name: "file", dir: path.join(BACKEND_DIR, "services", "file"), readyUrl: "http://127.0.0.1:8003/ready" },
  { name: "project", dir: path.join(BACKEND_DIR, "services", "project"), readyUrl: "http://127.0.0.1:8002/ready" },
];

const GATEWAY = {
  name: "gateway",
  dir: path.join(BACKEND_DIR, "gateway"),
  readyUrl: "http://127.0.0.1:8000/ready",
};

const children = [];

function launch({ name, dir }) {
  const child = spawn(process.execPath, ["src/index.js"], {
    cwd: dir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line) console.log(`[${name}] ${line}`);
    }
  });
  child.stderr.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line) console.error(`[${name}] ${line}`);
    }
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  children.push(child);
  return child;
}

async function waitReady(url, label, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* waiting for service boot */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${label} did not become ready at ${url} within ${timeoutMs}ms`);
}

function shutdownAll() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdownAll);
process.on("SIGTERM", shutdownAll);

async function main() {
  for (const svc of SERVICES) launch(svc);
  await Promise.all(SERVICES.map((svc) => waitReady(svc.readyUrl, svc.name)));

  launch(GATEWAY);
  await waitReady(GATEWAY.readyUrl, GATEWAY.name);
  console.log("[start-all] All NexPulse backend services are ready (gateway:8000, auth:8001, project:8002, file:8003).");
}

main().catch((error) => {
  console.error(`[start-all] Startup failed: ${error.message}`);
  shutdownAll();
});
