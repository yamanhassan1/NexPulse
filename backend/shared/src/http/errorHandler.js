export const createErrorHandler = (label) => {
  return (err, req, res, next) => {
    const status = Number(err?.status || err?.statusCode) || 500;
    const reqId = req?.requestId ? ` [${req.requestId}]` : "";

    if (status >= 500) {
      console.error(`[${label}]${reqId} ${err?.stack || err?.message || err}`);
    }

    if (res.headersSent) {
      return next(err);
    }

    if (status === 413 || err?.type === "entity.too.large") {
      return res.status(413).json({ message: "Payload too large" });
    }

    if (status === 400 || err?.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid request body" });
    }

    if (status >= 400 && status < 500) {
      return res.status(status).json({ message: "Request failed" });
    }

    return res.status(500).json({ message: "Internal server error" });
  };
};
