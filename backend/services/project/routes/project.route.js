import express from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  getStarredProjects,
  renameProject,
  toggleStar,
} from "../controllers/project.controller.js";

const router = express.Router();

router.post("/", createProject);
router.get("/", getProjects);
router.get("/starred", getStarredProjects);
router.patch("/star/:id", toggleStar);
router.patch("/:id/star", toggleStar);
router.patch("/:id", renameProject);
router.get("/:id", getProjectById);
router.delete("/:id", deleteProject);

export default router;
