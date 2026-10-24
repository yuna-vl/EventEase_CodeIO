import mongoose from "mongoose";

/**
 * Connect to MongoDB Atlas using Mongoose.
 * Ensure environment variables are loaded prior to calling this function.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    console.warn("[Database] MONGODB_URI is not defined in server/.env");
    return false;
  }

  try {
    // Establish connection to MongoDB Atlas
    await mongoose.connect(uri);
    console.log("[Database] Connected to MongoDB Atlas successfully");
    return true;
  } catch (error) {
    // Log error message safely without exposing sensitive connection URI or credentials
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    throw error;
  }
};

/**
 * Safely returns the readable connection status of MongoDB.
 * 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
 */
export const getDatabaseStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const stateCode = mongoose.connection.readyState;
  return {
    status: states[stateCode] || "unknown",
    connected: stateCode === 1
  };
};

export default connectDB;
