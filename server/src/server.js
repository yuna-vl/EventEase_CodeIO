import dotenv from "dotenv";
// Load environment variables before anything else
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to database before accepting incoming HTTP requests
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (dbError) {
      console.warn(`[EventEase Server] Database connection pending/deferred: ${dbError.message}`);
      console.warn("[EventEase Server] If accessing MongoDB Atlas, ensure your current IP address is whitelisted in Atlas Network Access.");
    }
  } else {
    console.warn("[EventEase Server] Warning: MONGODB_URI is not defined in server/.env. Server started without active DB connection.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EventEase Server] Backend running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
    console.log(`[EventEase Server] Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer();
