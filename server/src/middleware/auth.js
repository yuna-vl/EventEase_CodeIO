import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organizer from "../models/Organizer.js";

/**
 * Authentication Helper: Extracts Bearer token from authorization header.
 */
export const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1].trim();
  }
  return null;
};

/**
 * Normalizes a role value to the canonical string ("student" or "organizer").
 */
export const normalizeRole = (role) => {
  if (!role) return "student";
  const lower = String(role).toLowerCase().trim();
  if (lower === "organizer" || lower === "organiser") return "organizer";
  return "student";
};

/**
 * Express Authentication Middleware: authenticateUser
 * Verifies JWT token and retrieves the persistent account from MongoDB.
 * Attaches the authenticated user to req.user with verified, immutable role.
 * Safe against forged client role fields and invalid/missing roles.
 */
export const authenticateUser = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization denied: No token provided"
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("[Auth] Fatal: JWT_SECRET is not configured in server/.env");
    return res.status(500).json({
      success: false,
      message: "Authentication service misconfiguration"
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Malformed token payload"
      });
    }

    // Lookup in MongoDB User collection first, fallback to legacy Organizer collection
    let account = await User.findById(decoded.id).select("-password");
    let verifiedRole = null;

    if (account) {
      verifiedRole = normalizeRole(account.role);
      account.role = verifiedRole;
    } else {
      const legacyOrg = await Organizer.findById(decoded.id).select("-password");
      if (legacyOrg) {
        account = legacyOrg;
        verifiedRole = "organizer";
      }
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Account not found or deactivated"
      });
    }

    // Attach verified user and role to request
    req.user = account;
    req.user.role = verifiedRole || "student";
    // Compatibility alias for existing handlers
    req.organizer = req.user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Token has expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid token"
    });
  }
};

/**
 * Express Authorisation Middleware: requireRole
 * Higher-order middleware that validates that the authenticated user has one of the required roles.
 * Returns HTTP 401 if unauthenticated, HTTP 403 if authenticated but lacks required role.
 */
export const requireRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied: Authentication required"
      });
    }

    const currentRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Organiser privileges required. Student accounts cannot perform this action.`
      });
    }

    next();
  };
};

/**
 * Express Authentication Middleware: optionalAuthenticateUser
 * Inspects Authorization Bearer token if present, attaching req.user if valid.
 * Does not block or reject requests if token is missing or invalid.
 */
export const optionalAuthenticateUser = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded && decoded.id) {
      let account = await User.findById(decoded.id).select("-password");
      if (account) {
        req.user = account;
        req.user.role = normalizeRole(account.role);
      } else {
        const legacyOrg = await Organizer.findById(decoded.id).select("-password");
        if (legacyOrg) {
          req.user = legacyOrg;
          req.user.role = "organizer";
        }
      }
    }
  } catch (err) {
    // Silently pass for optional authentication on public endpoints
  }

  next();
};

/**
 * Aliases for backwards compatibility with existing codebase
 */
export const protectUser = authenticateUser;

export const protectOrganizer = async (req, res, next) => {
  return authenticateUser(req, res, (err) => {
    if (err) return next(err);
    return requireRole("organizer")(req, res, next);
  });
};

export default {
  extractBearerToken,
  normalizeRole,
  authenticateUser,
  requireRole,
  protectUser,
  protectOrganizer
};
