/**
 * EventEase Brand Identity & Logo
 * Cinematic dark glassmorphism version with soft violet/magenta ambient tones.
 */

export default function EventEaseLogo({
  size = "md", // 'sm' | 'md' | 'lg' | 'xl'
  showWordmark = true,
  className = ""
}) {
  const iconDimensions = {
    sm: { width: 22, height: 22 },
    md: { width: 30, height: 30 },
    lg: { width: 48, height: 48 },
    xl: { width: 68, height: 68 }
  }[size] || { width: 30, height: 30 };

  const wordmarkSizes = {
    sm: "1.1rem",
    md: "1.35rem",
    lg: "1.75rem",
    xl: "2.3rem"
  }[size] || "1.35rem";

  return (
    <div
      className={`eventease-brand-lockup ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? "0.5rem" : "0.75rem",
        userSelect: "none"
      }}
    >
      {/* Standalone EventEase Logo Icon (White Inner Symbol) */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="17 19 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="eventease-logo-svg"
        role="img"
        aria-label="EventEase Logo"
        style={{ flexShrink: 0 }}
      >
        {/* Circular Ring of 'e' */}
        <circle cx="36" cy="38" r="15" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />

        {/* The horizontal crossbar of 'e' */}
        <line x1="22" y1="38" x2="48" y2="38" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />

        {/* Integrated Checkmark at bottom right */}
        <path
          d="M32 46L36.5 50L43.5 41"
          stroke="#FFFFFF"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className="eventease-wordmark"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: wordmarkSizes,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            lineHeight: 1
          }}
        >
          Event<span style={{ color: "var(--accent-primary)" }}>Ease</span>
        </span>
      )}
    </div>
  );
}
