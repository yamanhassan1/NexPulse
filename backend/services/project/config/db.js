import mongoose from "mongoose";

export const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[project] MONGODB_URI is not set");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("DB Connected");
  } catch (error) {
    console.error(`[project] MongoDB connection failed: ${error.message}`);
  }
};
