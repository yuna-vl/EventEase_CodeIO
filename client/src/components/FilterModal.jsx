import { useState, useRef } from "react";
import { CATEGORIES } from "../utils/eventImages.js";

/**
 * Dark Glass Filter Modal / Bottom Sheet
 * Refined experience discovery with:
 * - Category selection
 * - Interactive Date & Schedule calendar picker
 * - Seats Available Only toggle
 */
export default function FilterModal({
  isOpen,
  onClose,
  initialFilters,
  onApplyFilters
}) {
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || "All");
  const [dateFilter, setDateFilter] = useState(initialFilters?.dateFilter || "all");
  const [customDate, setCustomDate] = useState(initialFilters?.customDate || "");
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(Boolean(initialFilters?.availableOnly));
  const dateInputRef = useRef(null);

  if (!isOpen) return null;

  const handleOpenCalendar = () => {
    setDateFilter("custom");
    if (dateInputRef.current) {
      try {
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const handleClear = () => {
    setSelectedCategory("All");
    setDateFilter("all");
    setCustomDate("");
    setFilterAvailableOnly(false);
  };

  const handleApply = () => {
    onApplyFilters({
      category: selectedCategory,
      dateFilter,
      customDate,
      availableOnly: filterAvailableOnly
    });
    onClose();
  };

  return (
    <div className="glass-modal-backdrop" onClick={onClose}>
      <div
        className="glass-filter-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
      >
        {/* Mobile Swipe Handle Indicator */}
        <div className="filter-sheet-handle" />

        {/* Modal Header */}
        <div className="filter-glass-header">
          <div className="header-title-block">
            <h2 id="filter-title" className="filter-heading">
              Filter Experiences
            </h2>
            <span className="filter-sub-heading">Refine your event discovery</span>
          </div>
          <button
            type="button"
            className="btn-glass-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Filters Content */}
        <div className="filter-glass-content">
          {/* 1. Categories Section */}
          <div className="filter-group-block">
            <div className="filter-group-header">
              <h3 className="group-title">Category</h3>
              <span className="active-filter-indicator">
                {selectedCategory === "All" ? "All Categories" : selectedCategory}
              </span>
            </div>
            <div className="glass-chips-cluster">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`glass-filter-chip ${selectedCategory === cat ? "is-active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Date & Schedule Section with Calendar Picker */}
          <div className="filter-group-block">
            <div className="filter-group-header">
              <h3 className="group-title">Date & Schedule</h3>
              {dateFilter === "custom" && customDate && (
                <span className="active-filter-indicator">
                  {new Date(customDate + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              )}
            </div>

            <div className="glass-chips-cluster">
              <button
                type="button"
                className={`glass-filter-chip ${dateFilter === "all" ? "is-active" : ""}`}
                onClick={() => {
                  setDateFilter("all");
                  setCustomDate("");
                }}
              >
                All Dates
              </button>

              <button
                type="button"
                className={`glass-filter-chip ${dateFilter === "today" ? "is-active" : ""}`}
                onClick={() => setDateFilter("today")}
              >
                Today
              </button>

              <button
                type="button"
                className={`glass-filter-chip ${dateFilter === "tomorrow" ? "is-active" : ""}`}
                onClick={() => setDateFilter("tomorrow")}
              >
                Tomorrow
              </button>

              <button
                type="button"
                className={`glass-filter-chip ${dateFilter === "weekend" ? "is-active" : ""}`}
                onClick={() => setDateFilter("weekend")}
              >
                This Weekend
              </button>

              <button
                type="button"
                className={`glass-filter-chip date-picker-cta-chip ${dateFilter === "custom" ? "is-active" : ""}`}
                onClick={handleOpenCalendar}
              >
                <span>Select Date 📅</span>
              </button>
            </div>

            {/* Interactive Calendar Input Box */}
            <div className={`filter-calendar-picker-box ${dateFilter === "custom" ? "is-highlighted" : ""}`}>
              <div className="calendar-box-label">
                <span>Pick a Specific Date</span>
                <span className="calendar-subtext">Click to open browser calendar</span>
              </div>
              <div className="calendar-picker-input-row">
                <input
                  ref={dateInputRef}
                  id="filter-custom-date-picker"
                  type="date"
                  className="glass-native-date-input"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDateFilter(e.target.value ? "custom" : "all");
                  }}
                  aria-label="Select custom event date"
                />
                {customDate && (
                  <button
                    type="button"
                    className="btn-clear-date-mini"
                    onClick={() => {
                      setCustomDate("");
                      setDateFilter("all");
                    }}
                    title="Clear selected date"
                    aria-label="Clear date"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {customDate && dateFilter === "custom" && (
                <div className="glass-note-bubble">
                  🗓️ Selected Date: <strong>{new Date(customDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}</strong>
                </div>
              )}
            </div>
          </div>

          {/* 3. Availability Toggle */}
          <div className="filter-group-block availability-block">
            <label className="glass-toggle-label">
              <span className="toggle-title-text">Seats Available Only</span>
              <input
                type="checkbox"
                checked={filterAvailableOnly}
                onChange={(e) => setFilterAvailableOnly(e.target.checked)}
                className="hidden-checkbox"
              />
              <span className="glass-toggle-switch" />
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div className="filter-glass-actions">
          <button
            type="button"
            className="btn-glass-clear"
            onClick={handleClear}
          >
            Clear All
          </button>
          <button
            type="button"
            className="btn-glass-apply"
            onClick={handleApply}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

