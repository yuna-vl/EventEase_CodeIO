import Notification from "../models/Notification.js";

/**
 * GET /api/notifications
 * Fetch persistent in-app notifications for the authenticated user.
 * Derived strictly from authenticated JWT identity (never trusting client-supplied ID).
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;

    if (!userId && !userEmail) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to view notifications"
      });
    }

    const query = {
      $or: [
        ...(userId ? [{ recipient: userId }] : []),
        ...(userEmail ? [{ email: userEmail }] : [])
      ]
    };

    const notifications = await Notification.find(query)
      .populate("event", "title date venue bannerUrl status")
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    console.error("[Notifications] Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications"
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 * Strict recipient ownership enforced: students can only modify their own notifications.
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    const isOwner =
      (notification.recipient && notification.recipient.toString() === userId) ||
      (userEmail && notification.email === userEmail);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You cannot modify notifications belonging to another account"
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error("[Notifications] Mark read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the authenticated user as read.
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;

    const filter = {
      $or: [
        ...(userId ? [{ recipient: userId }] : []),
        ...(userEmail ? [{ email: userEmail }] : [])
      ],
      isRead: false
    };

    const result = await Notification.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("[Notifications] Mark all read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read"
    });
  }
};
