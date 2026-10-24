import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import EventEaseLogo from "./EventEaseLogo.jsx";
import NotificationBell from "./NotificationBell.jsx";
import SignOutModal from "./SignOutModal.jsx";

/**
 * Cinematic Dark Glass Navbar
 * Strictly connects navigation options to the authenticated user's verified role:
 * - Student: Discover, Saved Events, My Tickets, Student profile, Sign Out
 * - Organiser: Discover, My Events, Dashboard, Organiser profile, Sign Out
 * - Saved Events and My Tickets are strictly removed from Organiser navigation
 * - Preserves session restoration without flashing wrong role
 */
export default function Navbar({
  currentView,
  setCurrentView,
  savedCount = 0,
  ticketCount = 0
}) {
  const { isAuthenticated, user, isOrganizer, isStudent, loading, logout } = useAuth();


  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    logout();
    setCurrentView("discovery");
    if (window.location.hash) {
      window.location.hash = "#/discovery";
    }
  };

  return (
    <header className="cinematic-nav-header">
      <div className="nav-bounds-container">
        {/* Brand Logo */}
        <div
          className="nav-brand-container"
          onClick={() => {
            setCurrentView("discovery");
            window.location.hash = "#/discovery";
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setCurrentView("discovery");
              window.location.hash = "#/discovery";
            }
          }}
          aria-label="EventEase Home"
        >
          <EventEaseLogo size="md" showWordmark={true} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-glass-nav" aria-label="Main Navigation">
          {/* 1. Discover - Available for everyone */}
          <button
            type="button"
            className={`glass-nav-pill ${currentView === "discovery" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("discovery");
              window.location.hash = "#/discovery";
            }}
          >
            Discover
          </button>

          {/* 2. Loading placeholder: Do not flash role-specific items while session verifies */}
          {loading && (
            <div className="nav-loading-shimmer" style={{ width: 120, height: 20, opacity: 0.4 }} />
          )}

          {/* 3. STUDENT ONLY Navigation Items */}
          {!loading && isAuthenticated && isStudent && (
            <>
              <button
                type="button"
                className={`glass-nav-pill ${currentView === "saved" ? "active" : ""}`}
                onClick={() => {
                  setCurrentView("saved");
                  window.location.hash = "#/saved";
                }}
              >
                Saved Events
                {savedCount > 0 && (
                  <span className="glass-pill-badge">{savedCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`glass-nav-pill ${currentView === "tickets" ? "active" : ""}`}
                onClick={() => {
                  setCurrentView("tickets");
                  window.location.hash = "#/tickets";
                }}
              >
                My Tickets
                {ticketCount > 0 && (
                  <span className="glass-pill-badge">{ticketCount}</span>
                )}
              </button>
            </>
          )}

          {/* 4. ORGANISER ONLY Navigation Items */}
          {!loading && isAuthenticated && isOrganizer && (
            <>
              <button
                type="button"
                className={`glass-nav-pill ${currentView === "my-events" ? "active" : ""}`}
                onClick={() => {
                  setCurrentView("my-events");
                  window.location.hash = "#/my-events";
                }}
              >
                My Events
              </button>

              <button
                type="button"
                className={`glass-nav-pill ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => {
                  setCurrentView("dashboard");
                  window.location.hash = "#/dashboard";
                }}
              >
                Dashboard
              </button>
            </>
          )}
        </nav>

        {/* Auth / Role-based Trailing Actions */}
        <div className="nav-trailing-actions">
          {loading ? (
            <div className="nav-profile-loading" style={{ width: 90, height: 32, opacity: 0.3 }} />
          ) : isAuthenticated ? (
            <div className="authenticated-user-dock">
              {/* Student Notification Center */}
              <NotificationBell />

              {/* Profile Badge: Clicking personal avatar or name opens student's own profile */}
              <div
                className={`user-profile-badge ${isStudent ? "is-clickable" : ""} ${currentView === "profile" ? "active" : ""}`}
                title={
                  isStudent
                    ? `Open your student profile (${user?.name || "Student"})`
                    : `${user?.name || "Organiser"} (${user?.email})`
                }
                onClick={
                  isStudent
                    ? () => {
                        setCurrentView("profile");
                        window.location.hash = "#/profile";
                      }
                    : undefined
                }
                role={isStudent ? "button" : undefined}
                tabIndex={isStudent ? 0 : undefined}
                onKeyDown={
                  isStudent
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCurrentView("profile");
                          window.location.hash = "#/profile";
                        }
                      }
                    : undefined
                }
                aria-label={isStudent ? `Open ${user?.name || "My"} Student Profile` : undefined}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || "Avatar"} className="profile-avatar-img" />
                ) : (
                  <span className="profile-initial">
                    {user?.name ? user.name.charAt(0).toUpperCase() : (isOrganizer ? "O" : "S")}
                  </span>
                )}
                <span className="profile-name">
                  {user?.name || (isOrganizer ? "Organiser" : "Student")}
                </span>
                <span className={`profile-role-tag ${isOrganizer ? "is-org" : "is-stud"}`}>
                  {isOrganizer ? "Organiser" : "Student"}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                className="btn-glass-logout"
                onClick={() => setShowSignOutModal(true)}
                title="Sign out of current account"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`btn-organizer-glass ${currentView === "role-selection" || currentView === "role-auth" ? "active" : ""}`}
              onClick={() => {
                setCurrentView("role-selection");
                window.location.hash = "#/login";
              }}
            >
              LOG IN
            </button>
          )}
        </div>
      </div>

      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
        userName={user?.name}
      />
    </header>
  );
}
