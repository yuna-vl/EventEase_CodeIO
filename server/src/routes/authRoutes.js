import express from "express";
import {
  loginUser,
  signupUser,
  googleAuth,
  getMe
} from "../controllers/authController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

/**
 * EventEase Authentication Routes
 * Base Path: /api/auth
 */

// POST /api/auth/login - Role-based authentication (Student or Organiser)
router.post("/login", loginUser);

// POST /api/auth/signup - Register new Student or Organiser (Protected provisioning for organisers)
router.post("/signup", signupUser);

// POST /api/auth/google - Real Google OAuth authentication
router.post("/google", googleAuth);

// GET /api/auth/me - Get current verified user profile and role from MongoDB (Protected)
router.get("/me", authenticateUser, getMe);

export default router;
