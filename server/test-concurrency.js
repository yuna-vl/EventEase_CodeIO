import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import Event from "./src/models/Event.js";
import Registration from "./src/models/Registration.js";
import User from "./src/models/User.js";
import Organizer from "./src/models/Organizer.js";
import Notification from "./src/models/Notification.js";
import { registerWithoutTransaction } from "./src/controllers/eventController.js";

const PORT = 5057;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let serverInstance = null;
const trackedEventIds = [];
const trackedUserIds = [];
const trackedRegIds = [];

const logResult = (name, passed, details = "") => {
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} - ${name} ${details ? `(${details})` : ""}`);
};

async function main() {
  console.log("\n========================================================");
  console.log("   EventEase Backend: Race-Safe Concurrency Test Suite  ");
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
      throw new Error(`Assertion failed: ${name} - ${details}`);
    }
  };

  try {
    // 1. Database Connection & Index Synchronization
    await connectDB();
    await Registration.syncIndexes();
    await Event.syncIndexes();
    await User.syncIndexes();

    serverInstance = app.listen(PORT);
    console.log(`[Concurrency Server] Listening on ${BASE_URL}\n`);

    // Setup Test Organizer for Event Creation
    const timestamp = Date.now();
    const orgEmail = `race_organizer_${timestamp}@eventease.live`;
    const orgPassword = "TestPassword123!";
    let organizer = await Organizer.findOne({ email: orgEmail });
    if (!organizer) {
      organizer = await Organizer.create({
        name: "Race Test Organizer",
        email: orgEmail,
        password: orgPassword
      });
      trackedUserIds.push(organizer._id);
    }

    // Login Organizer to obtain Bearer Token
    const orgLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: orgEmail, password: orgPassword })
    });
    const orgLoginData = await orgLoginRes.json();
    const orgToken = orgLoginData.token;
    assert(Boolean(orgToken), "Organizer logged in and JWT acquired", `Org: ${orgEmail}`);

    // Helper: Create Authenticated Student
    const createStudent = async (prefix) => {
      const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@student.edu`;
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${prefix} Student`,
          email,
          password: "StudentPassword123!",
          role: "student"
        })
      });
      const data = await res.json();
      if (data.user?.id) trackedUserIds.push(data.user.id);
      return {
        id: data.user?.id,
        email,
        name: `${prefix} Student`,
        token: data.token
      };
    };

    // Helper: Create Test Event
    const createTestEvent = async (title, capacity, status = "active") => {
      const res = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orgToken}`
        },
        body: JSON.stringify({
          title,
          description: "High concurrency race testing event.",
          date: new Date(Date.now() + 86400000 * 5).toISOString(),
          venue: "Virtual Arena Alpha",
          capacity,
          status
        })
      });
      const data = await res.json();
      const eventId = data.data._id;
      trackedEventIds.push(eventId);
      return eventId;
    };

    // =========================================================================
    // TEST 1 (Req 1-6): Capacity 1, 2 concurrent requests from different students
    // =========================================================================
    console.log("\n--- Test 1: Last Seat Competition (Capacity 1, 2 Different Students) ---");
    const event1Id = await createTestEvent("Last Seat Showdown", 1);
    const studentA = await createStudent("Alice");
    const studentB = await createStudent("Bob");

    // Barrier / Coordinated dispatch using Promise.all
    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/events/${event1Id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentA.token}`
        },
        body: JSON.stringify({ participantName: studentA.name, email: studentA.email })
      }).then(async r => ({ status: r.status, data: await r.json() })),
      fetch(`${BASE_URL}/events/${event1Id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentB.token}`
        },
        body: JSON.stringify({ participantName: studentB.name, email: studentB.email })
      }).then(async r => ({ status: r.status, data: await r.json() }))
    ]);

    const resultsTest1 = [resA, resB];
    const successes1 = resultsTest1.filter(r => r.status === 201);
    const conflicts1 = resultsTest1.filter(r => r.status === 409);

    assert(successes1.length === 1, "Exactly one registration succeeds (HTTP 201)", `Count: ${successes1.length}`);
    assert(conflicts1.length === 1, "Other request receives expected 409 Conflict response", `Status: ${conflicts1[0]?.status}`);
    assert(conflicts1[0]?.data?.message === "Sorry, this event is full.", "Conflict response message indicates event is full", `Msg: ${conflicts1[0]?.data?.message}`);

    const registrationsTest1 = await Registration.find({ event: event1Id });
    assert(registrationsTest1.length === 1, "Exactly one registration record exists in database", `Records: ${registrationsTest1.length}`);

    const event1Doc = await Event.findById(event1Id);
    assert(event1Doc.registeredCount === 1, "Event registeredCount is strictly 1 (no overbooking)", `Count: ${event1Doc.registeredCount}`);

    // =========================================================================
    // TEST 2 (Req 7-8): Duplicate concurrent requests from the SAME student
    // =========================================================================
    console.log("\n--- Test 2: Duplicate Concurrent Requests from Same Student ---");
    const event2Id = await createTestEvent("Duplicate Booking Barrier Test", 5);
    const studentDup = await createStudent("DupeTester");

    // Send two simultaneous requests for the exact same student and event
    const [dupRes1, dupRes2] = await Promise.all([
      fetch(`${BASE_URL}/events/${event2Id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentDup.token}`
        },
        body: JSON.stringify({ participantName: studentDup.name, email: studentDup.email })
      }).then(async r => ({ status: r.status, data: await r.json() })),
      fetch(`${BASE_URL}/events/${event2Id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentDup.token}`
        },
        body: JSON.stringify({ participantName: studentDup.name, email: studentDup.email })
      }).then(async r => ({ status: r.status, data: await r.json() }))
    ]);

    const dupResults = [dupRes1, dupRes2];
    const dupSuccess = dupResults.filter(r => r.status === 201);
    const dupConflict = dupResults.filter(r => r.status === 409);

    assert(dupSuccess.length === 1, "First submission succeeds with HTTP 201 Created", `Success: ${dupSuccess.length}`);
    assert(dupConflict.length === 1, "Duplicate concurrent submission rejected with HTTP 409 Conflict", `Conflict: ${dupConflict.length}`);
    assert(
      dupConflict[0]?.data?.message?.includes("already registered"),
      "Duplicate response clearly indicates user is already registered",
      `Msg: ${dupConflict[0]?.data?.message}`
    );

    const dupRegs = await Registration.find({ event: event2Id });
    assert(dupRegs.length === 1, "Only one registration record exists in database for this student", `Count: ${dupRegs.length}`);

    const event2Doc = await Event.findById(event2Id);
    assert(event2Doc.registeredCount === 1, "RegisteredCount increased by only 1 seat", `registeredCount: ${event2Doc.registeredCount}`);

    // =========================================================================
    // TEST 3 (Req 9-10): Multiple seats remaining, concurrent stampede
    // =========================================================================
    console.log("\n--- Test 3: Multiple Seats Stampede (Capacity 3, 10 Concurrent Competitors) ---");
    const event3Capacity = 3;
    const event3Id = await createTestEvent("Multi-Seat Stampede", event3Capacity);

    const competitors = [];
    for (let i = 0; i < 10; i++) {
      competitors.push(await createStudent(`Competitor_${i}`));
    }

    // Coordinated concurrent storm
    const stampedeResults = await Promise.all(
      competitors.map(c =>
        fetch(`${BASE_URL}/events/${event3Id}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${c.token}`
          },
          body: JSON.stringify({ participantName: c.name, email: c.email })
        }).then(async r => ({ status: r.status, data: await r.json() }))
      )
    );

    console.log("Stampede results breakdown:", stampedeResults.map(r => ({ status: r.status, msg: r.data?.message })));
    const stampedeSuccess = stampedeResults.filter(r => r.status === 201);
    const stampedeFull = stampedeResults.filter(r => r.status === 409);

    assert(
      stampedeSuccess.length === event3Capacity,
      `Exactly ${event3Capacity} out of 10 concurrent requests succeed`,
      `Successes: ${stampedeSuccess.length}`
    );
    assert(
      stampedeFull.length === 10 - event3Capacity,
      `Exactly ${10 - event3Capacity} concurrent requests rejected with 409 Conflict`,
      `Rejections: ${stampedeFull.length}`
    );

    const event3Doc = await Event.findById(event3Id);
    assert(
      event3Doc.registeredCount === event3Capacity,
      `Final registeredCount strictly equals event capacity (${event3Capacity}/${event3Capacity})`,
      `Count: ${event3Doc.registeredCount}`
    );

    const event3RegCount = await Registration.countDocuments({ event: event3Id });
    assert(
      event3RegCount === event3Capacity,
      `Total registrations in DB matches capacity exactly (${event3RegCount})`,
      `DB count: ${event3RegCount}`
    );

    // =========================================================================
    // TEST 4 (Req 11): Rollback & Compensation on Registration Failure
    // =========================================================================
    console.log("\n--- Test 4: Rollback & Compensation on Registration Failure ---");

    // Part A: Transaction Rollback
    const event4Id = await createTestEvent("Transaction Rollback Test", 5);
    const student4 = await createStudent("TransFail");

    // Pre-seed an identical registration so that the second attempt will collide inside the transaction
    await Registration.create({
      event: event4Id,
      student: student4.id,
      participantName: student4.name,
      email: student4.email
    });
    await Event.findByIdAndUpdate(event4Id, { $inc: { registeredCount: 1 } });

    const countBeforeTx = (await Event.findById(event4Id)).registeredCount;
    assert(countBeforeTx === 1, "Pre-seeded count is 1");

    // Submit duplicate registration via API
    const txFailRes = await fetch(`${BASE_URL}/events/${event4Id}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student4.token}`
      },
      body: JSON.stringify({ participantName: student4.name, email: student4.email })
    });
    assert(txFailRes.status === 409, "Duplicate registration attempt rejected with 409", `Status: ${txFailRes.status}`);

    const countAfterTx = (await Event.findById(event4Id)).registeredCount;
    assert(
      countAfterTx === 1,
      "Transaction rollback preserved registeredCount (did not increment after collision)",
      `registeredCount: ${countAfterTx}`
    );

    // Part B: Nontransactional Fallback Compensation Test
    console.log("\n--- Testing registerWithoutTransaction Compensation ---");
    const eventCompId = await createTestEvent("Compensation Rollback Test", 5);
    const initialCompEvent = await Event.findById(eventCompId);
    assert(initialCompEvent.registeredCount === 0, "Initial registeredCount is 0");

    // Pre-insert a registration document to cause E11000 duplicate key error in Registration.create
    const collisionEmail = "collision@test.edu";
    await Registration.create({
      event: eventCompId,
      participantName: "Pre-existing",
      email: collisionEmail
    });

    // Mock Express res object to test registerWithoutTransaction directly
    let mockStatus = 0;
    let mockJson = null;
    const mockRes = {
      status(s) {
        mockStatus = s;
        return this;
      },
      json(j) {
        mockJson = j;
        return this;
      }
    };

    await registerWithoutTransaction({
      id: eventCompId,
      participantName: "Colliding Participant",
      normalizedEmail: collisionEmail,
      studentId: null,
      requestedSeats: 1,
      res: mockRes
    });

    assert(mockStatus === 409, "registerWithoutTransaction returned 409 Conflict on E11000 duplicate key", `Status: ${mockStatus}`);
    assert(mockJson?.message === "You are already registered for this event.", "Returned duplicate error message", `Msg: ${mockJson?.message}`);

    const postCompEvent = await Event.findById(eventCompId);
    assert(
      postCompEvent.registeredCount === 0,
      "Reliable compensation restored registeredCount back to 0 after insert failure",
      `Count: ${postCompEvent.registeredCount}`
    );

    // =========================================================================
    // TEST 5 (Req 12): Cancelled Events Cannot Be Booked (Racing Cancellation)
    // =========================================================================
    console.log("\n--- Test 5: Booking Rejection on Cancelled Events ---");
    const event5Id = await createTestEvent("Cancelled Event Showdown", 10);
    const studentCancel = await createStudent("CancelRacer");

    // Cancel the event
    await fetch(`${BASE_URL}/events/${event5Id}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgToken}`
      },
      body: JSON.stringify({ reason: "Weather emergency" })
    });

    // Attempt to book against the cancelled event
    const cancelBookRes = await fetch(`${BASE_URL}/events/${event5Id}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentCancel.token}`
      },
      body: JSON.stringify({ participantName: studentCancel.name, email: studentCancel.email })
    });
    const cancelBookData = await cancelBookRes.json();

    assert(cancelBookRes.status === 400, "Registration against cancelled event rejected with HTTP 400", `Status: ${cancelBookRes.status}`);
    assert(
      cancelBookData.message.includes("cancelled"),
      "Rejection message clearly states event has been cancelled",
      `Msg: ${cancelBookData.message}`
    );

    const event5Final = await Event.findById(event5Id);
    assert(event5Final.registeredCount === 0, "RegisteredCount remains 0 for cancelled event", `Count: ${event5Final.registeredCount}`);

    // =========================================================================
    // TEST 6 (Req 13): Legitimate Registrations & Attendees History Intact
    // =========================================================================
    console.log("\n--- Test 6: Attendee History & Notification Integrity ---");
    const attendeesRes = await fetch(`${BASE_URL}/events/${event3Id}/attendees`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const attendeesData = await attendeesRes.json();

    assert(attendeesRes.status === 200, "Organizer can fetch attendee roster (HTTP 200)");
    assert(attendeesData.count === event3Capacity, `Attendee roster count matches successful registrations (${event3Capacity})`, `Count: ${attendeesData.count}`);
    assert(attendeesData.data.length === event3Capacity, "Roster array contains all confirmed attendee records");

    // =========================================================================
    // TEST 7 (Req 14 & Intermittent Check): Repeated High-Concurrency Runs
    // =========================================================================
    console.log("\n--- Test 7: Repeated High-Concurrency Runs (5 Consecutive Iterations) ---");
    const iterations = 5;
    for (let iter = 1; iter <= iterations; iter++) {
      const iterEventId = await createTestEvent(`Iterative Race ${iter}`, 1);
      const student1 = await createStudent(`Iter${iter}_A`);
      const student2 = await createStudent(`Iter${iter}_B`);
      const student3 = await createStudent(`Iter${iter}_C`);

      const [r1, r2, r3] = await Promise.all([
        fetch(`${BASE_URL}/events/${iterEventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${student1.token}` },
          body: JSON.stringify({ participantName: student1.name, email: student1.email })
        }).then(async r => ({ status: r.status, data: await r.json() })),
        fetch(`${BASE_URL}/events/${iterEventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${student2.token}` },
          body: JSON.stringify({ participantName: student2.name, email: student2.email })
        }).then(async r => ({ status: r.status, data: await r.json() })),
        fetch(`${BASE_URL}/events/${iterEventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${student3.token}` },
          body: JSON.stringify({ participantName: student3.name, email: student3.email })
        }).then(async r => ({ status: r.status, data: await r.json() }))
      ]);

      const iterResults = [r1, r2, r3];
      const winCount = iterResults.filter(r => r.status === 201).length;
      const loseCount = iterResults.filter(r => r.status === 409).length;

      assert(winCount === 1, `Iteration ${iter}: Exactly 1 winner acquired the seat`, `Wins: ${winCount}`);
      assert(loseCount === 2, `Iteration ${iter}: Exactly 2 losers received 409 Conflict`, `Losses: ${loseCount}`);

      const iterEvent = await Event.findById(iterEventId);
      assert(iterEvent.registeredCount === 1, `Iteration ${iter}: registeredCount strictly 1`, `Count: ${iterEvent.registeredCount}`);
    }

    console.log("\n========================================================");
    console.log(`   Concurrency Suite Results: ${passedCount} / ${totalCount} checks passed!`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    console.log("[Teardown] Cleaning up test artifacts from database...");
    try {
      if (trackedEventIds.length > 0) {
        await Event.deleteMany({ _id: { $in: trackedEventIds } });
        await Registration.deleteMany({ event: { $in: trackedEventIds } });
        await Notification.deleteMany({ event: { $in: trackedEventIds } });
      }
      if (trackedUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: trackedUserIds } });
        await Organizer.deleteMany({ _id: { $in: trackedUserIds } });
      }
      console.log(`[Teardown] Cleaned up ${trackedEventIds.length} events and ${trackedUserIds.length} test accounts.`);
    } catch (cleanupErr) {
      console.error("[Teardown] Error during cleanup:", cleanupErr);
    }

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
  }
}

main();
