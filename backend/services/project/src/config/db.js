import mongoose from "mongoose";

const LABEL = "project";

export const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(`[${LABEL}] MONGODB_URI is not set`);
    return false;
  }

  // Fail fast instead of buffering queries for 10 s when the cluster is
  // unreachable: a paused Atlas cluster, blocked DNS, or an IP that is not on
  // the allowlist all look the same from here.
  mongoose.set("bufferTimeoutMS", 5000);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[${LABEL}] DB connected`);
  } catch (error) {
    console.error(`[${LABEL}] MongoDB connection failed: ${error.message}`);
    return false;
  }

  mongoose.connection.on("disconnected", () => {
    console.warn(`[${LABEL}] DB disconnected — requests will fail until it reconnects`);
  });
  mongoose.connection.on("reconnected", () => {
    console.log(`[${LABEL}] DB reconnected`);
  });
  mongoose.connection.on("error", (error) => {
    console.error(`[${LABEL}] DB error: ${error.message}`);
  });

  return true;
};
