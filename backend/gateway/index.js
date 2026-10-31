import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import proxy from "express-http-proxy";
import { protect } from "./middleware/protect.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeaders.js";
import { loginLimiter } from "./middleware/loginLimiter.js";
import { createErrorHandler } from "../shared/http/errorHandler.js";

const port = process.env.PORT || 8000;
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const authService = process.env.AUTH_SERVICE || "http://localhost:8001";
const projectService = process.env.PROJECT_SERVICE || "http://localhost:8002";
const fileService = process.env.FILE_SERVICE || "http://localhost:8003";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", proxy(authService));
app.use("/api/project", protect, proxyWithHeader(projectService));
app.use("/api/file", protect, proxyWithHeader(fileService));

app.get("/api/me", protect, getCurrentUser);

app.get(["/", "/health"], (req, res) => {
  res.json({ message: "Hello from gateway" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("gateway"));

app.listen(port, () => {
  console.log(`gateway running at ${port}`);
});
