import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("eventease_token") || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("eventease_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed) {
          const uid = parsed._id || parsed.id;
          parsed._id = uid;
          parsed.id = uid;
          if (parsed.role) {
            parsed.role = parsed.role === "organiser" ? "organizer" : parsed.role;
          }
        }
        return parsed;
      }

      // Migration fallback for legacy organizer session
      const legacyOrg = localStorage.getItem("eventease_organizer");
      if (legacyOrg) {
        const parsed = JSON.parse(legacyOrg);
        const uid = parsed._id || parsed.id;
        return { ...parsed, _id: uid, id: uid, role: "organizer" };
      }
      return null;
    } catch {
      return null;
    }
  });

  // Track whether initial authentication/session verification is pending
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("eventease_token")));

  // Validate stored session on mount against authoritative backend
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await api.getUserProfile(token);
        if (isMounted && response.success && response.user) {
          const freshRole = response.user.role === "organiser" ? "organizer" : response.user.role;
          const uid = response.user._id || response.user.id;
          const freshUser = { ...response.user, _id: uid, id: uid, role: freshRole };
          setUser(freshUser);
          localStorage.setItem("eventease_user", JSON.stringify(freshUser));
          if (freshRole === "organizer") {
            localStorage.setItem("eventease_organizer", JSON.stringify(freshUser));
          } else {
            localStorage.removeItem("eventease_organizer");
          }
        }
      } catch (err) {
        // If token has expired, invalid, or role revoked, clear session
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAuthSuccess = (data) => {
    if (data.success && data.token) {
      setToken(data.token);
      const rawUser = data.user || (data.organizer ? { ...data.organizer, role: "organizer" } : null);
      const cleanRole = rawUser?.role === "organiser" ? "organizer" : rawUser?.role;
      const uid = rawUser?._id || rawUser?.id;
      const authenticatedUser = rawUser ? { ...rawUser, _id: uid, id: uid, role: cleanRole } : null;
      setUser(authenticatedUser);

      localStorage.setItem("eventease_token", data.token);
      if (authenticatedUser) {
        localStorage.setItem("eventease_user", JSON.stringify(authenticatedUser));
        if (authenticatedUser.role === "organizer") {
          localStorage.setItem("eventease_organizer", JSON.stringify(authenticatedUser));
        } else {
          localStorage.removeItem("eventease_organizer");
        }
      }
    }
    return data;
  };

  const login = async ({ email, password, role }) => {
    const data = await api.loginUser({ email, password, role });
    return handleAuthSuccess(data);
  };

  const signup = async ({ name, email, password, role, organizerSecret }) => {
    const data = await api.signupUser({ name, email, password, role, organizerSecret });
    return handleAuthSuccess(data);
  };

  const googleLogin = async (payloadOrToken, roleIfString) => {
    let payload = {};
    if (typeof payloadOrToken === "string") {
      if (payloadOrToken.length > 200) {
        payload = { credential: payloadOrToken, role: roleIfString || "student" };
      } else {
        payload = { accessToken: payloadOrToken, role: roleIfString || "student" };
      }
    } else if (payloadOrToken && typeof payloadOrToken === "object") {
      payload = { ...payloadOrToken };
      if (!payload.role && roleIfString) {
        payload.role = roleIfString;
      }
    }
    const data = await api.googleAuth(payload);
    return handleAuthSuccess(data);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const uid = prev._id || prev.id;
      const updated = { ...prev, ...updatedFields, _id: uid, id: uid };
      localStorage.setItem("eventease_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    const uid = user?._id || user?.id;
    if (uid) {
      localStorage.removeItem(`eventease_saved_events_${uid}`);
      localStorage.removeItem(`eventease_booked_tickets_${uid}`);
    }
    // Also remove legacy un-scoped storage keys to prevent cross-account pollution
    localStorage.removeItem("eventease_saved_events");
    localStorage.removeItem("eventease_booked_tickets");

    setToken(null);
    setUser(null);
    localStorage.removeItem("eventease_token");
    localStorage.removeItem("eventease_user");
    localStorage.removeItem("eventease_organizer");
  };

  const verifiedRole = user?.role ? (user.role === "organiser" ? "organizer" : user.role) : null;
  const isOrganizer = !!token && verifiedRole === "organizer";
  const isStudent = !!token && verifiedRole === "student";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: verifiedRole,
        isOrganizer,
        isStudent,
        // Backward compatibility organizer property
        organizer: isOrganizer ? user : null,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        signup,
        googleLogin,
        updateUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
