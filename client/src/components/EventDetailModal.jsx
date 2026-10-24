import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { getEventVisual } from "../utils/eventImages.js";

/**
 * Dark Glassmorphism Event Detail & Booking Modal
 * Spacious two-column layout on desktop, single-column on mobile.
 */
export default function EventDetailModal({
  event,
  onClose,
  onRegistrationSuccess,
  isSaved = false,
  onToggleSave,
  onRequireAuth
}) {
  const { isAuthenticated, user, token } = useAuth();
  const [participantName, setParticipantName] = useState(() => user?.name || "");
  const [email, setEmail] = useState(() => user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);

  // Synchronize authenticated student's profile details into registration fields
  useEffect(() => {
    if (user) {
      if (user.name && !participantName) setParticipantName(user.name);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  if (!event) return null;

  const visual = getEventVisual(event);
  const isCancelled = event.status === "cancelled";
  const isFull = event.registeredCount >= event.capacity;
  const availableSeats = Math.max(0, event.capacity - event.registeredCount);
  const fillPercentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  const eventDateObj = new Date(event.date);
  const isValidDate = !isNaN(eventDateObj.getTime());

  const formattedDate = isValidDate
    ? eventDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "TBD";

  const formattedTime = isValidDate
    ? eventDateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setErrorStatus(null);

    if (isCancelled) {
      setErrorMessage("Registration closed: This event has been cancelled by the organizer.");
      return;
    }

    if (!participantName.trim() || participantName.trim().length < 2) {
      setErrorMessage("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.registerForEvent(
        event._id,
        {
          participantName: participantName.trim(),
          email: email.trim().toLowerCase()
        },
        token
      );

      if (response.success && response.data) {
        onRegistrationSuccess(response.data, event);
      }
    } catch (err) {
      setErrorStatus(err.status);
      if (err.status === 409) {
        setErrorMessage(
          "⚠️ You are already registered for this event with this email. Duplicate registrations are not permitted."
        );
      } else if (err.status === 400 && err.message?.toLowerCase().includes("capacity")) {
        setErrorMessage(
          "⚠️ Registration failed: This event has reached maximum capacity."
        );
      } else {
        setErrorMessage(err.message || "Failed to complete registration. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-modal-backdrop" onClick={onClose}>
      <div
        className="glass-detail-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="btn-glass-round-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Cinematic Cover Banner: Render ONLY if event has uploaded banner */}
        {visual.hasBanner && visual.image ? (
          <div className="detail-media-banner">
            <img
              src={visual.image}
              alt={event.title}
              className="detail-banner-photo"
            />
            <div className="detail-banner-vignette" />

            {/* Floating Pill Badges */}
            <div className="detail-banner-pill-cluster">
              <span className="glass-pill-accent">{visual.priceDisplay}</span>
              <span className="glass-pill-tag">{visual.category}</span>
              <span className={`glass-pill-status ${isFull ? "status-sold" : "status-open"}`}>
                {isFull ? "Sold Out" : `${availableSeats} Seats Left`}
              </span>
            </div>

            {/* Favorite Toggle */}
            {onToggleSave && (
              <button
                type="button"
                className={`detail-fav-btn ${isSaved ? "is-fav" : ""}`}
                onClick={() => onToggleSave(event)}
                aria-label={isSaved ? "Saved" : "Save event"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "#C78AF4" : "none"} stroke={isSaved ? "#C78AF4" : "#FFFFFF"} strokeWidth="2.2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="detail-nobanner-header">
            <div className="detail-nobanner-pills">
              <span className="glass-pill-accent">{visual.priceDisplay}</span>
              <span className="glass-pill-tag">{visual.category}</span>
              <span className={`glass-pill-status ${isFull ? "status-sold" : "status-open"}`}>
                {isFull ? "Sold Out" : `${availableSeats} Seats Left`}
              </span>
            </div>
            {onToggleSave && (
              <button
                type="button"
                className={`detail-fav-btn inline-btn ${isSaved ? "is-fav" : ""}`}
                onClick={() => onToggleSave(event)}
                aria-label={isSaved ? "Saved" : "Save event"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "#C78AF4" : "none"} stroke={isSaved ? "#C78AF4" : "#FFFFFF"} strokeWidth="2.2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Dialog Content Grid */}
        <div className="detail-grid-layout">
          {/* Left Column: Event Narrative & Schedule */}
          <div className="detail-content-col">
            <h1 id="detail-title" className="detail-heading">
              {event.title}
            </h1>

            <div className="detail-meta-tiles">
              <div className="meta-tile">
                <div className="tile-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="tile-text">
                  <span className="tile-label">Date & Time</span>
                  <span className="tile-value">{formattedDate} {formattedTime ? `• ${formattedTime}` : ""}</span>
                </div>
              </div>

              <div className="meta-tile">
                <div className="tile-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="2.2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="tile-text">
                  <span className="tile-label">Location / Venue</span>
                  <span className="tile-value">{event.venue}</span>
                </div>
              </div>
            </div>

            <div className="detail-description-box">
              <h3 className="section-title">About This Experience</h3>
              <p className="description-text">{event.description}</p>
            </div>

            {/* Capacity Meter */}
            <div className="detail-capacity-panel">
              <div className="capacity-stat-line">
                <span className="panel-label">Seat Allocation</span>
                <span className="panel-count">
                  {event.registeredCount} / {event.capacity} Booked ({fillPercentage}%)
                </span>
              </div>
              <div className="capacity-bar-track">
                <div
                  className={`capacity-glow-fill ${isFull ? "full" : fillPercentage > 75 ? "warning" : "normal"}`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Reservation Card */}
          <div className="detail-action-col">
            <div className="glass-booking-card">
              <div className="booking-card-head">
                <span className="instant-badge">Instant Pass</span>
                <h3 className="booking-card-title">Reserve Your Spot</h3>
                <p className="booking-card-subtitle">
                  {isCancelled
                    ? "This event has been cancelled by the organizer."
                    : isFull
                    ? "All available capacity has been reserved."
                    : "Enter your attendee details to generate your confirmed entry pass."}
                </p>
              </div>

              {isCancelled ? (
                <div className="booking-exhausted-notice booking-cancelled-notice">
                  <div className="notice-lock-icon">✕</div>
                  <h4>Event Cancelled</h4>
                  <p>This event was cancelled by the organizer. New registrations are permanently closed.</p>
                  {event.cancellationReason && (
                    <div className="cancellation-reason-callout">
                      <strong>Reason:</strong> {event.cancellationReason}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    onClick={onClose}
                  >
                    Explore Other Events
                  </button>
                </div>
              ) : isFull ? (
                <div className="booking-exhausted-notice">
                  <div className="notice-lock-icon">🔒</div>
                  <h4>Sold Out</h4>
                  <p>All allocated seats have been reserved by attendees.</p>
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    onClick={onClose}
                  >
                    Explore Other Events
                  </button>
                </div>
              ) : !isAuthenticated ? (
                <div className="booking-login-prompt">
                  <div className="login-prompt-icon">🔒</div>
                  <h4>Authentication Required</h4>
                  <p>
                    Please log in or create an account to reserve your spot and claim your instant entry pass.
                  </p>
                  <button
                    type="button"
                    className="btn-accent-reserve"
                    onClick={() => {
                      if (onRequireAuth) {
                        onRequireAuth(event);
                      }
                    }}
                  >
                    Log In to Reserve Spot →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="booking-form-glass">
                  {errorMessage && (
                    <div
                      className={`glass-alert-bar ${
                        errorStatus === 409 ? "alert-warning" : "alert-error"
                      }`}
                    >
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="glass-input-wrapper">
                    <label htmlFor="modal-reg-name">Full Name *</label>
                    <input
                      id="modal-reg-name"
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="glass-input-wrapper">
                    <label htmlFor="modal-reg-email">Email Address *</label>
                    <input
                      id="modal-reg-email"
                      type="email"
                      required
                      placeholder="e.g. alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                    />
                    <small className="field-hint-text">
                      Your unique registration pass will be linked to this email.
                    </small>
                  </div>

                  <button
                    type="submit"
                    className="btn-accent-reserve"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="spinner-align">
                        <span className="accent-mini-spinner" /> Generating Pass...
                      </span>
                    ) : (
                      "Confirm & Generate Pass →"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
