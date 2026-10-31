import { createRequire } from "node:module";
import { cert, initializeApp } from "firebase-admin";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

export const app = initializeApp({
  credential: cert(serviceAccount),
});
