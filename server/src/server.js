import dotenv from "dotenv";
// Load environment variables before anything else
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database before accepting incoming HTTP requests
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn("[EventEase Server] Warning: MONGODB_URI is not defined in server/.env. Server started without active DB connection.");
    }

    app.listen(PORT, () => {
      console.log(`[EventEase Server] Backend running on http://localhost:${PORT}`);
      console.log(`[EventEase Server] Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[EventEase Server] Server startup halted due to database connection error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
