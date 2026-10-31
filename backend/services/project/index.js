import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import { createErrorHandler } from "../../shared/http/errorHandler.js";
import router from "./routes/project.route.js";

const port = process.env.PORT || 8002;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/health", (req, res) => {
  res.json({ message: "Hello from Project Service" });
});

app.use("/", router);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(createErrorHandler("project"));

app.listen(port, () => {
  connectDb();
  console.log(`Project service running at ${port}`);
});
