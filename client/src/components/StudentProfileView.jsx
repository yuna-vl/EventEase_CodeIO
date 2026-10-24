import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import SignOutModal from "./SignOutModal.jsx";

const PRESET_INTERESTS = [
  "Web Development",
  "Artificial Intelligence",
  "Machine Learning",
  "Mobile Apps",
  "Cybersecurity",
  "Cloud Computing",
  "UI/UX Design",
  "Competitive Programming",
  "Hackathons",
  "Robotics & IoT",
  "Blockchain & Web3",
  "Data Science",
  "Entrepreneurship",
  "Game Development"
];

export default function StudentProfileView({ onNavigateHome }) {
  const { token, user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    logout();
    if (onNavigateHome) onNavigateHome();
    window.location.hash = "#/discovery";
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    homeCollege: "",
    phoneNumber: "",
    graduationYear: "",
    rollNumber: "",
    avatar: ""
  });
  const [updating, setUpdating] = useState(false);
  const [formError, setFormError] = useState("");

  // Interests editing state
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);

  // Fetch full student profile from verified backend
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getStudentProfile(token);
      if (res && res.success && res.data) {
        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          homeCollege: res.data.homeCollege || "",
          phoneNumber: res.data.phoneNumber || "",
          graduationYear: res.data.graduationYear || "",
          rollNumber: res.data.rollNumber || "",
          avatar: res.data.avatar || ""
        });
        setSelectedInterests(res.data.interests || []);
      } else {
        setError(res?.message || "Failed to load student profile");
      }
    } catch (err) {
      setError(err.message || "Network error loading student profile");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle profile edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setUpdating(true);

    try {
      const payload = {
        name: formData.name.trim(),
        homeCollege: formData.homeCollege.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        graduationYear: formData.graduationYear.trim(),
        rollNumber: formData.rollNumber.trim(),
        avatar: formData.avatar.trim()
      };

      const res = await api.updateStudentProfile(payload, token);
      if (res && res.success && res.data) {
        setProfile((prev) => ({
          ...prev,
          ...res.data
        }));
        // Update global auth context so navbar reflects new name/avatar immediately
        updateUser({
          name: res.data.name,
          avatar: res.data.avatar
        });
        setIsEditModalOpen(false);
        setSuccessMsg("Profile details updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setFormError(res?.message || "Failed to update profile");
      }
    } catch (err) {
      setFormError(err.message || "Failed to persist profile updates");
    } finally {
      setUpdating(false);
    }
  };

  // Toggle interest chip
  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  // Add custom interest
  const handleAddCustomInterest = (e) => {
    e.preventDefault();
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    if (!selectedInterests.includes(trimmed)) {
      setSelectedInterests([...selectedInterests, trimmed]);
    }
    setCustomInterest("");
  };

  // Save updated interests
  const handleSaveInterests = async () => {
    setSavingInterests(true);
    setFormError("");
    try {
      const res = await api.updateStudentProfile({ interests: selectedInterests }, token);
      if (res && res.success && res.data) {
        setProfile((prev) => ({
          ...prev,
          interests: res.data.interests
        }));
        setIsInterestsModalOpen(false);
        setSuccessMsg("Interests updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setFormError(res?.message || "Failed to save interests");
      }
    } catch (err) {
      setFormError(err.message || "Error saving interests");
    } finally {
      setSavingInterests(false);
    }
  };

  if (loading) {
    return (
      <div className="student-profile-page">
        <div className="profile-container">
          <div className="profile-loading-card">
            <span className="spinner"></span>
            <p>Loading your verified student profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="student-profile-page">
        <div className="profile-container">
          <div className="profile-error-card">
            <div className="error-icon">⚠️</div>
            <h2>Unable to load profile</h2>
            <p>{error}</p>
            <div className="profile-error-actions">
              <button className="btn btn-primary" onClick={fetchProfile}>
                Retry Loading
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  window.location.hash = "#/discovery";
                }}
              >
                Return to Discovery
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const studentName = profile?.name || user?.name || "Student";
  const studentEmail = profile?.email || user?.email || "";
  const studentInitial = studentName.charAt(0).toUpperCase();
  const totalPoints = profile?.activityPoints ?? profile?.stats?.totalPoints ?? 0;
  const eventsAttended = profile?.stats?.eventsAttended ?? 0;
  const certificatesCount = (profile?.certificates || []).length;
  const attendanceHistory = profile?.attendanceHistory || [];
  const interests = profile?.interests || [];
  const certificates = profile?.certificates || [];

  return (
    <div className="student-profile-page">
      <div className="profile-container">
        {/* Toast / Notification Banner */}
        {successMsg && (
          <div className="alert-banner alert-success" role="status" aria-live="polite">
            <span className="alert-icon">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. PROFILE HEADER CARD */}
        <section className="profile-header-card glass-panel">
          <div className="profile-header-left">
            <div className="profile-hero-avatar-wrap">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={studentName}
                  className="profile-hero-avatar-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : null}
              <div className="profile-hero-avatar-fallback">
                {studentInitial}
              </div>
              <span className="profile-badge-student-pill">Student</span>
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-title-row">
                <h1 className="profile-hero-name">{studentName}</h1>
                <span className="verified-student-tag" title="Verified Campus Student">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Verified Student
                </span>
              </div>
              <p className="profile-hero-email">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {studentEmail}
              </p>
              {profile?.homeCollege && (
                <p className="profile-hero-college">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  {profile.homeCollege}
                </p>
              )}
            </div>
          </div>

          <div className="profile-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-edit-profile"
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Edit Profile Details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-signout-profile"
              onClick={() => setShowSignOutModal(true)}
              title="Sign out of this student account"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* 2. STATS & ACTIVITY POINTS SUMMARY */}
        <section className="profile-stats-grid">
          <div className="stat-card stat-points-card">
            <div className="stat-card-glow"></div>
            <div className="stat-icon-wrapper points-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value points-val">{totalPoints}</span>
              <span className="stat-label">Activity Points</span>
              <span className="stat-subtext">Earned from verified event attendances</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper attended-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{eventsAttended}</span>
              <span className="stat-label">Events Attended</span>
              <span className="stat-subtext">Verified on-campus check-ins</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper certs-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{certificatesCount}</span>
              <span className="stat-label">Certificates</span>
              <span className="stat-subtext">Issued by event organizers</span>
            </div>
          </div>
        </section>

        {/* 3. DETAILS & INTERESTS TWO-COLUMN ROW */}
        <div className="profile-columns-layout">
          {/* Column A: Academic & Personal Details */}
          <section className="profile-section-card glass-panel">
            <div className="section-card-header">
              <div className="section-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h2>Student Details</h2>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit
              </button>
            </div>

            <div className="details-list-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{studentName}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{studentEmail}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Account Type</span>
                <span className="detail-value">
                  <span className="code-pill">Student</span>
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Home College / University</span>
                <span className="detail-value">
                  {profile?.homeCollege || (
                    <span className="text-muted-italic">Not specified — click Edit to add</span>
                  )}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">
                  {profile?.phoneNumber || (
                    <span className="text-muted-italic">Not specified</span>
                  )}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Graduation Year</span>
                <span className="detail-value">
                  {profile?.graduationYear || (
                    <span className="text-muted-italic">Not specified</span>
                  )}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Roll Number / USN</span>
                <span className="detail-value">
                  {profile?.rollNumber || (
                    <span className="text-muted-italic">Not specified</span>
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Column B: Interests */}
          <section className="profile-section-card glass-panel">
            <div className="section-card-header">
              <div className="section-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <h2>My Interests</h2>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => {
                  setSelectedInterests(interests);
                  setIsInterestsModalOpen(true);
                }}
              >
                {interests.length > 0 ? "Edit Interests" : "+ Add Interests"}
              </button>
            </div>

            {interests.length === 0 ? (
              <div className="empty-sub-card">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <p>No interests selected yet.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedInterests(interests);
                    setIsInterestsModalOpen(true);
                  }}
                >
                  Select Your Interests
                </button>
              </div>
            ) : (
              <div className="interests-tag-cloud">
                {interests.map((tag) => (
                  <span key={tag} className="interest-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 4. ACTIVITY POINTS & ATTENDANCE HISTORY */}
        <section className="profile-section-card glass-panel">
          <div className="section-card-header">
            <div className="section-header-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <div>
                <h2>Activity Points & Attendance History</h2>
                <p className="section-subtitle">
                  Points are credited exclusively for verified attendance checked in by event organizers.
                </p>
              </div>
            </div>
          </div>

          {attendanceHistory.length === 0 ? (
            <div className="empty-sub-card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>No event attendance records yet.</p>
              <span className="text-muted-italic">
                Register for events and check in at the venue to earn activity points and certificates!
              </span>
            </div>
          ) : (
            <div className="attendance-history-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date & Venue</th>
                    <th>Registration Code</th>
                    <th>Attendance Status</th>
                    <th>Activity Points</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="history-event-cell">
                        <strong>{item.eventTitle}</strong>
                      </td>
                      <td className="cell-nowrap">
                        <div>
                          {item.eventDate ? new Date(item.eventDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          }) : "N/A"}
                        </div>
                        <span className="history-venue-sub">{item.eventVenue}</span>
                      </td>
                      <td>
                        <span className="code-pill">{item.registrationReference}</span>
                      </td>
                      <td>
                        {item.attended ? (
                          <span className="badge-verified-attendance">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="badge-pending-attendance">
                            Registered (Pending Attendance)
                          </span>
                        )}
                      </td>
                      <td>
                        {item.attended ? (
                          <span className="points-award-badge">
                            +{item.pointsAwarded || 50} pts
                          </span>
                        ) : (
                          <span className="points-zero-badge">0 pts</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 5. CERTIFICATES SECTION */}
        <section className="profile-section-card glass-panel">
          <div className="section-card-header">
            <div className="section-header-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              <div>
                <h2>Earned Certificates ({certificates.length})</h2>
                <p className="section-subtitle">
                  Official participation & achievement credentials issued for verified event attendances.
                </p>
              </div>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="empty-sub-card">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              <p>No certificates earned yet.</p>
              <span className="text-muted-italic">
                Attend campus events and have your attendance verified by organizers to receive official EventEase certificates.
              </span>
            </div>
          ) : (
            <div className="certificates-grid">
              {certificates.map((cert) => (
                <div key={cert.certificateId || cert._id} className="certificate-card">
                  <div className="certificate-ribbon">EVENT CREDENTIAL</div>
                  <div className="certificate-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <h3 className="certificate-card-title">{cert.title || "Certificate of Participation"}</h3>
                  <p className="certificate-event-name">{cert.eventTitle}</p>
                  <div className="certificate-meta-row">
                    <span>
                      Issued: {new Date(cert.issueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                    <span className="code-pill cert-id-pill">{cert.certificateId}</span>
                  </div>
                  <div className="certificate-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedCertificate(cert)}
                    >
                      View & Print Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL 1: EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !updating && setIsEditModalOpen(false)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog profile-edit-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="admin-modal-header">
              <div className="modal-header-content">
                <span className="roster-kicker-tag">STUDENT ACCOUNT</span>
                <h2 id="edit-profile-title" className="admin-modal-title">
                  Edit Personal Profile
                </h2>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !updating && setIsEditModalOpen(false)}
                aria-label="Close dialog"
                disabled={updating}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {formError && (
                <div className="alert-banner alert-danger">
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="profile-edit-form">
                <div className="form-group">
                  <label htmlFor="edit-name">Full Name *</label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={updating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-email">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={studentEmail}
                    disabled
                    readOnly
                    className="input-disabled"
                    title="Email is bound to your authentication identity and cannot be edited directly."
                  />
                  <small className="form-hint">Email address is verified and permanently linked to your account.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-avatar">Profile Avatar URL</label>
                  <input
                    id="edit-avatar"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    disabled={updating}
                  />
                  <small className="form-hint">Leave blank to use your name initials fallback.</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-college">Home College / University</label>
                    <input
                      id="edit-college"
                      type="text"
                      placeholder="e.g. Stanford University / MIT"
                      value={formData.homeCollege}
                      onChange={(e) => setFormData({ ...formData, homeCollege: e.target.value })}
                      disabled={updating}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-phone">Phone Number</label>
                    <input
                      id="edit-phone"
                      type="tel"
                      placeholder="e.g. +1 555-019-2834"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      disabled={updating}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-grad">Graduation Year</label>
                    <input
                      id="edit-grad"
                      type="text"
                      placeholder="e.g. 2026"
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                      disabled={updating}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-roll">Roll Number / USN</label>
                    <input
                      id="edit-roll"
                      type="text"
                      placeholder="e.g. 1MS22CS091"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      disabled={updating}
                    />
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updating}
                  >
                    {updating ? "Saving Changes..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT INTERESTS MODAL */}
      {isInterestsModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !savingInterests && setIsInterestsModalOpen(false)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog interests-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="interests-modal-title"
          >
            <div className="admin-modal-header">
              <div className="modal-header-content">
                <span className="roster-kicker-tag">PREFERENCES</span>
                <h2 id="interests-modal-title" className="admin-modal-title">
                  Select Your Event Interests
                </h2>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !savingInterests && setIsInterestsModalOpen(false)}
                aria-label="Close dialog"
                disabled={savingInterests}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <p className="interests-modal-desc">
                Choose the technical and cultural topics you are passionate about to customize your event recommendations.
              </p>

              <div className="interests-selection-grid">
                {PRESET_INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      className={`interest-select-pill ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleInterest(interest)}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {interest}
                    </button>
                  );
                })}
              </div>

              {/* Custom interest tag adder */}
              <div className="custom-interest-row">
                <input
                  type="text"
                  placeholder="Add custom interest (e.g. Quantum Computing)..."
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomInterest(e);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddCustomInterest}
                >
                  Add Tag
                </button>
              </div>

              {selectedInterests.length > 0 && (
                <div className="selected-interests-preview">
                  <span className="preview-label">Selected ({selectedInterests.length}):</span>
                  <div className="preview-tags">
                    {selectedInterests.map((tag) => (
                      <span key={tag} className="preview-tag-chip">
                        {tag}
                        <button
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsInterestsModalOpen(false)}
                disabled={savingInterests}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveInterests}
                disabled={savingInterests}
              >
                {savingInterests ? "Saving..." : "Save Interests"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CERTIFICATE PREVIEW & PRINT MODAL */}
      {selectedCertificate && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedCertificate(null)}
          role="presentation"
        >
          <div
            className="admin-modal-dialog certificate-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-modal-title"
          >
            <div className="admin-modal-header no-print">
              <div className="modal-header-content">
                <span className="roster-kicker-tag">OFFICIAL CREDENTIAL</span>
                <h2 id="cert-modal-title" className="admin-modal-title">
                  EventEase Certificate
                </h2>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedCertificate(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body certificate-print-area">
              <div className="official-certificate-sheet">
                <div className="certificate-border-ornament">
                  <div className="cert-brand-row">
                    <span className="cert-logo-text">⚡ EVENTEASE</span>
                    <span className="cert-doc-type">OFFICIAL VERIFIED CERTIFICATE</span>
                  </div>

                  <h1 className="cert-main-headline">
                    {selectedCertificate.title || "Certificate of Participation"}
                  </h1>

                  <p className="cert-presentation-text">
                    This is proudly presented to
                  </p>

                  <h2 className="cert-recipient-name">
                    {studentName}
                  </h2>

                  <p className="cert-body-description">
                    for verified on-campus participation and contribution to the technical workshop
                  </p>

                  <h3 className="cert-event-title-display">
                    "{selectedCertificate.eventTitle}"
                  </h3>

                  <div className="cert-footer-row">
                    <div className="cert-sig-block">
                      <div className="cert-sig-line"></div>
                      <span className="cert-sig-title">EventEase Academic Lead</span>
                    </div>

                    <div className="cert-gold-seal">
                      <div className="seal-inner">
                        <span>★</span>
                        <strong>VERIFIED</strong>
                        <span>EVENT</span>
                      </div>
                    </div>

                    <div className="cert-sig-block">
                      <div className="cert-sig-line"></div>
                      <span className="cert-sig-title">
                        {new Date(selectedCertificate.issueDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="cert-verification-footer">
                    <span>Credential ID: <code>{selectedCertificate.certificateId}</code></span>
                    <span>•</span>
                    <span>Verification Code: <code>{selectedCertificate.verificationCode || "EE-AUTH-VERIFIED"}</code></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-actions no-print">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedCertificate(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
        userName={profile?.name || user?.name}
      />
    </div>
  );
}
