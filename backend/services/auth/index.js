import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { connectDb } from "./config/db.js";
import { createErrorHandler } from "../../shared/http/errorHandler.js";
import {
  assertInternalSecret,
  internalAuth,
  listenHost,
} from "../../shared/http/internalAuth.js";
import router from "./routes/auth.route.js";

const port = process.env.PORT || 8001;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

// Only the gateway may talk to this service.
app.use(internalAuth);

app.use("/", router);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("auth"));

assertInternalSecret("auth");

app.listen(port, listenHost(), () => {
  connectDb();
  console.log(`Auth running at ${listenHost()}:${port}`);
});
