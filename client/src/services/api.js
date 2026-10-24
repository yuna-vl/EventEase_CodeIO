/**
 * EventEase Live - API Service
 * Centralized HTTP client for backend REST communication.
 */

const getBaseUrl = () => {
  let url = "";
  // Vite client environment
  if (typeof import.meta !== "undefined" && import.meta.env) {
    url = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
  }
  // Node / SSR environment
  if (!url && typeof process !== "undefined" && process.env) {
    url = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || "";
  }
  url = (url || "").trim();
  if (!url) {
    // Fallback to local API (127.0.0.1 avoids Node fetch IPv6 DNS resolution issues on Windows)
    return "http://127.0.0.1:5000/api";
  }
  // Cleanly strip any trailing slashes
  while (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  // Ensure the base URL cleanly includes the /api prefix
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

/**
 * Generic fetch wrapper with JSON parsing and standardized error handling.
 */
async function request(endpoint, options = {}) {
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // Prevent duplicate /api/api if endpoint already started with /api
  if (API_BASE_URL.endsWith("/api") && cleanEndpoint.startsWith("/api/")) {
    cleanEndpoint = cleanEndpoint.slice(4);
  }
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Parse JSON payload if present
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      const error = new Error(
        data?.message || `Request failed with HTTP status ${response.status}`
      );
      error.status = response.status;
      error.data = data;
      error.errors = data?.errors || [];
      throw error;
    }

    return data;
  } catch (err) {
    // Rethrow API errors with status or wrap network failures
    if (err.status) {
      throw err;
    }
    const networkError = new Error(
      "Unable to connect to EventEase server. Please verify your backend is running."
    );
    networkError.status = 0;
    throw networkError;
  }
}

/**
 * Public Endpoints
 */

// Verify system health
export async function getHealth() {
  return request("/health");
}

// Fetch all events (sorted by upcoming date)
export async function getEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/events${query ? `?${query}` : ""}`);
}

// Fetch single event by ID
export async function getEventById(id) {
  return request(`/events/${id}`);
}

// Register participant for an event (passes bearer token when user is logged in)
export async function registerForEvent(id, { participantName, email }, token) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return request(`/events/${id}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ participantName, email })
  });
}

// Fetch saved events for authenticated student
export async function getSavedEvents(token) {
  return request("/students/saved-events", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch saved event IDs for authenticated student
export async function getSavedEventIds(token) {
  return request("/students/saved-events/ids", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Save an event for authenticated student
export async function saveEvent(eventId, token) {
  return request(`/students/saved-events/${eventId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Remove an event from saved list for authenticated student
export async function unsaveEvent(eventId, token) {
  return request(`/students/saved-events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch all tickets/passes for authenticated student
export async function getStudentTickets(token) {
  return request("/students/tickets", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch single ticket details by registration ID (strictly authorized to owner)
export async function getStudentTicketById(ticketId, token) {
  return request(`/students/tickets/${ticketId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Role-based login (Student or Organiser)
export async function loginUser({ email, password, role }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role })
  });
}

// Role-based signup (Student or Organiser)
export async function signupUser({ name, email, password, role, organizerSecret }) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role, organizerSecret })
  });
}

// Google OAuth authentication
export async function googleAuth(authPayload = {}) {
  return request("/auth/google", {
    method: "POST",
    body: JSON.stringify(authPayload)
  });
}

// Legacy alias for organizer login
export async function loginOrganizer({ email, password }) {
  return loginUser({ email, password, role: "organizer" });
}

/**
 * Protected Endpoints (Require Bearer Token)
 */

// Verify current user profile & role
export async function getUserProfile(token) {
  return request("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Legacy alias for organizer profile
export async function getOrganizerProfile(token) {
  return getUserProfile(token);
}

// Create new event (Organizer only)
export async function createEvent(eventData, token) {
  return request("/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(eventData)
  });
}

// Update existing event (Organizer only, owner enforced)
export async function updateEvent(eventId, eventData, token) {
  return request(`/events/${eventId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(eventData)
  });
}

// Delete event (Organizer only, owner enforced)
export async function deleteEvent(eventId, token) {
  return request(`/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Set event status (Organizer only, owner enforced)
export async function setEventStatus(eventId, status, token) {
  return request(`/events/${eventId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
}

// Upload event banner image (Organizer only)
export async function uploadBanner(imageData, token) {
  return request("/events/upload-banner", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(imageData)
  });
}

// Fetch attendee list for event (Organizer only)
export async function getEventAttendees(eventId, token) {
  return request(`/events/${eventId}/attendees`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Verify participant attendance (Organizer only)
export async function markAttendeeAttendance(eventId, attendeeId, token) {
  return request(`/events/${eventId}/attendees/${attendeeId}/attendance`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch authenticated student's own profile (details, points, certificates, attendance)
export async function getStudentProfile(token) {
  return request("/students/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Update permitted fields on student's own profile
export async function updateStudentProfile(profileData, token) {
  return request("/students/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
}

// Cancel an event and notify registered attendees (Organizer only)
export async function cancelEvent(eventId, reason, token) {
  return request(`/events/${eventId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
}

// Fetch in-app notifications for authenticated user
export async function getNotifications(token) {
  return request("/notifications", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Mark a single notification as read
export async function markNotificationAsRead(notificationId, token) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(token) {
  return request("/notifications/read-all", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch events owned strictly by currently authenticated organizer
export async function getOrganizerEvents(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/events/organizer/events${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fetch authoritative server-side statistics for currently authenticated organizer
export async function getOrganizerStats(token) {
  return request("/events/organizer/stats", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export default {
  getHealth,
  getEvents,
  getEventById,
  registerForEvent,
  loginUser,
  signupUser,
  googleAuth,
  loginOrganizer,
  getUserProfile,
  getOrganizerProfile,
  getStudentProfile,
  updateStudentProfile,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventStatus,
  cancelEvent,
  uploadBanner,
  getEventAttendees,
  markAttendeeAttendance,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getOrganizerEvents,
  getOrganizerStats,
  getSavedEvents,
  getSavedEventIds,
  saveEvent,
  unsaveEvent,
  getStudentTickets,
  getStudentTicketById
};
