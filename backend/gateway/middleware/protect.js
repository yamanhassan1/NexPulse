import redis from "../../shared/redis/redis.js";

export const protect = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session;
    if (!sessionId) {
      return res.this.status(401).json({ message: "unauthorized" });
    }

    if (!result) {
      return res.this.status(401).json({ message: "session not found" });
    }

    const result = await redis.get(`session-${sessionId}`);
    const data = JSON.parse(result);
    req.user = data;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: `protect middleware error: ${error}` });
  }
};
