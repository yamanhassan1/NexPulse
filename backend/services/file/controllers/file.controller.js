import mongoose from "mongoose";
import crypto from "node:crypto";
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
    const encoding = normaliseEncoding(req.body?.encoding);
    const contentType = cleanString(req.body?.contentType).slice(0, 120);

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
      encoding,
      contentType,
      extension: getExtension(name),
      size: storedSize(content, encoding),
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
      file.size = storedSize(body.content, file.encoding);
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

    const deletedBatch = crypto.randomUUID();

    await File.updateMany(
      { _id: { $in: ids } },
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
    if (!isValidId(projectId)) {
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

export const getRawFile = async (req, res) => {
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
      type: "file",
    }).select("content encoding contentType name");

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

export const renameProjectRoot = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { projectId } = req.params;
    const name = cleanString(req.body?.name);

    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: "Name is too long" });
    }

    const root = await File.findOne({
      projectId,
      owner: userId,
      parentId: null,
      type: "folder",
      isDeleted: false,
    });

    if (!root) {
      return res.status(404).json({ message: "Root folder not found" });
    }

    root.name = name;
    await root.save();

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
      name: candidate,
      isDeleted: false,
    });
    if (!exists) return candidate;
  }

  return `${base} copy ${Date.now()}${extension}`;
};

const collectSubtree = async ({ rootId, userId }) => {
  const nodes = [];
  let frontier = [rootId];

  while (frontier.length) {
    const batch = await File.find({
      _id: { $in: frontier },
      owner: userId,
      isDeleted: false,
    });
    nodes.push(...batch);

    const ids = batch.map((node) => node._id);
    if (!ids.length) break;

    const children = await File.find({
      parentId: { $in: ids },
      owner: userId,
      isDeleted: false,
    }).select("_id");

    frontier = children.map((child) => child._id);
  }

  return nodes;
};

const findFolder = ({ id, userId }) =>
  File.findOne({ _id: id, owner: userId, isDeleted: false, type: "folder" });

export const moveNode = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id, parentId } = req.body || {};
    if (!isValidId(id) || !isValidId(parentId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const node = await File.findOne({ _id: id, owner: userId, isDeleted: false });
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

    // Walk up from the target; if we meet the node, this would create a cycle.
    let cursor = parent;
    const visited = new Set();
    while (cursor) {
      if (String(cursor._id) === String(node._id)) {
        return res.status(400).json({ message: "Cannot move a folder into itself" });
      }
      if (!cursor.parentId || visited.has(String(cursor._id))) break;
      visited.add(String(cursor._id));
      cursor = await File.findOne({
        _id: cursor.parentId,
        owner: userId,
        isDeleted: false,
      });
    }

    const conflict = await File.findOne({
      projectId: node.projectId,
      parentId,
      name: node.name,
      isDeleted: false,
      _id: { $ne: node._id },
    });
    if (conflict) {
      return res.status(409).json({ message: "An item with that name already exists there" });
    }

    node.parentId = parentId;
    await node.save();

    return res.status(200).json(node);
  } catch (error) {
    return sendControllerError(res, "move file", error);
  }
};

export const copyNode = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { id, parentId } = req.body || {};
    if (!isValidId(id) || !isValidId(parentId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const source = await File.findOne({ _id: id, owner: userId, isDeleted: false });
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

    // Build the clone in memory and write it once. The previous version issued
    // one insert per node, which made copying a 200-file folder take seconds on
    // a remote database.
    const docs = [];
    const queue = [{ node: source, parentId: parent._id, name: rootName }];
    let rootCopyId = null;

    while (queue.length) {
      const item = queue.shift();
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

  const invalid = parts.some(
    (part) => part === "." || part === ".." || part.length > MAX_NAME_LENGTH,
  );
  return invalid ? null : parts;
};

export const importFiles = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const projectId = req.body?.projectId;
    const requestedParentId = req.body?.parentId;
    const files = req.body?.files;

    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "No files to import" });
    }
    if (files.length > IMPORT_MAX_FILES) {
      return res.status(400).json({ message: `Too many files (max ${IMPORT_MAX_FILES})` });
    }

    const parent = requestedParentId
      ? await findFolder({ id: requestedParentId, userId })
      : await File.findOne({ projectId, owner: userId, parentId: null, isDeleted: false });

    if (!parent) return res.status(404).json({ message: "Root folder not found" });
    if (parent.type !== "folder") {
      return res.status(400).json({ message: "Target must be a folder" });
    }

    let totalBytes = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

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
        });

        if (folder && folder.type !== "folder") {
          throw Object.assign(new Error(`${currentPath} is a file`), { status: 409 });
        }

        if (!folder) {
          folder = await File.create({
            owner: userId,
            projectId,
            parentId: currentId,
            name: segment,
            type: "folder",
          });
          created += 1;
        }

        folderCache.set(cacheKey, folder._id);
        currentId = folder._id;
      }

      return currentId;
    };

    // Phase 1: validate every entry and resolve its folder chain up front.
    const planned = [];

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

      const name = segments[segments.length - 1];
      const targetParentId = await ensureFolder(parent._id, segments.slice(0, -1));

      planned.push({ parentId: targetParentId, name, content, encoding, contentType, size });
    }

    if (planned.length) {
      const quota = Number(process.env.STORAGE_QUOTA_BYTES || 0);
      if (quota > 0) {
        const used = await usedBytes(userId);
        if (used + totalBytes > quota) {
          return res.status(413).json({ message: "Storage quota exceeded" });
        }
      }

      // Phase 2: one query for what already exists in those folders, then a
      // single insert and a single bulk update instead of two round trips per
      // file (the old loop took ~20 s for a 400-file import on a remote DB).
      const parentIds = [...new Set(planned.map((item) => String(item.parentId)))];
      const existing = await File.find({
        projectId,
        owner: userId,
        parentId: { $in: parentIds },
        isDeleted: false,
      });

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
