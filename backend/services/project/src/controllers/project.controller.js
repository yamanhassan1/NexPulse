import redis from "../../../../shared/src/redis/redis.js";
import {
  getUserId,
  isValidObjectId,
  sanitizeNodeName,
  sendControllerError,
} from "../../../../shared/src/http/controllerHelpers.js";
import Project from "../models/project.model.js";
import {
  createProjectRootFolder,
  deleteProjectFiles,
  renameProjectRootFolder,
} from "../utils/fileClient.js";

const CACHE_TTL_SECONDS = 5 * 60;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

const projectsKey = (userId) => `projects-${userId}`;
const starredKey = (userId) => `starred-projects-${userId}`;

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

export const createProject = async (req, res) => {
  let project = null;
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const { name, error: nameError } = sanitizeNodeName(req.body?.name, MAX_NAME_LENGTH);
    if (nameError) {
      return res.status(400).json({ message: nameError === "Name is required" ? "Project name is required" : nameError });
    }

    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ message: "Description is too long" });
    }

    project = await Project.create({
      owner: userId,
      name,
      description,
    });

    await createProjectRootFolder({
      userId,
      projectId: project._id.toString(),
      projectName: project.name,
      requestId: req.requestId,
    });

    await invalidateProjectCaches(userId);
    return res.status(201).json(project);
  } catch (error) {
    if (error?.code === "ROOT_FOLDER_SETUP_FAILED") {
      if (project?._id) {
        await Project.deleteOne({ _id: project._id, owner: userId }).catch(() => {});
        await invalidateProjectCaches(userId).catch(() => {});
      }
      console.error(`[create project] ${error.message}`);
      return res.status(503).json({
        message: "Project file setup unavailable. Try again shortly.",
      });
    }
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

    const projects = await Project.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .lean();

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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: { lastOpenedAt: new Date() } },
      { returnDocument: "after", timestamps: false },
    ).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await invalidateProjectCaches(userId);

    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "get project by id", error);
  }
};

export const renameProject = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const { name, error: nameError } = sanitizeNodeName(req.body?.name, MAX_NAME_LENGTH);
    if (nameError) {
      return res.status(400).json({ message: nameError === "Name is required" ? "Project name is required" : nameError });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: { name } },
      { returnDocument: "after" },
    ).lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // The file tree's root folder carries the project name; keep them in step.
    try {
      await renameProjectRootFolder({
        userId,
        projectId: id,
        name,
        requestId: req.requestId,
      });
    } catch (error) {
      console.error(`[rename project] ${error.message}`);
      return res.status(502).json({
        message: "Project renamed, but the file tree could not be renamed.",
      });
    }
    await invalidateProjectCaches(userId);

    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "rename project", error);
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
    })
      .sort({ updatedAt: -1 })
      .lean();

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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: userId },
      [{ $set: { starred: { $cond: ["$starred", false, true] } } }],
      { returnDocument: "after", updatePipeline: true },
    ).lean();
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const project = await Project.findOne({ _id: id, owner: userId }).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    try {
      await deleteProjectFiles({
        userId,
        projectId: id,
        requestId: req.requestId,
      });
    } catch (error) {
      console.error(`[project delete] ${error.message}`);
      return res.status(503).json({
        message: "Project files could not be deleted. The project was kept.",
      });
    }

    await Project.deleteOne({ _id: id, owner: userId });

    await invalidateProjectCaches(userId);
    return res.status(200).json(project);
  } catch (error) {
    return sendControllerError(res, "project delete", error);
  }
};
