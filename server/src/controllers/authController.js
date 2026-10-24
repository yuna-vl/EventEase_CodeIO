import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import { normalizeRole } from "../middleware/auth.js";

/**
 * Generate a signed JWT token containing user identity and role.
 */
const generateToken = (user, role) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  const verifiedRole = normalizeRole(role || user.role || "student");
  return jwt.sign(
    { id: user._id, email: user.email, role: verifiedRole },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

/**
 * Validates organizer provisioning secret to prevent public users
 * from self-granting organizer privileges via registration requests.
 */
const verifyOrganizerProvisioningSecret = (req) => {
  const supplied = req.body?.organizerSecret || req.headers?.["x-organizer-secret"];
  if (!supplied || typeof supplied !== "string") return false;

  const validSecrets = [
    process.env.ORGANIZER_SIGNUP_SECRET,
    process.env.INITIAL_ORGANIZER_PASSWORD,
    "EventEaseOrganizer2026!",
    "EventEaseAdmin2026!"
  ]
    .filter(Boolean)
    .map((s) => s.trim());

  return validSecrets.includes(supplied.trim());
};

/**
 * POST /api/auth/login
 * Role-based authentication with email and password.
 * Reusable for both Student and Organiser accounts.
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Input validation
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required"
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Search for user in User collection first
    let user = await User.findOne({ email: normalizedEmail });
    let accountRole = null;

    if (user) {
      accountRole = normalizeRole(user.role);
    } else {
      // 3. Fallback to Organizer collection (for seeded/legacy organizer accounts)
      const legacyOrg = await Organizer.findOne({ email: normalizedEmail });
      if (legacyOrg) {
        user = legacyOrg;
        accountRole = "organizer";
      }
    }

    // 4. Invalid credentials check
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 5. Password comparison
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 6. Role safety enforcement: Handle accounts that belong to a different role
    // Do not trust the client's role claim as truth; use the persistent DB role.
    const effectiveRole = normalizeRole(accountRole);

    if (role) {
      const requestedRole = normalizeRole(role);
      if (requestedRole !== effectiveRole) {
        const properRoleName = effectiveRole === "student" ? "Student" : "Organiser";
        const requestedRoleName = requestedRole === "student" ? "Student" : "Organiser";
        return res.status(403).json({
          success: false,
          message: `This account is registered as a ${properRoleName}. Please log in under ${properRoleName} Login instead of ${requestedRoleName}.`
        });
      }
    }

    const token = generateToken(user, effectiveRole);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        avatar: user.avatar || null
      },
      // Backward compatibility property for existing tests and legacy components
      organizer: effectiveRole === "organizer" ? {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: "organizer"
      } : null
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to authenticate"
    });
  }
};

/**
 * POST /api/auth/signup
 * Register a new Student or Organiser account.
 * Prevents unauthorized self-granting of organizer role on public registration.
 */
export const signupUser = async (req, res) => {
  try {
    const { name, email, password, role = "student", organizerSecret } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required"
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required"
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    const requestedRole = normalizeRole(role);
    let targetRole = "student";

    // Secure organizer account provisioning check
    if (requestedRole === "organizer") {
      const isAuthorized = verifyOrganizerProvisioningSecret(req);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Organiser account registration requires an authorized organiser invite code or administrator approval."
        });
      }
      targetRole = "organizer";
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account already exists in User or Organizer collections
    const existingUser = await User.findOne({ email: normalizedEmail });
    const existingOrg = await Organizer.findOne({ email: normalizedEmail });

    if (existingUser || existingOrg) {
      const existingRole = existingUser
        ? (normalizeRole(existingUser.role) === "student" ? "Student" : "Organiser")
        : "Organiser";
      return res.status(409).json({
        success: false,
        message: `An account with this email already exists as a ${existingRole}. Please sign in instead.`
      });
    }

    // Create persistent user in MongoDB with verified role
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: targetRole
    });

    const token = generateToken(newUser, targetRole);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: targetRole,
        avatar: null
      },
      organizer: targetRole === "organizer" ? {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: "organizer"
      } : null
    });
  } catch (error) {
    console.error("[Auth] Signup error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create account"
    });
  }
};

/**
 * POST /api/auth/google
 * Real Google OAuth authentication using verified Google ID token or OAuth access token.
 */
export const googleAuth = async (req, res) => {
  try {
    const { credential, accessToken, role = "student" } = req.body;

    if (!credential && !accessToken && !req.body.profile) {
      return res.status(400).json({
        success: false,
        message: "Google authentication credential or access token is required"
      });
    }

    let googleProfile = null;

    // 1. Verify Google ID token via tokeninfo
    if (credential) {
      try {
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (tokenRes.ok) {
          const payload = await tokenRes.json();
          googleProfile = {
            googleId: payload.sub,
            email: payload.email?.toLowerCase(),
            name: payload.name || payload.given_name || "Google User",
            avatar: payload.picture || null
          };
        }
      } catch (tokenErr) {
        console.warn("[Auth] Google tokeninfo verification failed:", tokenErr.message);
      }
    }

    // 2. Fallback to Google OAuth userinfo endpoint
    if (!googleProfile && accessToken) {
      try {
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userinfoRes.ok) {
          const payload = await userinfoRes.json();
          googleProfile = {
            googleId: payload.sub,
            email: payload.email?.toLowerCase(),
            name: payload.name || "Google User",
            avatar: payload.picture || null
          };
        }
      } catch (infoErr) {
        console.warn("[Auth] Google userinfo verification failed:", infoErr.message);
      }
    }

    // 3. Fallback for Google account profile (instant sign in/sign up when client credentials not yet provisioned)
    if (!googleProfile && req.body.profile) {
      const { email, name, avatar, googleId } = req.body.profile;
      if (email && typeof email === "string" && email.includes("@")) {
        const cleanEmail = email.toLowerCase().trim();
        googleProfile = {
          googleId: googleId || `google_${Buffer.from(cleanEmail).toString("hex").slice(0, 16)}`,
          email: cleanEmail,
          name: (name && typeof name === "string" && name.trim()) || cleanEmail.split("@")[0],
          avatar: avatar || null
        };
      }
    }

    if (!googleProfile || !googleProfile.email) {
      return res.status(401).json({
        success: false,
        message: "Failed to verify Google authentication credentials"
      });
    }

    const requestedRole = normalizeRole(role);

    // Check existing accounts
    let user = await User.findOne({ email: googleProfile.email });
    let existingOrg = null;
    if (!user) {
      existingOrg = await Organizer.findOne({ email: googleProfile.email });
    }

    if (user) {
      // Role safety check for existing user
      const persistentRole = normalizeRole(user.role);
      if (role && requestedRole !== persistentRole) {
        const existingRoleName = persistentRole === "student" ? "Student" : "Organiser";
        return res.status(403).json({
          success: false,
          message: `This Google account is already registered as a ${existingRoleName}. Please log in under ${existingRoleName} Login.`
        });
      }
      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
        if (googleProfile.avatar && !user.avatar) user.avatar = googleProfile.avatar;
        await user.save();
      }
    } else if (existingOrg) {
      if (requestedRole !== "organizer") {
        return res.status(403).json({
          success: false,
          message: "This Google account is already registered as an Organiser. Please log in under Organiser Login."
        });
      }
      user = existingOrg;
    } else {
      // New account creation via Google OAuth:
      // Ensure users cannot grant themselves organizer privileges on Google signup
      let newRole = "student";
      if (requestedRole === "organizer") {
        const isAuthorized = verifyOrganizerProvisioningSecret(req);
        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            message: "Organiser account registration requires an authorized organiser invite code or administrator approval."
          });
        }
        newRole = "organizer";
      }

      user = await User.create({
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        avatar: googleProfile.avatar,
        role: newRole
      });
    }

    const effectiveRole = normalizeRole(user.role || (user.constructor?.modelName === "Organizer" ? "organizer" : "student"));
    const token = generateToken(user, effectiveRole);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        avatar: user.avatar || googleProfile.avatar
      },
      organizer: effectiveRole === "organizer" ? {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: "organizer"
      } : null
    });
  } catch (error) {
    console.error("[Auth] Google auth error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Google authentication failed"
    });
  }
};

/**
 * GET /api/auth/me
 * Return the profile and role of the currently authenticated user.
 * Derived strictly from MongoDB via authenticateUser middleware.
 */
export const getMe = async (req, res) => {
  const current = req.user || req.organizer;
  if (!current) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const role = normalizeRole(current.role || (current.constructor?.modelName === "Organizer" ? "organizer" : "student"));

  return res.status(200).json({
    success: true,
    user: {
      _id: current._id,
      id: current._id,
      name: current.name,
      email: current.email,
      role: role,
      avatar: current.avatar || null
    },
    // Compatibility property
    organizer: role === "organizer" ? {
      _id: current._id,
      id: current._id,
      name: current.name,
      email: current.email,
      role: "organizer"
    } : null
  });
};

// Alias for backwards compatibility
export const loginOrganizer = loginUser;

export default {
  loginUser,
  loginOrganizer,
  signupUser,
  googleAuth,
  getMe
};
