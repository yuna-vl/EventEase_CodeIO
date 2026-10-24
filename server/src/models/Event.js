import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [120, "Title cannot exceed 120 characters"]
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    date: {
      type: Date,
      required: [true, "Event date and time are required"],
      validate: {
        validator: function (value) {
          // Verify that the value represents a valid date
          return !isNaN(new Date(value).getTime());
        },
        message: "Please provide a valid date"
      }
    },
    venue: {
      type: String,
      required: [true, "Event venue or location is required"],
      trim: true,
      minlength: [2, "Venue must be at least 2 characters long"],
      maxlength: [200, "Venue cannot exceed 200 characters"]
    },
    capacity: {
      type: Number,
      required: [true, "Event capacity is required"],
      min: [1, "Capacity must be at least 1 attendee"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole integer"
      }
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, "Registered count cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Registered count must be a whole integer"
      }
    },
    bannerUrl: {
      type: String,
      default: null,
      trim: true
    },
    registrationType: {
      type: String,
      enum: ["free", "paid"],
      default: "free"
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"]
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ["published", "active", "draft", "cancelled"],
      default: "active",
      index: true
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
