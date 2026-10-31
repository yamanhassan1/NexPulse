import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import { createErrorHandler } from "../../shared/http/errorHandler.js";
import router from "./routes/file.route.js";

const port = process.env.PORT || 8003;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => {
  res.json({ message: "Hello from File Service" });
});

app.use("/", router);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("file"));

app.listen(port, () => {
  connectDb();
  console.log(`file service running at ${port}`);
});
