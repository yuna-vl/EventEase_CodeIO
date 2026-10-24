import { useAuth } from "../context/AuthContext.jsx";

/**
 * Floating Dark Glass Navigation Dock
 * Adapts strictly to authenticated user's role:
 * - Student: Discover, Saved, Tickets, Account
 * - Organiser: Discover, My Events, Dashboard, Account
 * - Unauthenticated: Discover, Log In
 */
export default function MobileBottomNav({
  currentView,
  setCurrentView,
  savedCount = 0,
  ticketCount = 0
}) {
  const { isAuthenticated, isOrganizer, isStudent } = useAuth();

  return (
    <nav className="floating-glass-dock-wrapper" aria-label="Mobile Navigation">
      <div className="floating-glass-dock">
        {/* 1. Discover */}
        <button
          type="button"
          className={`dock-item ${currentView === "discovery" ? "active" : ""}`}
          onClick={() => {
            setCurrentView("discovery");
            window.location.hash = "#/discovery";
          }}
          aria-label="Discover Events"
        >
          <div className="dock-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="dock-label">Discover</span>
        </button>

        {/* 2. STUDENT: Saved Events */}
        {isAuthenticated && isStudent && (
          <button
            type="button"
            className={`dock-item ${currentView === "saved" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("saved");
              window.location.hash = "#/saved";
            }}
            aria-label={`Saved Events (${savedCount})`}
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {savedCount > 0 && (
                <span className="dock-badge">{savedCount}</span>
              )}
            </div>
            <span className="dock-label">Saved</span>
          </button>
        )}

        {/* 3. STUDENT: My Tickets */}
        {isAuthenticated && isStudent && (
          <button
            type="button"
            className={`dock-item ${currentView === "tickets" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("tickets");
              window.location.hash = "#/tickets";
            }}
            aria-label={`My Tickets (${ticketCount})`}
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
              {ticketCount > 0 && (
                <span className="dock-badge">{ticketCount}</span>
              )}
            </div>
            <span className="dock-label">Tickets</span>
          </button>
        )}

        {/* 3.5. STUDENT: My Profile */}
        {isAuthenticated && isStudent && (
          <button
            type="button"
            className={`dock-item ${currentView === "profile" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("profile");
              window.location.hash = "#/profile";
            }}
            aria-label="My Profile"
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="dock-label">Profile</span>
          </button>
        )}

        {/* 4. ORGANISER: My Events */}
        {isAuthenticated && isOrganizer && (
          <button
            type="button"
            className={`dock-item ${currentView === "my-events" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("my-events");
              window.location.hash = "#/my-events";
            }}
            aria-label="My Events"
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="dock-label">My Events</span>
          </button>
        )}

        {/* 5. ORGANISER: Dashboard */}
        {isAuthenticated && isOrganizer && (
          <button
            type="button"
            className={`dock-item ${currentView === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("dashboard");
              window.location.hash = "#/dashboard";
            }}
            aria-label="Dashboard"
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            </div>
            <span className="dock-label">Dashboard</span>
          </button>
        )}

        {/* 6. Unauthenticated: Log In */}
        {!isAuthenticated && (
          <button
            type="button"
            className={`dock-item ${
              currentView === "role-selection" || currentView === "role-auth" || currentView === "login"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setCurrentView("role-selection");
              window.location.hash = "#/login";
            }}
            aria-label="Log In"
          >
            <div className="dock-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="dock-label">Log In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
