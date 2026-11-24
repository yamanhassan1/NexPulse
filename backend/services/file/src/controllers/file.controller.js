import mongoose from "mongoose";
import crypto from "node:crypto";
import File from "../models/file.model.js";
import { BuildTree } from "../utils/buildTree.js";
import {
  getUserId,
  isValidObjectId,
  sanitizeNodeName,
  sendControllerError as sendSharedControllerError,
} from "../../../../shared/src/http/controllerHelpers.js";

const MAX_NAME_LENGTH = 255;
const MAX_TREE_DEPTH = 100;

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const getExtension = (name) =>
  name.includes(".") ? name.split(".").pop().toLowerCase() : "";

// `content` holds base64 for binaries, so the stored size must be the decoded
// length — otherwise a 1 MB image would be reported as 1.33 MB.
const storedSize = (content, encoding) =>
  encoding === "base64"
    ? Buffer.byteLength(content || "", "base64")
    : Buffer.byteLength(content || "", "utf8");

const normaliseEncoding = (value) => (value === "base64" ? "base64" : "utf8");

/** Total stored bytes for one user. Only called when a quota is configured. */
const usedBytes = async (userId) => {
  const [row] = await File.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(userId)),
        isDeleted: false,
        type: "file",
      },
    },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);

  return row?.total ?? 0;
};

// Serialize quota-checked writes per user within the service process so
// concurrent create/import/update requests cannot bypass STORAGE_QUOTA_BYTES.
const userQuotaLocks = new Map();
const withUserQuotaLock = async (userId, fn) => {
  const key = String(userId);
  const prev = userQuotaLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const chain = prev.then(() => gate);
  userQuotaLocks.set(key, chain);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (userQuotaLocks.get(key) === chain) {
      userQuotaLocks.delete(key);
    }
  }
};

const sendControllerError = (res, label, error) => {
  if (error?.code === 11000) {
    return res
      .status(409)
      .json({ message: "A file or folder with that name already exists" });
  }
  return sendSharedControllerError(res, label, error);
};

const findParentFolder = async ({ projectId, parentId, userId }) => {
  if (!isValidObjectId(parentId)) {
    return { error: "Invalid parent id" };
  }

  const parent = await File.findOne({
    _id: parentId,
    projectId,
    owner: userId,
    isDeleted: false,
  })
    .select("_id projectId type")
    .lean();

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
    const { name: projectName, error: nameError } = sanitizeNodeName(
      req.body?.projectName,
      MAX_NAME_LENGTH,
    );

    if (!projectId || nameError === "Name is required" || nameError === "Name must be a string") {
      return res
        .status(400)
        .json({ message: "Project id and name is required!" });
    }
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    const existingRootFolder = await File.findOne({
      projectId,
      owner: userId,
      parentId: null,
      isDeleted: false,
    })
      .select("_id")
      .lean();

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
    const parentId = req.body?.parentId;
    const { name, error: nameError } = sanitizeNodeName(req.body?.name, MAX_NAME_LENGTH);

    if (!projectId || !parentId || nameError === "Name is required" || nameError === "Name must be a string") {
      return res
        .status(400)
        .json({ message: "Project id, parent id and name are required!" });
    }
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (nameError) {
      return res.status(400).json({ message: nameError });
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
    })
      .select("_id")
      .lean();

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
    const parentId = req.body?.parentId;
    const { name, error: nameError } = sanitizeNodeName(req.body?.name, MAX_NAME_LENGTH);
    const content = req.body?.content ?? "";
    const language = cleanString(req.body?.language) || "plaintext";
    const encoding = normaliseEncoding(req.body?.encoding);
    const contentType = cleanString(req.body?.contentType).slice(0, 120);

    if (!projectId || !parentId || nameError === "Name is required" || nameError === "Name must be a string") {
      return res
        .status(400)
        .json({ message: "Project id, parent id and name are required!" });
    }
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (nameError) {
      return res.status(400).json({ message: nameError });
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
    })
      .select("_id")
      .lean();

    if (exist) {
      return res.status(409).json({ message: "File already Exist!" });
    }

    const size = storedSize(content, encoding);
    const quota = Number(process.env.STORAGE_QUOTA_BYTES || 0);
    if (quota > 0) {
      const used = await usedBytes(userId);
      if (used + size > quota) {
        return res.status(413).json({ message: "Storage quota exceeded" });
      }
    }

    const file = await File.create({
      owner: userId,
      name,
      projectId,
      type: "file",
      language,
      content,
      encoding,
      contentType,
      extension: getExtension(name),
      size,
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
    if (!isValidObjectId(id)) {
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
      if (!file.parentId) {
        return res.status(400).json({ message: "The project root cannot be renamed here" });
      }
      const { name, error: nameError } = sanitizeNodeName(body.name, MAX_NAME_LENGTH);
      if (nameError) {
        return res.status(400).json({ message: nameError });
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
      const nextSize = storedSize(body.content, file.encoding);
      const quota = Number(process.env.STORAGE_QUOTA_BYTES || 0);
      if (quota > 0 && nextSize > (file.size || 0)) {
        const used = await usedBytes(userId);
        if (used - (file.size || 0) + nextSize > quota) {
          return res.status(413).json({ message: "Storage quota exceeded" });
        }
      }
      file.content = body.content;
      file.size = nextSize;
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
    })
      .select("_id parentId")
      .lean();

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    if (!file.parentId) {
      return res.status(400).json({ message: "The project root cannot be deleted directly" });
    }

    const visited = new Set([file._id.toString()]);
    const ids = [file._id];
    let frontier = [file._id];
    let depth = 0;

    while (frontier.length && depth < MAX_TREE_DEPTH) {
      depth += 1;
      const children = await File.find({
        parentId: { $in: frontier },
        owner: userId,
        isDeleted: false,
      })
        .select("_id")
        .lean();

      frontier = children
        .map((child) => child._id)
        .filter((childId) => !visited.has(childId.toString()));

      frontier.forEach((childId) => visited.add(childId.toString()));
      ids.push(...frontier);
    }

    const deletedBatch = crypto.randomUUID();

    await File.updateMany(
      { _id: { $in: ids }, owner: userId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBatch } },
    );

    return res.status(200).json({
      message: "Deleted successfully",
      deletedCount: ids.length,
      batchId: deletedBatch,
    });
  } catch (error) {
    return sendControllerError(res, "delete file", error);
  }
};

export const restoreDeleted = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { batchId } = req.params;
    if (typeof batchId !== "string" || batchId.length < 8 || batchId.length > 64) {
      return res.status(400).json({ message: "Invalid restore id" });
    }

    const result = await File.updateMany(
      { owner: userId, isDeleted: true, deletedBatch: batchId },
      {
        $set: { isDeleted: false, deletedAt: null },
        $unset: { deletedBatch: "" },
      },
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Nothing to restore" });
    }

    return res.status(200).json({
      message: "Restored successfully",
      restoredCount: result.modifiedCount,
    });
  } catch (error) {
    // A replacement with the same name may have been created while the
    // original was in the bin; the unique index rejects the restore.
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "A file or folder with that name already exists" });
    }
    return sendControllerError(res, "restore file", error);
  }
};

export const deleteProjectFiles = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const result = await File.updateMany(
      { projectId, owner: userId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    return res.status(200).json(file);
  } catch (error) {
    return sendControllerError(res, "get file", error);
  }
};

export const getRawFile = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const file = await File.findOne({
      _id: id,
      owner: userId,
      isDeleted: false,
      type: "file",
    })
      .select("content encoding contentType name")
      .lean();

    if (!file) {
      return res.status(404).json({ message: "File not found!" });
    }

    const buffer =
      file.encoding === "base64"
        ? Buffer.from(file.content || "", "base64")
        : Buffer.from(file.content || "", "utf8");

    const declaredType = file.contentType || "application/octet-stream";

    // Only raster images may render inline. Anything else — notably an uploaded
    // .html or .svg — is forced to a download, so a file in the project can
    // never execute script on this origin.
    const inlineSafe = /^image\/(png|jpe?g|gif|webp|avif|bmp|x-icon)$/i.test(declaredType);
    const safeName = String(file.name || "download")
      .replace(/["\\\r\n]/g, "_")
      .slice(0, 120);

    res.setHeader("Content-Type", inlineSafe ? declaredType : "application/octet-stream");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader(
      "Content-Disposition",
      inlineSafe ? "inline" : `attachment; filename="${safeName}"`,
    );
    // A sandboxed document has no origin, no scripts and no forms.
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(buffer);
  } catch (error) {
    return sendControllerError(res, "get raw file", error);
  }
};

const EXPORT_MAX_FILES = 2000;
const EXPORT_MAX_TOTAL_BYTES = 32 * 1024 * 1024;

/**
 * Everything needed to rebuild the project elsewhere: the tree as paths, plus
 * each file's content and how to decode it.
 */
export const exportProject = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const nodes = await File.find({ projectId, owner: userId, isDeleted: false })
      .select("name type parentId content encoding contentType size")
      .lean();

    if (!nodes.length) {
      return res.status(404).json({ message: "This project has no files" });
    }
    if (nodes.length > EXPORT_MAX_FILES) {
      return res.status(413).json({ message: "Project is too large to export" });
    }

    const byId = new Map(nodes.map((node) => [String(node._id), node]));
    const root = nodes.find((node) => !node.parentId);

    const pathOf = (node) => {
      const parts = [node.name];
      const seen = new Set([String(node._id)]);
      let current = node;

      while (current.parentId) {
        const parent = byId.get(String(current.parentId));
        if (!parent || seen.has(String(parent._id))) break;
        seen.add(String(parent._id));
        parts.unshift(parent.name);
        current = parent;
      }

      return parts.join("/");
    };

    let total = 0;
    const files = [];

    for (const node of nodes) {
      if (node.type !== "file") continue;

      total += node.size || 0;
      if (total > EXPORT_MAX_TOTAL_BYTES) {
        return res.status(413).json({ message: "Project is too large to export" });
      }

      files.push({
        path: pathOf(node),
        content: node.content ?? "",
        encoding: node.encoding ?? "utf8",
        contentType: node.contentType ?? "",
        size: node.size ?? 0,
      });
    }

    return res.status(200).json({ project: root?.name ?? "project", files });
  } catch (error) {
    return sendControllerError(res, "export project", error);
  }
};

export const getTree = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    if (!isValidObjectId(projectId)) {
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
      })
      .lean();

    const tree = BuildTree(files);

    return res.status(200).json(tree);
  } catch (error) {
    return sendControllerError(res, "get tree", error);
  }
};

export const renameProjectRoot = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    const { name, error: nameError } = sanitizeNodeName(req.body?.name, MAX_NAME_LENGTH);

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    const root = await File.findOneAndUpdate(
      {
        projectId,
        owner: userId,
        parentId: null,
        type: "folder",
        isDeleted: false,
      },
      { $set: { name } },
      { returnDocument: "after" },
    ).lean();

    if (!root) {
      return res.status(404).json({ message: "Root folder not found" });
    }

    return res.status(200).json(root);
  } catch (error) {
    return sendControllerError(res, "rename root folder", error);
  }
};

const IMPORT_MAX_FILES = 400;
const IMPORT_MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const IMPORT_MAX_FILE_BYTES = 6 * 1024 * 1024;
const IMPORT_MAX_DEPTH = 12;

const splitExtension = (name) => {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { base: name, extension: "" };
  return { base: name.slice(0, dot), extension: name.slice(dot) };
};

const uniqueNameInFolder = async ({ projectId, parentId, userId, name }) => {
  const { base, extension } = splitExtension(name);

  for (let attempt = 1; attempt < 50; attempt += 1) {
    const candidate = attempt === 1 ? `${base} copy${extension}` : `${base} copy ${attempt}${extension}`;
    const exists = await File.findOne({
      projectId,
      parentId,
      owner: userId,
      name: candidate,
      isDeleted: false,
    })
      .select("_id")
      .lean();
    if (!exists) return candidate;
  }

  return `${base} copy ${Date.now()}${extension}`;
};

const collectSubtree = async ({ rootId, userId }) => {
  const nodes = [];
  const seen = new Set();
  let frontier = [rootId];
  let depth = 0;

  while (frontier.length && depth < MAX_TREE_DEPTH) {
    depth += 1;
    const batch = await File.find({
      _id: { $in: frontier },
      owner: userId,
      isDeleted: false,
    }).lean();
    nodes.push(...batch);

    const ids = batch
      .map((node) => node._id)
      .filter((id) => {
        const key = String(id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!ids.length) break;

    const children = await File.find({
      parentId: { $in: ids },
      owner: userId,
      isDeleted: false,
    })
      .select("_id")
      .lean();

    frontier = children.map((child) => child._id).filter((id) => !seen.has(String(id)));
  }

  return nodes;
};

const findFolder = ({ id, userId }) =>
  File.findOne({ _id: id, owner: userId, isDeleted: false, type: "folder" })
    .select("_id projectId parentId type")
    .lean();

export const moveNode = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id, parentId } = req.body || {};
    if (!isValidObjectId(id) || !isValidObjectId(parentId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const node = await File.findOne({ _id: id, owner: userId, isDeleted: false }).lean();
    if (!node) return res.status(404).json({ message: "File not found!" });

    if (!node.parentId) {
      return res.status(400).json({ message: "The project root cannot be moved" });
    }

    const parent = await findFolder({ id: parentId, userId });
    if (!parent) return res.status(404).json({ message: "Target folder not found" });

    if (String(parent.projectId) !== String(node.projectId)) {
      return res.status(400).json({ message: "Cannot move between projects" });
    }

    if (String(node.parentId) === String(parentId)) {
      return res.status(200).json(node);
    }

    // Fetch all project folders once to check for ancestor cycles without N+1 queries.
    if (node.type === "folder") {
      const folders = await File.find({
        projectId: node.projectId,
        owner: userId,
        type: "folder",
        isDeleted: false,
      })
        .select("_id parentId")
        .lean();
      const parentById = new Map(
        folders.map((folder) => [String(folder._id), folder.parentId ? String(folder.parentId) : null]),
      );

      let cursorId = String(parent._id);
      const visited = new Set();
      while (cursorId && !visited.has(cursorId)) {
        if (cursorId === String(node._id)) {
          return res.status(400).json({ message: "Cannot move a folder into itself" });
        }
        visited.add(cursorId);
        cursorId = parentById.get(cursorId) ?? null;
      }
    }

    const conflict = await File.findOne({
      projectId: node.projectId,
      parentId,
      name: node.name,
      isDeleted: false,
      _id: { $ne: node._id },
    })
      .select("_id")
      .lean();
    if (conflict) {
      return res.status(409).json({ message: "An item with that name already exists there" });
    }

    const updated = await File.findOneAndUpdate(
      { _id: node._id, owner: userId, isDeleted: false },
      { $set: { parentId } },
      { returnDocument: "after" },
    ).lean();

    return res.status(200).json(updated);
  } catch (error) {
    return sendControllerError(res, "move file", error);
  }
};

export const copyNode = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id, parentId } = req.body || {};
    if (!isValidObjectId(id) || !isValidObjectId(parentId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const source = await File.findOne({ _id: id, owner: userId, isDeleted: false }).lean();
    if (!source) return res.status(404).json({ message: "File not found!" });

    const parent = await findFolder({ id: parentId, userId });
    if (!parent) return res.status(404).json({ message: "Target folder not found" });

    if (String(parent.projectId) !== String(source.projectId)) {
      return res.status(400).json({ message: "Cannot copy between projects" });
    }

    const subtree = await collectSubtree({ rootId: source._id, userId });
    const childrenOf = new Map();
    subtree.forEach((node) => {
      if (!node.parentId) return;
      const key = String(node.parentId);
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key).push(node);
    });

    const rootName = await uniqueNameInFolder({
      projectId: source.projectId,
      parentId,
      userId,
      name: source.name,
    });

    const docs = [];
    const queue = [{ node: source, parentId: parent._id, name: rootName }];
    let head = 0;
    let rootCopyId = null;

    while (head < queue.length) {
      const item = queue[head++];
      const _id = new mongoose.Types.ObjectId();
      if (!rootCopyId) rootCopyId = _id;

      docs.push({
        _id,
        owner: userId,
        projectId: item.node.projectId,
        parentId: item.parentId,
        name: item.name,
        type: item.node.type,
        extension: item.node.type === "file" ? getExtension(item.name) : "",
        language: item.node.language,
        content: item.node.type === "file" ? item.node.content : "",
        encoding: item.node.encoding,
        contentType: item.node.contentType,
        size: item.node.type === "file" ? item.node.size : 0,
      });

      const children = childrenOf.get(String(item.node._id)) || [];
      for (const child of children) {
        queue.push({ node: child, parentId: _id, name: child.name });
      }
    }

    await File.insertMany(docs, { ordered: true });

    const rootCopy = docs.find((doc) => doc._id === rootCopyId);

    return res.status(201).json({ root: rootCopy, createdCount: docs.length });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A file with that name already exists" });
    }
    return sendControllerError(res, "copy file", error);
  }
};

const normaliseImportPath = (value) => {
  if (typeof value !== "string") return null;

  const parts = value.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!parts.length || parts.length > IMPORT_MAX_DEPTH) return null;

  const clean = [];
  for (const part of parts) {
    const { name, error } = sanitizeNodeName(part, MAX_NAME_LENGTH);
    if (error) return null;
    clean.push(name);
  }
  return clean;
};

export const importFiles = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const projectId = req.body?.projectId;
    const requestedParentId = req.body?.parentId;
    const files = req.body?.files;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (requestedParentId && !isValidObjectId(requestedParentId)) {
      return res.status(400).json({ message: "Invalid parent id" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "No files to import" });
    }
    if (files.length > IMPORT_MAX_FILES) {
      return res.status(400).json({ message: `Too many files (max ${IMPORT_MAX_FILES})` });
    }

    const parent = requestedParentId
      ? await findFolder({ id: requestedParentId, userId })
      : await File.findOne({ projectId, owner: userId, parentId: null, isDeleted: false })
          .select("_id projectId type")
          .lean();

    if (!parent) return res.status(404).json({ message: "Root folder not found" });
    if (parent.type !== "folder") {
      return res.status(400).json({ message: "Target must be a folder" });
    }
    if (String(parent.projectId) !== String(projectId)) {
      return res.status(400).json({ message: "Target folder belongs to another project" });
    }

    let totalBytes = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Phase 1: validate every entry and enforce size/quota BEFORE writing any folders.
    const validated = [];

    for (const entry of files) {
      const segments = normaliseImportPath(entry?.path);
      const content = typeof entry?.content === "string" ? entry.content : null;

      if (!segments || content === null) {
        skipped += 1;
        continue;
      }

      const encoding = normaliseEncoding(entry?.encoding);
      const contentType = cleanString(entry?.contentType).slice(0, 120);
      const size = storedSize(content, encoding);

      if (size > IMPORT_MAX_FILE_BYTES) {
        skipped += 1;
        continue;
      }

      totalBytes += size;
      if (totalBytes > IMPORT_MAX_TOTAL_BYTES) {
        return res.status(413).json({ message: "Import is too large" });
      }

      validated.push({
        folderSegments: segments.slice(0, -1),
        name: segments[segments.length - 1],
        content,
        encoding,
        contentType,
        size,
      });
    }

    if (validated.length) {
      const quotaResult = await withUserQuotaLock(userId, async () => {
        const quota = Number(process.env.STORAGE_QUOTA_BYTES || 0);
        if (quota > 0) {
          const used = await usedBytes(userId);
          if (used + totalBytes > quota) {
            return { exceeded: true };
          }
        }

        // Cache folder lookups per normalised path so a large import stays O(n).
        const folderCache = new Map();

        const ensureFolder = async (parentId, segments) => {
          let currentId = parentId;
          let currentPath = "";

          for (const segment of segments) {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            const cacheKey = `${String(currentId)}::${segment}`;
            const cached = folderCache.get(cacheKey);
            if (cached) {
              currentId = cached;
              continue;
            }

            let folder = await File.findOne({
              projectId,
              owner: userId,
              parentId: currentId,
              name: segment,
              isDeleted: false,
            })
              .select("_id type")
              .lean();

            if (folder && folder.type !== "folder") {
              throw Object.assign(new Error(`${currentPath} is a file`), { status: 409 });
            }

            if (!folder) {
              const createdFolder = await File.create({
                owner: userId,
                projectId,
                parentId: currentId,
                name: segment,
                type: "folder",
              });
              folder = { _id: createdFolder._id };
              created += 1;
            }

            folderCache.set(cacheKey, folder._id);
            currentId = folder._id;
          }

          return currentId;
        };

        const planned = [];
        for (const item of validated) {
          const targetParentId = await ensureFolder(parent._id, item.folderSegments);
          planned.push({
            parentId: targetParentId,
            name: item.name,
            content: item.content,
            encoding: item.encoding,
            contentType: item.contentType,
            size: item.size,
          });
        }

        const parentIds = [...new Set(planned.map((item) => String(item.parentId)))];
        const existing = await File.find({
          projectId,
          owner: userId,
          parentId: { $in: parentIds },
          isDeleted: false,
        })
          .select("_id parentId name type")
          .lean();

        const byKey = new Map(
          existing.map((doc) => [`${String(doc.parentId)}::${doc.name}`, doc]),
        );

        const inserts = [];
        const updates = [];

        for (const item of planned) {
          const current = byKey.get(`${String(item.parentId)}::${item.name}`);

          if (current && current.type !== "file") {
            skipped += 1;
            continue;
          }

          if (current) {
            updates.push({
              updateOne: {
                filter: { _id: current._id },
                update: {
                  $set: {
                    content: item.content,
                    size: item.size,
                    encoding: item.encoding,
                    contentType: item.contentType,
                    extension: getExtension(item.name),
                  },
                },
              },
            });
          } else {
            inserts.push({
              owner: userId,
              projectId,
              parentId: item.parentId,
              name: item.name,
              type: "file",
              extension: getExtension(item.name),
              content: item.content,
              encoding: item.encoding,
              contentType: item.contentType,
              size: item.size,
            });
          }
        }

        if (inserts.length) await File.insertMany(inserts, { ordered: false });
        if (updates.length) await File.bulkWrite(updates, { ordered: false });

        created += inserts.length;
        updated += updates.length;
        return { exceeded: false };
      });

      if (quotaResult?.exceeded) {
        return res.status(413).json({ message: "Storage quota exceeded" });
      }
    }

    return res.status(200).json({ created, updated, skipped });
  } catch (error) {
    if (error?.status === 409) {
      return res.status(409).json({ message: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A file with that name already exists" });
    }
    return sendControllerError(res, "import files", error);
  }
};
