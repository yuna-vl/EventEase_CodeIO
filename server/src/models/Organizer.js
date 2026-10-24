import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const organizerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organizer name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address format"
      ]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"]
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Hash password with bcrypt before saving if it has been modified
organizerSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password against stored bcrypt hash
organizerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Organizer = mongoose.model("Organizer", organizerSchema);

export default Organizer;
