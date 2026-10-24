export default function Hero({ searchTerm, setSearchTerm, filterAvailable, setFilterAvailable, totalEvents }) {
  return (
    <section className="hero-section">
      <div className="hero-glow"></div>
      <div className="hero-content">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          Live Developer & Tech Events Platform
        </div>

        <h1 className="hero-heading">
          Where Engineering Minds <br />
          <span className="gradient-text">Connect & Innovate.</span>
        </h1>

        <p className="hero-description">
          Discover high-impact tech conferences, architecture deep-dives, and hands-on workshops.
          Reserve your confirmed seat in seconds with instant digital passes.
        </p>

        {/* Search & Filter Control Bar */}
        <div className="hero-filter-bar">
          <div className="search-input-group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by event title, topic, or venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search events"
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-toggles">
            <button
              className={`filter-btn ${!filterAvailable ? "active" : ""}`}
              onClick={() => setFilterAvailable(false)}
            >
              All Events ({totalEvents})
            </button>
            <button
              className={`filter-btn ${filterAvailable ? "active" : ""}`}
              onClick={() => setFilterAvailable(true)}
            >
              Seats Available Only
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
