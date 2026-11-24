import { internalHeaders } from "../../../shared/src/http/internalAuth.js";

export const proxyWithHeader = (serviceUrl) => {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url, serviceUrl);
      const headers = new Headers();
      const contentType = req.get("content-type");
      if (contentType) headers.set("content-type", contentType);

      if (req.user?._id) {
        headers.set("x-user-id", String(req.user._id));
      }
      Object.entries(internalHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      const unsafe = ["POST", "PUT", "PATCH"].includes(req.method);
      const body = unsafe && req.body !== undefined
        ? JSON.stringify(req.body)
        : undefined;

      const response = await fetch(url, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
      });

      response.headers.forEach((value, key) => {
        if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.status(response.status);
      const payload = Buffer.from(await response.arrayBuffer());
      return res.send(payload);
    } catch (error) {
      console.error(`[gateway proxy] ${serviceUrl}: ${error.message}`);
      return res.status(502).json({ message: "Service unavailable" });
    }
  };
};
