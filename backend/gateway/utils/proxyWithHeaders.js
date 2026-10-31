import proxy from "express-http-proxy";

export const proxyWithHeader = (serviceUrl) => {
  return proxy(serviceUrl, {
    limit: "5mb",
    proxyReqPathResolver: (req) => req.url,
    proxyReqOptDecorator: (proxyReqOpts, req) => {
      if (req.user?._id) {
        proxyReqOpts.headers["x-user-id"] = String(req.user._id);
      }
      return proxyReqOpts;
    },
  });
};
