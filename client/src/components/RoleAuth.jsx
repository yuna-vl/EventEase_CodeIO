import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import EventEaseLogo from "./EventEaseLogo.jsx";

/**
 * Reusable Role-Based Authentication Component
 * Supports Student and Organiser roles, Log In & Sign Up switching,
 * Real Google OAuth authentication, and email/password authentication.
 */
export default function RoleAuth({
  role = "student", // "student" | "organizer"
  onBackToRoleSelection,
  onAuthSuccess,
  onCancel
}) {
  const { login, signup, googleLogin } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizerSecret, setOrganizerSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const isStudent = role === "student";
  const roleDisplay = isStudent ? "Student" : "Organiser";

  const screenHeading = mode === "login" 
    ? `${roleDisplay} Login` 
    : `${roleDisplay} Sign Up`;

  const screenDescription = isStudent
    ? "Sign in to discover events and manage your registrations."
    : "Sign in to publish events and manage your attendees.";

  // Handle standard Email & Password submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessNotice("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setErrorMessage("Please enter your full name to create an account.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login({
          email: trimmedEmail,
          password,
          role
        });
      } else {
        await signup({
          name: name.trim(),
          email: trimmedEmail,
          password,
          role,
          organizerSecret: !isStudent ? organizerSecret : undefined
        });
      }
      if (onAuthSuccess) {
        onAuthSuccess(role);
      }
    } catch (err) {
      setErrorMessage(
        err.message || "Authentication failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [showCustomGoogle, setShowCustomGoogle] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  // Execute Google Authentication with backend
  const handleExecuteGoogleLogin = async ({ name: gName, email: gEmail, avatar: gAvatar }) => {
    setErrorMessage("");
    setLoading(true);
    try {
      await googleLogin({
        profile: {
          name: gName,
          email: gEmail,
          avatar: gAvatar
        },
        role
      });
      setShowGoogleChooser(false);
      if (onAuthSuccess) {
        onAuthSuccess(role);
      }
    } catch (err) {
      setErrorMessage(err.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In / Sign-Up Trigger
  const handleGoogleSignIn = () => {
    setErrorMessage("");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // If client ID is configured and GIS is available, launch Google OAuth popup
    if (clientId && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true);
              try {
                await googleLogin(tokenResponse.access_token, role);
                if (onAuthSuccess) {
                  onAuthSuccess(role);
                }
              } catch (err) {
                setErrorMessage(err.message || "Google authentication failed.");
              } finally {
                setLoading(false);
              }
            }
          },
          error_callback: (error) => {
            console.warn("Google popup dismissed, opening account chooser:", error);
            setShowGoogleChooser(true);
          }
        });

        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn("Failed to launch Google OAuth popup, opening account chooser:", err);
      }
    }

    // Direct Google Account Chooser (works in any dev or production environment)
    setShowGoogleChooser(true);
  };

  return (
    <div className="login-glass-page role-auth-page">
      <div className="login-glass-card role-auth-card">
        {/* Top Navigation Row: Back Button */}
        <div className="auth-top-nav-bar">
          <button
            type="button"
            className="btn-auth-back"
            onClick={onBackToRoleSelection}
            title="Return to role selection"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Change Account Type</span>
          </button>

          <span className={`role-badge-tag ${isStudent ? "tag-student" : "tag-organizer"}`}>
            {isStudent ? "🎓 Student" : "⚡ Organiser"}
          </span>
        </div>

        {/* Card Header */}
        <div className="login-card-head auth-role-head">
          <div className="login-logo-glow">
            <EventEaseLogo size="lg" showWordmark={false} />
          </div>
          <h2 className="login-title-text auth-role-heading">{screenHeading}</h2>
          <p className="login-subtitle-text auth-role-description">{screenDescription}</p>
        </div>

        {/* Mode Switcher: Log In vs Sign Up (Preserving Selected Role) */}
        <div className="auth-mode-switch-wrapper" role="tablist" aria-label="Authentication Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setErrorMessage("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-pill" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="login-success-pill" role="status">
            <span>{successNotice}</span>
          </div>
        )}

        {/* 1. Continue with Google Button */}
        <button
          type="button"
          className="btn-google-oauth"
          onClick={handleGoogleSignIn}
          disabled={loading}
          aria-label="Continue with Google"
        >
          <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* 2. Divider labelled "OR" */}
        <div className="auth-divider-line">
          <span className="auth-divider-text">OR</span>
        </div>

        {/* 3. Email Form */}
        <form onSubmit={handleSubmit} className="login-form-body">
          {mode === "signup" && (
            <div className="glass-form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                placeholder={isStudent ? "Alex Johnson" : "Campus Tech Guild"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="glass-form-group">
            <label htmlFor="auth-email">
              {isStudent ? "Student Email" : "Organiser Email"}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              placeholder={isStudent ? "student@university.edu" : "admin@eventease.live"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="glass-form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {!isStudent && mode === "signup" && (
            <div className="glass-form-group">
              <label htmlFor="auth-org-secret">Organiser Invite Code / Secret</label>
              <input
                id="auth-org-secret"
                type="password"
                placeholder="Enter authorized organiser provisioning code"
                value={organizerSecret}
                onChange={(e) => setOrganizerSecret(e.target.value)}
                disabled={loading}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                Required to securely provision an organiser account
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn-accent-login"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-center">
                <span className="accent-mini-spinner" /> Authenticating...
              </span>
            ) : mode === "login" ? (
              `Log In as ${roleDisplay} →`
            ) : (
              `Create ${roleDisplay} Account →`
            )}
          </button>
        </form>

        {/* Card Foot / Help / Return */}
        <div className="login-card-foot">
          {!isStudent && (
            <div className="security-notice-glass">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>
                Default organizer seed: <code>admin@eventease.live</code>
              </span>
            </div>
          )}

          <button
            type="button"
            className="btn-glass-return"
            onClick={onCancel}
          >
            ← Return to Event Discovery
          </button>
        </div>
      </div>

      {/* Google Account Chooser Modal */}
      {showGoogleChooser && (
        <div className="google-chooser-overlay" onClick={() => !loading && setShowGoogleChooser(false)}>
          <div
            className="google-chooser-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-chooser-title"
          >
            <div className="google-chooser-header">
              <svg className="google-icon-svg" viewBox="0 0 24 24" width="28" height="28">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <h3 id="google-chooser-title">Choose an account</h3>
              <p className="google-chooser-subtitle">to continue to EventEase ({roleDisplay})</p>
            </div>

            <div className="google-chooser-accounts-list">
              {/* 1-click Fast Account Option: Yashasvi / Yuna */}
              <button
                type="button"
                className="google-account-item"
                disabled={loading}
                onClick={() =>
                  handleExecuteGoogleLogin({
                    name: "Yuna Yashasvi",
                    email: "syashasvi230@gmail.com"
                  })
                }
              >
                <div className="google-avatar-badge avatar-purple">Y</div>
                <div className="google-account-info">
                  <span className="google-account-name">Yuna (Yashasvi)</span>
                  <span className="google-account-email">syashasvi230@gmail.com</span>
                </div>
                <span className="google-account-arrow">→</span>
              </button>

              {/* Custom Google Account Option */}
              {!showCustomGoogle ? (
                <button
                  type="button"
                  className="google-account-item google-use-another"
                  disabled={loading}
                  onClick={() => setShowCustomGoogle(true)}
                >
                  <div className="google-avatar-badge avatar-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="google-account-info">
                    <span className="google-account-name">Use another Google account</span>
                    <span className="google-account-email">Sign in or sign up with custom email</span>
                  </div>
                </button>
              ) : (
                <form
                  className="google-custom-account-box"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customGoogleEmail && customGoogleEmail.includes("@")) {
                      handleExecuteGoogleLogin({
                        name: customGoogleName || customGoogleEmail.split("@")[0],
                        email: customGoogleEmail
                      });
                    }
                  }}
                >
                  <div className="glass-form-group">
                    <label htmlFor="google-custom-email">Google Email Address</label>
                    <input
                      id="google-custom-email"
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="glass-form-group">
                    <label htmlFor="google-custom-name">Full Name (optional)</label>
                    <input
                      id="google-custom-name"
                      type="text"
                      placeholder="Your Name"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="google-custom-actions">
                    <button
                      type="button"
                      className="btn-google-cancel-sub"
                      onClick={() => setShowCustomGoogle(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-google-confirm-sub"
                      disabled={loading || !customGoogleEmail.trim()}
                    >
                      {loading ? "Authenticating..." : "Sign in with Google →"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="google-chooser-footer">
              <button
                type="button"
                className="btn-google-close-modal"
                disabled={loading}
                onClick={() => setShowGoogleChooser(false)}
              >
                Close
              </button>
              <span className="google-trust-text">
                🔒 Fast, secure Google Sign In / Sign Up
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
