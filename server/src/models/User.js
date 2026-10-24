import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
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
      required: function () {
        // Password is required only if not signed in via Google OAuth
        return !this.googleId;
      },
      minlength: [8, "Password must be at least 8 characters long"]
    },
    role: {
      type: String,
      enum: {
        values: ["student", "organizer", "organiser"],
        message: "User role must be student or organizer"
      },
      required: [true, "User role is required (student or organizer)"],
      default: "student",
      set: function (v) {
        if (!v) return "student";
        const clean = String(v).toLowerCase().trim();
        return clean === "organiser" ? "organizer" : clean;
      }
    },
    googleId: {
      type: String,
      sparse: true
    },
    avatar: {
      type: String,
      default: null
    },
    homeCollege: {
      type: String,
      trim: true,
      default: ""
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ""
    },
    graduationYear: {
      type: String,
      trim: true,
      default: ""
    },
    rollNumber: {
      type: String,
      trim: true,
      default: ""
    },
    interests: {
      type: [String],
      default: []
    },
    activityPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    certificates: [
      {
        title: {
          type: String,
          required: true,
          trim: true
        },
        eventName: {
          type: String,
          trim: true
        },
        eventTitle: {
          type: String,
          trim: true
        },
        issueDate: {
          type: Date,
          default: Date.now
        },
        certificateId: {
          type: String,
          required: true,
          trim: true
        },
        verificationCode: {
          type: String,
          default: ""
        },
        credentialUrl: {
          type: String,
          default: ""
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Hash password with bcrypt before saving if it has been modified
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password against stored bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
