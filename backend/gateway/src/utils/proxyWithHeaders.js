import { internalHeaders } from "../../../shared/src/http/internalAuth.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 15000;

export const proxyWithHeader = (serviceUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  return async (req, res) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(req.url, serviceUrl);
      const headers = new Headers();
      const contentType = req.get("content-type");
      if (contentType) headers.set("content-type", contentType);

      // Forward cookies so Auth service can invalidate sessions on /logout.
      const cookie = req.get("cookie");
      if (cookie) headers.set("cookie", cookie);

      if (req.requestId) {
        headers.set("x-request-id", req.requestId);
      }

      if (req.user?._id) {
        headers.set("x-user-id", String(req.user._id));
      }
      Object.entries(internalHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      const hasBodyMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      const body =
        hasBodyMethod && req.body !== undefined && contentType?.toLowerCase().includes("application/json")
          ? JSON.stringify(req.body)
          : undefined;

      const response = await fetch(url, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
      });

      response.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "transfer-encoding" || lower === "connection" || lower === "set-cookie") {
          return;
        }
        res.setHeader(key, value);
      });

      if (typeof response.headers.getSetCookie === "function") {
        const cookies = response.headers.getSetCookie();
        if (cookies.length) {
          res.setHeader("set-cookie", cookies);
        }
      } else {
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) res.setHeader("set-cookie", setCookie);
      }

      res.status(response.status);
      const payload = Buffer.from(await response.arrayBuffer());
      return res.send(payload);
    } catch (error) {
      if (error?.name === "AbortError") {
        console.error(`[gateway proxy] ${serviceUrl} timed out after ${timeoutMs}ms`);
        return res.status(504).json({ message: "Upstream service timed out" });
      }
      console.error(`[gateway proxy] ${serviceUrl}: ${error.message}`);
      return res.status(502).json({ message: "Service unavailable" });
    } finally {
      clearTimeout(timer);
    }
  };
};
