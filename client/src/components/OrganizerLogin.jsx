import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import EventEaseLogo from "./EventEaseLogo.jsx";

/**
 * Organizer Login Screen
 * Styled in dark glassmorphism with soft violet/magenta ambient highlights.
 */
export default function OrganizerLogin({ onLoginSuccess, onCancel }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both organizer email and password.");
      return;
    }

    setLoading(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password
      });
      onLoginSuccess();
    } catch (err) {
      setErrorMessage(
        err.message || "Invalid credentials. Please verify your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-glass-page">
      <div className="login-glass-card">
        {/* Card Header */}
        <div className="login-card-head">
          <div className="login-logo-glow">
            <EventEaseLogo size="lg" showWordmark={false} />
          </div>
          <h2 className="login-title-text">Organizer Portal</h2>
          <p className="login-subtitle-text">
            Sign in to manage live events, monitor capacities, and access attendee rosters.
          </p>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form-body">
          <div className="glass-form-group">
            <label htmlFor="login-email">Organizer Email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@eventease.live"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="glass-form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-accent-login"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-center">
                <span className="accent-mini-spinner" /> Authenticating...
              </span>
            ) : (
              "Sign In to Dashboard →"
            )}
          </button>
        </form>

        {/* Security & Return Footer */}
        <div className="login-card-foot">
          <div className="security-notice-glass">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>
              Secure credentials provisioned via CLI seed: <code>admin@eventease.live</code>
            </span>
          </div>

          <button
            type="button"
            className="btn-glass-return"
            onClick={onCancel}
          >
            ← Return to Event Discovery
          </button>
        </div>
      </div>
    </div>
  );
}
