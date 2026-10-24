import EventCard from "./EventCard.jsx";

/**
 * Dark Glassmorphism Saved Events View
 */
export default function SavedEventsView({
  savedEvents,
  onSelectEvent,
  onToggleSave,
  onBrowseMore,
  onRequireAuth
}) {
  return (
    <div className="glass-subpage-container">
      <div className="subpage-header-row">
        <div>
          <h1 className="subpage-title">Saved Experiences</h1>
          <p className="subpage-subtitle">
            {savedEvents.length === 1
              ? "1 experience bookmarked for later"
              : `${savedEvents.length} experiences bookmarked for later`}
          </p>
        </div>
        {savedEvents.length > 0 && (
          <button
            type="button"
            className="btn-glass-back"
            onClick={onBrowseMore}
          >
            ← Explore All Events
          </button>
        )}
      </div>

      {savedEvents.length === 0 ? (
        <div className="glass-empty-card">
          <div className="empty-glow-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h3>No saved experiences yet</h3>
          <p>
            Tap the heart icon on any event card to save it here for instant access.
          </p>
          <button
            type="button"
            className="btn-accent-cta"
            onClick={onBrowseMore}
          >
            Discover Experiences
          </button>
        </div>
      ) : (
        <div className="glass-events-grid">
          {savedEvents.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onSelect={onSelectEvent}
              isSaved={true}
              onToggleSave={onToggleSave}
              onRequireAuth={onRequireAuth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
