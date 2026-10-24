import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventStatus,
  cancelEvent,
  registerForEvent,
  getEventAttendees,
  uploadBanner,
  markAttendance,
  getOrganizerEvents,
  getOrganizerStats
} from "../controllers/eventController.js";
import { authenticateUser, optionalAuthenticateUser, requireRole } from "../middleware/auth.js";

const router = express.Router();

const organizerOnly = [authenticateUser, requireRole("organizer")];

/**
 * EventEase Live Event Routes
 * Base Path: /api/events
 */

// List all public events / Create an event (Protected: Organizer only)
router.route("/")
  .get(getEvents)
  .post(organizerOnly, createEvent);

// Organizer-specific event management and authoritative dashboard statistics (Protected: Organizer only)
router.get("/organizer/events", organizerOnly, getOrganizerEvents);
router.get("/organizer/stats", organizerOnly, getOrganizerStats);
router.get("/my-events", organizerOnly, getOrganizerEvents);
router.get("/dashboard-stats", organizerOnly, getOrganizerStats);

// Upload event banner (Protected: Organizer only)
router.route("/upload-banner")
  .post(organizerOnly, uploadBanner);

// Fetch a single event (Public) / Edit event (Organizer only) / Delete event (Organizer only)
router.route("/:id")
  .get(getEventById)
  .put(organizerOnly, updateEvent)
  .delete(organizerOnly, deleteEvent);

// Update event status (publish / draft / cancel) (Protected: Organizer only)
router.route("/:id/status")
  .patch(organizerOnly, setEventStatus);

// Cancel an event and notify registered students (Protected: Organizer only)
router.route("/:id/cancel")
  .patch(organizerOnly, cancelEvent);

// Register a participant for an event (Public, optionally authenticated)
router.route("/:id/register")
  .post(optionalAuthenticateUser, registerForEvent);

// Fetch attendees for an event (Protected: Organizer only, with ownership verification)
router.route("/:id/attendees")
  .get(organizerOnly, getEventAttendees);

// Verify attendance for an attendee (Protected: Organizer only)
router.route("/:id/attendees/:attendeeId/attendance")
  .patch(organizerOnly, markAttendance);

export default router;
