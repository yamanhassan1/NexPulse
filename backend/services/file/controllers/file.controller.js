import mongoose from "mongoose";
import File from "../models/file.model.js";
import { BuildTree } from "../utils/buildTree.js";

const MAX_NAME_LENGTH = 255;

const getUserId = (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    res.status(401).json({ message: "userid is required" });
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: "Invalid user id" });
    return null;
  }
  return String(userId);
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const getExtension = (name) =>
  name.includes(".") ? name.split(".").pop().toLowerCase() : "";

const byteSize = (content) => Buffer.byteLength(content, "utf8");

const sendControllerError = (res, label, error) => {
  if (error?.code === 11000) {
    return res
      .status(409)
      .json({ message: "A file or folder with that name already exists" });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  console.error(`[${label}] ${error.message}`);
  return res.status(500).json({ message: `${label} error` });
};

const findParentFolder = async ({ projectId, parentId, userId }) => {
  if (!isValidId(parentId)) {
    return { error: "Invalid parent id" };
  }

  const parent = await File.findOne({
    _id: parentId,
    projectId,
    owner: userId,
    isDeleted: false,
  });

  if (!parent) {
    return { error: "Parent folder not found" };
  }
  if (parent.type !== "folder") {
    return { error: "Parent must be a folder" };
  }

  return { parent };
};

export const createRootFolder = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const projectId = req.body?.projectId;
    const projectName = cleanString(req.body?.projectName);

    if (!projectId || !projectName) {
      return res
        .status(400)
        .json({ message: "Project id and name is required!" });
    }
    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (projectName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: "Name is too long" });
    }

    const existingRootFolder = await File.findOne({
      projectId,
      owner: userId,
      parentId: null,
      isDeleted: false,
    });

    if (existingRootFolder) {
      return res.status(409).json({ message: "Root Folder already Exist!" });
    }

    const rootFolder = await File.create({
      owner: userId,
      name: projectName,
      projectId,
      type: "folder",
      parentId: null,
    });

    return res.status(201).json(rootFolder);
  } catch (error) {
    return sendControllerError(res, "create root folder", error);
  }
};

export const createFolder = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const projectId = req.body?.projectId;
    const name = cleanString(req.body?.name);
    const parentId = req.body?.parentId;

    if (!projectId || !name || !parentId) {
      return res
        .status(400)
        .json({ message: "Project id, parent id and name are required!" });
    }
    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: "Name is too long" });
    }

    const { error: parentError } = await findParentFolder({
      projectId,
      parentId,
      userId,
    });
    if (parentError) {
      return res.status(400).json({ message: parentError });
    }

    const exist = await File.findOne({
      projectId,
      name,
      parentId,
      isDeleted: false,
    });

    if (exist) {
      return res.status(409).json({ message: "Folder already Exist!" });
    }

    const folder = await File.create({
      owner: userId,
      name,
      projectId,
      type: "folder",
      parentId,
    });

    return res.status(201).json(folder);
  } catch (error) {
    return sendControllerError(res, "create folder", error);
  }
};

export const createFile = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const projectId = req.body?.projectId;
    const name = cleanString(req.body?.name);
    const parentId = req.body?.parentId;
    const content = req.body?.content ?? "";
    const language = cleanString(req.body?.language) || "plaintext";

    if (!projectId || !name || !parentId) {
      return res
        .status(400)
        .json({ message: "Project id, parent id and name are required!" });
    }
    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: "Name is too long" });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ message: "Content must be a string" });
    }

    const { error: parentError } = await findParentFolder({
      projectId,
      parentId,
      userId,
    });
    if (parentError) {
      return res.status(400).json({ message: parentError });
    }

    const exist = await File.findOne({
      projectId,
      name,
      parentId,
      isDeleted: false,
    });

    if (exist) {
      return res.status(409).json({ message: "File already Exist!" });
    }

    const file = await File.create({
      owner: userId,
      name,
      projectId,
      type: "file",
      language,
      content,
      extension: getExtension(name),
      size: byteSize(content),
      parentId,
    });

    return res.status(201).json(file);
  } catch (error) {
    return sendControllerError(res, "create file", error);
  }
};

export const updateFile = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const body = req.body || {};
    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasContent = Object.prototype.hasOwnProperty.call(body, "content");
    const hasLanguage = Object.prototype.hasOwnProperty.call(body, "language");

    if (!hasName && !hasContent && !hasLanguage) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    if (hasName) {
      const name = cleanString(body.name);
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ message: "Name is too long" });
      }
      file.name = name;
      if (file.type === "file") {
        file.extension = getExtension(name);
      }
    }

    if (hasContent) {
      if (typeof body.content !== "string") {
        return res.status(400).json({ message: "Content must be a string" });
      }
      file.content = body.content;
      file.size = byteSize(body.content);
    }

    if (hasLanguage) {
      const language = cleanString(body.language);
      if (!language) {
        return res.status(400).json({ message: "Language is required" });
      }
      file.language = language;
    }

    await file.save();

    return res.status(200).json(file);
  } catch (error) {
    return sendControllerError(res, "update file", error);
  }
};

export const deleteFile = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    const visited = new Set([file._id.toString()]);
    const ids = [file._id];
    let frontier = [file._id];

    while (frontier.length) {
      const children = await File.find({
        parentId: { $in: frontier },
        owner: userId,
        isDeleted: false,
      }).select("_id");

      frontier = children
        .map((child) => child._id)
        .filter((childId) => !visited.has(childId.toString()));

      frontier.forEach((childId) => visited.add(childId.toString()));
      ids.push(...frontier);
    }

    await File.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } },
    );

    return res.status(200).json({
      message: "Deleted successfully",
      deletedCount: ids.length,
    });
  } catch (error) {
    return sendControllerError(res, "delete file", error);
  }
};

export const deleteProjectFiles = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const result = await File.updateMany(
      { projectId, owner: userId, isDeleted: false },
      { $set: { isDeleted: true } },
    );

    return res.status(200).json({
      message: "Deleted successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    return sendControllerError(res, "delete project files", error);
  }
};

export const getFile = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    return res.status(200).json(file);
  } catch (error) {
    return sendControllerError(res, "get file", error);
  }
};

export const getTree = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const files = await File.find({
      projectId,
      owner: userId,
      isDeleted: false,
    })
      .select("-content")
      .sort({
        type: -1,
        name: 1,
      });

    const tree = BuildTree(files);

    return res.status(200).json(tree);
  } catch (error) {
    return sendControllerError(res, "get tree", error);
  }
};
