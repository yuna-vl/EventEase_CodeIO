import { useEffect, useState } from "react";
import EventEaseLogo from "./EventEaseLogo.jsx";

/**
 * Mobile / Initial Splash Screen
 * Dark cinematic glassmorphism version with soft violet/magenta ambient illumination.
 */
export default function SplashScreen({ onComplete }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onComplete();
      }, 400);
    }, 1100);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`splash-cinematic-overlay ${fading ? "fade-out" : ""}`}
      onClick={() => {
        setFading(true);
        setTimeout(onComplete, 200);
      }}
      role="button"
      tabIndex={0}
      aria-label="Tap to enter EventEase"
    >
      <div className="splash-ambient-halo" />

      <div className="splash-center-block">
        <div className="splash-logo-mount">
          <EventEaseLogo size="xl" showWordmark={false} />
        </div>

        <div className="splash-brand-heading">
          <span className="splash-title">
            Event<span className="splash-glow">Ease</span>
          </span>
        </div>

        <div className="splash-progress-track">
          <div className="splash-progress-bar" />
        </div>
      </div>
    </div>
  );
}
