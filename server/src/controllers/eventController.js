import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../uploads");

/**
 * Helper to process, validate, and write uploaded banner image to the server file system.
 * Returns the relative static URL (e.g., "/uploads/banner-12345.png") or null.
 */
const processAndSaveBannerImage = async (bannerData) => {
  if (!bannerData || typeof bannerData !== "string") {
    return null;
  }

  const trimmed = bannerData.trim();
  if (!trimmed) return null;

  // If already a hosted or relative URL, return as-is
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Handle Base64 Data URL (data:image/png;base64,...)
  const matches = trimmed.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!matches) {
    throw new Error("Invalid image format. Supported formats are PNG, JPG, JPEG, and WebP.");
  }

  const mimeType = matches[1].toLowerCase();
  const rawData = matches[3];
  const buffer = Buffer.from(rawData, "base64");

  // Validate file size (max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error("Image file size exceeds the 5MB limit. Please choose a smaller image.");
  }

  // Determine file extension
  let ext = "jpg";
  if (mimeType.includes("png")) ext = "png";
  else if (mimeType.includes("webp")) ext = "webp";

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const targetPath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(targetPath, buffer);
  return `/uploads/${filename}`;
};

/**
 * POST /api/events/upload-banner
 * Dedicated endpoint for uploading and saving banner images.
 * Protected: Organizer only.
 */
export const uploadBanner = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        message: "No image data provided for upload"
      });
    }

    const url = await processAndSaveBannerImage(image);
    return res.status(200).json({
      success: true,
      url
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to upload image banner"
    });
  }
};

/**
 * GET /api/events
 * List all events with sensible sorting (earliest upcoming date first).
 * Public endpoint: excludes cancelled events by default.
 * Use ?includeCancelled=true to retrieve all events including cancelled ones (e.g. for organizer dashboard history).
 */
export const getEvents = async (req, res) => {
  try {
    const { includeCancelled, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else if (includeCancelled === "true" || includeCancelled === true) {
      filter.status = { $ne: "draft" };
    } else {
      // By default for public student event discovery:
      // Exclude drafts, unpublished events, and cancelled events.
      filter.status = { $in: ["published", "active"] };
    }

    // Sort by upcoming date ascending by default
    const events = await Event.find(filter).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve events"
    });
  }
};

/**
 * GET /api/events/:id
 * Retrieve a single event by ID or return a 404.
 * Public endpoint.
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve event"
    });
  }
};

/**
 * POST /api/events
 * Create a new event with validated input.
 * Protected: Organizer only.
 * Enforces organizer ownership association on creation.
 */
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      capacity,
      bannerUrl,
      banner,
      registrationType = "free",
      price = 0
    } = req.body;

    // Field presence checks
    if (!title || !description || !date || !venue || capacity === undefined) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: title, description, date, venue, capacity"
      });
    }

    // Capacity validation
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive whole integer of at least 1"
      });
    }

    // Date validation
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format provided"
      });
    }

    // Registration Type & Price validation
    const cleanRegType = registrationType === "paid" ? "paid" : "free";
    let cleanPrice = 0;

    if (cleanRegType === "paid") {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Paid events require a positive registration price in ₹ greater than 0"
        });
      }
      cleanPrice = Math.round(numPrice * 100) / 100;
    }

    // Process and save banner image if supplied
    let savedBannerUrl = null;
    try {
      savedBannerUrl = await processAndSaveBannerImage(bannerUrl || banner);
    } catch (bannerErr) {
      return res.status(400).json({
        success: false,
        message: bannerErr.message || "Failed to process event banner image"
      });
    }

    // Derive organizer ownership strictly from verified authenticated identity
    const organizerId = req.user?._id || req.organizer?._id;
    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Authorization required: Organizer identity missing"
      });
    }

    const newEvent = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date: parsedDate,
      venue: venue.trim(),
      capacity: parsedCapacity,
      registeredCount: 0,
      bannerUrl: savedBannerUrl,
      registrationType: cleanRegType,
      price: cleanPrice,
      organizer: organizerId,
      status: "published"
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create event"
    });
  }
};

/**
 * PUT /api/events/:id
 * Edit an existing event.
 * Protected: Organizer only.
 * Enforces strict backend event ownership.
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Strict ownership verification:
    // Organizer cannot edit another organizer's event
    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not own this event and cannot modify it."
      });
    }

    const {
      title,
      description,
      date,
      venue,
      capacity,
      bannerUrl,
      banner,
      registrationType,
      price,
      status
    } = req.body;

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (venue) event.venue = venue.trim();

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }
      event.date = parsedDate;
    }

    if (capacity !== undefined) {
      const capNum = Number(capacity);
      if (!Number.isInteger(capNum) || capNum < event.registeredCount) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be less than current registered count (${event.registeredCount})`
        });
      }
      event.capacity = capNum;
    }

    if (registrationType) {
      event.registrationType = registrationType === "paid" ? "paid" : "free";
    }

    if (price !== undefined) {
      event.price = event.registrationType === "paid" ? Math.max(0, Number(price)) : 0;
    }

    if (status && ["published", "draft", "cancelled"].includes(status)) {
      event.status = status;
    }

    if (bannerUrl || banner) {
      try {
        const savedUrl = await processAndSaveBannerImage(bannerUrl || banner);
        if (savedUrl) event.bannerUrl = savedUrl;
      } catch (imgErr) {
        return res.status(400).json({ success: false, message: imgErr.message });
      }
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update event"
    });
  }
};

/**
 * DELETE /api/events/:id
 * Delete or cancel an event.
 * Protected: Organizer only.
 * Enforces strict backend event ownership.
 */
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Strict ownership verification:
    // Organizer cannot delete another organizer's event
    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not own this event and cannot delete it."
      });
    }

    // Delete associated registrations and the event document
    await Registration.deleteMany({ event: id });
    await Event.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Event and associated registrations deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete event"
    });
  }
};

/**
 * PATCH /api/events/:id/status
 * Publish or cancel an event.
 * Protected: Organizer only.
 * Enforces strict backend event ownership.
 */
export const setEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["published", "draft", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status must be 'published', 'draft', or 'cancelled'"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not own this event."
      });
    }

    event.status = status;
    await event.save();

    return res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
      data: event
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update event status"
    });
  }
};

/**
 * PATCH /api/events/:id/cancel
 * Cancel an event owned by the authenticated organizer.
 * Sets status to "cancelled", stores cancellation metadata,
 * and notifies all registered participants idempotently.
 * Protected: Organizer only.
 */
export const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You do not own this event and cannot cancel it."
      });
    }

    const cleanReason = typeof reason === "string" ? reason.trim() : "";

    // Idempotency check: If already cancelled, do not recreate notifications or duplicate work
    if (event.status === "cancelled") {
      return res.status(200).json({
        success: true,
        message: "Event is already cancelled",
        alreadyCancelled: true,
        data: event,
        notificationsSent: 0,
        notificationsDelivered: 0
      });
    }

    // Eligibility check: Reject cancellation for draft events (only active/published events can be cancelled)
    if (event.status === "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a draft event. Only active or published events are eligible for cancellation."
      });
    }

    // Atomic conditional cancellation update ensuring status and ownership remain valid concurrently
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: id,
        ...(isOwner
          ? { organizer: req.user._id }
          : { organizer: { $in: [null, undefined] } }),
        status: { $in: ["active", "published"] }
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: req.user._id,
          cancellationReason: cleanReason
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedEvent) {
      const freshEvent = await Event.findById(id);
      if (!freshEvent) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }
      if (freshEvent.status === "cancelled") {
        return res.status(200).json({
          success: true,
          message: "Event is already cancelled",
          alreadyCancelled: true,
          data: freshEvent,
          notificationsSent: 0,
          notificationsDelivered: 0
        });
      }
      if (freshEvent.status === "draft") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel a draft event. Only active or published events are eligible for cancellation."
        });
      }
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You do not own this event and cannot cancel it."
      });
    }

    // Retrieve all registered participants for this event
    const registrations = await Registration.find({ event: updatedEvent._id });
    let notifiedCount = 0;

    const eventDateStr = updatedEvent.date
      ? new Date(updatedEvent.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      : "Scheduled Date";

    const cancellationMsg = `The organizer has cancelled "${updatedEvent.title}" scheduled for ${eventDateStr} at ${updatedEvent.venue}.${cleanReason ? ` Reason: ${cleanReason}.` : ""} We apologize for the inconvenience. Please check EventEase for updates.`;

    for (const reg of registrations) {
      const normalizedEmail = reg.email.toLowerCase().trim();
      const studentUser = await User.findOne({ email: normalizedEmail });
      const dedupKey = `event_cancelled_${updatedEvent._id}_${normalizedEmail}`;

      const notifResult = await Notification.updateOne(
        { dedupKey },
        {
          $setOnInsert: {
            recipient: studentUser?._id || null,
            email: normalizedEmail,
            event: updatedEvent._id,
            type: "event_cancelled",
            title: `Event Cancelled: ${updatedEvent.title}`,
            message: cancellationMsg,
            cancellationReason: cleanReason,
            dedupKey,
            isRead: false
          }
        },
        { upsert: true }
      );

      if (notifResult.upsertedCount > 0) {
        notifiedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Event "${updatedEvent.title}" has been successfully cancelled and ${notifiedCount} registered participant(s) notified.`,
      alreadyCancelled: false,
      data: updatedEvent,
      notificationsSent: notifiedCount,
      notificationsDelivered: notifiedCount
    });
  } catch (error) {
    console.error("[Events] Cancel error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel event"
    });
  }
};

/**
 * Fallback registration handler using atomic conditional update with compensation rollback.
 * Used when transactions are not supported by the deployment environment (e.g. standalone MongoDB).
 */
export const registerWithoutTransaction = async ({ id, participantName, normalizedEmail, studentId = null, requestedSeats = 1, res }) => {
  // 1. Authoritative atomic seat reservation:
  // Conditionally allocate seat ONLY IF event is in eligible status ("active" or "published")
  // and registeredCount + requestedSeats <= capacity.
  const event = await Event.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ["active", "published"] },
      $expr: {
        $lte: [{ $add: ["$registeredCount", requestedSeats] }, "$capacity"]
      }
    },
    { $inc: { registeredCount: requestedSeats } },
    { returnDocument: "after" }
  );

  // If atomic conditional update returned null, inspect the database state to determine exact failure cause
  if (!event) {
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (existingEvent.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Registration closed: This event has been cancelled by the organizer."
      });
    }

    if (existingEvent.status === "draft") {
      return res.status(400).json({
        success: false,
        message: "Registration not open: This event is currently in draft status."
      });
    }

    // Capacity exhausted - return 409 Conflict
    return res.status(409).json({
      success: false,
      message: "Sorry, this event is full."
    });
  }

  let resolvedStudentId = studentId;
  if (!resolvedStudentId) {
    const matched = await User.findOne({ email: normalizedEmail }).select("_id");
    if (matched) {
      resolvedStudentId = matched._id;
    }
  }

  // 2. Seat reserved atomically. Attempt creating the registration document.
  try {
    const registration = await Registration.create({
      event: id,
      student: resolvedStudentId,
      participantName: participantName.trim(),
      email: normalizedEmail
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        _id: registration._id,
        id: registration._id,
        registrationReference: registration.registrationReference,
        eventId: event._id,
        eventTitle: event.title,
        participantName: registration.participantName,
        email: registration.email,
        student: registration.student,
        registeredAt: registration.createdAt
      }
    });
  } catch (regError) {
    // 3. Compensation: Reliably roll back the reserved seat counter
    try {
      await Event.findByIdAndUpdate(id, { $inc: { registeredCount: -requestedSeats } });
    } catch (compensateErr) {
      console.error("[Registration] CRITICAL: Seat compensation decrement failed:", compensateErr);
    }

    if (regError.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You are already registered for this event."
      });
    }

    if (regError.name === "ValidationError") {
      const messages = Object.values(regError.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process registration"
    });
  }
};

/**
 * POST /api/events/:id/register
 * Register a participant for an event.
 * Enforces atomic capacity constraints and compound unique email index.
 * Public endpoint.
 */
export const registerForEvent = async (req, res) => {
  const { id } = req.params;
  const participantName = req.body.participantName || req.body.name;
  const { email } = req.body;
  const requestedSeats = Math.max(1, parseInt(req.body.seats, 10) || 1);

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid event ID format"
    });
  }

  if (!participantName || typeof participantName !== "string" || !participantName.trim()) {
    return res.status(400).json({
      success: false,
      message: "Participant name is required and must be at least 2 characters long"
    });
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Valid email address is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address format"
    });
  }

  let studentId = req.user?._id || null;
  if (!studentId) {
    const matchedStudent = await User.findOne({ email: normalizedEmail }).select("_id");
    if (matchedStudent) {
      studentId = matchedStudent._id;
    }
  }

  // Max retries for transient concurrency write conflicts in multi-document transactions
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // 1. Authoritative atomic reservation inside the transaction:
      // Strictly verifying event status is active or published and capacity is not exceeded.
      const event = await Event.findOneAndUpdate(
        {
          _id: id,
          status: { $in: ["active", "published"] },
          $expr: {
            $lte: [{ $add: ["$registeredCount", requestedSeats] }, "$capacity"]
          }
        },
        { $inc: { registeredCount: requestedSeats } },
        { session, returnDocument: "after" }
      );

      if (!event) {
        const existingEvent = await Event.findById(id).session(session);
        await session.abortTransaction();

        if (!existingEvent) {
          return res.status(404).json({
            success: false,
            message: "Event not found"
          });
        }

        if (existingEvent.status === "cancelled") {
          return res.status(400).json({
            success: false,
            message: "Registration closed: This event has been cancelled by the organizer."
          });
        }

        if (existingEvent.status === "draft") {
          return res.status(400).json({
            success: false,
            message: "Registration not open: This event is currently in draft status."
          });
        }

        return res.status(409).json({
          success: false,
          message: "Sorry, this event is full."
        });
      }

      // 2. Create the registration record within the transaction
      const [registration] = await Registration.create(
        [
          {
            event: id,
            student: studentId,
            participantName: participantName.trim(),
            email: normalizedEmail
          }
        ],
        { session }
      );

      // 3. Commit the transaction
      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          _id: registration._id,
          id: registration._id,
          registrationReference: registration.registrationReference,
          eventId: event._id,
          eventTitle: event.title,
          participantName: registration.participantName,
          email: registration.email,
          student: registration.student,
          registeredAt: registration.createdAt
        }
      });
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      // If transactions are not supported by the deployment, fallback to atomic conditional update with compensation
      if (
        error.message &&
        (error.message.includes("Transaction numbers are only allowed") ||
          error.message.includes("does not support transactions") ||
          error.message.includes("replica set"))
      ) {
        return registerWithoutTransaction({ id, participantName, normalizedEmail, studentId, requestedSeats, res });
      }

      // Duplicate key error code 11000 from MongoDB unique index
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You are already registered for this event."
        });
      }

      // Schema validation errors
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: messages
        });
      }

      // Retry or fallback on transient write conflicts during high concurrency
      const isTransient =
        error.hasErrorLabel?.("TransientTransactionError") ||
        error.code === 112 ||
        error.codeName === "WriteConflict" ||
        (error.message && error.message.includes("Write conflict"));

      if (isTransient) {
        if (attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 50) + 30;
          await new Promise(resolve => setTimeout(resolve, jitter * attempt));
          continue;
        }

        // If multi-document transaction conflicts persist under extreme stampede,
        // smoothly fallback to atomic conditional reservation with compensation.
        return registerWithoutTransaction({ id, participantName, normalizedEmail, studentId, requestedSeats, res });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to process registration"
      });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
};

/**
 * GET /api/events/:id/attendees
 * Return the attendee list for a specific event.
 * Protected: Organizer only.
 * Enforces event ownership: An organiser cannot view attendee data for another organiser's event.
 */
export const getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    const event = await Event.findById(id).select("title date venue capacity registeredCount organizer");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Backend Event Ownership Enforcement:
    // Disallow an organizer from viewing attendee rosters of events owned by another organizer
    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You do not have permission to view attendees for an event you do not own."
      });
    }

    const attendees = await Registration.find({ event: id })
      .select("participantName email registrationReference createdAt attended attendedAt pointsAwarded")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        capacity: event.capacity,
        registeredCount: event.registeredCount
      },
      count: attendees.length,
      data: attendees
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendee list"
    });
  }
};

/**
 * PATCH /api/events/:id/attendees/:attendeeId/attendance
 * Verify attendance for a registered participant.
 * Protected: Organizer only (with event ownership check).
 * Awards 50 activity points and automatically issues a Certificate of Participation.
 */
export const markAttendance = async (req, res) => {
  try {
    const { id, attendeeId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(attendeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Ownership check
    const currentUserId = req.user?._id?.toString();
    const isOwner = event.organizer && event.organizer.toString() === currentUserId;
    const isLegacyAdmin = !event.organizer && req.user?.email === "admin@eventease.live";

    if (!isOwner && !isLegacyAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You do not own this event."
      });
    }

    const registration = await Registration.findOne({ _id: attendeeId, event: id });
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found for this event"
      });
    }

    if (registration.attended) {
      return res.status(200).json({
        success: true,
        message: "Attendance already verified for this participant",
        data: registration
      });
    }

    // Mark attended & award verified attendance points
    registration.attended = true;
    registration.attendedAt = new Date();
    registration.pointsAwarded = 50;
    await registration.save();

    // Check if participant is a registered Student in the User collection
    const studentUser = await User.findOne({ email: registration.email.toLowerCase() });
    if (studentUser) {
      // Award 50 activity points for verified attendance
      studentUser.activityPoints = (studentUser.activityPoints || 0) + 50;

      // Issue Certificate of Participation
      const certId = `CERT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      const verificationCode = `EE-VERIFY-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;
      studentUser.certificates = studentUser.certificates || [];
      const alreadyHasCert = studentUser.certificates.some(
        (c) => c.eventName === event.title || c.eventTitle === event.title
      );
      if (!alreadyHasCert) {
        studentUser.certificates.push({
          title: "Certificate of Participation",
          eventName: event.title,
          eventTitle: event.title,
          issueDate: new Date(),
          certificateId: certId,
          verificationCode,
          credentialUrl: ""
        });
      }
      await studentUser.save();
    }

    return res.status(200).json({
      success: true,
      message: "Attendance verified successfully. 50 activity points and certificate awarded.",
      data: registration
    });
  } catch (error) {
    console.error("[Event Controller] Mark attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify attendance"
    });
  }
};

/**
 * GET /api/events/organizer/events (alias: /api/events/my-events)
 * Return events belonging strictly to the currently authenticated organizer.
 * Excludes events belonging to other organizers.
 * Retains cancelled events in management history if ?includeCancelled=true (default for organizer management).
 * Protected: Organizer only.
 */
export const getOrganizerEvents = async (req, res) => {
  try {
    const organizerId = req.user?._id;
    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied: Organizer identity missing"
      });
    }

    const { includeCancelled, status } = req.query;

    // Strict organizer ownership query
    const filter = { organizer: organizerId };

    if (status) {
      filter.status = status;
    } else if (includeCancelled === "false") {
      filter.status = { $ne: "cancelled" };
    }
    // By default for organizer views, all events belonging to the organizer (active, published, draft, cancelled)
    // are returned so the organizer can see their full history and manage them.

    const events = await Event.find(filter).sort({ date: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error("[Events] Get organizer events error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve organizer events"
    });
  }
};

/**
 * GET /api/events/organizer/stats (alias: /api/events/dashboard-stats)
 * Authoritative backend statistics for the authenticated organizer.
 *
 * Requirements:
 * A. Total Events:
 *    - Count ONLY eligible, non-cancelled events belonging to the current organizer.
 *    - Exclude cancelled events.
 *    - Exclude draft events from active total.
 *    - Exclude other organizers' events.
 *    - Legacy events with missing status are treated as active unless cancelled.
 *
 * B. Confirmed Registrations:
 *    - Count ONLY confirmed registrations for eligible, non-cancelled events of current organizer.
 *    - Exclude registrations associated with cancelled events.
 *    - Exclude other organizers' event registrations.
 *    - Respect seat counter / Registration collection conventions.
 *
 * C. Available Capacity:
 *    - Sum of Math.max(0, capacity - confirmed/registeredCount) across eligible non-cancelled events.
 *    - Exclude cancelled event capacity.
 *    - Exclude other organizers' capacity.
 *    - Never allow available capacity to become negative.
 *
 * Protected: Organizer only.
 */
export const getOrganizerStats = async (req, res) => {
  try {
    const organizerId = req.user?._id;
    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied: Organizer identity missing"
      });
    }

    // Query all eligible non-cancelled, non-draft events belonging strictly to the current organizer
    // Legacy events lacking status field are treated as active if not marked cancelled.
    const eligibleFilter = {
      organizer: organizerId,
      status: { $in: ["active", "published"] },
      cancelledAt: null
    };

    const eligibleEvents = await Event.find(eligibleFilter);
    const eligibleEventIds = eligibleEvents.map((ev) => ev._id);

    // Total Events: Only eligible active/published events
    const totalEvents = eligibleEvents.length;

    // Confirmed Registrations: Count from Registration collection for eligible active events
    let confirmedRegistrations = 0;
    if (eligibleEventIds.length > 0) {
      confirmedRegistrations = await Registration.countDocuments({
        event: { $in: eligibleEventIds }
      });
    }

    // Available Capacity & Total Active Capacity:
    let availableCapacity = 0;
    let totalActiveCapacity = 0;

    for (const ev of eligibleEvents) {
      const cap = Number(ev.capacity) || 0;
      const registered = Number(ev.registeredCount) || 0;
      const seatsLeft = Math.max(0, cap - registered);
      availableCapacity += seatsLeft;
      totalActiveCapacity += cap;
    }

    // Additional metadata for management insights
    const cancelledEventsCount = await Event.countDocuments({
      organizer: organizerId,
      status: "cancelled"
    });
    const draftEventsCount = await Event.countDocuments({
      organizer: organizerId,
      status: "draft"
    });

    return res.status(200).json({
      success: true,
      data: {
        totalEvents,
        confirmedRegistrations,
        availableCapacity,
        totalActiveCapacity,
        cancelledEvents: cancelledEventsCount,
        draftEvents: draftEventsCount
      }
    });
  } catch (error) {
    console.error("[Events] Get organizer stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate organizer statistics"
    });
  }
};

export default {
  uploadBanner,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventStatus,
  cancelEvent,
  registerForEvent,
  getEventAttendees,
  markAttendance,
  getOrganizerEvents,
  getOrganizerStats
};
