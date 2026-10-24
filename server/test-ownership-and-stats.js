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

const BASE_URL = process.env.API_BASE || "http://127.0.0.1:5000/api";

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

async function runComprehensiveTests() {
  console.log("\n========================================================");
  console.log("   EventEase — Organizer Ownership & Statistics Test    ");
  console.log("========================================================\n");

  const ts = Date.now();
  const orgAEmail = `org_a_${ts}@test.edu`;
  const orgBEmail = `org_b_${ts}@test.edu`;
  const studentEmail = `student_${ts}@test.edu`;
  const password = "TestPassword123!";
  const organizerSecret = process.env.ORGANIZER_SIGNUP_SECRET || "EventEaseOrganizer2026!";

  const createdUserIds = [];
  const createdEventIds = [];

  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // ----------------------------------------------------
    // SETUP: Create Organiser A, Organiser B, and Student
    // ----------------------------------------------------
    console.log("[Setup] Provisioning test organizers and student");
    const regOrgA = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Organiser Alpha", email: orgAEmail, password, role: "organizer", organizerSecret })
    });
    assert(regOrgA.status === 201, "Organiser A registered successfully");
    const tokenA = regOrgA.data.token;
    const orgAId = regOrgA.data.user.id;
    createdUserIds.push(orgAId);

    const regOrgB = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Organiser Beta", email: orgBEmail, password, role: "organizer", organizerSecret })
    });
    assert(regOrgB.status === 201, "Organiser B registered successfully");
    const tokenB = regOrgB.data.token;
    const orgBId = regOrgB.data.user.id;
    createdUserIds.push(orgBId);

    const regStudent = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Student Sam", email: studentEmail, password, role: "student" })
    });
    assert(regStudent.status === 201, "Student registered successfully");
    const studentToken = regStudent.data.token;
    createdUserIds.push(regStudent.data.user.id);

    // ----------------------------------------------------
    // TEST 3: Organiser with no events sees empty state
    // ----------------------------------------------------
    console.log("\n[Test 3] An organiser with no events sees 0 events (Empty State)");
    const emptyEventsRes = await request("/events/organizer/events", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(emptyEventsRes.status === 200, "GET /api/events/organizer/events returns 200");
    assert(emptyEventsRes.data.count === 0, "Organiser A initially has 0 events");
    assert(Array.isArray(emptyEventsRes.data.data) && emptyEventsRes.data.data.length === 0, "Event array is empty");

    const emptyStatsRes = await request("/events/organizer/stats", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(emptyStatsRes.status === 200, "GET /api/events/organizer/stats returns 200");
    assert(emptyStatsRes.data.data.totalEvents === 0, "Total Events is 0");
    assert(emptyStatsRes.data.data.confirmedRegistrations === 0, "Confirmed Registrations is 0");
    assert(emptyStatsRes.data.data.availableCapacity === 0, "Available Capacity is 0");

    // ----------------------------------------------------
    // SETUP EVENTS:
    // Organiser A creates 3 events:
    // Event A1: Active, Capacity 100
    // Event A2: Active, Capacity 50
    // Event A3: Cancelled, Capacity 200
    // Organiser B creates 2 events:
    // Event B1: Active, Capacity 80
    // Event B2: Active, Capacity 40
    // ----------------------------------------------------
    console.log("\n[Setup] Creating events for Organiser A and Organiser B");
    const createA1 = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: "Event A1 - Cloud Architecture",
        description: "Cloud systems and scale",
        date: new Date(Date.now() + 86400000 * 2).toISOString(),
        venue: "Hall A",
        capacity: 100
      })
    });
    assert(createA1.status === 201, "Event A1 created (Capacity: 100)");
    const eventA1Id = createA1.data.data._id;
    createdEventIds.push(eventA1Id);

    const createA2 = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: "Event A2 - AI Systems",
        description: "Modern neural networks",
        date: new Date(Date.now() + 86400000 * 3).toISOString(),
        venue: "Hall B",
        capacity: 50
      })
    });
    assert(createA2.status === 201, "Event A2 created (Capacity: 50)");
    const eventA2Id = createA2.data.data._id;
    createdEventIds.push(eventA2Id);

    const createA3 = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: "Event A3 - Legacy Cancelled Tech",
        description: "Will be cancelled for test",
        date: new Date(Date.now() + 86400000 * 4).toISOString(),
        venue: "Hall C",
        capacity: 200
      })
    });
    assert(createA3.status === 201, "Event A3 created (Capacity: 200)");
    const eventA3Id = createA3.data.data._id;
    createdEventIds.push(eventA3Id);

    // Organiser B events
    const createB1 = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: "Event B1 - Quantum Fundamentals",
        description: "Quantum computing workshop",
        date: new Date(Date.now() + 86400000 * 5).toISOString(),
        venue: "Hall D",
        capacity: 80
      })
    });
    assert(createB1.status === 201, "Event B1 created (Capacity: 80)");
    const eventB1Id = createB1.data.data._id;
    createdEventIds.push(eventB1Id);

    const createB2 = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: "Event B2 - Robotics & Edge",
        description: "Embedded robotics",
        date: new Date(Date.now() + 86400000 * 6).toISOString(),
        venue: "Hall E",
        capacity: 40
      })
    });
    assert(createB2.status === 201, "Event B2 created (Capacity: 40)");
    const eventB2Id = createB2.data.data._id;
    createdEventIds.push(eventB2Id);

    // ----------------------------------------------------
    // TEST 1 & 2: Isolation: Organiser A sees only 3 events, Organiser B sees only 2 events
    // ----------------------------------------------------
    console.log("\n[Test 1 & 2] Organiser-specific event isolation in My Events & Dashboard");
    const myEventsA = await request("/events/organizer/events", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(myEventsA.status === 200, "Organiser A fetched their events");
    assert(myEventsA.data.count === 3, `Organiser A sees exactly their 3 events (count: ${myEventsA.data.count})`);
    const allBelongToA = myEventsA.data.data.every(e => e.organizer.toString() === orgAId);
    assert(allBelongToA, "Every event returned for Organiser A belongs strictly to Organiser A");

    const myEventsB = await request("/events/organizer/events", {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(myEventsB.status === 200, "Organiser B fetched their events");
    assert(myEventsB.data.count === 2, `Organiser B sees exactly their 2 events (count: ${myEventsB.data.count})`);
    const allBelongToB = myEventsB.data.data.every(e => e.organizer.toString() === orgBId);
    assert(allBelongToB, "Every event returned for Organiser B belongs strictly to Organiser B");

    // ----------------------------------------------------
    // REGISTER PARTICIPANTS:
    // Event A1 (cap 100): 2 registrations -> 98 available
    // Event A2 (cap 50): 1 registration -> 49 available
    // Event A3 (cap 200): 1 registration -> will be cancelled!
    // Event B1 (cap 80): 1 registration (belongs to B!)
    // ----------------------------------------------------
    console.log("\n[Setup] Registering participants across events");
    await request(`/events/${eventA1Id}/register`, {
      method: "POST",
      body: JSON.stringify({ participantName: "Alice Attendee", email: `alice_${ts}@test.edu` })
    });
    await request(`/events/${eventA1Id}/register`, {
      method: "POST",
      body: JSON.stringify({ participantName: "Bob Attendee", email: `bob_${ts}@test.edu` })
    });
    await request(`/events/${eventA2Id}/register`, {
      method: "POST",
      body: JSON.stringify({ participantName: "Charlie Attendee", email: `charlie_${ts}@test.edu` })
    });
    await request(`/events/${eventA3Id}/register`, {
      method: "POST",
      body: JSON.stringify({ participantName: "David Attendee", email: `david_${ts}@test.edu` })
    });
    await request(`/events/${eventB1Id}/register`, {
      method: "POST",
      body: JSON.stringify({ participantName: "Eve Attendee", email: `eve_${ts}@test.edu` })
    });

    // ----------------------------------------------------
    // TEST 11: Organiser A cancels Event A3
    // ----------------------------------------------------
    console.log("\n[Test 11] Organiser A cancels their own eligible event (Event A3)");
    const cancelRes = await request(`/events/${eventA3Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ reason: "Unforeseen speaker schedule conflict" })
    });
    assert(cancelRes.status === 200, "Event A3 cancelled successfully (HTTP 200)");
    assert(cancelRes.data.data.status === "cancelled", "Event A3 status is now 'cancelled'");
    assert(cancelRes.data.notificationsSent === 1, "Registered attendee received cancellation notification");

    // ----------------------------------------------------
    // TEST 13: Already cancelled event returns idempotent response
    // ----------------------------------------------------
    console.log("\n[Test 13] Re-cancelling returns idempotent response without duplicating notifications");
    const reCancelRes = await request(`/events/${eventA3Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ reason: "Another reason" })
    });
    assert(reCancelRes.status === 200, "Re-cancellation returned HTTP 200");
    assert(reCancelRes.data.alreadyCancelled === true, "alreadyCancelled flag is true");
    assert(reCancelRes.data.notificationsSent === 0, "0 duplicate notifications sent");

    // ----------------------------------------------------
    // TEST 13b: Draft event cancellation rejection
    // ----------------------------------------------------
    console.log("\n[Test 13b] Draft events cannot be cancelled");
    const draftEvent = await Event.create({
      title: "Draft Test Event",
      description: "Draft description",
      date: new Date(Date.now() + 86400000 * 10),
      venue: "Draft Room",
      capacity: 30,
      organizer: orgAId,
      status: "draft"
    });
    createdEventIds.push(draftEvent._id);
    const cancelDraftRes = await request(`/events/${draftEvent._id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(cancelDraftRes.status === 400, "Cancelling draft event rejected with HTTP 400");
    assert(cancelDraftRes.data.message.includes("draft"), "Error message mentions draft event eligibility");

    // ----------------------------------------------------
    // TEST 5, 6, 7, 8, 10: Authoritative Dashboard Statistics Calculation
    // For Organiser A:
    // Event A1: Cap 100, Reg 2, Active -> Available 98
    // Event A2: Cap 50, Reg 1, Active -> Available 49
    // Event A3: Cap 200, Reg 1, Cancelled -> EXCLUDED!
    // Total Events = 2 (A1 and A2, excludes A3 and draft)
    // Confirmed Registrations = 3 (2 from A1 + 1 from A2, excludes A3)
    // Available Capacity = 147 (98 + 49) out of 150 active capacity!
    // Organiser B's event B1 (80 cap, 1 reg) must NOT affect A!
    // ----------------------------------------------------
    console.log("\n[Test 5, 6, 7, 8, 10] Authoritative Dashboard Statistics for Organiser A");
    const statsARes = await request("/events/organizer/stats", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(statsARes.status === 200, "GET /api/events/organizer/stats succeeded (HTTP 200)");
    const statsA = statsARes.data.data;

    console.log("   Observed Statistics for Organiser A:", statsA);
    assert(statsA.totalEvents === 2, `[Test 5] Total Events is strictly 2 (excluded cancelled A3 and draft) (Got: ${statsA.totalEvents})`);
    assert(statsA.confirmedRegistrations === 3, `[Test 6] Confirmed Registrations is strictly 3 (excluded cancelled A3 registrations and B's registrations) (Got: ${statsA.confirmedRegistrations})`);
    assert(statsA.availableCapacity === 147, `[Test 7] Available Capacity is strictly 147 (98 + 49) (Got: ${statsA.availableCapacity})`);
    assert(statsA.totalActiveCapacity === 150, `Total Active Capacity is strictly 150 (100 + 50) (Got: ${statsA.totalActiveCapacity})`);
    assert(statsA.cancelledEvents === 1, "Cancelled events metadata count is 1");
    assert(statsA.draftEvents === 1, "Draft events metadata count is 1");

    // Check Organiser B stats (should have 2 events, 1 registration, 119 available out of 120)
    console.log("\n[Test 8] Organiser B statistics are completely independent");
    const statsBRes = await request("/events/organizer/stats", {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const statsB = statsBRes.data.data;
    console.log("   Observed Statistics for Organiser B:", statsB);
    assert(statsB.totalEvents === 2, `Organiser B Total Events is 2 (Got: ${statsB.totalEvents})`);
    assert(statsB.confirmedRegistrations === 1, `Organiser B Confirmed Registrations is 1 (Got: ${statsB.confirmedRegistrations})`);
    assert(statsB.availableCapacity === 119, `Organiser B Available Capacity is 119 (79 + 40) (Got: ${statsB.availableCapacity})`);
    assert(statsB.totalActiveCapacity === 120, `Organiser B Active Capacity is 120 (80 + 40) (Got: ${statsB.totalActiveCapacity})`);

    // ----------------------------------------------------
    // TEST 12: Organiser B cannot cancel Organiser A's event
    // ----------------------------------------------------
    console.log("\n[Test 12] Cross-organizer cancellation authorization check");
    const crossCancelRes = await request(`/events/${eventA1Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ reason: "Attacker cancel" })
    });
    assert(crossCancelRes.status === 403, "Organiser B cancelling Organiser A's event rejected with HTTP 403");

    // ----------------------------------------------------
    // TEST 14: Editing, deleting, and attendee access enforce event ownership
    // ----------------------------------------------------
    console.log("\n[Test 14] Cross-organizer edit, delete, and attendee access rejection");
    const crossEditRes = await request(`/events/${eventA1Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ title: "Hacked Title" })
    });
    assert(crossEditRes.status === 403, "Organiser B editing Organiser A's event rejected with HTTP 403");

    const crossDeleteRes = await request(`/events/${eventA1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(crossDeleteRes.status === 403, "Organiser B deleting Organiser A's event rejected with HTTP 403");

    const crossAttendeesRes = await request(`/events/${eventA1Id}/attendees`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(crossAttendeesRes.status === 403, "Organiser B viewing Organiser A's attendees rejected with HTTP 403");

    // ----------------------------------------------------
    // TEST 15: Supplying another organiser's ID in body/params cannot bypass ownership
    // ----------------------------------------------------
    console.log("\n[Test 15] Supplying another organiser ID in payload cannot bypass ownership checks");
    const spoofCreateRes = await request("/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: "Spoof Ownership Attempt",
        description: "Attempting to create event under Org A's ID",
        date: new Date(Date.now() + 86400000 * 7).toISOString(),
        venue: "Security Lab",
        capacity: 25,
        organizer: orgAId // Spoofed ID
      })
    });
    assert(spoofCreateRes.status === 201, "Event created");
    assert(spoofCreateRes.data.data.organizer.toString() === orgBId, "Backend strictly assigned verified token identity orgBId, ignoring spoofed orgAId");
    createdEventIds.push(spoofCreateRes.data.data._id);

    // ----------------------------------------------------
    // TEST 16: Students cannot access organizer-only management endpoints
    // ----------------------------------------------------
    console.log("\n[Test 16] Students cannot access organizer-only endpoints");
    const studentStatsRes = await request("/events/organizer/stats", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentStatsRes.status === 403, "Student blocked from /events/organizer/stats with HTTP 403");

    const studentEventsRes = await request("/events/organizer/events", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentEventsRes.status === 403, "Student blocked from /events/organizer/events with HTTP 403");

    const studentCancelRes = await request(`/events/${eventA1Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentCancelRes.status === 403, "Student blocked from /events/:id/cancel with HTTP 403");

    // ----------------------------------------------------
    // TEST 17 & 18: Cancellation notifications and registration preservation
    // ----------------------------------------------------
    console.log("\n[Test 17 & 18] Existing registration records and notifications remain intact");
    const regCount = await Registration.countDocuments({ event: eventA3Id });
    assert(regCount === 1, "Cancelled Event A3's registration record remains intact in MongoDB");
    const notifCount = await Notification.countDocuments({ event: eventA3Id });
    assert(notifCount === 1, "Cancellation notification delivered and stored for participant");

    // ----------------------------------------------------
    // TEST 19: Dashboard statistics update reactively after event cancellation
    // ----------------------------------------------------
    console.log("\n[Test 19] Cancelling Event A2 updates statistics immediately");
    await request(`/events/${eventA2Id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ reason: "Emergency cancellation" })
    });
    const postCancelStatsRes = await request("/events/organizer/stats", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const postCancelStats = postCancelStatsRes.data.data;
    console.log("   Updated Statistics after cancelling Event A2:", postCancelStats);
    assert(postCancelStats.totalEvents === 1, "Total events dropped from 2 to 1");
    assert(postCancelStats.confirmedRegistrations === 2, "Confirmed registrations dropped from 3 to 2");
    assert(postCancelStats.availableCapacity === 98, "Available capacity dropped from 147 to 98");
    assert(postCancelStats.totalActiveCapacity === 100, "Active capacity dropped from 150 to 100");

    console.log("\n========================================================");
    console.log("   ALL 19 AUTOMATED TESTS PASSED SUCCESSFULLY!          ");
    console.log("========================================================\n");
  } finally {
    console.log("[Cleanup] Removing test events, registrations, and accounts...");
    if (createdEventIds.length > 0) {
      await Event.deleteMany({ _id: { $in: createdEventIds } });
      await Registration.deleteMany({ event: { $in: createdEventIds } });
      await Notification.deleteMany({ event: { $in: createdEventIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
    console.log("[Cleanup] Completed cleanly.");
  }
}

runComprehensiveTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
