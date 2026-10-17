import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import router from "./routes/auth.route.js";

const port = process.env.PORT || 8001;

const app = express();
app.use(express.json());

app.use("/", router);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.listen(port, () => {
  connectDb();
  console.log(`Auth running at ${port}`);
});
