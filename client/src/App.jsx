import { useState, useEffect, useMemo, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import DiscoveryHeader from "./components/DiscoveryHeader.jsx";
import FilterModal from "./components/FilterModal.jsx";
import EventCard from "./components/EventCard.jsx";
import EventDetailModal from "./components/EventDetailModal.jsx";
import DigitalPassModal from "./components/DigitalPassModal.jsx";
import SavedEventsView from "./components/SavedEventsView.jsx";
import MyTicketsView from "./components/MyTicketsView.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import RoleSelection from "./components/RoleSelection.jsx";
import RoleAuth from "./components/RoleAuth.jsx";
import OrganizerDashboard from "./components/OrganizerDashboard.jsx";
import MyEventsView from "./components/MyEventsView.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import StudentProfileView from "./components/StudentProfileView.jsx";
import { getEventVisual } from "./utils/eventImages.js";
import api from "./services/api.js";
import "./App.css";

const SAVED_EVENTS_STORAGE_KEY = "eventease_saved_events";
const BOOKED_TICKETS_STORAGE_KEY = "eventease_booked_tickets";
const SPLASH_SEEN_STORAGE_KEY = "eventease_splash_seen";

const VALID_VIEWS = ["dashboard", "my-events", "saved", "tickets", "discovery", "role-selection", "role-auth", "login", "profile"];

function MainContent() {
  const { isAuthenticated, user, token, isOrganizer, isStudent, loading: authLoading } = useAuth();

  const getInitialView = () => {
    if (typeof window === "undefined") return "discovery";
    const raw = window.location.hash.replace(/^#\/?/, "");
    if (VALID_VIEWS.includes(raw)) {
      return raw === "login" ? "role-selection" : raw;
    }
    return "discovery";
  };

  // User-scoped storage keys
  const getSavedEventsKey = (uid) => (uid ? `eventease_saved_events_${uid}` : null);
  const getBookedTicketsKey = (uid) => (uid ? `eventease_booked_tickets_${uid}` : null);

  // Navigation View: 'discovery' | 'saved' | 'tickets' | 'role-selection' | 'role-auth' | 'dashboard' | 'my-events' | 'profile'
  const [currentView, setCurrentView] = useState(getInitialView);
  const [selectedRole, setSelectedRole] = useState("student");
  // Pending event reservation when an unauthenticated user clicks Reserve Spot
  const [pendingReservationEvent, setPendingReservationEvent] = useState(null);

  // Synchronize browser URL hash with application state
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace(/^#\/?/, "");
      if (VALID_VIEWS.includes(raw)) {
        setCurrentView(raw === "login" ? "role-selection" : raw);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRequireAuthForEvent = (event) => {
    setSelectedEvent(null);
    setPendingReservationEvent(event);
    setSelectedRole("student");
    setCurrentView("role-selection");
    window.location.hash = "#/login";
  };

  // Splash screen state (shows once initially or on user request)
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem(SPLASH_SEEN_STORAGE_KEY);
  });

  // Events & Loading State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "All",
    dateFilter: "all",
    customDate: "",
    availableOnly: false
  });

  // Saved / Favorited events (strictly isolated per authenticated student)
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedEventIds, setSavedEventIds] = useState([]);

  // Confirmed tickets / passes (strictly isolated per authenticated student)
  const [bookedTickets, setBookedTickets] = useState([]);

  // Modals
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [issuedPass, setIssuedPass] = useState(null);
  const [passEventContext, setPassEventContext] = useState(null);

  // Synchronize and isolate user data on authentication change or account switch
  useEffect(() => {
    let isCancelled = false;

    // Remove legacy un-scoped storage keys that could leak across accounts
    localStorage.removeItem("eventease_saved_events");
    localStorage.removeItem("eventease_booked_tickets");

    const userId = user?._id || user?.id;

    if (!isAuthenticated || !token || !userId) {
      setSavedEvents([]);
      setSavedEventIds([]);
      setBookedTickets([]);
      return;
    }

    const userSavedKey = getSavedEventsKey(userId);
    const userTicketsKey = getBookedTicketsKey(userId);

    // Populate from user-scoped storage for fast responsive render if present
    try {
      const cachedSaved = localStorage.getItem(userSavedKey);
      if (cachedSaved) {
        setSavedEventIds(JSON.parse(cachedSaved));
      } else {
        setSavedEventIds([]);
      }
      const cachedTickets = localStorage.getItem(userTicketsKey);
      if (cachedTickets) {
        setBookedTickets(JSON.parse(cachedTickets));
      } else {
        setBookedTickets([]);
      }
    } catch {
      setSavedEventIds([]);
      setBookedTickets([]);
    }

    // Authoritative fetch from MongoDB backend for the currently authenticated student
    async function loadUserData() {
      try {
        const savedRes = await api.getSavedEvents(token);
        if (!isCancelled && savedRes.success && Array.isArray(savedRes.data)) {
          setSavedEvents(savedRes.data);
          const ids = savedRes.data.map((e) => e._id || e.id).filter(Boolean);
          setSavedEventIds(ids);
          try {
            localStorage.setItem(userSavedKey, JSON.stringify(ids));
          } catch (e) {
            console.error("Storage error:", e);
          }
        }
      } catch (err) {
        console.warn("[EventEase] Could not fetch saved events:", err.message);
      }

      try {
        const ticketsRes = await api.getStudentTickets(token);
        if (!isCancelled && ticketsRes.success && Array.isArray(ticketsRes.data)) {
          setBookedTickets(ticketsRes.data);
          try {
            localStorage.setItem(userTicketsKey, JSON.stringify(ticketsRes.data));
          } catch (e) {
            console.error("Storage error:", e);
          }
        }
      } catch (err) {
        console.warn("[EventEase] Could not fetch student tickets:", err.message);
      }
    }

    loadUserData();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, token, user?._id, user?.id]);

  // Fetch all events from API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getEvents();
      if (response.success && Array.isArray(response.data)) {
        // Deduplicate events by _id to prevent duplicate renders
        const seenIds = new Set();
        const uniqueEvents = response.data.filter((ev) => {
          if (!ev || !ev._id || seenIds.has(ev._id)) return false;
          seenIds.add(ev._id);
          return true;
        });
        setEvents(uniqueEvents);
      }
    } catch (err) {
      setError(err.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Toggle save/unsave associated with authenticated student on the backend
  const toggleSaveEvent = async (event) => {
    const userId = user?._id || user?.id;
    if (!isAuthenticated || !token || !userId) {
      handleRequireAuthForEvent(event);
      return;
    }

    const userSavedKey = getSavedEventsKey(userId);
    const isCurrentlySaved = savedEventIds.includes(event._id);

    // Optimistic UI state update
    const nextSavedIds = isCurrentlySaved
      ? savedEventIds.filter((id) => id !== event._id)
      : [...savedEventIds, event._id];

    const nextSavedEvents = isCurrentlySaved
      ? savedEvents.filter((e) => (e._id || e.id) !== event._id)
      : [{ ...event, isSaved: true }, ...savedEvents];

    setSavedEventIds(nextSavedIds);
    setSavedEvents(nextSavedEvents);
    try {
      localStorage.setItem(userSavedKey, JSON.stringify(nextSavedIds));
    } catch (e) {
      console.error("Storage write error:", e);
    }

    try {
      if (isCurrentlySaved) {
        await api.unsaveEvent(event._id, token);
      } else {
        await api.saveEvent(event._id, token);
      }
    } catch (err) {
      console.error("[EventEase] Failed to persist save status to server:", err);
      // Revert optimistic update on server error
      setSavedEventIds(savedEventIds);
      setSavedEvents(savedEvents);
      try {
        localStorage.setItem(userSavedKey, JSON.stringify(savedEventIds));
      } catch {}
    }
  };

  // Handle successful registration
  const handleRegistrationSuccess = (passData, event) => {
    setSelectedEvent(null);
    setIssuedPass(passData);
    setPassEventContext(event);

    const userId = user?._id || user?.id;
    const userTicketsKey = getBookedTicketsKey(userId);

    const newTicket = {
      ...passData,
      eventId: event?._id || passData.eventId,
      eventTitle: event?.title || passData.eventTitle,
      eventVenue: event?.venue || passData.eventVenue,
      eventDate: event?.date || passData.eventDate,
      registeredAt: passData.registeredAt || new Date().toISOString()
    };

    setBookedTickets((prev) => {
      const filtered = prev.filter(
        (t) =>
          (t.registrationReference || t._id || t.id) !==
          (newTicket.registrationReference || newTicket._id || newTicket.id)
      );
      const updated = [newTicket, ...filtered];
      if (userId && userTicketsKey) {
        try {
          localStorage.setItem(userTicketsKey, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to persist ticket pass:", err);
        }
      }
      return updated;
    });

    // Re-sync with backend to ensure authoritative data consistency
    if (token) {
      api.getStudentTickets(token)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setBookedTickets(res.data);
            if (userId && userTicketsKey) {
              try {
                localStorage.setItem(userTicketsKey, JSON.stringify(res.data));
              } catch {}
            }
          }
        })
        .catch(() => {});
    }

    // Increment registeredCount locally for instant reactivity
    setEvents((prev) =>
      prev.map((e) =>
        e._id === event._id
          ? { ...e, registeredCount: e.registeredCount + 1 }
          : e
      )
    );
  };

  const handleDismissSplash = () => {
    setShowSplash(false);
    sessionStorage.setItem(SPLASH_SEEN_STORAGE_KEY, "true");
  };

  // Compute available venues for the filter modal
  const availableVenues = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (e.venue) set.add(e.venue.trim());
    });
    return Array.from(set);
  }, [events]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "All") count += 1;
    if (filters.dateFilter !== "all") count += 1;
    if (filters.availableOnly) count += 1;
    return count;
  }, [filters]);

  // Helper date checker
  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Filter events based on search, category chip, and detailed modal filters
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return events.filter((ev) => {
      // Exclude cancelled events from public discovery event listings
      if (ev.status === "cancelled") {
        return false;
      }

      const visual = getEventVisual(ev);
      const evDate = new Date(ev.date);

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = ev.title?.toLowerCase().includes(query);
        const matchesVenue = ev.venue?.toLowerCase().includes(query);
        const matchesDesc = ev.description?.toLowerCase().includes(query);
        const matchesCategory = visual.category?.toLowerCase().includes(query);
        const matchesTag = visual.tag?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesVenue && !matchesDesc && !matchesCategory && !matchesTag) {
          return false;
        }
      }

      // Category filter
      if (filters.category !== "All") {
        if (visual.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // Availability filter
      if (filters.availableOnly) {
        if (ev.registeredCount >= ev.capacity) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFilter === "today") {
        if (!isSameDay(evDate, today)) return false;
      } else if (filters.dateFilter === "tomorrow") {
        if (!isSameDay(evDate, tomorrow)) return false;
      } else if (filters.dateFilter === "weekend") {
        const day = evDate.getDay();
        if (day !== 0 && day !== 6) return false;
      } else if (filters.dateFilter === "custom" && filters.customDate) {
        const [year, month, day] = filters.customDate.split("-").map(Number);
        const customObj = new Date(year, month - 1, day);
        if (!isSameDay(evDate, customObj)) return false;
      }

      return true;
    });
  }, [events, searchTerm, filters]);

  // List of saved event objects (populated from backend or derived from discovery events)
  const savedEventsList = useMemo(() => {
    if (savedEvents && savedEvents.length > 0) {
      return savedEvents;
    }
    return events.filter((ev) => savedEventIds.includes(ev._id || ev.id));
  }, [savedEvents, events, savedEventIds]);

  return (
    <div className="eventease-cinematic-app">
      {/* Shared Ambient Pink, Magenta & Warm Amber Glow Layer */}
      <div className="eventease-ambient-glow-layer" aria-hidden="true" />

      {/* Splash Screen (Dark Cinematic) */}
      {showSplash && (
        <SplashScreen onComplete={handleDismissSplash} />
      )}

      {/* Top Glass Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        savedCount={savedEventIds.length}
        ticketCount={bookedTickets.length}
      />

      {/* Main Content Area */}
      <main className="cinematic-main-content">
        {/* 1. DISCOVERY VIEW */}
        {currentView === "discovery" && (
          <div className="discovery-cinematic-view">
            {/* Cinematic Centered Hero & Search */}
            <DiscoveryHeader
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={filters.category}
              setSelectedCategory={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
              onOpenFilters={() => setIsFilterModalOpen(true)}
              activeFilterCount={activeFilterCount}
            />

            {/* Experiences Feed Section */}
            <section className="cinematic-feed-section">
              <div className="feed-title-bar">
                <div className="feed-title-left">
                  <h2 className="feed-main-heading">
                    {filters.category === "All" ? "Explore Experiences" : filters.category}
                  </h2>
                  <span className="feed-count-pill">
                    {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="feed-actions-right">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      className="btn-reset-filters-glass"
                      onClick={() =>
                        setFilters({
                          category: "All",
                          dateFilter: "all",
                          customDate: "",
                          availableOnly: false
                        })
                      }
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-refresh-glass"
                    onClick={fetchEvents}
                    disabled={loading}
                    title="Refresh events"
                  >
                    {loading ? "Refreshing..." : "↻ Refresh"}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="glass-status-banner banner-error">
                  <p>{error}</p>
                  <button type="button" className="btn-glass-retry" onClick={fetchEvents}>
                    Try Again
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loading && (
                <div className="glass-skeletons-grid">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="event-skeleton-card" />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && filteredEvents.length === 0 && (
                <div className="glass-empty-container">
                  <div className="empty-symbol-icon">✦</div>
                  <h3>
                    {searchTerm || activeFilterCount > 0
                      ? "No matching experiences found"
                      : "No events available right now."}
                  </h3>
                  <p>
                    {searchTerm || activeFilterCount > 0
                      ? "No events match your current filter parameters. Try expanding your search or clearing active filters."
                      : "No events are currently scheduled. Check back soon or log in as an organizer to publish an event."}
                  </p>
                  {(searchTerm || activeFilterCount > 0) && (
                    <button
                      type="button"
                      className="btn-clear-all-glass"
                      onClick={() => {
                        setSearchTerm("");
                        setFilters({
                          category: "All",
                          dateFilter: "all",
                          customDate: "",
                          availableOnly: false
                        });
                      }}
                    >
                      Clear Search & Filters
                    </button>
                  )}
                </div>
              )}

              {/* Responsive Event Grid */}
              {!loading && !error && filteredEvents.length > 0 && (
                <div className="glass-events-grid">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onSelect={(ev) => setSelectedEvent(ev)}
                      isSaved={savedEventIds.includes(event._id)}
                      onToggleSave={toggleSaveEvent}
                      onRequireAuth={handleRequireAuthForEvent}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 2. SAVED EVENTS VIEW (Requires Authentication) */}
        {currentView === "saved" && (
          isAuthenticated ? (
            <SavedEventsView
              savedEvents={savedEventsList}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              onToggleSave={toggleSaveEvent}
              onBrowseMore={() => setCurrentView("discovery")}
              onRequireAuth={handleRequireAuthForEvent}
            />
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
              }}
              onCancel={() => {
                setPendingReservationEvent(null);
                setCurrentView("discovery");
              }}
            />
          )
        )}

        {/* 3. MY TICKETS VIEW (Requires Authentication) */}
        {currentView === "tickets" && (
          isAuthenticated ? (
            <MyTicketsView
              tickets={bookedTickets}
              onViewPass={(ticket) => setIssuedPass(ticket)}
              onBrowseMore={() => setCurrentView("discovery")}
            />
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
              }}
              onCancel={() => {
                setPendingReservationEvent(null);
                setCurrentView("discovery");
              }}
            />
          )
        )}

        {/* 3.5. STUDENT PERSONAL PROFILE (Authenticated Student Only) */}
        {currentView === "profile" && (
          authLoading ? (
            <div className="login-glass-page">
              <div className="glass-empty-container">
                <span className="spinner"></span>
                <p>Verifying secure session...</p>
              </div>
            </div>
          ) : isAuthenticated ? (
            isStudent ? (
              <StudentProfileView onNavigateHome={() => setCurrentView("discovery")} />
            ) : (
              <div className="login-glass-page">
                <div className="login-glass-card">
                  <div className="login-card-head">
                    <div className="login-logo-glow">
                      <span style={{ fontSize: "2.5rem" }}>🎓</span>
                    </div>
                    <h2 className="login-title-text">Student Profile Access</h2>
                    <p className="login-subtitle-text">
                      You are currently signed in with an Organiser account. Student personal profiles, activity points, and participation certificates are dedicated to Student accounts.
                    </p>
                  </div>
                  <div className="login-form-body">
                    <button
                      type="button"
                      className="btn-accent-login"
                      onClick={() => {
                        setCurrentView("dashboard");
                        window.location.hash = "#/dashboard";
                      }}
                    >
                      Go to Organiser Dashboard →
                    </button>
                    <button
                      type="button"
                      className="btn-glass-return"
                      onClick={() => {
                        setCurrentView("discovery");
                        window.location.hash = "#/discovery";
                      }}
                    >
                      ← Return to Discovery
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
                window.location.hash = "#/login";
              }}
              onCancel={() => {
                setCurrentView("discovery");
                window.location.hash = "#/discovery";
              }}
            />
          )
        )}

        {/* 4. ROLE SELECTION SCREEN */}
        {(currentView === "role-selection" || currentView === "login") && (
          isAuthenticated ? (
            isOrganizer ? (
              <OrganizerDashboard />
            ) : (
              (() => {
                if (currentView !== "discovery") {
                  setTimeout(() => {
                    setCurrentView("discovery");
                    window.location.hash = "#/discovery";
                  }, 0);
                }
                return null;
              })()
            )
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
              }}
              onCancel={() => {
                setPendingReservationEvent(null);
                setCurrentView("discovery");
                window.location.hash = "#/discovery";
              }}
            />
          )
        )}

        {/* 5. ROLE AUTHENTICATION SCREEN */}
        {currentView === "role-auth" && (
          isAuthenticated ? (
            (() => {
              if (currentView !== "discovery" && currentView !== "dashboard") {
                setTimeout(() => {
                  setCurrentView(isOrganizer ? "dashboard" : "discovery");
                  window.location.hash = isOrganizer ? "#/dashboard" : "#/discovery";
                }, 0);
              }
              return null;
            })()
          ) : (
            <RoleAuth
              role={selectedRole}
              onBackToRoleSelection={() => setCurrentView("role-selection")}
              onAuthSuccess={(authedRole) => {
                if (pendingReservationEvent) {
                  const targetEvent = pendingReservationEvent;
                  setPendingReservationEvent(null);
                  setCurrentView("discovery");
                  window.location.hash = "#/discovery";
                  setSelectedEvent(targetEvent);
                } else if (authedRole === "organizer") {
                  setCurrentView("dashboard");
                  window.location.hash = "#/dashboard";
                } else {
                  setCurrentView("discovery");
                  window.location.hash = "#/discovery";
                }
              }}
              onCancel={() => {
                setPendingReservationEvent(null);
                setCurrentView("discovery");
                window.location.hash = "#/discovery";
              }}
            />
          )
        )}

        {/* 6. ORGANIZER DASHBOARD (PROTECTED ROUTE) */}
        {currentView === "dashboard" && (
          authLoading ? (
            <div className="login-glass-page">
              <div className="glass-empty-container">
                <span className="spinner"></span>
                <p>Verifying secure session...</p>
              </div>
            </div>
          ) : isAuthenticated ? (
            isOrganizer ? (
              <OrganizerDashboard />
            ) : (
              <div className="login-glass-page">
                <div className="login-glass-card">
                  <div className="login-card-head">
                    <div className="login-logo-glow">
                      <span style={{ fontSize: "2.5rem" }}>🔒</span>
                    </div>
                    <h2 className="login-title-text">Organiser Access Required</h2>
                    <p className="login-subtitle-text">
                      Your current session is signed in with a Student account. The Organiser Dashboard, event publishing, and attendee rosters require an Organiser account.
                    </p>
                  </div>
                  <div className="login-form-body">
                    <button
                      type="button"
                      className="btn-accent-login"
                      onClick={() => {
                        setSelectedRole("organizer");
                        setCurrentView("role-auth");
                        window.location.hash = "#/login";
                      }}
                    >
                      Sign In as Organiser →
                    </button>
                    <button
                      type="button"
                      className="btn-glass-return"
                      onClick={() => {
                        setCurrentView("discovery");
                        window.location.hash = "#/discovery";
                      }}
                    >
                      ← Return to Student Discovery
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
                window.location.hash = "#/login";
              }}
              onCancel={() => {
                setCurrentView("discovery");
                window.location.hash = "#/discovery";
              }}
            />
          )
        )}

        {/* 7. MY EVENTS (DEDICATED ORGANIZER ROUTE) */}
        {currentView === "my-events" && (
          authLoading ? (
            <div className="login-glass-page">
              <div className="glass-empty-container">
                <span className="spinner"></span>
                <p>Verifying secure session...</p>
              </div>
            </div>
          ) : isAuthenticated ? (
            isOrganizer ? (
              <MyEventsView />
            ) : (
              <div className="login-glass-page">
                <div className="login-glass-card">
                  <div className="login-card-head">
                    <div className="login-logo-glow">
                      <span style={{ fontSize: "2.5rem" }}>🔒</span>
                    </div>
                    <h2 className="login-title-text">Organiser Access Required</h2>
                    <p className="login-subtitle-text">
                      Your current session is signed in with a Student account. Accessing My Events and private organizer management requires an Organiser account.
                    </p>
                  </div>
                  <div className="login-form-body">
                    <button
                      type="button"
                      className="btn-accent-login"
                      onClick={() => {
                        setSelectedRole("organizer");
                        setCurrentView("role-auth");
                        window.location.hash = "#/login";
                      }}
                    >
                      Sign In as Organiser →
                    </button>
                    <button
                      type="button"
                      className="btn-glass-return"
                      onClick={() => {
                        setCurrentView("discovery");
                        window.location.hash = "#/discovery";
                      }}
                    >
                      ← Return to Student Discovery
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <RoleSelection
              onSelectRole={(chosenRole) => {
                setSelectedRole(chosenRole);
                setCurrentView("role-auth");
                window.location.hash = "#/login";
              }}
              onCancel={() => {
                setCurrentView("discovery");
                window.location.hash = "#/discovery";
              }}
            />
          )
        )}
      </main>

      {/* FILTER MODAL / BOTTOM SHEET */}
      {isFilterModalOpen && (
        <FilterModal
          key={`filter-modal-${filters.category}-${isFilterModalOpen}`}
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          initialFilters={filters}
          onApplyFilters={(newFilters) => setFilters(newFilters)}
        />
      )}

      {/* EVENT DETAIL & REGISTRATION MODAL */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRegistrationSuccess={handleRegistrationSuccess}
          isSaved={savedEventIds.includes(selectedEvent._id)}
          onToggleSave={toggleSaveEvent}
          onRequireAuth={handleRequireAuthForEvent}
        />
      )}

      {/* DIGITAL ENTRY PASS MODAL */}
      {issuedPass && (
        <DigitalPassModal
          passData={issuedPass}
          event={passEventContext}
          onClose={() => {
            setIssuedPass(null);
            setPassEventContext(null);
          }}
        />
      )}

      {/* Floating Dark Glass Navigation Dock on Mobile */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        savedCount={savedEventIds.length}
        ticketCount={bookedTickets.length}
      />

      {/* Cinematic Desktop Footer */}
      <footer className="cinematic-footer">
        <div className="footer-bounds-wrap">
          <div className="footer-left-brand">
            <strong>EventEase</strong>
          </div>
          <div className="footer-right-tags">
            <span>Atomic Seat Allocation</span>
            <span>•</span>
            <span>MongoDB Atlas Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
