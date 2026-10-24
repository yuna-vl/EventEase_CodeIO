import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function NotificationBell() {
  const { token, isAuthenticated, isStudent } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  // Fetch notifications for the authenticated student
  const fetchNotifications = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await api.getNotifications(token);
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Gracefully handle network hiccups without breaking navbar
      console.warn("[Notifications] Fetch error:", err.message);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationAsRead(notifId, token);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[Notifications] Mark read error:", err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[Notifications] Mark all read error:", err);
    }
  };

  // Only render for authenticated students
  if (!isAuthenticated || !isStudent) return null;

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        type="button"
        className={`btn-notification-bell ${isOpen ? "active" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        title="View Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge-counter" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown-panel" role="region" aria-label="Notifications Panel">
          <div className="notification-panel-header">
            <div className="panel-title-wrap">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-panel-body">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="empty-bell-icon">🔔</div>
                <p>No notifications yet</p>
                <span>You're all caught up with your event updates!</span>
              </div>
            ) : (
              <div className="notification-items-list">
                {notifications.map((item) => (
                  <div
                    key={item._id}
                    className={`notification-item-card ${!item.isRead ? "unread" : ""}`}
                  >
                    <div className="notif-card-header">
                      <div className="notif-type-tag warning">
                        <span className="notif-icon">⚠️</span>
                        <span>{item.title}</span>
                      </div>
                      {!item.isRead && (
                        <button
                          type="button"
                          className="btn-mark-read-item"
                          onClick={(e) => handleMarkAsRead(item._id, e)}
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    <p className="notif-card-message">{item.message}</p>

                    <div className="notif-card-footer">
                      <span className="notif-date">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {!item.isRead && <span className="notif-unread-dot" title="Unread notification" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
