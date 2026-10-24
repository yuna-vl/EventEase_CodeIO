import { useEffect, useRef } from "react";

/**
 * SignOutModal
 * Dark glassmorphism confirmation modal prompting the user before completing sign out.
 */
export default function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
  userName
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    if (confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="glass-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
    >
      <div
        className="glass-signout-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="signout-modal-icon-badge" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <h3 id="signout-modal-title" className="signout-modal-title">
          Sign Out of EventEase?
        </h3>

        <p className="signout-modal-desc">
          {userName ? (
            <>
              Are you sure you want to sign out, <strong>{userName}</strong>?
            </>
          ) : (
            "Are you sure you want to sign out of your account?"
          )}
          <br />
          You will need to sign back in to access your registered events, passes, and preferences.
        </p>

        <div className="signout-modal-actions">
          <button
            type="button"
            className="btn-glass-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="btn-danger-confirm"
            onClick={onConfirm}
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
