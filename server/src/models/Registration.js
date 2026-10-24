import mongoose from "mongoose";
import crypto from "crypto";

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"]
    },
    participantName: {
      type: String,
      required: [true, "Participant name is required"],
      trim: true,
      minlength: [2, "Participant name must be at least 2 characters long"],
      maxlength: [100, "Participant name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address"
      ]
    },
    registrationReference: {
      type: String,
      required: [true, "Registration reference is required"],
      unique: true,
      trim: true,
      uppercase: true,
      default: () => `REG-${crypto.randomUUID().substring(0, 8).toUpperCase()}`
    },
    attended: {
      type: Boolean,
      default: false,
      index: true
    },
    attendedAt: {
      type: Date,
      default: null
    },
    pointsAwarded: {
      type: Number,
      default: 0
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index on event and email to prevent duplicate registrations for the same event
registrationSchema.index({ event: 1, email: 1 }, { unique: true });

// Compound unique index on event and authenticated student (only when student is present as an ObjectId)
registrationSchema.index(
  { event: 1, student: 1 },
  { unique: true, partialFilterExpression: { student: { $type: "objectId" } } }
);

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
