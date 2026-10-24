import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const API_BASE = "http://127.0.0.1:5000/api";

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`✅ PASSED: ${testName}`);
  } else {
    console.error(`❌ FAILED: ${testName} ${details ? `(${details})` : ""}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function apiRequest(endpoint, { method = "GET", token = null, body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runComprehensiveVerification() {
  console.log("\n============================================================");
  console.log("   EVENT EASE — COMPREHENSIVE FIX VERIFICATION SUITE");
  console.log("============================================================\n");

  const timestamp = Date.now();

  // --------------------------------------------------------------------------
  // TEST A: Real Events Verification (No fake events, drafts excluded)
  // --------------------------------------------------------------------------
  console.log("--- TEST A: Public Event Discovery & Real Events Integrity ---");
  const publicEventsRes = await apiRequest("/events");
  assert(publicEventsRes.status === 200, "GET /api/events returns 200 OK");
  assert(Array.isArray(publicEventsRes.data?.data), "Events payload is an array");

  const events = publicEventsRes.data.data;
  const fakeIsolationEvents = events.filter(e => /Isolation Test Event/i.test(e.title));
  assert(fakeIsolationEvents.length === 0, "No fake 'Isolation Test Event' appears in public events listing");

  const draftEvents = events.filter(e => e.status === "draft");
  assert(draftEvents.length === 0, "No draft events appear in public student listing");

  const cancelledEvents = events.filter(e => e.status === "cancelled");
  assert(cancelledEvents.length === 0, "No cancelled events appear in public student listing");

  // Create an organizer and test event publication
  console.log("\n--- Creating Organizer and Publishing Live Event ---");
  const orgEmail = `organizer.comp.${timestamp}@example.com`;
  const orgSignup = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Verification Organizer",
      email: orgEmail,
      password: "Password123!",
      role: "organizer",
      organizerSecret: "EventEaseOrganizer2026!"
    }
  });
  assert(orgSignup.status === 201, "Organizer signed up successfully");
  const orgToken = orgSignup.data.token;

  // Create 1 draft event and 1 published event
  const pubEventRes = await apiRequest("/events", {
    method: "POST",
    token: orgToken,
    body: {
      title: `Live Production Tech Summit ${timestamp}`,
      description: "Official tech summit for testing live event discovery.",
      date: new Date(Date.now() + 86400000 * 5).toISOString(),
      venue: "Grand Convention Center",
      capacity: 3,
      registrationType: "free"
    }
  });
  assert(pubEventRes.status === 201, "Published event created successfully");
  const publishedEvent = pubEventRes.data.data;

  // Check public events: publishedEvent must be present
  const updatedPublicRes = await apiRequest("/events");
  const foundPublished = updatedPublicRes.data.data.find(e => e._id === publishedEvent._id);
  assert(!!foundPublished, "Published organizer event appears in public listing");

  // --------------------------------------------------------------------------
  // TEST B: Student A (Session Persistence, Save, Register, No Re-login)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST B: Student A Session & Reserve Spot Flow ---");
  const studentAEmail = `studentA.${timestamp}@example.com`;
  const studentASignup = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Student Alpha",
      email: studentAEmail,
      password: "Password123!",
      role: "student"
    }
  });
  assert(studentASignup.status === 201, "Student A signed up successfully");
  const studentAToken = studentASignup.data.token;
  const studentAUser = studentASignup.data.user;

  // Session recognition: auth endpoints return BOTH _id and id
  assert(!!studentAUser._id && !!studentAUser.id, "Student A response contains both _id and id");
  assert(studentAUser.role === "student", "Student A role is student");

  // Verify /api/auth/me retains _id and session
  const studentAMe = await apiRequest("/auth/me", { token: studentAToken });
  assert(studentAMe.status === 200, "GET /api/auth/me returns 200 OK");
  assert(studentAMe.data.user._id === studentAUser._id, "Session profile matches authenticated student _id");

  // Student A saves published event
  const saveARes = await apiRequest(`/students/saved-events/${publishedEvent._id}`, {
    method: "POST",
    token: studentAToken
  });
  assert(saveARes.status === 200, "Student A saved event successfully");

  // Student A retrieves saved events
  const savedAList = await apiRequest("/students/saved-events", { token: studentAToken });
  assert(savedAList.status === 200, "GET /api/students/saved-events returns 200 OK");
  assert(savedAList.data.data.length === 1 && savedAList.data.data[0]._id === publishedEvent._id, "Student A sees saved event with full details");

  // Student A registers for published event (Reserve Spot with token)
  const regARes = await apiRequest(`/events/${publishedEvent._id}/register`, {
    method: "POST",
    token: studentAToken,
    body: {
      participantName: "Student Alpha",
      email: studentAEmail
    }
  });
  assert(regARes.status === 201, "Student A registered for event with token (no re-login needed)");
  assert(regARes.data.data.student.toString() === studentAUser._id.toString(), "Registration record is linked to Student A's unique MongoDB _id");
  const ticketAId = regARes.data.data._id;

  // Student A retrieves tickets
  const ticketsARes = await apiRequest("/students/tickets", { token: studentAToken });
  assert(ticketsARes.status === 200, "GET /api/students/tickets returns 200 OK");
  assert(ticketsARes.data.data.length === 1, "Student A has exactly 1 ticket");
  assert(ticketsARes.data.data[0].eventTitle === publishedEvent.title, "Ticket correctly contains event title");

  // --------------------------------------------------------------------------
  // TEST C: Student B (Complete Isolation Verification)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST C: Student B Data Isolation & Cross-Account Breach Prevention ---");
  const studentBEmail = `studentB.${timestamp}@example.com`;
  const studentBSignup = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Student Beta",
      email: studentBEmail,
      password: "Password123!",
      role: "student"
    }
  });
  assert(studentBSignup.status === 201, "Student B signed up successfully");
  const studentBToken = studentBSignup.data.token;
  const studentBUser = studentBSignup.data.user;

  // Student B inspects saved events: MUST BE 0 (Zero leakage from Student A)
  const savedBList = await apiRequest("/students/saved-events", { token: studentBToken });
  assert(savedBList.data.data.length === 0, "Student B sees 0 saved events (Student A's saved event is completely hidden)");

  // Student B inspects tickets: MUST BE 0 (Zero leakage from Student A)
  const ticketsBRes = await apiRequest("/students/tickets", { token: studentBToken });
  assert(ticketsBRes.data.data.length === 0, "Student B sees 0 tickets (Student A's ticket is completely hidden)");

  // Tampering attempt: Student B requests Student A's ticket by registration ID
  const tamperAttempt = await apiRequest(`/students/tickets/${ticketAId}`, { token: studentBToken });
  assert(tamperAttempt.status === 403, "Student B denied access to Student A's ticket with HTTP 403 Forbidden");

  // --------------------------------------------------------------------------
  // TEST D: Session Handling & Logout
  // --------------------------------------------------------------------------
  console.log("\n--- TEST D: Session Verification & Unauthenticated Rejection ---");
  const unauthMe = await apiRequest("/auth/me");
  assert(unauthMe.status === 401, "Unauthenticated request to /auth/me returns 401");

  const unauthSaved = await apiRequest("/students/saved-events");
  assert(unauthSaved.status === 401, "Unauthenticated request to /students/saved-events returns 401");

  const unauthTickets = await apiRequest("/students/tickets");
  assert(unauthTickets.status === 401, "Unauthenticated request to /students/tickets returns 401");

  // --------------------------------------------------------------------------
  // TEST E: Registration Integrity (Capacity & Duplicate Enforcements)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST E: Registration Integrity, Duplicate Prevention & Capacity ---");

  // Duplicate registration attempt by Student A
  const dupReg = await apiRequest(`/events/${publishedEvent._id}/register`, {
    method: "POST",
    token: studentAToken,
    body: {
      participantName: "Student Alpha",
      email: studentAEmail
    }
  });
  assert(dupReg.status === 409, "Duplicate registration by Student A rejected with HTTP 409 Conflict");

  // Student B registers for the second seat
  const regBRes = await apiRequest(`/events/${publishedEvent._id}/register`, {
    method: "POST",
    token: studentBToken,
    body: {
      participantName: "Student Beta",
      email: studentBEmail
    }
  });
  assert(regBRes.status === 201, "Student B registered for seat 2");

  // Register a 3rd attendee to fill capacity (capacity = 3)
  const studentCEmail = `studentC.${timestamp}@example.com`;
  const regCRes = await apiRequest(`/events/${publishedEvent._id}/register`, {
    method: "POST",
    body: {
      participantName: "Student Gamma",
      email: studentCEmail
    }
  });
  assert(regCRes.status === 201, "Seat 3 registered (event is now at full capacity: 3/3)");

  // Attempting 4th registration must fail with 409 Full
  const reg4Res = await apiRequest(`/events/${publishedEvent._id}/register`, {
    method: "POST",
    body: {
      participantName: "Overflow Attendee",
      email: `overflow.${timestamp}@example.com`
    }
  });
  assert(reg4Res.status === 409, "Registration past capacity correctly rejected with HTTP 409 (Event full)");

  // Clean up test event and registrations so DB stays pristine
  console.log("\n--- Cleanup: Deleting temporary test event from MongoDB ---");
  const delRes = await apiRequest(`/events/${publishedEvent._id}`, {
    method: "DELETE",
    token: orgToken
  });
  assert(delRes.status === 200, "Cleaned up test event and all its registrations");

  console.log("\n============================================================");
  console.log("  🎉 ALL COMPREHENSIVE VERIFICATION TESTS PASSED (100%)!");
  console.log("============================================================\n");
}

runComprehensiveVerification().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
