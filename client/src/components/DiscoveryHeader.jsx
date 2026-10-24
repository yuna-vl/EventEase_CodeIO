import { useRef } from "react";
import { CATEGORIES } from "../utils/eventImages.js";

/**
 * Cinematic Discovery Hero & Header
 * Dark glassmorphism, ambient lighting, centered hero typography and search bar.
 */
export default function DiscoveryHeader({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  onOpenFilters,
  activeFilterCount = 0
}) {
  const chipsScrollRef = useRef(null);

  return (
    <div className="cinematic-hero-wrapper">
      {/* Ambient background glow orbs matching reference image */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-hero-center" />

      <div className="hero-editorial-container hero-centered-container">
        {/* Centered Editorial Hero Copy & Search Control */}
        <div className="hero-copy-column hero-centered-copy">
          <h1 className="hero-cinematic-title">
            Find Your Next <span className="gradient-highlight">Experience.</span>
          </h1>

          <p className="hero-cinematic-description">
            Discover hackathons, keynote seminars, esports arenas, and cultural fests.
            Instant verified digital passes with atomic seat reservations.
          </p>

          {/* Prominent Centered Dark Glass Search Bar */}
          <div className="glass-search-control hero-centered-search">
            <div className="glass-search-inner">
              <svg
                className="search-glyph"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                type="text"
                className="glass-search-input"
                placeholder="Search events, topics, or venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search events"
              />

              {searchTerm && (
                <button
                  type="button"
                  className="search-reset-btn"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}

              {/* Filter Trigger Button */}
              <button
                type="button"
                className={`glass-filter-btn ${activeFilterCount > 0 ? "has-active" : ""}`}
                onClick={onOpenFilters}
                aria-label="Open filter options"
                title="Filters"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                <span className="filter-text-label">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="filter-count-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Category Pills (Glass Badges) */}
      <div className="hero-categories-shelf">
        <div className="categories-track-container" ref={chipsScrollRef}>
          <div className="categories-pill-track">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`glass-category-chip ${isSelected ? "selected" : ""}`}
                  onClick={(e) => {
                    setSelectedCategory(cat);
                    const container = chipsScrollRef.current;
                    const chip = e.currentTarget;
                    if (container && chip) {
                      const chipLeft = chip.offsetLeft;
                      const chipWidth = chip.offsetWidth;
                      const containerWidth = container.offsetWidth;
                      container.scrollTo({
                        left: chipLeft - (containerWidth / 2) + (chipWidth / 2),
                        behavior: "smooth"
                      });
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  <span className="chip-label">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
