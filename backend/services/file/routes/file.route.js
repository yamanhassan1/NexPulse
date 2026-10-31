import express from "express";
import {
  createFile,
  createFolder,
  createRootFolder,
  deleteFile,
  deleteProjectFiles,
  getFile,
  getTree,
  updateFile,
} from "../controllers/file.controller.js";

const router = express.Router();

router.post("/create-root-folder", createRootFolder);
router.post("/create-folder", createFolder);
router.post("/create-file", createFile);
router.patch("/update/:id", updateFile);
router.delete("/project/:projectId", deleteProjectFiles);
router.delete("/:id", deleteFile);
router.get("/tree/:projectId", getTree);
router.get("/:id", getFile);

export default router;
