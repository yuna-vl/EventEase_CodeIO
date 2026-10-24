import express from "express";
import {
  getStudentProfile,
  updateStudentProfile,
  getSavedEvents,
  getSavedEventIds,
  saveEvent,
  unsaveEvent,
  getStudentTickets,
  getStudentTicketById
} from "../controllers/studentController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

/**
 * EventEase Student Routes
 * Base Path: /api/students
 */

// GET /api/students/me - Fetch authenticated student's own verified profile
router.get("/me", authenticateUser, getStudentProfile);

// PATCH /api/students/me - Update permitted fields on authenticated student's profile
router.patch("/me", authenticateUser, updateStudentProfile);

// Saved Events (Protected: Authenticated Student only)
router.get("/saved-events", authenticateUser, getSavedEvents);
router.get("/saved-events/ids", authenticateUser, getSavedEventIds);
router.post("/saved-events/:eventId", authenticateUser, saveEvent);
router.delete("/saved-events/:eventId", authenticateUser, unsaveEvent);

// Tickets & Passes (Protected: Authenticated Student only)
router.get("/tickets", authenticateUser, getStudentTickets);
router.get("/tickets/:ticketId", authenticateUser, getStudentTicketById);

export default router;
