import mongoose from "mongoose";

const savedEventSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      index: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring a student cannot save the same event more than once
savedEventSchema.index({ student: 1, event: 1 }, { unique: true });

const SavedEvent = mongoose.model("SavedEvent", savedEventSchema);

export default SavedEvent;
