import { app } from "../config/firebase.js";
import { getAuth } from "firebase-admin/auth";
import User from "../models/user.model.js";
import crypto from "crypto";
import redis from "../../../../shared/src/redis/redis.js";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_TOKEN_LENGTH = 16384;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS * 1000,
};

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
});

const isInvalidTokenError = (error) =>
  typeof error?.code === "string" && error.code.startsWith("auth/");

export const login = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) {
      return res.status(400).json({ message: "Valid token is required" });
    }

    let decoded;
    try {
      decoded = await getAuth(app).verifyIdToken(token);
    } catch (verifyError) {
      if (isInvalidTokenError(verifyError)) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      throw verifyError;
    }

    if (!decoded?.uid || !decoded?.email) {
      return res.status(401).json({ message: "Invalid token" });
    }

    let user = await User.findOne({ firebaseUid: decoded.uid })
      .select("_id name email avatar")
      .lean();

    if (!user) {
      try {
        const created = await User.create({
          firebaseUid: decoded.uid,
          name: (decoded.name || decoded.email.split("@")[0] || "User").slice(0, 120),
          email: decoded.email,
          avatar: decoded.picture || "",
        });
        user = toPublicUser(created);
      } catch (createError) {
        if (createError.code !== 11000) throw createError;
        user = await User.findOne({ firebaseUid: decoded.uid })
          .select("_id name email avatar")
          .lean();
        if (!user) throw createError;
      }
    }

    const publicUser = toPublicUser(user);
    const sessionId = crypto.randomUUID();

    try {
      await redis.set(
        `session-${sessionId}`,
        JSON.stringify(publicUser),
        "EX",
        SESSION_TTL_SECONDS,
      );

      res.cookie("session", sessionId, cookieOptions);
    } catch (sessionError) {
      console.error(`[login] session not saved: ${sessionError.message}`);
      return res
        .status(503)
        .json({ message: "Could not create session. Try again." });
    }

    return res.status(200).json(publicUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Login failed" });
    }
    console.error(`[login] ${error.message}`);
    return res.status(500).json({ message: "Login failed" });
  }
};

export const logout = async (req, res) => {
  try {
    const sessionId = req.cookies?.session;
    if (sessionId && typeof sessionId === "string" && SESSION_ID_RE.test(sessionId)) {
      try {
        await redis.del(`session-${sessionId}`);
      } catch (err) {
        console.warn(`[logout] session not removed: ${err.message}`);
      }
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return res.status(200).json({ message: "Logout Successfully" });
  } catch (error) {
    console.error(`[logout] ${error.message}`);
    return res.status(500).json({ message: "Logout failed" });
  }
};
