import proxy from "express-http-proxy";
import { internalHeaders } from "../../shared/http/internalAuth.js";

export const proxyWithHeader = (serviceUrl) => {
  return proxy(serviceUrl, {
    limit: "25mb",
    proxyReqPathResolver: (req) => req.url,
    proxyReqOptDecorator: (proxyReqOpts, req) => {
      if (req.user?._id) {
        proxyReqOpts.headers["x-user-id"] = String(req.user._id);
      }
      // The internal services reject calls that do not carry this secret, so a
      // browser cannot forge x-user-id even if the port is reachable.
      Object.assign(proxyReqOpts.headers, internalHeaders());
      return proxyReqOpts;
    },
  });
};
