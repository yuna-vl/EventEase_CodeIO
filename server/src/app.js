import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getDatabaseStatus } from "./config/db.js";
import eventRoutes from "./routes/eventRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads directory exists on server start
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Configure CORS for client access
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

// Built-in middleware for parsing JSON and urlencoded payloads (10MB limit for image uploads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded event banner images statically
app.use("/uploads", express.static(uploadsDir));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: "ok",
    message: "EventEase Live Backend is running smoothly",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes
app.use("/api/auth", authRoutes);

// Event API Routes
app.use("/api/events", eventRoutes);

// Student Profile Routes
app.use("/api/students", studentRoutes);

// Notification Routes
app.use("/api/notifications", notificationRoutes);

// Catch-all 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

export default app;
