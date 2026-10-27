import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { connectDb } from "./config/db.js";
import router from "./routes/auth.route.js";

const port = process.env.PORT || 8001;

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.use("/", router);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(`[auth] ${err.message}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  connectDb();
  console.log(`Auth running at ${port}`);
});
