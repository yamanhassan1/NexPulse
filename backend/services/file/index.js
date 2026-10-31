import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import router from "./routes/file.route.js";

const port = process.env.PORT || 8003;

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "Hello from File Service" });
});

app.use("/", router);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(`[file] ${err.message}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  connectDb();
  console.log(`file service running at ${port}`);
});
