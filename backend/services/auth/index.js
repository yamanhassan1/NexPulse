import express from "express";
import dotenv from "dotenv";

dotenv.config();
const port = process.env.PORT || 8001;

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});

app.listen(port, () => {
  console.log(`Auth running at ${port}`);
});
