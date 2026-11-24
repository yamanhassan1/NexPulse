import redis from "../../../shared/src/redis/redis.js";
import { isValidObjectId } from "../../../shared/src/http/controllerHelpers.js";

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const protect = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session;
    if (!sessionId || typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const result = await redis.get(`session-${sessionId}`);
    if (!result) {
      return res.status(401).json({ message: "session not found" });
    }

    const parsed = JSON.parse(result);
    if (!parsed || !isValidObjectId(parsed._id)) {
      return res.status(401).json({ message: "session not found" });
    }

    req.user = parsed;
    next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(401).json({ message: "session not found" });
    }
    console.error(`[protect] ${error.message}`);
    return res.status(503).json({ message: "Session store unavailable" });
  }
};
