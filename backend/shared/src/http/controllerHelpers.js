const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/;

export const isValidObjectId = (id) =>
  typeof id === "string" ? OBJECT_ID_RE.test(id) : OBJECT_ID_RE.test(String(id || ""));

export const getUserId = (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    res.status(401).json({ message: "userid is required" });
    return null;
  }
  const normalized = String(userId).trim();
  if (!isValidObjectId(normalized)) {
    res.status(400).json({ message: "Invalid user id" });
    return null;
  }
  return normalized;
};

/**
 * Validates and normalises a single file or folder name.
 * Rejects path separators, traversal segments, empty names, and control chars.
 */
export const sanitizeNodeName = (value, maxLength = 255) => {
  if (typeof value !== "string") return { error: "Name must be a string" };
  const name = value.trim();
  if (!name) return { error: "Name is required" };
  if (name.length > maxLength) return { error: "Name is too long" };
  if (name === "." || name === "..") {
    return { error: "Name cannot be . or .." };
  }
  if (name.includes("/") || name.includes("\\") || CONTROL_CHARS_RE.test(name)) {
    return { error: "Name contains invalid characters" };
  }
  return { name };
};

export const isDatabaseUnavailable = (error) =>
  error?.code === "ENOTFOUND" ||
  error?.code === "ECONNREFUSED" ||
  error?.name === "MongoNetworkError" ||
  error?.name === "MongoServerSelectionError" ||
  error?.name === "MongooseServerSelectionError" ||
  /buffering timed out/i.test(error?.message || "");

export const sendControllerError = (res, label, error) => {
  if (isDatabaseUnavailable(error)) {
    console.error(`[${label}] database unavailable: ${error.message}`);
    return res.status(503).json({ message: "Database unavailable. Try again shortly." });
  }
  if (error?.code === 11000) {
    return res
      .status(409)
      .json({ message: "A resource with that value already exists" });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  console.error(`[${label}] ${error?.message || error}`);
  return res.status(500).json({ message: `${label} error` });
};
