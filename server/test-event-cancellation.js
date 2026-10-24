import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import User from "./src/models/User.js";
import Event from "./src/models/Event.js";
import Registration from "./src/models/Registration.js";
import Notification from "./src/models/Notification.js";

const BASE_URL = "http://127.0.0.1:5000/api";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runCancellationTests() {
  console.log("\n========================================================");
  console.log("   EventEase — Event Cancellation & Notification Tests ");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const org1Email = `org_canceller1_${timestamp}@test.edu`;
  const org2Email = `org_canceller2_${timestamp}@test.edu`;
  const student1Email = `student_registered_${timestamp}@test.edu`;
  const student2Email = `student_unregistered_${timestamp}@test.edu`;
  const password = "TestPassword123!";
  const organizerSecret = process.env.ORGANIZER_SIGNUP_SECRET || "EventEaseOrganizer2026!";

  const createdUserIds = [];
  let testEventId = null;

  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // ----------------------------------------------------
    // CHECK 1 & 2: Opening/refreshing events page does not insert records
    // ----------------------------------------------------
    console.log("[Test 1 & 2] GET /api/events never mutates database (Read-only)");
    const initialCount = await Event.countDocuments({});
    await request("/events");
    await request("/events");
    await request("/events");
    const countAfterGets = await Event.countDocuments({});
    assert(initialCount === countAfterGets, `Event count remained unchanged (${initialCount} === ${countAfterGets}) across repeated GET calls`);

    // ----------------------------------------------------
    // CHECK 3: Unauthenticated user cannot create an event
    // ----------------------------------------------------
    console.log("\n[Test 3] Unauthenticated event creation blocked");
    const unauthCreateRes = await request("/events", {
      method: "POST",
      body: JSON.stringify({
        title: "Unauthorized Hack Event",
        capacity: 10
      })
    });
    assert(unauthCreateRes.status === 401, "Unauthenticated POST /api/events returned HTTP 401");

    // ----------------------------------------------------
    // Setup Accounts: 2 Organizers + 2 Students
    // ----------------------------------------------------
    console.log("\n[Setup] Provisioning test organizers and students");
    // Org 1
    const org1Signup = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Organizer One",
        email: org1Email,
        password,
        role: "organizer",
        organizerSecret
      })
    });
    assert(org1Signup.status === 201, "Organizer 1 registered successfully");
    const org1Token = org1Signup.data.token;
    createdUserIds.push(org1Signup.data.user?.id);

    // Org 2
    const org2Signup = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Organizer Two",
        email: org2Email,
        password,
        role: "organizer",
        organizerSecret
      })
    });
    assert(org2Signup.status === 201, "Organizer 2 registered successfully");
    const org2Token = org2Signup.data.token;
    createdUserIds.push(org2Signup.data.user?.id);

    // Student 1 (Will register)
    const stud1Signup = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Alice Registered",
        email: student1Email,
        password,
        role: "student"
      })
    });
    assert(stud1Signup.status === 201, "Student 1 registered successfully");
    const stud1Token = stud1Signup.data.token;
    const stud1Id = stud1Signup.data.user?.id;
    createdUserIds.push(stud1Id);

    // Student 2 (Will NOT register)
    const stud2Signup = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Bob Bystander",
        email: student2Email,
        password,
        role: "student"
      })
    });
    assert(stud2Signup.status === 201, "Student 2 registered successfully");
    const stud2Token = stud2Signup.data.token;
    const stud2Id = stud2Signup.data.user?.id;
    createdUserIds.push(stud2Id);

    // ----------------------------------------------------
    // CHECK 4: Authenticated organizer creates event explicitly
    // ----------------------------------------------------
    console.log("\n[Test 4] Authenticated organizer explicitly creates event");
    const createRes = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${org1Token}` },
      body: JSON.stringify({
        title: `Quantum Computing Symposium ${timestamp}`,
        description: "Exploring NISQ quantum hardware and fault-tolerant algorithms.",
        date: new Date(Date.now() + 86400000 * 7).toISOString(),
        time: "02:00 PM",
        venue: "Auditorium Hall C",
        capacity: 50,
        registrationType: "free"
      })
    });
    assert(createRes.status === 201, "Organizer 1 created event with HTTP 201");
    testEventId = createRes.data.data._id;
    assert(Boolean(testEventId), "Event ID successfully returned");
    assert(createRes.data.data.status === "active" || createRes.data.data.status === "published", "Initial event status is 'active' or 'published'");

    // Register Student 1 for the event
    console.log("\n[Setup] Student 1 registers for the event");
    const regRes = await request(`/events/${testEventId}/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stud1Token}` },
      body: JSON.stringify({
        name: "Alice Registered",
        email: student1Email,
        phone: "+1 555-0199",
        seats: 1
      })
    });
    assert(regRes.status === 201, "Student 1 successfully registered for event");

    // ----------------------------------------------------
    // CHECK 5: Another organizer cannot cancel an event they do not own
    // ----------------------------------------------------
    console.log("\n[Test 5] Org 2 tries to cancel Org 1's event (Should be 403 Forbidden)");
    const org2CancelRes = await request(`/events/${testEventId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${org2Token}` },
      body: JSON.stringify({ reason: "Malicious cancellation attempt" })
    });
    assert(org2CancelRes.status === 403, "Unrelated organizer blocked from cancelling event (HTTP 403)");

    // ----------------------------------------------------
    // CHECK 6: A student cannot cancel an event
    // ----------------------------------------------------
    console.log("\n[Test 6] Student tries to cancel the event (Should be 403 Forbidden)");
    const studentCancelRes = await request(`/events/${testEventId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${stud1Token}` },
      body: JSON.stringify({ reason: "Student cancel attempt" })
    });
    assert(studentCancelRes.status === 403, "Student blocked from cancelling event (HTTP 403)");

    // ----------------------------------------------------
    // CHECK 7: Owning organizer cancels event
    // ----------------------------------------------------
    console.log("\n[Test 7] Owning organizer cancels event successfully");
    const cancellationReason = "Speaker unavailable due to unexpected travel delays";
    const cancelRes = await request(`/events/${testEventId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${org1Token}` },
      body: JSON.stringify({ reason: cancellationReason })
    });
    assert(cancelRes.status === 200, "Owning organizer successfully cancelled event (HTTP 200)");
    assert(cancelRes.data.data.status === "cancelled", "Event status updated to 'cancelled'");
    assert(Boolean(cancelRes.data.data.cancelledAt), "Cancellation timestamp recorded");
    assert(cancelRes.data.data.cancellationReason === cancellationReason, "Cancellation reason stored correctly");
    assert(cancelRes.data.notificationsSent === 1, "Exactly 1 cancellation notification delivered to registered student");

    // ----------------------------------------------------
    // CHECK 8 & 14: Repeat cancellation is idempotent (0 duplicate notifications)
    // ----------------------------------------------------
    console.log("\n[Test 8 & 14] Idempotent retry: Re-cancelling does not duplicate notifications");
    const repeatCancelRes = await request(`/events/${testEventId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${org1Token}` },
      body: JSON.stringify({ reason: "Repeated cancel call" })
    });
    assert(repeatCancelRes.status === 200, "Re-cancelling returns HTTP 200");
    assert(repeatCancelRes.data.alreadyCancelled === true, "Response indicates event was already cancelled");
    assert(repeatCancelRes.data.notificationsSent === 0, "No duplicate notifications created on retry (0 new)");

    // Verify Notification count in MongoDB
    const notifsInDb = await Notification.find({ event: testEventId });
    assert(notifsInDb.length === 1, `Total notifications in database for event is exactly 1 (found ${notifsInDb.length})`);

    // ----------------------------------------------------
    // CHECK 9: Registered student receives persistent notification
    // ----------------------------------------------------
    console.log("\n[Test 9] Registered student fetches their notifications");
    const stud1NotifsRes = await request("/notifications", {
      headers: { Authorization: `Bearer ${stud1Token}` }
    });
    assert(stud1NotifsRes.status === 200, "Student 1 fetched notifications with HTTP 200");
    assert(stud1NotifsRes.data.count >= 1, "Student 1 received at least 1 notification");
    const cancelNotif = stud1NotifsRes.data.data.find(n => n.event?._id === testEventId || n.event === testEventId);
    assert(Boolean(cancelNotif), "Cancellation notification found for Student 1");
    assert(cancelNotif.type === "event_cancelled", "Notification type is 'event_cancelled'");
    assert(cancelNotif.message.includes(cancellationReason), "Notification message contains the cancellation reason");
    assert(cancelNotif.isRead === false, "Notification is initially unread");

    // ----------------------------------------------------
    // CHECK 10: Unregistered student receives NO cancellation notification
    // ----------------------------------------------------
    console.log("\n[Test 10] Unregistered student receives 0 cancellation notifications");
    const stud2NotifsRes = await request("/notifications", {
      headers: { Authorization: `Bearer ${stud2Token}` }
    });
    assert(stud2NotifsRes.status === 200, "Student 2 fetched notifications with HTTP 200");
    const stud2CancelNotif = stud2NotifsRes.data.data.find(n => n.event?._id === testEventId || n.event === testEventId);
    assert(!stud2CancelNotif, "Unregistered Student 2 received NO notification for cancelled event");

    // ----------------------------------------------------
    // CHECK 11: Security: Student cannot read or modify another student's notifications
    // ----------------------------------------------------
    console.log("\n[Test 11] Security: Student 2 cannot mark Student 1's notification as read");
    const notifId = cancelNotif._id;
    const hackReadRes = await request(`/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${stud2Token}` }
    });
    assert(hackReadRes.status === 403 || hackReadRes.status === 404, `Student 2 blocked (status ${hackReadRes.status}) from modifying Student 1's notification`);

    // Student 1 legitimately marks their notification as read
    console.log("\n[Test 11b] Student 1 marks their own notification as read");
    const legitimateReadRes = await request(`/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${stud1Token}` }
    });
    assert(legitimateReadRes.status === 200, "Student 1 successfully marked notification as read (HTTP 200)");
    assert(legitimateReadRes.data.data.isRead === true, "Notification isRead flag updated to true");

    // ----------------------------------------------------
    // CHECK 12: Students cannot register for cancelled events
    // ----------------------------------------------------
    console.log("\n[Test 12] Block new registration on cancelled event");
    const blockedRegRes = await request(`/events/${testEventId}/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stud2Token}` },
      body: JSON.stringify({
        name: "Bob Latecomer",
        email: student2Email,
        phone: "+1 555-0200",
        seats: 1
      })
    });
    assert(blockedRegRes.status === 400, "Registration on cancelled event rejected with HTTP 400");
    assert(blockedRegRes.data.message.toLowerCase().includes("cancelled"), `Error message mentions event is cancelled: "${blockedRegRes.data.message}"`);

    // ----------------------------------------------------
    // CHECK 13: Existing registrations are preserved
    // ----------------------------------------------------
    console.log("\n[Test 13] Registrations preserved for audit & notification history");
    const existingReg = await Registration.findOne({ event: testEventId, email: student1Email });
    assert(Boolean(existingReg), "Student 1's registration record remains intact in MongoDB");

    // ----------------------------------------------------
    // CHECK 14: Public listings exclude cancelled events while organizer history retains them
    // ----------------------------------------------------
    console.log("\n[Test 14] Public listings exclude cancelled events while organizer history retains them");
    const publicListingsRes = await request("/events");
    assert(publicListingsRes.status === 200, "Public GET /api/events succeeded");
    const inPublicListing = publicListingsRes.data.data.some(e => e._id === testEventId);
    assert(!inPublicListing, "Cancelled event is strictly EXCLUDED from public event listings");

    const organizerHistoryRes = await request("/events?includeCancelled=true");
    assert(organizerHistoryRes.status === 200, "History GET /api/events?includeCancelled=true succeeded");
    const inHistory = organizerHistoryRes.data.data.find(e => e._id === testEventId);
    assert(Boolean(inHistory), "Cancelled event is strictly RETAINED in organizer history view");
    assert(inHistory.status === "cancelled", "Cancelled event retains status 'cancelled' in organizer history");

    console.log("\n========================================================");
    console.log("   ALL 15 CANCELLATION & NOTIFICATION CHECKS PASSED!    ");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log("Cleaning up test resources...");
    if (testEventId) {
      await Event.deleteOne({ _id: testEventId });
      await Registration.deleteMany({ event: testEventId });
      await Notification.deleteMany({ event: testEventId });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log("Cleaned up successfully.\n");
  }
}

runCancellationTests();
