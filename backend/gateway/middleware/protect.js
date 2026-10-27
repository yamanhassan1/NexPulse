import redis from "../../shared/redis/redis.js";

export const protect = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session;
    if (!sessionId) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const result = await redis.get(`session-${sessionId}`);
    if (!result) {
      return res.status(401).json({ message: "session not found" });
    }

    req.user = JSON.parse(result);
    next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(401).json({ message: "session not found" });
    }
    console.error(`[protect] ${error.message}`);
    return res.status(503).json({ message: "Session store unavailable" });
  }
};
