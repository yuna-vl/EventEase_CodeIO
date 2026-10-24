import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEventVisual } from "../utils/eventImages.js";

/**
 * Dark Glassmorphism Event Card
 * Inspired by the reference's atmospheric cards:
 * Translucent dark surfaces, thin subtle borders, soft lilac/magenta accents, and photographic imagery.
 */
export default function EventCard({
  event,
  onSelect,
  isSaved = false,
  onToggleSave,
  onRequireAuth
}) {
  const { isAuthenticated } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const visual = getEventVisual(event);

  const isCancelled = event.status === "cancelled";
  const isFull = event.registeredCount >= event.capacity;
  const availableSeats = Math.max(0, event.capacity - event.registeredCount);
  const fillPercentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  const eventDateObj = new Date(event.date);
  const isValidDate = !isNaN(eventDateObj.getTime());

  const formattedDate = isValidDate
    ? eventDateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      })
    : "TBD";

  const formattedTime = isValidDate
    ? eventDateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
    : "";

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth(event);
      }
      return;
    }
    if (onToggleSave) {
      onToggleSave(event);
    }
  };

  const hasBanner = Boolean(visual.hasBanner && visual.image);

  return (
    <article
      className={`glass-event-card ${isCancelled ? "event-is-cancelled" : isFull ? "sold-out" : ""} ${hasBanner ? "has-banner" : "no-banner"}`}
      onClick={() => onSelect(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(event);
        }
      }}
      aria-label={`View details for ${event.title}`}
    >
      {/* 1. Cover Image Container: Render ONLY if admin uploaded an actual banner */}
      {hasBanner && (
        <div className="card-media-wrapper">
          <img
            src={visual.image}
            alt={event.title}
            className={`card-cover-photo ${imageLoaded ? "is-loaded" : "is-loading"}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
          <div className="card-media-scrim" />

          {/* Favorite Save Button on Media Overlay */}
          <button
            type="button"
            className={`card-heart-button ${isSaved ? "favorited" : ""}`}
            onClick={handleFavoriteClick}
            aria-label={isSaved ? "Remove from saved events" : "Save this event"}
            title={isSaved ? "Saved" : "Save event"}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill={isSaved ? "#C78AF4" : "none"}
              stroke={isSaved ? "#C78AF4" : "#FFFFFF"}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Status Pill Overlay */}
          <div className="card-status-badges">
            {isFull ? (
              <span className="glass-status-pill status-soldout">Sold Out</span>
            ) : (
              <span className="glass-status-pill status-available">
                {availableSeats} seats left
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Card Info & Meta Body: Adapts naturally whether banner exists or not */}
      <div className="card-body-wrapper">
        <div className="card-category-row">
          <div className="card-category-left">
            <span className="card-category-tag">{visual.category}</span>
            <span className={`card-price-tag ${visual.priceDisplay === "FREE" ? "price-free" : "price-paid"}`}>
              {visual.priceDisplay}
            </span>
          </div>

          {/* If no banner, place status pill and favorite button cleanly in the top header */}
          {!hasBanner && (
            <div className="card-category-right">
              <span className={`glass-status-pill mini-badge ${isFull ? "status-soldout" : "status-available"}`}>
                {isFull ? "Sold Out" : `${availableSeats} seats left`}
              </span>
              <button
                type="button"
                className={`card-heart-button inline-heart ${isSaved ? "favorited" : ""}`}
                onClick={handleFavoriteClick}
                aria-label={isSaved ? "Remove from saved events" : "Save this event"}
                title={isSaved ? "Saved" : "Save event"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isSaved ? "#C78AF4" : "none"}
                  stroke={isSaved ? "#C78AF4" : "#FFFFFF"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <h3 className="card-headline" title={event.title}>
          {event.title}
        </h3>

        <div className="card-meta-list">
          <div className="meta-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formattedDate} {formattedTime ? `• ${formattedTime}` : ""}</span>
          </div>

          <div className="meta-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="venue-text">{event.venue}</span>
          </div>
        </div>

        {/* Capacity Meter */}
        <div className="card-capacity-meter">
          <div className="capacity-track">
            <div
              className={`capacity-glow-fill ${isFull ? "full" : fillPercentage > 75 ? "warning" : "normal"}`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
          <span className="capacity-label">
            {event.registeredCount}/{event.capacity} booked
          </span>
        </div>

        {/* Action Button */}
        <div className="card-footer-cta">
          <button
            type="button"
            className={`btn-experience-action ${isCancelled ? "btn-cancelled-action" : isFull ? "disabled" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCancelled && !isFull && !isAuthenticated && onRequireAuth) {
                onRequireAuth(event);
              } else {
                onSelect(event);
              }
            }}
          >
            {isCancelled ? "Cancelled" : isFull ? "View Details (Full)" : "Reserve Spot →"}
          </button>
        </div>
      </div>
    </article>
  );
}
