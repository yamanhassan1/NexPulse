import { app } from "../config/firebase.js";
import { getAuth } from "firebase-admin/auth";
import User from "../models/user.model.js";
import crypto from "crypto";
import redis from "../../../shared/redis/redis.js";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

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

export const login = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token is required" });
    }

    const decoded = await getAuth(app).verifyIdToken(token);
    if (!decoded?.uid || !decoded?.email) {
      return res.status(401).json({ message: "Invalid token" });
    }

    let user = await User.findOne({
      firebaseUid: decoded.uid,
    });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name: decoded.name || decoded.email.split("@")[0] || "User",
        email: decoded.email,
        avatar: decoded.picture || "",
      });
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
    } catch (err) {
      console.warn(`[login] session not saved: ${err.message}`);
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
    if (sessionId) {
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
