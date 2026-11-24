import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { protect } from "./middleware/protect.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeaders.js";
import { loginLimiter } from "./middleware/loginLimiter.js";
import { heavyOpLimiter, writeLimiter } from "./middleware/writeLimiter.js";
import { csrfGuard } from "./middleware/csrfGuard.js";
import { createErrorHandler } from "../../shared/src/http/errorHandler.js";
import {
  configureServerTimeouts,
  setupGracefulShutdown,
} from "../../shared/src/http/gracefulShutdown.js";
import { closeRedis, isRedisReady } from "../../shared/src/redis/redis.js";

const port = process.env.PORT || 8000;
const allowedOrigins = (() => {
  const configured = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // "localhost" and "127.0.0.1" are the same machine; accepting both avoids a
  // confusing 403 when a developer opens the other spelling.
  const alternates = configured
    .map((origin) => {
      if (origin.includes("//localhost")) return origin.replace("//localhost", "//127.0.0.1");
      if (origin.includes("//127.0.0.1")) return origin.replace("//127.0.0.1", "//localhost");
      return null;
    })
    .filter(Boolean);

  return [...new Set([...configured, ...alternates])];
})();
const authService = process.env.AUTH_SERVICE || "http://localhost:8001";
const projectService = process.env.PROJECT_SERVICE || "http://localhost:8002";
const fileService = process.env.FILE_SERVICE || "http://localhost:8003";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const incomingId = req.get("x-request-id");
  const requestId =
    incomingId && /^[A-Za-z0-9_-]{8,64}$/.test(incomingId)
      ? incomingId
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(csrfGuard({ allowedOrigins }));

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", express.json({ limit: "16kb" }), proxyWithHeader(authService));
app.use(
  "/api/project",
  protect,
  writeLimiter,
  express.json({ limit: "64kb" }),
  proxyWithHeader(projectService),
);
app.use("/api/file/export", protect, heavyOpLimiter);
app.use("/api/file/import", protect, heavyOpLimiter);
app.use(
  "/api/file",
  protect,
  writeLimiter,
  express.json({ limit: "25mb" }),
  proxyWithHeader(fileService, { timeoutMs: 60000 }),
);

app.get("/api/me", protect, getCurrentUser);

app.get(["/", "/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "gateway",
    redis: isRedisReady() ? "ready" : "unavailable",
  });
});

app.get("/ready", (req, res) => {
  if (!isRedisReady()) {
    return res.status(503).json({ status: "not_ready", redis: "unavailable" });
  }
  return res.json({ status: "ready", redis: "ready" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("gateway"));

const server = app.listen(port, () => {
  console.log(`gateway running at ${port}`);
});

configureServerTimeouts(server, { requestTimeoutMs: 65000 });
setupGracefulShutdown({
  label: "gateway",
  server,
  onShutdown: closeRedis,
});
