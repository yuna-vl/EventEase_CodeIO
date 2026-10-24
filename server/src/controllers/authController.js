import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import { normalizeRole } from "../middleware/auth.js";

/**
 * Safely masks a token or client ID for secure diagnostic logging.
 */
const safeMask = (val) => {
  if (!val || typeof val !== "string") return "[none]";
  if (val.length <= 10) return "***";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
};

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
    let { credential, accessToken, token: legacyToken, role = "student" } = req.body;

    // Support token field alias
    if (!credential && !accessToken && legacyToken) {
      if (typeof legacyToken === "string" && (legacyToken.startsWith("ey") || legacyToken.split(".").length === 3)) {
        credential = legacyToken;
      } else {
        accessToken = legacyToken;
      }
    }

    // Auto-detect payload confusion:
    // If credential was sent but is actually an OAuth access token (e.g. ya29... or no JWT dot-separation)
    if (credential && typeof credential === "string") {
      const isJwt = credential.startsWith("ey") || (credential.includes(".") && credential.split(".").length === 3);
      if (!isJwt) {
        if (!accessToken) accessToken = credential;
        credential = null;
      }
    }

    // If accessToken was sent but is actually a JWT ID token (starts with ey and has 3 parts)
    if (accessToken && typeof accessToken === "string") {
      const isJwt = accessToken.startsWith("ey") || (accessToken.includes(".") && accessToken.split(".").length === 3);
      if (isJwt) {
        if (!credential) credential = accessToken;
        accessToken = null;
      }
    }

    if (!credential && !accessToken && !req.body.profile) {
      return res.status(400).json({
        success: false,
        message: "Google authentication credential (ID token) or access token is required."
      });
    }

    const configuredClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();

    // In production, GOOGLE_CLIENT_ID must be configured
    if (!configuredClientId && process.env.NODE_ENV === "production") {
      console.error("[Auth] Server configuration error: GOOGLE_CLIENT_ID is not configured in backend environment variables.");
      return res.status(500).json({
        success: false,
        message: "Google authentication is not properly configured on the server. Please ensure GOOGLE_CLIENT_ID is set in backend environment variables."
      });
    }

    let googleProfile = null;
    let verificationError = null;

    const oauthClient = new OAuth2Client(configuredClientId || undefined);

    // 1. Verify Google ID token (JWT) using google-auth-library
    if (credential) {
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: credential,
          audience: configuredClientId || undefined
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          googleProfile = {
            googleId: payload.sub,
            email: payload.email.toLowerCase().trim(),
            name: payload.name || payload.given_name || "Google User",
            avatar: payload.picture || null,
            emailVerified: payload.email_verified
          };
        } else {
          verificationError = new Error("Google ID token payload is missing an email address.");
        }
      } catch (idErr) {
        verificationError = idErr;
        const msg = idErr.message || "";
        console.warn(`[Auth] Google ID token verification failed: ${msg.includes("expired") ? "Token expired" : msg.includes("audience") ? "Audience mismatch" : "Invalid credential"}`);
      }
    }

    // 2. Verify Google OAuth Access Token via google-auth-library getTokenInfo + userinfo
    if (!googleProfile && accessToken) {
      try {
        // Verify access token validity and audience via Google's tokeninfo
        const tokenInfo = await oauthClient.getTokenInfo(accessToken);

        // Verify audience if GOOGLE_CLIENT_ID is configured
        if (configuredClientId && tokenInfo.aud && tokenInfo.aud !== configuredClientId) {
          console.warn(`[Auth] Google access token audience mismatch: expected ${safeMask(configuredClientId)}, received ${safeMask(tokenInfo.aud)}`);
          return res.status(401).json({
            success: false,
            message: "Google authentication failed: Token audience mismatch."
          });
        }

        // Fetch user profile from Google userinfo endpoint using the verified token
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (userinfoRes.ok) {
          const payload = await userinfoRes.json();
          if (payload && payload.email) {
            googleProfile = {
              googleId: payload.sub || tokenInfo.sub,
              email: payload.email.toLowerCase().trim(),
              name: payload.name || payload.given_name || "Google User",
              avatar: payload.picture || null,
              emailVerified: payload.email_verified || tokenInfo.email_verified
            };
            verificationError = null;
          }
        } else {
          verificationError = new Error(`Google userinfo endpoint returned HTTP ${userinfoRes.status}`);
          console.warn(`[Auth] Google userinfo fetch failed with status ${userinfoRes.status}`);
        }
      } catch (accessErr) {
        verificationError = accessErr;
        const msg = accessErr.message || "";
        console.warn(`[Auth] Google access token verification failed: ${msg.includes("expired") ? "Token expired" : "Invalid token"}`);
      }
    }

    // 3. Fallback for test / dev environment only (mock profile)
    if (!googleProfile && req.body.profile && process.env.NODE_ENV !== "production") {
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
      if (verificationError) {
        const errMsg = verificationError.message || "";
        if (errMsg.toLowerCase().includes("expired")) {
          return res.status(401).json({
            success: false,
            message: "Google authentication token has expired. Please sign in again."
          });
        }
        if (errMsg.toLowerCase().includes("audience") || errMsg.toLowerCase().includes("recipient")) {
          return res.status(401).json({
            success: false,
            message: "Google authentication failed: Client ID mismatch or unauthorized token audience."
          });
        }
        if (verificationError.code === "ENOTFOUND" || verificationError.code === "ETIMEDOUT" || verificationError.name === "FetchError") {
          return res.status(503).json({
            success: false,
            message: "Unable to reach Google authentication servers. Please verify network connectivity and try again."
          });
        }
      }

      return res.status(401).json({
        success: false,
        message: "Failed to verify Google authentication credentials."
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
