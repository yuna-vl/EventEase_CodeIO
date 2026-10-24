import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import mongoose from "mongoose";
import User from "./src/models/User.js";
import Event from "./src/models/Event.js";
import Registration from "./src/models/Registration.js";
import Organizer from "./src/models/Organizer.js";
import jwt from "jsonwebtoken";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:5000/api";

const logPass = (title, details = "") => {
  console.log(`   ✅ PASS: ${title} ${details ? `(${details})` : ""}`);
};

const logFail = (title, details = "") => {
  console.error(`   ❌ FAIL: ${title} ${details ? `(${details})` : ""}`);
};

async function runRoleAuthTests() {
  console.log("\n========================================================");
  console.log("   EventEase - Role-Based Authentication & RBAC Tests  ");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const studentEmail = `student_${timestamp}@university.edu`;
  const orgAEmail = `organizerA_${timestamp}@eventease.live`;
  const orgBEmail = `organizerB_${timestamp}@eventease.live`;
  const attackerEmail = `attacker_${timestamp}@evil.com`;
  const password = "SecurePassword123!";
  const organizerSecret = process.env.ORGANIZER_SIGNUP_SECRET || "EventEaseOrganizer2026!";

  let createdEventIds = [];
  let createdUserIds = [];

  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // ----------------------------------------------------
    // TEST 1: Register a verified Student account
    // ----------------------------------------------------
    console.log("1. Registering new Student account...");
    const studentSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Student",
        email: studentEmail,
        password,
        role: "student"
      })
    });
    const studentSignupData = await studentSignupRes.json();
    if (studentSignupRes.status === 201 && studentSignupData.user?.role === "student") {
      logPass("Student created with persistent role 'student'");
      createdUserIds.push(studentSignupData.user.id);
    } else {
      throw new Error(`Failed to create student: ${JSON.stringify(studentSignupData)}`);
    }
    const studentToken = studentSignupData.token;

    // ----------------------------------------------------
    // TEST 2: Untrusted Role Tampering Prevention (Public Registration)
    // ----------------------------------------------------
    console.log("2. Testing untrusted role tampering: Attempting organizer signup without invite code...");
    const tamperSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Malicious Attacker",
        email: attackerEmail,
        password,
        role: "organizer" // Untrusted claim without secret
      })
    });
    const tamperSignupData = await tamperSignupRes.json();
    if (tamperSignupRes.status === 403) {
      logPass("Unauthorised organizer registration blocked with HTTP 403", tamperSignupData.message);
    } else {
      throw new Error(`Public user granted organizer role without secret! Status: ${tamperSignupRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 3: Authorised Organiser A Registration with Provisioning Secret
    // ----------------------------------------------------
    console.log("3. Registering authorized Organiser A with provisioning secret...");
    const orgASignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Organizer Alpha",
        email: orgAEmail,
        password,
        role: "organizer",
        organizerSecret
      })
    });
    const orgASignupData = await orgASignupRes.json();
    if (orgASignupRes.status === 201 && orgASignupData.user?.role === "organizer") {
      logPass("Organiser A created with verified role 'organizer'");
      createdUserIds.push(orgASignupData.user.id);
    } else {
      throw new Error(`Failed to create Organiser A: ${JSON.stringify(orgASignupData)}`);
    }
    const orgAToken = orgASignupData.token;

    // ----------------------------------------------------
    // TEST 4: Authorised Organiser B Registration with Provisioning Secret
    // ----------------------------------------------------
    console.log("4. Registering authorized Organiser B with provisioning secret...");
    const orgBSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Organizer Beta",
        email: orgBEmail,
        password,
        role: "organizer",
        organizerSecret
      })
    });
    const orgBSignupData = await orgBSignupRes.json();
    if (orgBSignupRes.status === 201 && orgBSignupData.user?.role === "organizer") {
      logPass("Organiser B created with verified role 'organizer'");
      createdUserIds.push(orgBSignupData.user.id);
    } else {
      throw new Error(`Failed to create Organiser B: ${JSON.stringify(orgBSignupData)}`);
    }
    const orgBToken = orgBSignupData.token;

    // ----------------------------------------------------
    // TEST 5: Student Login and Role Mismatch Safeguards
    // ----------------------------------------------------
    console.log("5. Testing Student Login and cross-portal login defense...");
    // 5a. Valid Student Login
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password,
        role: "student"
      })
    });
    const studentLoginData = await studentLoginRes.json();
    if (studentLoginRes.status === 200 && studentLoginData.user?.role === "student") {
      logPass("Student login successful, returns verified role='student'");
    } else {
      throw new Error(`Student login failed: ${JSON.stringify(studentLoginData)}`);
    }

    // 5b. Student attempts to log in as Organiser
    const studentCrossLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password,
        role: "organizer"
      })
    });
    const studentCrossLoginData = await studentCrossLoginRes.json();
    if (studentCrossLoginRes.status === 403 && studentCrossLoginData.message.includes("Student")) {
      logPass("Cross-portal login blocked with HTTP 403", studentCrossLoginData.message);
    } else {
      throw new Error(`Student was not blocked from organiser portal: ${JSON.stringify(studentCrossLoginData)}`);
    }

    // ----------------------------------------------------
    // TEST 6: Session Refresh & Authoritative Verification (GET /api/auth/me)
    // ----------------------------------------------------
    console.log("6. Testing session restoration & profile role retrieval (GET /api/auth/me)...");
    const studentMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const studentMeData = await studentMeRes.json();
    if (studentMeRes.status === 200 && studentMeData.user?.role === "student") {
      logPass("Student session restore derives role='student' from DB");
    } else {
      throw new Error(`Student session restore failed: ${JSON.stringify(studentMeData)}`);
    }

    const orgMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${orgAToken}` }
    });
    const orgMeData = await orgMeRes.json();
    if (orgMeRes.status === 200 && orgMeData.user?.role === "organizer") {
      logPass("Organiser session restore derives role='organizer' from DB");
    } else {
      throw new Error(`Organiser session restore failed: ${JSON.stringify(orgMeData)}`);
    }

    // ----------------------------------------------------
    // TEST 7: Sign Out and Invalid/Missing Token Protection
    // ----------------------------------------------------
    console.log("7. Testing sign-out and unauthenticated request rejection...");
    const noTokenRes = await fetch(`${API_BASE}/auth/me`);
    if (noTokenRes.status === 401) {
      logPass("Protected API without token rejected with HTTP 401");
    } else {
      throw new Error(`Protected API allowed without token: status ${noTokenRes.status}`);
    }

    const badTokenRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: "Bearer forged.or.expired.jwt" }
    });
    if (badTokenRes.status === 401) {
      logPass("Protected API with forged token rejected with HTTP 401");
    } else {
      throw new Error(`Protected API allowed with forged token: status ${badTokenRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 8: Backend RBAC: Student Blocked from Organiser-Only Endpoints
    // ----------------------------------------------------
    console.log("8. Testing RBAC: Student token blocked from all organiser-only operations...");

    // 8a. Event Creation
    const studentCreateRes = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: "Illegal Student Event",
        description: "Should be blocked by requireRole",
        date: new Date(Date.now() + 86400000).toISOString(),
        venue: "Hall 1",
        capacity: 10
      })
    });
    if (studentCreateRes.status === 403) {
      logPass("Student blocked from POST /api/events with HTTP 403");
    } else {
      throw new Error(`Student was not blocked from creating event! Status: ${studentCreateRes.status}`);
    }

    // 8b. Banner Upload
    const studentBannerRes = await fetch(`${API_BASE}/events/upload-banner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" })
    });
    if (studentBannerRes.status === 403) {
      logPass("Student blocked from POST /api/events/upload-banner with HTTP 403");
    } else {
      throw new Error(`Student was not blocked from upload banner! Status: ${studentBannerRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 9: Organiser A Creates Event (Ownership Establishment)
    // ----------------------------------------------------
    console.log("9. Organiser A creates event with associated backend ownership...");
    const createEventARes = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgAToken}`
      },
      body: JSON.stringify({
        title: `Alpha Private Tech Summit ${timestamp}`,
        description: "Exclusive conference organized by Alpha",
        date: new Date(Date.now() + 86400000).toISOString(),
        venue: "Skyline Convention Center",
        capacity: 25,
        registrationType: "free"
      })
    });
    const createEventAData = await createEventARes.json();
    if (createEventARes.status === 201 && createEventAData.data?._id) {
      createdEventIds.push(createEventAData.data._id);
      logPass("Organiser A successfully created event", `Event ID: ${createEventAData.data._id}`);
    } else {
      throw new Error(`Organiser A event creation failed: ${JSON.stringify(createEventAData)}`);
    }
    const eventAId = createEventAData.data._id;

    // Register a participant to Event A so it has attendee data
    const regRes = await fetch(`${API_BASE}/events/${eventAId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: "Student Attendee",
        email: `attendee_${timestamp}@univ.edu`
      })
    });
    const regData = await regRes.json();
    if (regRes.status === 201) {
      logPass("Participant registered to Event A", `Reference: ${regData.data?.registrationReference}`);
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    // ----------------------------------------------------
    // TEST 10: Enforce Event Ownership (Private Attendee Data Protection)
    // ----------------------------------------------------
    console.log("10. Testing Event Ownership & Attendee Roster Privacy...");

    // 10a. Organiser B (different organizer) attempts to view Event A's attendees
    const orgBViewRes = await fetch(`${API_BASE}/events/${eventAId}/attendees`, {
      headers: { Authorization: `Bearer ${orgBToken}` }
    });
    const orgBViewData = await orgBViewRes.json();
    if (orgBViewRes.status === 403) {
      logPass("Organiser B blocked from Event A attendees with HTTP 403", orgBViewData.message);
    } else {
      throw new Error(`Organiser B accessed another organizer's attendees! Status: ${orgBViewRes.status}`);
    }

    // 10b. Student attempts to view Event A's attendees
    const studentViewRes = await fetch(`${API_BASE}/events/${eventAId}/attendees`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (studentViewRes.status === 403) {
      logPass("Student blocked from Event A attendees with HTTP 403");
    } else {
      throw new Error(`Student accessed event attendees! Status: ${studentViewRes.status}`);
    }

    // 10c. Organiser A (the legitimate owner) views Event A's attendees
    const orgAViewRes = await fetch(`${API_BASE}/events/${eventAId}/attendees`, {
      headers: { Authorization: `Bearer ${orgAToken}` }
    });
    const orgAViewData = await orgAViewRes.json();
    if (orgAViewRes.status === 200 && orgAViewData.count === 1) {
      logPass("Organiser A (owner) successfully accesses attendee roster", `Count: ${orgAViewData.count}`);
    } else {
      throw new Error(`Organiser A could not access own attendee roster: ${JSON.stringify(orgAViewData)}`);
    }

    // ----------------------------------------------------
    // TEST 11: Enforce Event Ownership on Modification & Deletion
    // ----------------------------------------------------
    console.log("11. Testing Event Ownership on Edit & Delete...");

    // 11a. Organiser B attempts to edit Event A
    const orgBEditRes = await fetch(`${API_BASE}/events/${eventAId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgBToken}`
      },
      body: JSON.stringify({ title: "Hacked by Beta" })
    });
    if (orgBEditRes.status === 403) {
      logPass("Organiser B blocked from editing Event A with HTTP 403");
    } else {
      throw new Error(`Organiser B was not blocked from editing Event A! Status: ${orgBEditRes.status}`);
    }

    // 11b. Organiser B attempts to delete Event A
    const orgBDeleteRes = await fetch(`${API_BASE}/events/${eventAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${orgBToken}` }
    });
    if (orgBDeleteRes.status === 403) {
      logPass("Organiser B blocked from deleting Event A with HTTP 403");
    } else {
      throw new Error(`Organiser B was not blocked from deleting Event A! Status: ${orgBDeleteRes.status}`);
    }

    // 11c. Organiser A (owner) successfully updates Event A
    const orgAEditRes = await fetch(`${API_BASE}/events/${eventAId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgAToken}`
      },
      body: JSON.stringify({ title: `Alpha Private Tech Summit (Updated) ${timestamp}` })
    });
    if (orgAEditRes.status === 200) {
      logPass("Organiser A (owner) successfully updated Event A");
    } else {
      throw new Error(`Organiser A failed to update own event: status ${orgAEditRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 12: Missing or Invalid Role Safety (Safe Default Handling)
    // ----------------------------------------------------
    console.log("12. Testing handling of missing or corrupted roles...");
    const corruptToken = jwt.sign(
      { id: studentSignupData.user.id, role: "invalid_unsupported_role" },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1h" }
    );
    const corruptRes = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${corruptToken}`
      },
      body: JSON.stringify({ title: "Corrupt Role Event", capacity: 10 })
    });
    if (corruptRes.status === 403) {
      logPass("Invalid/corrupted role safely blocked with HTTP 403 (defaults safely to student)");
    } else {
      throw new Error(`Invalid role gained access! Status: ${corruptRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 13: Legacy Seed Organiser Backward Compatibility
    // ----------------------------------------------------
    console.log("13. Testing legacy seed organizer (admin@eventease.live)...");
    const seedLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@eventease.live",
        password: "EventEaseAdmin2026!",
        role: "organizer"
      })
    });
    const seedLoginData = await seedLoginRes.json();
    if (seedLoginRes.status === 200 && seedLoginData.user?.role === "organizer") {
      logPass("Seed organizer logs in seamlessly with role 'organizer'");
    } else {
      throw new Error(`Seed organizer login failed: ${JSON.stringify(seedLoginData)}`);
    }

    // ----------------------------------------------------
    // TEST 14: Organiser A Clean Deletion of Event
    // ----------------------------------------------------
    console.log("14. Organiser A deletes Event A and cleans up...");
    const deleteRes = await fetch(`${API_BASE}/events/${eventAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${orgAToken}` }
    });
    if (deleteRes.status === 200) {
      logPass("Organiser A successfully deleted event and registrations");
      createdEventIds = createdEventIds.filter(id => id !== eventAId);
    } else {
      throw new Error(`Event deletion failed: status ${deleteRes.status}`);
    }

    console.log("\n========================================================");
    console.log("   ALL 14 Role-Based Auth & RBAC Checks PASSED!         ");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ RBAC Test Error:", err);
    process.exit(1);
  } finally {
    // Cleanup created test resources
    if (createdEventIds.length > 0) {
      await Event.deleteMany({ _id: { $in: createdEventIds } });
      await Registration.deleteMany({ event: { $in: createdEventIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

runRoleAuthTests();
