import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function OrganizerDashboard() {
  const { token, organizer, logout } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Event Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const fileInputRef = useRef(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    venue: "",
    capacity: "",
    registrationType: "free", // "free" | "paid"
    price: "",
    bannerPreview: "",
    bannerFile: null,
    bannerName: ""
  });

  // Attendee Roster State
  const [selectedEventForRoster, setSelectedEventForRoster] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeError, setAttendeeError] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");

  // Cancellation Modal State
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [stats, setStats] = useState({
    totalEvents: 0,
    confirmedRegistrations: 0,
    availableCapacity: 0,
    totalActiveCapacity: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch current organizer's events (including historical/cancelled)
      const eventsRes = await api.getOrganizerEvents(token, { includeCancelled: "true" });
      if (eventsRes.success && Array.isArray(eventsRes.data)) {
        setEvents(eventsRes.data);
      }

      // 2. Fetch authoritative backend calculated dashboard statistics
      const statsRes = await api.getOrganizerStats(token);
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        setError(err.message || "Failed to load organizer dashboard data");
      }
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Lock background scroll and listen for Escape key when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedEventForRoster || showCreateModal || cancellingEvent);
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedEventForRoster) setSelectedEventForRoster(null);
        if (showCreateModal) setShowCreateModal(false);
        if (cancellingEvent && !isCancelling) setCancellingEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedEventForRoster, showCreateModal, cancellingEvent, isCancelling]);

  const resetFormState = () => {
    setNewEvent({
      title: "",
      description: "",
      date: "",
      venue: "",
      capacity: "",
      registrationType: "free",
      price: "",
      bannerPreview: "",
      bannerFile: null,
      bannerName: ""
    });
    setCreateError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Event Banner Upload / Selection
  const handleBannerFileSelect = (e) => {
    setCreateError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setCreateError("Invalid file type. Please upload a PNG, JPG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size limit (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setCreateError("Banner image exceeds the 5MB size limit. Please choose a smaller image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewEvent((prev) => ({
        ...prev,
        bannerPreview: reader.result,
        bannerFile: file,
        bannerName: file.name
      }));
    };
    reader.onerror = () => {
      setCreateError("Failed to read the selected image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setNewEvent((prev) => ({
      ...prev,
      bannerPreview: "",
      bannerFile: null,
      bannerName: ""
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Event Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (
      !newEvent.title.trim() ||
      !newEvent.description.trim() ||
      !newEvent.date ||
      !newEvent.venue.trim() ||
      !newEvent.capacity
    ) {
      setCreateError("All required fields must be filled out.");
      return;
    }

    const capNum = Number(newEvent.capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      setCreateError("Capacity must be a positive whole integer of at least 1.");
      return;
    }

    // Validate registration price if paid
    if (newEvent.registrationType === "paid") {
      const p = Number(newEvent.price);
      if (isNaN(p) || p <= 0) {
        setCreateError("Please enter a valid positive registration price in ₹ (greater than 0).");
        return;
      }
    }

    setCreating(true);
    try {
      const response = await api.createEvent(
        {
          title: newEvent.title.trim(),
          description: newEvent.description.trim(),
          date: new Date(newEvent.date).toISOString(),
          venue: newEvent.venue.trim(),
          capacity: capNum,
          registrationType: newEvent.registrationType,
          price: newEvent.registrationType === "paid" ? Number(newEvent.price) : 0,
          bannerUrl: newEvent.bannerPreview || null
        },
        token
      );

      if (response.success) {
        setShowCreateModal(false);
        resetFormState();
        await fetchDashboardData();
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        setCreateError(err.message || "Failed to create event.");
      }
    } finally {
      setCreating(false);
    }
  };

  // Open Attendee Roster
  const handleViewAttendees = async (event) => {
    setSelectedEventForRoster(event);
    setLoadingAttendees(true);
    setAttendeeError("");
    setAttendees([]);
    setAttendeeSearch("");

    try {
      const response = await api.getEventAttendees(event._id, token);
      if (response.success && Array.isArray(response.data)) {
        setAttendees(response.data);
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        setAttendeeError(err.message || "Failed to load attendees.");
      }
    } finally {
      setLoadingAttendees(false);
    }
  };

  const [markingAttendanceId, setMarkingAttendanceId] = useState(null);

  const handleMarkAttendance = async (attendeeId) => {
    if (!selectedEventForRoster?._id) return;
    setMarkingAttendanceId(attendeeId);
    try {
      const res = await api.markAttendeeAttendance(selectedEventForRoster._id, attendeeId, token);
      if (res && res.success) {
        setAttendees((prev) =>
          prev.map((att) =>
            att._id === attendeeId
              ? {
                  ...att,
                  attended: true,
                  attendedAt: res.data.attendedAt,
                  pointsAwarded: res.data.pointsAwarded
                }
              : att
          )
        );
      } else {
        alert(res?.message || "Failed to mark attendance");
      }
    } catch (err) {
      alert(err.message || "Error verifying attendee attendance");
    } finally {
      setMarkingAttendanceId(null);
    }
  };

  // Handle Event Cancellation with Participant Notification
  const handleConfirmCancel = async () => {
    if (!cancellingEvent) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      const res = await api.cancelEvent(cancellingEvent._id, cancellationReason, token);
      if (res && res.success) {
        setEvents((prev) =>
          prev.map((e) =>
            e._id === cancellingEvent._id
              ? {
                  ...e,
                  status: "cancelled",
                  cancelledAt: res.data?.cancelledAt || new Date().toISOString(),
                  cancellationReason: res.data?.cancellationReason || cancellationReason
                }
              : e
          )
        );
        setCancellingEvent(null);
        // Refresh authoritative statistics immediately
        fetchDashboardData();
      } else {
        setCancelError(res?.message || "Failed to cancel event");
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        setCancelError(err.message || "Failed to process cancellation request");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will cancel the event and delete all participant registrations.`)) {
      return;
    }

    try {
      await api.deleteEvent(eventId, token);
      await fetchDashboardData();
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        alert(err.message || "Failed to delete event");
      }
    }
  };

  // Authoritative Server-Side Dashboard Statistics
  const totalEvents = stats?.totalEvents ?? 0;
  const totalRegistrations = stats?.confirmedRegistrations ?? 0;
  const availableCapacity = stats?.availableCapacity ?? 0;
  const totalActiveCapacity = stats?.totalActiveCapacity ?? 0;

  // Filtered Attendees
  const filteredAttendees = attendees.filter(
    (att) =>
      att.participantName?.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      att.email?.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      att.registrationReference?.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <span className="dashboard-badge">Authorized Management Portal</span>
          <h1 className="dashboard-title">Organizer Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, <strong>{organizer?.name || "Organizer"}</strong> ({organizer?.email}).
          </p>
        </div>

        <button className="btn btn-primary btn-create" onClick={() => setShowCreateModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Publish New Event
        </button>
      </div>

      {/* Metrics Row (Authoritative Server-Side Stats) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Events</span>
          <span className="metric-value">{totalEvents}</span>
          <span className="metric-sub">Active events published by you</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Confirmed Registrations</span>
          <span className="metric-value">{totalRegistrations}</span>
          <span className="metric-sub">Verified participant passes</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Available Capacity</span>
          <span className="metric-value">{availableCapacity}</span>
          <span className="metric-sub">Out of {totalActiveCapacity} active spots</span>
        </div>
      </div>

      {/* Events Table / List Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>Platform Events</h2>
            <p>Your live event schedules, capacity utilization, and attendee access</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Loading events from database...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <p>No events found. Click "Publish New Event" to create your first tech session!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Name & Details</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th>Seat Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const isFull = ev.registeredCount >= ev.capacity;
                  const pct = Math.min(100, Math.round((ev.registeredCount / ev.capacity) * 100));
                  const isCancelled = ev.status === "cancelled";
                  const isDraft = ev.status === "draft";
                  const isPublished = ev.status === "published";
                  return (
                    <tr key={ev._id} className={isCancelled ? "row-cancelled-event" : ""}>
                      <td className="cell-event-title">
                        <div className="dashboard-title-line">
                          <strong>{ev.title}</strong>
                          <span className={`dashboard-price-pill ${ev.registrationType === "paid" && ev.price > 0 ? "pill-paid" : "pill-free"}`}>
                            {ev.registrationType === "paid" && ev.price > 0 ? `₹${ev.price}` : "FREE"}
                          </span>
                        </div>
                        <span className="cell-event-desc">
                          {ev.description.substring(0, 80)}...
                        </span>
                      </td>
                      <td className="cell-nowrap">
                        {new Date(ev.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>
                      <td>{ev.venue}</td>
                      <td>
                        <div className="table-capacity-wrap">
                          <span>
                            {ev.registeredCount} / {ev.capacity} ({pct}%)
                          </span>
                          <div className="progress-track mini">
                            <div
                              className={`progress-fill ${isFull ? "fill-full" : pct > 75 ? "fill-warning" : "fill-normal"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        {isCancelled ? (
                          <span
                            className="badge-status-cancelled"
                            title={`Cancelled on ${ev.cancelledAt ? new Date(ev.cancelledAt).toLocaleString() : "Date recorded"}${ev.cancellationReason ? ` - ${ev.cancellationReason}` : ""}`}
                          >
                            ✕ Cancelled
                          </span>
                        ) : isDraft ? (
                          <span
                            style={{
                              background: "rgba(148, 163, 184, 0.15)",
                              color: "#94a3b8",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "999px",
                              fontSize: "0.8rem",
                              border: "1px solid rgba(148, 163, 184, 0.3)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}
                          >
                            ◌ Draft
                          </span>
                        ) : isPublished ? (
                          <span className="badge-status-active">
                            ● Published
                          </span>
                        ) : (
                          <span className="badge-status-active">
                            ● Active
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewAttendees(ev)}
                          >
                            View Attendees ({ev.registeredCount})
                          </button>
                          {!isCancelled && !isDraft ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-action-cancel"
                              onClick={() => {
                                setCancellingEvent(ev);
                                setCancellationReason("");
                                setCancelError("");
                              }}
                              title="Cancel this event and notify registered students"
                            >
                              Cancel Event
                            </button>
                          ) : isCancelled ? (
                            <span className="badge-cancelled-muted" title="Event has been cancelled">
                              Cancelled
                            </span>
                          ) : (
                            <span className="badge-cancelled-muted" title="Draft events cannot be cancelled">
                              Draft
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#F87171", borderColor: "rgba(248, 113, 113, 0.4)" }}
                            onClick={() => handleDeleteEvent(ev._id, ev.title)}
                            title="Delete this event"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setShowCreateModal(false)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <div className="admin-modal-header">
              <div className="modal-header-content">
                <span className="roster-kicker-tag">EVENT MANAGEMENT</span>
                <h2 id="create-modal-title" className="admin-modal-title">
                  Publish New Event
                </h2>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {createError && (
                <div className="alert-banner alert-danger">
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="create-event-form">
                <div className="form-group">
                  <label htmlFor="ev-title">Event Title *</label>
                  <input
                    id="ev-title"
                    type="text"
                    required
                    placeholder="e.g. Next.js & Server Components Deep Dive"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    disabled={creating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ev-desc">Description *</label>
                  <textarea
                    id="ev-desc"
                    required
                    rows={4}
                    placeholder="Overview, prerequisites, agenda, and speakers..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    disabled={creating}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ev-date">Date & Time *</label>
                    <input
                      id="ev-date"
                      type="datetime-local"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      disabled={creating}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ev-capacity">Max Capacity *</label>
                    <input
                      id="ev-capacity"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 50"
                      value={newEvent.capacity}
                      onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ev-venue">Venue or Virtual URL *</label>
                  <input
                    id="ev-venue"
                    type="text"
                    required
                    placeholder="e.g. Auditorium B, Silicon Tower or Zoom Webinar"
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                    disabled={creating}
                  />
                </div>

                {/* 1. REGISTRATION TYPE: Free vs Paid */}
                <div className="form-group">
                  <label className="form-label-with-hint">
                    <span>Registration Type *</span>
                    <span className="label-hint">Select ticket access model</span>
                  </label>
                  <div className="registration-type-toggle" role="radiogroup" aria-label="Registration Type">
                    <button
                      type="button"
                      className={`reg-type-pill ${newEvent.registrationType === "free" ? "is-active" : ""}`}
                      onClick={() => setNewEvent((prev) => ({ ...prev, registrationType: "free" }))}
                      role="radio"
                      aria-checked={newEvent.registrationType === "free"}
                    >
                      <span className="pill-dot-indicator"></span>
                      <span>Free Registration</span>
                    </button>
                    <button
                      type="button"
                      className={`reg-type-pill ${newEvent.registrationType === "paid" ? "is-active" : ""}`}
                      onClick={() => setNewEvent((prev) => ({ ...prev, registrationType: "paid" }))}
                      role="radio"
                      aria-checked={newEvent.registrationType === "paid"}
                    >
                      <span className="pill-dot-indicator"></span>
                      <span>Paid Registration</span>
                    </button>
                  </div>
                </div>

                {/* 2. REGISTRATION PRICE IN INR (₹) */}
                {newEvent.registrationType === "paid" && (
                  <div className="form-group price-field-animate">
                    <label htmlFor="ev-price">Registration Price (₹) *</label>
                    <div className="currency-input-wrap">
                      <span className="currency-symbol-addon" aria-hidden="true">₹</span>
                      <input
                        id="ev-price"
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="e.g. 499"
                        value={newEvent.price}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, price: e.target.value }))}
                        disabled={creating}
                        className="currency-field-input"
                        aria-label="Registration Price in Indian Rupees"
                      />
                    </div>
                    <span className="input-field-hint">Specify ticket fee in Indian Rupees (INR)</span>
                  </div>
                )}

                {/* 3. EVENT BANNER UPLOAD FIELD (OPTIONAL) */}
                <div className="form-group">
                  <label className="form-label-with-hint">
                    <span>Event Banner (Optional)</span>
                    <span className="label-hint">PNG, JPG or WebP (max 5MB)</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    style={{ display: "none" }}
                    onChange={handleBannerFileSelect}
                    disabled={creating}
                  />

                  {newEvent.bannerPreview ? (
                    <div className="banner-preview-box">
                      <img
                        src={newEvent.bannerPreview}
                        alt="Banner Preview"
                        className="banner-preview-img"
                      />
                      <div className="banner-preview-meta">
                        <div className="banner-file-info">
                          <span className="banner-filename">{newEvent.bannerName || "Uploaded Banner"}</span>
                          <span className="banner-status-tag">Ready to publish</span>
                        </div>
                        <div className="banner-action-buttons">
                          <button
                            type="button"
                            className="btn-banner-action btn-replace"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={creating}
                          >
                            Replace Image
                          </button>
                          <button
                            type="button"
                            className="btn-banner-action btn-remove"
                            onClick={handleRemoveBanner}
                            disabled={creating}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="banner-upload-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="upload-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <div className="upload-text-block">
                        <span className="upload-main-text">Upload event banner</span>
                        <span className="upload-sub-text">PNG, JPG or WebP up to 5MB</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetFormState();
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? "Publishing Event..." : "Publish Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDEE ROSTER MODAL OVERLAY */}
      {selectedEventForRoster && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedEventForRoster(null)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog admin-modal-lg roster-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-modal-title"
          >
            {/* Modal Header */}
            <div className="admin-modal-header">
              <div className="modal-header-content">
                <span className="roster-kicker-tag">EVENT PARTICIPANTS</span>
                <h2 id="roster-modal-title" className="admin-modal-title">
                  Attendee Roster
                </h2>
                <p className="admin-modal-subtitle">
                  Event: <strong>{selectedEventForRoster.title}</strong> •{" "}
                  <span className="roster-count-accent">
                    {selectedEventForRoster.registeredCount} / {selectedEventForRoster.capacity} Confirmed
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedEventForRoster(null)}
                aria-label="Close attendee roster"
              >
                ✕
              </button>
            </div>

            {/* Attendee search bar */}
            {attendees.length > 0 && (
              <div className="roster-search-bar">
                <div className="roster-search-inner">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="roster-search-icon"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="roster-search-input"
                    placeholder="Filter attendees by name, email, or reference..."
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    autoFocus
                  />
                  {attendeeSearch && (
                    <button
                      type="button"
                      className="roster-search-clear"
                      onClick={() => setAttendeeSearch("")}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Body / Scrollable Content Area */}
            <div className="admin-modal-body roster-scroll-body">
              {attendeeError && (
                <div className="alert-banner alert-danger">
                  <span>{attendeeError}</span>
                </div>
              )}

              {loadingAttendees ? (
                <div className="roster-loading-state">
                  <span className="spinner"></span>
                  <p>Retrieving secure attendee roster...</p>
                </div>
              ) : attendees.length === 0 ? (
                <div className="roster-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3>No Registrations Yet</h3>
                  <p>No attendees have registered for this event yet.</p>
                </div>
              ) : filteredAttendees.length === 0 ? (
                <div className="roster-empty-state">
                  <p>No attendees match your filter query "{attendeeSearch}".</p>
                </div>
              ) : (
                <div className="roster-table-wrapper">
                  <table className="data-table roster-table">
                    <thead>
                      <tr>
                        <th>Participant Name</th>
                        <th>Email Address</th>
                        <th>Registration Reference</th>
                        <th>Registered At</th>
                        <th>Attendance & Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendees.map((att) => (
                        <tr key={att._id}>
                          <td className="roster-name-cell">
                            <strong>{att.participantName}</strong>
                          </td>
                          <td className="roster-email-cell">{att.email}</td>
                          <td>
                            <span className="code-pill">{att.registrationReference}</span>
                          </td>
                          <td className="cell-nowrap">
                            {new Date(att.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td>
                            {att.attended ? (
                              <span
                                className="badge-verified-attendance"
                                title={`Verified on ${att.attendedAt ? new Date(att.attendedAt).toLocaleString() : "Attendance confirmed"}`}
                              >
                                ✓ Attended (+{att.pointsAwarded || 50} pts)
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleMarkAttendance(att._id)}
                                disabled={markingAttendanceId === att._id}
                                title="Verify student physical/online attendance and award 50 activity points + certificate"
                              >
                                {markingAttendanceId === att._id ? "Verifying..." : "Mark Attended (+50 pts)"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="admin-modal-actions">
              <span className="roster-footer-summary">
                Showing {filteredAttendees.length} of {attendees.length} participant{attendees.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-close-roster"
                onClick={() => setSelectedEventForRoster(null)}
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL EVENT CONFIRMATION MODAL */}
      {cancellingEvent && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !isCancelling && setCancellingEvent(null)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog cancel-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
          >
            <div className="admin-modal-header">
              <div className="modal-header-content">
                <span className="roster-kicker-tag warning">EVENT CANCELLATION</span>
                <h2 id="cancel-modal-title" className="admin-modal-title">
                  Cancel Event
                </h2>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !isCancelling && setCancellingEvent(null)}
                aria-label="Close dialog"
                disabled={isCancelling}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {cancelError && (
                <div className="alert-banner alert-danger">
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="cancel-warning-box">
                <div className="cancel-warning-icon">⚠️</div>
                <div className="cancel-warning-text">
                  <strong>Are you sure you want to cancel "{cancellingEvent.title}"?</strong>
                  <p>
                    Cancelling this event will immediately close registrations and deliver an in-app cancellation notification to all {cancellingEvent.registeredCount} registered participant{cancellingEvent.registeredCount === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "1.25rem" }}>
                <label htmlFor="cancel-reason">Cancellation Reason (Included in notification to students)</label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  placeholder="e.g. Guest speaker schedule conflict, venue maintenance, or moving to online format..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  disabled={isCancelling}
                />
              </div>

              <div className="admin-modal-actions" style={{ marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancellingEvent(null)}
                  disabled={isCancelling}
                >
                  Keep Event
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-cancel-confirm"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling & Notifying..." : "Confirm & Cancel Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
