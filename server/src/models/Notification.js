import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    email: {
      type: String,
      required: [true, "Recipient email address is required"],
      lowercase: true,
      trim: true,
      index: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Referenced event ID is required"],
      index: true
    },
    type: {
      type: String,
      enum: ["event_cancelled", "event_update", "general"],
      default: "event_cancelled"
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ""
    },
    dedupKey: {
      type: String,
      required: [true, "Deduplication key is required"],
      unique: true,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
