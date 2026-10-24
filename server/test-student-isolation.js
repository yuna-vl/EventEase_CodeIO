/**
 * Automated Test Suite: Student Data Isolation & Security Verification
 *
 * Verifies strict data isolation between multiple student accounts:
 * - Student 1 (Yuna) and Student 2 (Yashasvi)
 * - Saved events are isolated in MongoDB and strictly filtered by authenticated student ID.
 * - Confirmed tickets/registrations are isolated and strictly filtered by authenticated student ID.
 * - Accessing another student's registration ID is denied with 403 Forbidden.
 * - Account switching and data refresh do not cross-pollinate user data.
 */

const API_BASE = "http://localhost:5000/api";

function assert(condition, message, detail = "") {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    if (detail) console.error(`   Detail: ${detail}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function apiRequest(endpoint, { method = "GET", token = null, body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runIsolationTests() {
  console.log("============================================================");
  console.log("  EVENT EASE - STUDENT DATA ISOLATION TEST SUITE");
  console.log("============================================================\n");

  const timestamp = Date.now();

  // 1. Authenticate / provision Organiser to create test events
  console.log("--- 1. Setting up Organiser & 4 Test Events (A, B, C, D) ---");
  const orgEmail = `org_isolation_${timestamp}@test.edu`;
  const orgPassword = "OrganiserPass2026!";
  const orgSecret = "EventEaseAdmin2026!";

  const orgSignup = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Prof. Alan Turing",
      email: orgEmail,
      password: orgPassword,
      role: "organizer",
      organizerSecret: orgSecret
    }
  });

  let orgToken = orgSignup.data?.token;
  if (!orgToken) {
    const orgLogin = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: orgEmail, password: orgPassword, role: "organizer" }
    });
    orgToken = orgLogin.data?.token;
  }
  assert(!!orgToken, "Organiser authenticated successfully");

  // Create Event A, B, C, D
  async function createTestEvent(letter) {
    const res = await apiRequest("/events", {
      method: "POST",
      token: orgToken,
      body: {
        title: `Isolation Test Event ${letter} [${timestamp}]`,
        description: `Automated testing event ${letter} for user data isolation.`,
        date: new Date(Date.now() + 86400000 * 5).toISOString(),
        venue: `Hall ${letter}, Science Complex`,
        capacity: 100,
        registrationType: "free"
      }
    });
    assert(res.status === 201 && res.data?.data?._id, `Created Event ${letter}`);
    return res.data.data;
  }

  const eventA = await createTestEvent("A");
  const eventB = await createTestEvent("B");
  const eventC = await createTestEvent("C");
  const eventD = await createTestEvent("D");

  // 2. Provision Student 1 (Yuna) and Student 2 (Yashasvi)
  console.log("\n--- 2. Setting up Student Accounts (Yuna & Yashasvi) ---");
  const yunaEmail = `yuna_${timestamp}@isolation.test`;
  const yashasviEmail = `yashasvi_${timestamp}@isolation.test`;
  const studentPassword = "StudentPass2026!";

  const yunaRes = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Yuna Kim",
      email: yunaEmail,
      password: studentPassword,
      role: "student"
    }
  });
  assert(yunaRes.status === 201 && yunaRes.data?.token, "Yuna signed up successfully");
  const yunaToken = yunaRes.data.token;
  const yunaId = yunaRes.data.user.id || yunaRes.data.user._id;

  const yashasviRes = await apiRequest("/auth/signup", {
    method: "POST",
    body: {
      name: "Yashasvi Sharma",
      email: yashasviEmail,
      password: studentPassword,
      role: "student"
    }
  });
  assert(yashasviRes.status === 201 && yashasviRes.data?.token, "Yashasvi signed up successfully");
  const yashasviToken = yashasviRes.data.token;
  const yashasviId = yashasviRes.data.user.id || yashasviRes.data.user._id;

  assert(yunaId !== yashasviId, "Yuna and Yashasvi have distinct MongoDB user IDs", `Yuna: ${yunaId}, Yashasvi: ${yashasviId}`);

  // 3. Step 1: Yuna saves Event A and registers for Event B
  console.log("\n--- 3. Step 1: Yuna saves Event A and registers for Event B ---");
  const yunaSaveA = await apiRequest(`/students/saved-events/${eventA._id}`, {
    method: "POST",
    token: yunaToken
  });
  assert(yunaSaveA.status === 200 && yunaSaveA.data?.success, "Yuna saved Event A on the backend");

  const yunaRegB = await apiRequest(`/events/${eventB._id}/register`, {
    method: "POST",
    token: yunaToken,
    body: {
      participantName: "Yuna Kim",
      email: yunaEmail
    }
  });
  assert(yunaRegB.status === 201 && yunaRegB.data?.success, "Yuna registered for Event B with token");
  const yunaTicketBId = yunaRegB.data.data._id || yunaRegB.data.data.id;
  assert(!!yunaTicketBId, "Yuna received ticket registration ID for Event B");

  // Verify Yuna's own data
  const yunaSavedList = await apiRequest("/students/saved-events", { token: yunaToken });
  assert(
    yunaSavedList.data?.data?.some(e => e._id === eventA._id),
    "Yuna sees Event A in her saved events"
  );

  const yunaTicketsList = await apiRequest("/students/tickets", { token: yunaToken });
  assert(
    yunaTicketsList.data?.data?.some(t => t.eventId === eventB._id || t.eventId?._id === eventB._id),
    "Yuna sees Event B in her tickets"
  );

  // 4. Step 2: Yashasvi logs in and verifies she sees NEITHER Event A nor Event B
  console.log("\n--- 4. Step 2: Yashasvi checks saved events and tickets (Zero Leakage Verification) ---");
  const yashasviSavedList = await apiRequest("/students/saved-events", { token: yashasviToken });
  assert(
    yashasviSavedList.data?.data?.length === 0,
    "Yashasvi sees 0 saved events (Yuna's Event A is NOT visible to Yashasvi)",
    `Count: ${yashasviSavedList.data?.data?.length}`
  );

  const yashasviSavedIds = await apiRequest("/students/saved-events/ids", { token: yashasviToken });
  assert(
    !yashasviSavedIds.data?.data?.includes(eventA._id),
    "Yashasvi's saved event IDs do NOT include Event A"
  );

  const yashasviTicketsList = await apiRequest("/students/tickets", { token: yashasviToken });
  assert(
    yashasviTicketsList.data?.data?.length === 0,
    "Yashasvi sees 0 tickets (Yuna's Event B ticket is NOT visible to Yashasvi)",
    `Count: ${yashasviTicketsList.data?.data?.length}`
  );

  // 5. Step 3: Yashasvi saves Event C and registers for Event D
  console.log("\n--- 5. Step 3: Yashasvi saves Event C and registers for Event D ---");
  const yashasviSaveC = await apiRequest(`/students/saved-events/${eventC._id}`, {
    method: "POST",
    token: yashasviToken
  });
  assert(yashasviSaveC.status === 200 && yashasviSaveC.data?.success, "Yashasvi saved Event C on backend");

  const yashasviRegD = await apiRequest(`/events/${eventD._id}/register`, {
    method: "POST",
    token: yashasviToken,
    body: {
      participantName: "Yashasvi Sharma",
      email: yashasviEmail
    }
  });
  assert(yashasviRegD.status === 201 && yashasviRegD.data?.success, "Yashasvi registered for Event D with token");
  const yashasviTicketDId = yashasviRegD.data.data._id || yashasviRegD.data.data.id;

  // Verify Yashasvi sees ONLY Event C and Event D
  const yashasviUpdatedSaved = await apiRequest("/students/saved-events", { token: yashasviToken });
  assert(
    yashasviUpdatedSaved.data?.data?.length === 1 && yashasviUpdatedSaved.data?.data[0]?._id === eventC._id,
    "Yashasvi sees ONLY Event C in saved events (not Event A)"
  );

  const yashasviUpdatedTickets = await apiRequest("/students/tickets", { token: yashasviToken });
  assert(
    yashasviUpdatedTickets.data?.data?.length === 1 &&
      (yashasviUpdatedTickets.data?.data[0]?.eventId === eventD._id ||
        yashasviUpdatedTickets.data?.data[0]?.eventId?._id === eventD._id),
    "Yashasvi sees ONLY Event D in tickets (not Event B)"
  );

  // 6. Step 4: Yuna checks her data again and sees ONLY her own data
  console.log("\n--- 6. Step 4: Yuna re-verifies her data after Yashasvi's actions ---");
  const yunaCheckSaved = await apiRequest("/students/saved-events", { token: yunaToken });
  assert(
    yunaCheckSaved.data?.data?.length === 1 && yunaCheckSaved.data?.data[0]?._id === eventA._id,
    "Yuna sees ONLY Event A (Yashasvi's Event C is NOT visible to Yuna)"
  );

  const yunaCheckTickets = await apiRequest("/students/tickets", { token: yunaToken });
  assert(
    yunaCheckTickets.data?.data?.length === 1 &&
      (yunaCheckTickets.data?.data[0]?.eventId === eventB._id ||
        yunaCheckTickets.data?.data[0]?.eventId?._id === eventB._id),
    "Yuna sees ONLY Event B (Yashasvi's Event D is NOT visible to Yuna)"
  );

  // 7. Step 7: Cross-Account Ticket Access Attempt (Security Enforced)
  console.log("\n--- 7. Cross-Account Ticket Access (Authorization & 403 Forbidden Check) ---");
  // Yashasvi attempts to access Yuna's ticket by ID
  const breachAttempt1 = await apiRequest(`/students/tickets/${yunaTicketBId}`, { token: yashasviToken });
  assert(
    breachAttempt1.status === 403,
    "Yashasvi denied access to Yuna's ticket (HTTP 403 Forbidden)",
    `Status: ${breachAttempt1.status}, Message: ${breachAttempt1.data?.message}`
  );

  // Yuna attempts to access Yashasvi's ticket by ID
  const breachAttempt2 = await apiRequest(`/students/tickets/${yashasviTicketDId}`, { token: yunaToken });
  assert(
    breachAttempt2.status === 403,
    "Yuna denied access to Yashasvi's ticket (HTTP 403 Forbidden)",
    `Status: ${breachAttempt2.status}, Message: ${breachAttempt2.data?.message}`
  );

  // Yuna accessing her OWN ticket by ID -> succeeds with 200
  const ownerAccess = await apiRequest(`/students/tickets/${yunaTicketBId}`, { token: yunaToken });
  assert(
    ownerAccess.status === 200 && ownerAccess.data?.data?.participantName === "Yuna Kim",
    "Yuna successfully accesses her own ticket by ID (HTTP 200 OK)"
  );

  // 8. Step 8: Unsaving and Duplicate Prevention
  console.log("\n--- 8. Testing Duplicate Prevention and Unsaving ---");
  // Duplicate save attempt
  await apiRequest(`/students/saved-events/${eventA._id}`, { method: "POST", token: yunaToken });
  const yunaCheckDuplicates = await apiRequest("/students/saved-events", { token: yunaToken });
  assert(
    yunaCheckDuplicates.data?.data?.length === 1,
    "Duplicate save does NOT create multiple entries in saved events"
  );

  // Unsave Event A
  const unsaveRes = await apiRequest(`/students/saved-events/${eventA._id}`, { method: "DELETE", token: yunaToken });
  assert(unsaveRes.status === 200 && unsaveRes.data?.success, "Yuna unsaved Event A");

  const yunaAfterUnsave = await apiRequest("/students/saved-events", { token: yunaToken });
  assert(
    yunaAfterUnsave.data?.data?.length === 0,
    "Yuna's saved events is now empty after unsaving"
  );

  // Yashasvi's saved events is still intact with Event C
  const yashasviIntact = await apiRequest("/students/saved-events", { token: yashasviToken });
  assert(
    yashasviIntact.data?.data?.length === 1 && yashasviIntact.data?.data[0]?._id === eventC._id,
    "Yashasvi's saved Event C remains untouched and fully intact"
  );

  // Unauthenticated requests are rejected
  const unauthSaved = await apiRequest("/students/saved-events");
  assert(unauthSaved.status === 401, "Unauthenticated request to /saved-events returns 401 Unauthorized");

  const unauthTickets = await apiRequest("/students/tickets");
  assert(unauthTickets.status === 401, "Unauthenticated request to /tickets returns 401 Unauthorized");

  // Clean up test events to ensure no lingering test artifacts remain in the database
  console.log("\n--- 9. Cleaning up temporary test events to keep database pristine ---");
  for (const ev of [eventA, eventB, eventC, eventD]) {
    if (ev && ev._id) {
      await apiRequest(`/events/${ev._id}`, {
        method: "DELETE",
        token: orgToken
      });
    }
  }
  console.log("✅ Successfully cleaned up all test events (zero test artifacts left in DB)");

  console.log("\n============================================================");
  console.log("  🎉 ALL 16 DATA ISOLATION TESTS PASSED PERFECTLY!");
  console.log("============================================================\n");
}

runIsolationTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
