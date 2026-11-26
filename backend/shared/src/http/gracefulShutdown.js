export const configureServerTimeouts = (
  server,
  { requestTimeoutMs = 30000, headersTimeoutMs = 15000, keepAliveTimeoutMs = 65000 } = {},
) => {
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = headersTimeoutMs;
  server.keepAliveTimeout = keepAliveTimeoutMs;
  return server;
};

export const setupGracefulShutdown = ({ label, server, onShutdown }) => {
  let shuttingDown = false;

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[${label}] Port is already in use (${error.message}). Stop the conflicting process or change PORT.`);
    } else if (error.code === "EACCES") {
      console.error(`[${label}] Permission denied binding port (${error.message}).`);
    } else {
      console.error(`[${label}] HTTP server error: ${error.message}`);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[${label}] received ${signal}, shutting down gracefully...`);

    const forceTimer = setTimeout(() => {
      console.error(`[${label}] forced shutdown after timeout`);
      process.exit(1);
    }, 8000);
    forceTimer.unref?.();

    try {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
      if (onShutdown) {
        await onShutdown();
      }
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (error) {
      console.error(`[${label}] error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};
