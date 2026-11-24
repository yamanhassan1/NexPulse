import "dotenv/config";
import express from "express";
import { connectDb, disconnectDb, isDbReady } from "./config/db.js";
import { createErrorHandler } from "../../../shared/src/http/errorHandler.js";
import {
  assertInternalSecret,
  internalAuth,
  listenHost,
} from "../../../shared/src/http/internalAuth.js";
import {
  configureServerTimeouts,
  setupGracefulShutdown,
} from "../../../shared/src/http/gracefulShutdown.js";
import { closeRedis, isRedisReady } from "../../../shared/src/redis/redis.js";
import router from "./routes/project.route.js";

const port = process.env.PORT || 8002;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

app.use((req, _res, next) => {
  req.requestId = req.get("x-request-id") || "";
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "project",
    db: isDbReady() ? "ready" : "unavailable",
    redis: isRedisReady() ? "ready" : "unavailable",
  });
});

app.get("/ready", (_req, res) => {
  const ready = isDbReady();
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    db: isDbReady() ? "ready" : "unavailable",
    redis: isRedisReady() ? "ready" : "unavailable",
  });
});

// Only the gateway may talk to this service.
app.use(internalAuth);

app.use("/", router);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("project"));

assertInternalSecret("project");

const server = app.listen(port, listenHost(), () => {
  connectDb();
  console.log(`Project service running at ${listenHost()}:${port}`);
});

configureServerTimeouts(server);
setupGracefulShutdown({
  label: "project",
  server,
  onShutdown: async () => {
    await Promise.allSettled([disconnectDb(), closeRedis()]);
  },
});
