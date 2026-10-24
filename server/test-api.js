import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import Event from "./src/models/Event.js";
import Registration from "./src/models/Registration.js";
import Organizer from "./src/models/Organizer.js";

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let serverInstance = null;
const createdEventIds = [];
let testOrganizerId = null;

const logResult = (name, passed, details = "") => {
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} - ${name} ${details ? `(${details})` : ""}`);
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("   EventEase Live - End-to-End API & Auth Verification  ");
  console.log("========================================================\n");

  let passedCount = 0;
  let totalCount = 0;

  const assert = (condition, name, details = "") => {
    totalCount++;
    if (condition) {
      passedCount++;
      logResult(name, true, details);
    } else {
      logResult(name, false, details);
    }
  };

  try {
    // 1. Connect to Database & Start Test Server
    await connectDB();
    await Registration.syncIndexes();
    await Organizer.syncIndexes();

    serverInstance = app.listen(PORT);
    console.log(`[Test Server] Listening on ${BASE_URL}\n`);

    // Ensure test organizer exists for test suite
    const testEmail = "testorganizer@eventease.live";
    const testPassword = "TestPassword123!";
    let organizer = await Organizer.findOne({ email: testEmail });
    if (!organizer) {
      organizer = await Organizer.create({
        name: "Test Organizer",
        email: testEmail,
        password: testPassword
      });
    }
    testOrganizerId = organizer._id;

    let authToken = null;

    // --- GROUP 1: HEALTH CHECK ---
    const healthRes = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.database?.connected === true,
      "GET /api/health returns 200 and connected database",
      `Status: ${healthRes.status}`
    );

    // --- GROUP 2: AUTHENTICATION TESTS ---
    console.log("\n--- Testing Authentication & Token Verification ---");

    // TEST 2: Login validation - missing email or password
    const missingCredsRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail })
    });
    assert(
      missingCredsRes.status === 400,
      "POST /api/auth/login with missing password returns HTTP 400",
      `Status: ${missingCredsRes.status}`
    );

    // TEST 3: Login with incorrect password
    const badPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword999!" })
    });
    const badPassData = await badPassRes.json();
    assert(
      badPassRes.status === 401 && badPassData.message === "Invalid email or password",
      "POST /api/auth/login with incorrect credentials returns HTTP 401 generic error",
      `Message: "${badPassData.message}"`
    );

    // TEST 4: Login with non-existent email
    const nonExistentEmailRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unknown@eventease.live", password: "SomePassword123!" })
    });
    const nonExistentData = await nonExistentEmailRes.json();
    assert(
      nonExistentEmailRes.status === 401 && nonExistentData.message === "Invalid email or password",
      "POST /api/auth/login with unknown email returns identical HTTP 401 generic error (anti-enumeration)",
      `Message: "${nonExistentData.message}"`
    );

    // TEST 5: Successful organizer login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;
    assert(
      loginRes.status === 200 && authToken && loginData.organizer?.email === testEmail,
      "POST /api/auth/login with valid credentials returns HTTP 200 and signed JWT",
      `Token issued: ${authToken ? "YES" : "NO"}`
    );

    // TEST 6: Protected endpoint access without token
    const missingTokenRes = await fetch(`${BASE_URL}/auth/me`);
    assert(
      missingTokenRes.status === 401,
      "Accessing protected route without Authorization header returns HTTP 401",
      `Status: ${missingTokenRes.status}`
    );

    // TEST 7: Protected endpoint access with invalid / forged token
    const invalidTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: "Bearer this.is.an.invalid.token" }
    });
    assert(
      invalidTokenRes.status === 401,
      "Accessing protected route with invalid token returns HTTP 401",
      `Status: ${invalidTokenRes.status}`
    );

    // TEST 8: Protected endpoint access with valid token
    const validTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const validTokenData = await validTokenRes.json();
    assert(
      validTokenRes.status === 200 && validTokenData.organizer?.email === testEmail,
      "Accessing protected route with valid JWT succeeds with HTTP 200",
      `Organizer: ${validTokenData.organizer?.name}`
    );

    // --- GROUP 3: PROTECTED EVENT CREATION ---
    console.log("\n--- Testing Protected Event Creation ---");

    // TEST 9: POST /api/events rejected without token
    const unauthCreateRes = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Event",
        description: "Should be rejected without auth.",
        date: new Date(Date.now() + 86400000).toISOString(),
        venue: "Secret Location",
        capacity: 10
      })
    });
    assert(
      unauthCreateRes.status === 401,
      "POST /api/events rejected with HTTP 401 when unauthenticated",
      `Status: ${unauthCreateRes.status}`
    );

    // TEST 10: POST /api/events succeeds with organizer token
    const authCreateRes = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: "Developer Summit 2026",
        description: "A premier tech gathering for engineers.",
        date: new Date(Date.now() + 7 * 86400000).toISOString(),
        venue: "Main Hall, Metro Center",
        capacity: 2
      })
    });
    const createData = await authCreateRes.json();
    const testEventId = createData.data?._id;
    if (testEventId) createdEventIds.push(testEventId);

    assert(
      authCreateRes.status === 201 && testEventId && createData.data.capacity === 2,
      "POST /api/events succeeds with HTTP 201 when authenticated with JWT",
      `ID: ${testEventId}`
    );

    // --- GROUP 4: PUBLIC EVENT BROWSING & DETAILS ---
    console.log("\n--- Testing Public Event Browsing ---");

    // TEST 11: GET /api/events is public (no token needed)
    const listRes = await fetch(`${BASE_URL}/events`);
    const listData = await listRes.json();
    assert(
      listRes.status === 200 && Array.isArray(listData.data),
      "GET /api/events is publicly accessible without token (HTTP 200)",
      `Count: ${listData.count}`
    );

    // TEST 12: GET /api/events/:id is public (no token needed)
    const singleRes = await fetch(`${BASE_URL}/events/${testEventId}`);
    const singleData = await singleRes.json();
    assert(
      singleRes.status === 200 && singleData.data?.title === "Developer Summit 2026",
      "GET /api/events/:id is publicly accessible without token (HTTP 200)",
      `Title: ${singleData.data?.title}`
    );

    // --- GROUP 5: PUBLIC PARTICIPANT REGISTRATION & CONCURRENCY ---
    console.log("\n--- Testing Public Participant Registration ---");

    // TEST 13: Participant registration is public (no token required)
    const regRes1 = await fetch(`${BASE_URL}/events/${testEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: "Alice Walker",
        email: "  Alice.Walker@Example.com  "
      })
    });
    const regData1 = await regRes1.json();
    assert(
      regRes1.status === 201 &&
        regData1.data?.registrationReference?.startsWith("REG-") &&
        regData1.data?.email === "alice.walker@example.com",
      "POST /api/events/:id/register is public, books ticket and normalizes email (HTTP 201)",
      `Ref: ${regData1.data?.registrationReference}`
    );

    // TEST 14: Duplicate registration prevention
    const duplicateRes = await fetch(`${BASE_URL}/events/${testEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: "Alice Duplicate",
        email: "ALICE.WALKER@example.com"
      })
    });
    assert(
      duplicateRes.status === 409,
      "POST /api/events/:id/register catches duplicate email and returns HTTP 409 Conflict",
      `Status: ${duplicateRes.status}`
    );

    // TEST 15: Claim second seat
    const regRes2 = await fetch(`${BASE_URL}/events/${testEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: "Bob Smith",
        email: "bob.smith@example.com"
      })
    });
    assert(
      regRes2.status === 201,
      "POST /api/events/:id/register claims second and final seat (2/2)",
      `Status: ${regRes2.status}`
    );

    // TEST 16: Overcapacity registration rejected
    const overCapacityRes = await fetch(`${BASE_URL}/events/${testEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: "Charlie Brown",
        email: "charlie@example.com"
      })
    });
    assert(
      overCapacityRes.status === 400 || overCapacityRes.status === 409,
      "POST /api/events/:id/register rejects overcapacity with HTTP 400/409 Conflict",
      `Status: ${overCapacityRes.status}`
    );

    // --- GROUP 6: PROTECTED ATTENDEE LIST ---
    console.log("\n--- Testing Protected Attendee Roster ---");

    // TEST 17: GET /api/events/:id/attendees rejected without token
    const unauthAttendeesRes = await fetch(`${BASE_URL}/events/${testEventId}/attendees`);
    assert(
      unauthAttendeesRes.status === 401,
      "GET /api/events/:id/attendees is protected, rejects unauthenticated access (HTTP 401)",
      `Status: ${unauthAttendeesRes.status}`
    );

    // TEST 18: GET /api/events/:id/attendees succeeds with organizer token
    const authAttendeesRes = await fetch(`${BASE_URL}/events/${testEventId}/attendees`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const attendeesData = await authAttendeesRes.json();
    assert(
      authAttendeesRes.status === 200 &&
        attendeesData.count === 2 &&
        attendeesData.data.length === 2,
      "GET /api/events/:id/attendees succeeds with organizer JWT (HTTP 200)",
      `Attendees count: ${attendeesData.count}`
    );

    // --- GROUP 7: CONCURRENCY RACE CONDITION TEST ---
    console.log("\n--- Testing Concurrent Registration for the Last Seat ---");
    const raceEventRes = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: "High Concurrency Masterclass (1 Seat)",
        description: "Race condition verification.",
        date: new Date(Date.now() + 3 * 86400000).toISOString(),
        venue: "VIP Auditorium",
        capacity: 1
      })
    });
    const raceEventData = await raceEventRes.json();
    const raceEventId = raceEventData.data._id;
    createdEventIds.push(raceEventId);

    // Fire 6 simultaneous registration requests at the exact same millisecond
    const competitors = [
      { participantName: "Runner 1", email: "runner1@example.com" },
      { participantName: "Runner 2", email: "runner2@example.com" },
      { participantName: "Runner 3", email: "runner3@example.com" },
      { participantName: "Runner 4", email: "runner4@example.com" },
      { participantName: "Runner 5", email: "runner5@example.com" },
      { participantName: "Runner 6", email: "runner6@example.com" }
    ];

    const concurrentResults = await Promise.all(
      competitors.map(competitor =>
        fetch(`${BASE_URL}/events/${raceEventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(competitor)
        }).then(async res => ({ status: res.status, data: await res.json() }))
      )
    );

    const successCount = concurrentResults.filter(r => r.status === 201).length;
    const fullCount = concurrentResults.filter(r => r.status === 400 || r.status === 409).length;

    assert(
      successCount === 1,
      "Concurrent Race: Exactly 1 request acquired the final seat (HTTP 201)",
      `Successes: ${successCount}`
    );

    assert(
      fullCount === 5,
      "Concurrent Race: Remaining 5 simultaneous requests were rejected as full (HTTP 400/409)",
      `Rejections: ${fullCount}`
    );

    const raceEventFinal = await Event.findById(raceEventId);
    assert(
      raceEventFinal.registeredCount === 1,
      "Concurrent Race: Final registeredCount is strictly 1/1 (no over-allocation)",
      `Final registeredCount: ${raceEventFinal.registeredCount}`
    );

    console.log("\n========================================================");
    console.log(`   Verification Summary: ${passedCount} / ${totalCount} checks passed!`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Clean up created test events and test registrations
    if (createdEventIds.length > 0) {
      console.log(`[Cleanup] Removing ${createdEventIds.length} test events and their registrations...`);
      await Registration.deleteMany({ event: { $in: createdEventIds } });
      await Event.deleteMany({ _id: { $in: createdEventIds } });
    }

    if (testOrganizerId) {
      await Organizer.findByIdAndDelete(testOrganizerId);
      console.log("[Cleanup] Test organizer account cleaned up.");
    }

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTests();
