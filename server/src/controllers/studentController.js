import mongoose from "mongoose";
import User from "../models/User.js";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import SavedEvent from "../models/SavedEvent.js";

/**
 * GET /api/students/me
 * Fetch the authenticated student's own verified profile,
 * including details, real activity points, certificates, interests, and attendance history.
 */
export const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied: Authentication required"
      });
    }

    // Fetch student user directly by verified identity (never trusting client-supplied ID)
    const user = await User.findById(studentId).select("-password -__v");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student account not found or deactivated"
      });
    }

    // Retrieve verified registrations and attendance records for this student
    const registrations = await Registration.find({
      $or: [{ student: user._id }, { email: user.email }]
    })
      .populate("event", "title date venue bannerUrl registrationType price")
      .sort({ createdAt: -1 });

    const attendanceHistory = registrations.map((reg) => {
      const ev = reg.event;
      const isAttended = Boolean(reg.attended);
      return {
        id: reg._id,
        eventId: ev?._id || reg.event,
        eventTitle: ev?.title || "Campus Event",
        eventDate: ev?.date || reg.createdAt,
        eventVenue: ev?.venue || "Campus Venue",
        registrationReference: reg.registrationReference,
        attended: isAttended,
        attendedAt: reg.attendedAt || null,
        pointsAwarded: reg.pointsAwarded || (isAttended ? 50 : 0),
        status: isAttended ? "Verified Attendance" : "Registered (Pending Attendance)",
        registeredAt: reg.createdAt
      };
    });

    const attendedCount = attendanceHistory.filter((item) => item.attended).length;

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        role: user.role || "student",
        homeCollege: user.homeCollege || "",
        phoneNumber: user.phoneNumber || "",
        graduationYear: user.graduationYear || "",
        rollNumber: user.rollNumber || "",
        interests: user.interests || [],
        activityPoints: user.activityPoints || 0,
        certificates: user.certificates || [],
        attendanceHistory,
        stats: {
          totalPoints: user.activityPoints || 0,
          eventsAttended: attendedCount,
          certificatesEarned: (user.certificates || []).length,
          registeredEvents: attendanceHistory.length
        }
      }
    });
  } catch (error) {
    console.error("[Student Profile] Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student profile"
    });
  }
};

/**
 * PATCH /api/students/me
 * Update permitted profile fields for the authenticated student.
 * Strictly blocks role tampering, activity points forgery, certificates modification,
 * and sensitive credential alterations.
 */
export const updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied: Authentication required"
      });
    }

    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student account not found"
      });
    }

    const {
      name,
      homeCollege,
      phoneNumber,
      graduationYear,
      rollNumber,
      interests,
      avatar
    } = req.body;

    // Apply only permitted fields with validation
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters long"
        });
      }
      user.name = name.trim();
    }

    if (homeCollege !== undefined) {
      user.homeCollege = typeof homeCollege === "string" ? homeCollege.trim() : "";
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    }

    if (graduationYear !== undefined) {
      user.graduationYear = typeof graduationYear === "string" ? graduationYear.trim() : "";
    }

    if (rollNumber !== undefined) {
      user.rollNumber = typeof rollNumber === "string" ? rollNumber.trim() : "";
    }

    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({
          success: false,
          message: "Interests must be an array of strings"
        });
      }
      user.interests = interests
        .filter((i) => typeof i === "string" && i.trim().length > 0)
        .map((i) => i.trim());
    }

    if (avatar !== undefined) {
      user.avatar = typeof avatar === "string" ? avatar.trim() : null;
    }

    // Persist safe updates to MongoDB
    await user.save();

    // Query registrations to return full updated profile structure
    const registrations = await Registration.find({
      $or: [{ student: user._id }, { email: user.email }]
    })
      .populate("event", "title date venue")
      .sort({ createdAt: -1 });

    const attendanceHistory = registrations.map((reg) => ({
      id: reg._id,
      eventId: reg.event?._id || reg.event,
      eventTitle: reg.event?.title || "Campus Event",
      eventDate: reg.event?.date || reg.createdAt,
      eventVenue: reg.event?.venue || "Campus Venue",
      registrationReference: reg.registrationReference,
      attended: Boolean(reg.attended),
      attendedAt: reg.attendedAt || null,
      pointsAwarded: reg.pointsAwarded || (reg.attended ? 50 : 0),
      status: reg.attended ? "Verified Attendance" : "Registered (Pending Attendance)",
      registeredAt: reg.createdAt
    }));

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        homeCollege: user.homeCollege,
        phoneNumber: user.phoneNumber,
        graduationYear: user.graduationYear,
        rollNumber: user.rollNumber,
        interests: user.interests,
        activityPoints: user.activityPoints || 0,
        certificates: user.certificates || [],
        attendanceHistory,
        stats: {
          totalPoints: user.activityPoints || 0,
          eventsAttended: attendanceHistory.filter((i) => i.attended).length,
          certificatesEarned: (user.certificates || []).length,
          registeredEvents: attendanceHistory.length
        }
      }
    });
  } catch (error) {
    console.error("[Student Profile] Update error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile"
    });
  }
};

/**
 * GET /api/students/saved-events
 * Return list of events saved strictly by the currently authenticated student.
 */
export const getSavedEvents = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const savedRecords = await SavedEvent.find({ student: studentId })
      .populate({
        path: "event",
        populate: { path: "organizer", select: "name email" }
      })
      .sort({ createdAt: -1 });

    const events = savedRecords
      .filter((record) => record.event && record.event._id)
      .map((record) => {
        const ev = record.event.toObject ? record.event.toObject() : record.event;
        return {
          ...ev,
          isSaved: true,
          savedAt: record.createdAt
        };
      });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error("[Saved Events] Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved events"
    });
  }
};

/**
 * GET /api/students/saved-events/ids
 * Return array of event ID strings saved by the currently authenticated student.
 */
export const getSavedEventIds = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const savedRecords = await SavedEvent.find({ student: studentId })
      .select("event")
      .lean();

    const ids = savedRecords
      .filter((r) => r.event)
      .map((r) => r.event.toString());

    return res.status(200).json({
      success: true,
      data: ids
    });
  } catch (error) {
    console.error("[Saved Events] Fetch IDs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved event IDs"
    });
  }
};

/**
 * POST /api/students/saved-events/:eventId
 * Save an event for the currently authenticated student.
 */
export const saveEvent = async (req, res) => {
  try {
    const studentId = req.user?._id;
    const { eventId } = req.params;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (event.status === "draft" || event.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot save a ${event.status} event`
      });
    }

    const saved = await SavedEvent.findOneAndUpdate(
      { student: studentId, event: eventId },
      { student: studentId, event: eventId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Event saved successfully",
      data: {
        savedId: saved._id,
        eventId,
        savedAt: saved.createdAt
      }
    });
  } catch (error) {
    console.error("[Saved Events] Save error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save event"
    });
  }
};

/**
 * DELETE /api/students/saved-events/:eventId
 * Remove an event from the authenticated student's saved list.
 */
export const unsaveEvent = async (req, res) => {
  try {
    const studentId = req.user?._id;
    const { eventId } = req.params;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    await SavedEvent.findOneAndDelete({
      student: studentId,
      event: eventId
    });

    return res.status(200).json({
      success: true,
      message: "Event removed from saved list",
      data: { eventId }
    });
  } catch (error) {
    console.error("[Saved Events] Unsave error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove event from saved list"
    });
  }
};

/**
 * GET /api/students/tickets
 * Return all confirmed registrations / passes belonging strictly to authenticated student.
 */
export const getStudentTickets = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const registrations = await Registration.find({
      $or: [
        { student: studentId },
        { email: req.user.email }
      ]
    })
      .populate("event")
      .sort({ createdAt: -1 });

    const tickets = registrations.map((reg) => {
      const ev = reg.event;
      return {
        _id: reg._id,
        id: reg._id,
        registrationReference: reg.registrationReference,
        eventId: ev?._id || reg.event,
        eventTitle: ev?.title || "Confirmed Experience",
        eventVenue: ev?.venue || "Venue",
        eventDate: ev?.date,
        participantName: reg.participantName,
        email: reg.email,
        attended: Boolean(reg.attended),
        attendedAt: reg.attendedAt,
        pointsAwarded: reg.pointsAwarded,
        registeredAt: reg.createdAt,
        status: ev?.status || "active"
      };
    });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error("[Student Tickets] Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student tickets"
    });
  }
};

/**
 * GET /api/students/tickets/:ticketId
 * Fetch single ticket details by registration ID, enforcing strict student ownership.
 */
export const getStudentTicketById = async (req, res) => {
  try {
    const studentId = req.user?._id;
    const { ticketId } = req.params;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID format"
      });
    }

    const registration = await Registration.findById(ticketId).populate("event");
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    // Strict ownership verification:
    // Registration must belong to currently authenticated student
    const isOwner =
      (registration.student && registration.student.toString() === studentId.toString()) ||
      (registration.email && registration.email.toLowerCase() === req.user.email?.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not have permission to view this ticket"
      });
    }

    const ev = registration.event;
    return res.status(200).json({
      success: true,
      data: {
        _id: registration._id,
        id: registration._id,
        registrationReference: registration.registrationReference,
        eventId: ev?._id || registration.event,
        eventTitle: ev?.title || "Confirmed Experience",
        eventVenue: ev?.venue || "Venue",
        eventDate: ev?.date,
        participantName: registration.participantName,
        email: registration.email,
        attended: Boolean(registration.attended),
        attendedAt: registration.attendedAt,
        pointsAwarded: registration.pointsAwarded,
        registeredAt: registration.createdAt,
        status: ev?.status || "active"
      }
    });
  } catch (error) {
    console.error("[Student Ticket] Fetch by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket"
    });
  }
};

export default {
  getStudentProfile,
  updateStudentProfile,
  getSavedEvents,
  getSavedEventIds,
  saveEvent,
  unsaveEvent,
  getStudentTickets,
  getStudentTicketById
};
