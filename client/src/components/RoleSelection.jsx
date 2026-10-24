import EventEaseLogo from "./EventEaseLogo.jsx";

/**
 * Role Selection Screen
 * Prompts user to select their role before entering the authentication screen.
 * Strictly adheres to EventEase dark glassmorphism design system.
 */
export default function RoleSelection({ onSelectRole, onCancel }) {
  return (
    <div className="login-glass-page role-selection-page">
      <div className="login-glass-card role-selection-card">
        {/* Card Header */}
        <div className="login-card-head">
          <div className="login-logo-glow">
            <EventEaseLogo size="lg" showWordmark={false} />
          </div>
          <h2 className="login-title-text">LOG IN</h2>
          <p className="login-subtitle-text">
            Choose how you want to use EventEase.
          </p>
        </div>

        {/* Role Options */}
        <div className="role-options-grid">
          {/* Option 1: Student */}
          <button
            type="button"
            className="role-option-card role-student-card"
            onClick={() => onSelectRole("student")}
            aria-label="Student Account - Discover events, register, and connect"
          >
            <div className="role-card-content">
              <div className="role-card-header-row">
                <h3 className="role-card-title">Student</h3>
                <span className="role-pill-indicator">Attend & Explore</span>
              </div>
              <p className="role-card-desc">
                Discover events, register, and connect.
              </p>
            </div>
            <div className="role-card-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          {/* Option 2: Organiser */}
          <button
            type="button"
            className="role-option-card role-organizer-card"
            onClick={() => onSelectRole("organizer")}
            aria-label="Organiser Account - Create events, manage registrations, and manage attendees"
          >
            <div className="role-card-content">
              <div className="role-card-header-row">
                <h3 className="role-card-title">Organiser</h3>
                <span className="role-pill-indicator">Host & Manage</span>
              </div>
              <p className="role-card-desc">
                Create events, manage registrations, and manage attendees.
              </p>
            </div>
            <div className="role-card-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="login-card-foot">
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
