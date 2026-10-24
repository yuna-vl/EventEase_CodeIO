import express from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../controllers/notificationController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// All notification routes require authenticated user session
router.use(authenticateUser);

router.get("/", getUserNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

export default router;
