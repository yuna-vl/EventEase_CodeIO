/**
 * Dark Glassmorphism My Tickets View
 */
export default function MyTicketsView({
  tickets,
  onViewPass,
  onBrowseMore
}) {
  return (
    <div className="glass-subpage-container">
      <div className="subpage-header-row">
        <div>
          <h1 className="subpage-title">My Tickets & Passes</h1>
          <p className="subpage-subtitle">
            {tickets.length === 1
              ? "1 confirmed digital access pass"
              : `${tickets.length} confirmed digital access passes`}
          </p>
        </div>
        {tickets.length > 0 && (
          <button
            type="button"
            className="btn-glass-back"
            onClick={onBrowseMore}
          >
            ← Explore All Events
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="glass-empty-card">
          <div className="empty-glow-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C78AF4" strokeWidth="1.8">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
          </div>
          <h3>No confirmed passes yet</h3>
          <p>
            When you reserve your spot for any live event, your digital pass and unique verification code will be available here.
          </p>
          <button
            type="button"
            className="btn-accent-cta"
            onClick={onBrowseMore}
          >
            Find Events to Attend
          </button>
        </div>
      ) : (
        <div className="glass-tickets-grid">
          {tickets.map((ticket, idx) => (
            <div
              key={ticket.registrationReference || idx}
              className="ticket-glass-card"
              onClick={() => onViewPass(ticket)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onViewPass(ticket);
              }}
            >
              <div className="ticket-badge-pill">Verified Entry Pass</div>
              <h3 className="ticket-card-title">{ticket.eventTitle || "Confirmed Experience"}</h3>

              <div className="ticket-info-grid">
                <div className="ticket-stat">
                  <span className="stat-label">Attendee</span>
                  <span className="stat-val">{ticket.participantName}</span>
                </div>
                <div className="ticket-stat">
                  <span className="stat-label">Reference</span>
                  <span className="stat-val code-font">{ticket.registrationReference}</span>
                </div>
              </div>

              <div className="ticket-card-bottom">
                <span className="ticket-date-stamp">
                  Confirmed: {ticket.registeredAt ? new Date(ticket.registeredAt).toLocaleDateString() : "Active"}
                </span>
                <span className="link-view-pass">
                  View Pass →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
