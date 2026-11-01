import express from "express";
import {
  copyNode,
  createFile,
  createFolder,
  createRootFolder,
  deleteFile,
  deleteProjectFiles,
  getFile,
  getRawFile,
  getTree,
  importFiles,
  moveNode,
  renameProjectRoot,
  restoreDeleted,
  updateFile,
} from "../controllers/file.controller.js";

const router = express.Router();

router.post("/create-root-folder", createRootFolder);
router.post("/create-folder", createFolder);
router.post("/create-file", createFile);
router.post("/import", importFiles);
router.post("/copy", copyNode);
router.patch("/move", moveNode);
router.patch("/restore/:batchId", restoreDeleted);
router.patch("/project-root/:projectId", renameProjectRoot);
router.patch("/update/:id", updateFile);
router.delete("/project/:projectId", deleteProjectFiles);
router.delete("/:id", deleteFile);
router.get("/tree/:projectId", getTree);
router.get("/:id/raw", getRawFile);
router.get("/:id", getFile);

export default router;
