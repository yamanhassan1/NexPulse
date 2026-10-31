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

const port = process.env.PORT || 8000;
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const authService = process.env.AUTH_SERVICE || "http://localhost:8001";
const projectService = process.env.PROJECT_SERVICE || "http://localhost:8002";
const fileService = process.env.FILE_SERVICE || "http://localhost:8003";

const app = express();

app.set("trust proxy", 1);

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

app.use((err, req, res, next) => {
  console.error(`[gateway] ${err.message}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`gateway running at ${port}`);
});
