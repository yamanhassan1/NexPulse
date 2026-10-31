import mongoose from "mongoose";
import redis from "../../../shared/redis/redis.js";
import Project from "../models/project.model.js";
import {
  createProjectRootFolder,
  deleteProjectFiles,
} from "../utils/fileClient.js";

const CACHE_TTL_SECONDS = 5 * 60;

const projectsKey = (userId) => `projects-${userId}`;
const starredKey = (userId) => `starred-projects-${userId}`;

const getUserId = (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    res.status(401).json({ message: "userid is required" });
    return null;
  }
  return String(userId);
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const cacheGet = async (key) => {
  try {
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    console.warn(`[redis] get failed: ${error.message}`);
    return null;
  }
};

const cacheSet = async (key, value) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
  } catch (error) {
    console.warn(`[redis] set failed: ${error.message}`);
  }
};

const cacheDel = async (...keys) => {
  try {
    if (keys.length) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn(`[redis] del failed: ${error.message}`);
  }
};

const invalidateProjectCaches = (userId) =>
  cacheDel(projectsKey(userId), starredKey(userId));

const sendControllerError = (res, label, error) => {
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  console.error(`[${label}] ${error.message}`);
  return res.status(500).json({ message: `${label} error` });
};

export const createProject = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      owner: userId,
      name,
      description,
    });

    await createProjectRootFolder({
      userId,
      projectId: project._id.toString(),
      projectName: project.name,
    });

    await invalidateProjectCaches(userId);
    return res.status(201).json(project);
  } catch (error) {
    return sendControllerError(res, "create project", error);
  }
};

export const getProjects = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const cached = await cacheGet(projectsKey(userId));
    if (cached) {
      return res.status(200).json(cached);
    }

    const projects = await Project.find({ owner: userId }).sort({
      updatedAt: -1,
    });

    await cacheSet(projectsKey(userId), projects);
    return res.status(200).json(projects);
  } catch (error) {
    return sendControllerError(res, "get projects", error);
  }
};

export const getProjectById = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: { lastOpenedAt: new Date() } },
      { new: true, timestamps: false },
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await invalidateProjectCaches(userId);

    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "get project by id", error);
  }
};

export const getStarredProjects = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const cached = await cacheGet(starredKey(userId));
    if (cached) {
      return res.status(200).json(cached);
    }

    const projects = await Project.find({
      owner: userId,
      starred: true,
    }).sort({ updatedAt: -1 });

    await cacheSet(starredKey(userId), projects);
    return res.status(200).json(projects);
  } catch (error) {
    return sendControllerError(res, "get starred projects", error);
  }
};

export const toggleStar = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: userId },
      [{ $set: { starred: { $cond: ["$starred", false, true] } } }],
      { new: true },
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await invalidateProjectCaches(userId);

    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "toggle star", error);
  }
};

export const deleteProject = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOneAndDelete({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await deleteProjectFiles({ userId, projectId: id });

    await invalidateProjectCaches(userId);
    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "project delete", error);
  }
};
